import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, input, linkedSignal, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Observable, catchError, distinctUntilChanged, filter, of, switchMap } from 'rxjs';
import { ApiErro } from '../../../core/api/api-erro';
import { ChamadoService } from '../../../core/api/chamado.service';
import { ProjetoService } from '../../../core/api/projeto.service';
import { UsuarioService } from '../../../core/api/usuario.service';
import { AuthService } from '../../../core/auth/auth.service';
import { Chamado, STATUS, StatusChamado, URGENCIAS, Urgencia } from '../../../core/models/chamado';
import { NotificacaoService } from '../../../core/notificacao/notificacao.service';
import { carregarComParametros, listaDeApoio } from '../../../shared/carregamento';
import { BadgeStatus, BadgeUrgencia } from '../../../shared/componentes/badges';
import { ErroCampo } from '../../../shared/formularios/erro-campo';
import { aplicarErrosDoServidor } from '../../../shared/formularios/erros-servidor';
import { DuracaoPipe } from '../../../shared/formatos';
import { RotuloStatusPipe, RotuloUrgenciaPipe } from '../../../shared/rotulos';
import { Avatar } from '../../../shared/componentes/avatar';
import { SeletorResponsaveis } from '../seletor-responsaveis';
import { FeedChamado } from './feed/feed-chamado';

@Component({
  selector: 'app-detalhe-chamado',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    DatePipe,
    ErroCampo,
    BadgeUrgencia,
    BadgeStatus,
    RotuloStatusPipe,
    RotuloUrgenciaPipe,
    SeletorResponsaveis,
    Avatar,
    FeedChamado,
    DuracaoPipe,
  ],
  templateUrl: './detalhe-chamado.html',
  styleUrl: './detalhe-chamado.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DetalheChamado {
  /** Parâmetro de rota `:id`. */
  readonly id = input.required<string>();

  private readonly servico = inject(ChamadoService);
  private readonly projetos = inject(ProjetoService);
  private readonly notificacao = inject(NotificacaoService);
  protected readonly usuarioLogado = inject(AuthService).usuario;
  protected readonly usuarios = listaDeApoio(inject(UsuarioService).listarAtivos());

  protected readonly URGENCIAS = URGENCIAS;
  protected readonly STATUS = STATUS;

  private readonly idNumerico = computed(() => Number(this.id()));
  protected readonly carregamento = carregarComParametros(this.idNumerico, (id) => this.servico.buscar(id));
  /** Chamado exibido: o carregado, substituído pelas respostas das ações (sem nova busca). */
  protected readonly chamado = linkedSignal(() => this.carregamento.dados());

  private readonly projetoId = computed(() => this.chamado()?.projeto.id);
  protected readonly projetoArquivado = computed(() => this.projeto()?.arquivado ?? false);
  private readonly projeto = toSignal(
    toObservable(this.projetoId).pipe(
      filter((id): id is number => id !== undefined),
      distinctUntilChanged(),
      switchMap((id) => this.projetos.buscar(id).pipe(catchError(() => of(null)))),
    ),
  );

  /** "Atribuir a mim" só aparece para quem ainda não é um dos responsáveis. */
  protected readonly souResponsavel = computed(() => {
    const eu = this.usuarioLogado()?.id;
    return !!this.chamado()?.responsaveis.some((r) => r.id === eu);
  });

  protected readonly salvando = signal(false);
  protected readonly conflito = signal(false);

  protected readonly formulario = inject(NonNullableFormBuilder).group({
    titulo: ['', [Validators.required, Validators.maxLength(200)]],
    descricao: ['', [Validators.required, Validators.maxLength(20000)]],
    urgencia: ['MEDIA' as Urgencia, Validators.required],
    responsavelIds: [[] as number[]],
  });

  constructor() {
    // Atualiza o formulário com o chamado do servidor, sem atropelar edição em andamento.
    effect(() => {
      const chamado = this.chamado();
      if (chamado && this.formulario.pristine) {
        this.preencher(chamado);
      }
    });
    effect(() => (this.projetoArquivado() ? this.formulario.disable() : this.formulario.enable()));
  }

  protected salvar(): void {
    const chamado = this.chamado();
    if (!chamado || this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }
    const valor = this.formulario.getRawValue();
    this.salvando.set(true);
    this.servico
      .editar(chamado.id, {
        titulo: valor.titulo.trim(),
        descricao: valor.descricao,
        urgencia: valor.urgencia,
        responsavelIds: valor.responsavelIds,
        versao: chamado.versao,
      })
      .subscribe({
        next: (atualizado) => {
          this.notificacao.sucesso('Alterações salvas.');
          this.formulario.markAsPristine();
          this.aplicar(atualizado);
          this.salvando.set(false);
        },
        error: (erro: unknown) => {
          this.salvando.set(false);
          if (erro instanceof ApiErro && erro.status === 409) {
            this.conflito.set(true);
          } else if (!aplicarErrosDoServidor(this.formulario, erro)) {
            this.notificacao.erro(erro);
          }
        },
      });
  }

  /** Descarta a edição local e traz a versão atual do servidor (após conflito 409). */
  protected recarregar(): void {
    this.conflito.set(false);
    this.formulario.markAsPristine();
    this.carregamento.recarregar();
  }

  /** O feed alterou o chamado (ex.: Solução concluiu, tempo gasto mudou): traz a versão atual. */
  protected aoAlterarNoFeed(): void {
    this.carregamento.recarregar();
  }

  protected descartar(): void {
    const chamado = this.chamado();
    if (chamado) {
      this.preencher(chamado);
    }
  }

  protected alterarStatus(status: StatusChamado): void {
    this.executar((id) => this.servico.alterarStatus(id, status), 'Status atualizado.');
  }

  protected atribuirAMim(): void {
    this.executar((id) => this.servico.atribuirAMim(id), 'Chamado atribuído a você.');
  }

  /** Ações rápidas (status, atribuição): usam a resposta do servidor como novo estado. */
  private executar(acao: (id: number) => Observable<Chamado>, sucesso: string): void {
    const chamado = this.chamado();
    if (!chamado) {
      return;
    }
    acao(chamado.id).subscribe({
      next: (atualizado) => {
        this.notificacao.sucesso(sucesso);
        this.aplicar(atualizado);
      },
      error: (erro: unknown) => this.notificacao.erro(erro),
    });
  }

  /** O effect do construtor repreenche o formulário se não houver edição em andamento. */
  private aplicar(atualizado: Chamado): void {
    this.chamado.set(atualizado);
  }

  private preencher(chamado: Chamado): void {
    this.formulario.reset({
      titulo: chamado.titulo,
      descricao: chamado.descricao,
      urgencia: chamado.urgencia,
      responsavelIds: chamado.responsaveis.map((r) => r.id),
    });
  }
}
