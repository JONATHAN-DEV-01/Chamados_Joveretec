import { ChangeDetectionStrategy, Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { catchError, map, of, startWith, switchMap } from 'rxjs';
import { ChamadoService } from '../../../core/api/chamado.service';
import { ProjetoService, TAMANHO_MAXIMO } from '../../../core/api/projeto.service';
import { UsuarioService } from '../../../core/api/usuario.service';
import { AuthService } from '../../../core/auth/auth.service';
import { filaDeEnvios } from '../../../core/envio/fila-de-envios';
import { ChamadoResumo, STATUS_DA_FILA, URGENCIAS, Urgencia } from '../../../core/models/chamado';
import { NotificacaoService } from '../../../core/notificacao/notificacao.service';
import { listaDeApoio } from '../../../shared/carregamento';
import { idsReferenciados } from '../../../shared/anexos-no-texto';
import { EditorComAnexos } from '../../../shared/componentes/editor-com-anexos';
import { ErroCampo } from '../../../shared/formularios/erro-campo';
import { aplicarErrosDoServidor } from '../../../shared/formularios/erros-servidor';
import { RotuloUrgenciaPipe } from '../../../shared/rotulos';
import { SeletorResponsaveis } from '../seletor-responsaveis';

@Component({
  selector: 'app-novo-chamado',
  imports: [ReactiveFormsModule, RouterLink, ErroCampo, RotuloUrgenciaPipe, SeletorResponsaveis, EditorComAnexos],
  templateUrl: './novo-chamado.html',
  styleUrl: './novo-chamado.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NovoChamado implements OnInit {
  /** Query param opcional para já abrir com o projeto escolhido (ex.: vindo da fila). */
  readonly projetoId = input<string>();

  private readonly router = inject(Router);
  private readonly chamados = inject(ChamadoService);
  private readonly notificacao = inject(NotificacaoService);
  protected readonly usuarioLogado = inject(AuthService).usuario;

  protected readonly URGENCIAS = URGENCIAS;
  protected readonly String = String;
  protected readonly projetos = listaDeApoio(inject(ProjetoService).listarParaSelecao());
  protected readonly usuarios = listaDeApoio(inject(UsuarioService).listarAtivos());
  protected readonly salvando = signal(false);
  /**
   * Arquivos colados/arrastados na descrição: sobem na hora como rascunhos (o chamado ainda não
   * existe) e são ligados a ele na criação.
   */
  protected readonly envios = filaDeEnvios(() => of({ chamadoId: null, acompanhamentoId: null }));
  protected readonly aguardandoEnvios = computed(() => this.envios.pendente() || this.envios.comErro());

  protected readonly formulario = inject(NonNullableFormBuilder).group({
    projetoId: ['', Validators.required],
    titulo: ['', [Validators.required, Validators.maxLength(200)]],
    descricao: ['', [Validators.required, Validators.maxLength(20000)]],
    urgencia: ['MEDIA' as Urgencia, Validators.required],
    responsavelIds: [[] as number[]],
    posicao: [''],
  });

  /** Fila atual do projeto escolhido, para oferecer as posições possíveis. */
  protected readonly fila = toSignal(
    this.formulario.controls.projetoId.valueChanges.pipe(
      startWith(this.formulario.controls.projetoId.value),
      switchMap((id) => (id ? this.carregarFila(Number(id)) : of<ChamadoResumo[]>([]))),
    ),
    { initialValue: [] as ChamadoResumo[] },
  );
  protected readonly fimDaFila = computed(() => this.fila().length + 1);

  ngOnInit(): void {
    const projetoId = this.projetoId();
    if (projetoId) {
      this.formulario.controls.projetoId.setValue(projetoId);
    }
  }

  protected salvar(): void {
    if (this.aguardandoEnvios()) {
      return;
    }
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }
    const valor = this.formulario.getRawValue();
    this.salvando.set(true);
    this.chamados
      .criar({
        projetoId: Number(valor.projetoId),
        titulo: valor.titulo.trim(),
        descricao: valor.descricao,
        urgencia: valor.urgencia,
        responsavelIds: valor.responsavelIds,
        posicao: valor.posicao ? Number(valor.posicao) : null,
        anexoIds: this.anexosCitados(valor.descricao),
      })
      .subscribe({
        next: (criado) => {
          this.notificacao.sucesso('Chamado criado.');
          this.envios.limpar();
          void this.router.navigate(['/chamados', criado.id]);
        },
        error: (erro: unknown) => {
          if (!aplicarErrosDoServidor(this.formulario, erro)) {
            this.notificacao.erro(erro);
          }
          this.salvando.set(false);
        },
      });
  }

  /** Só os enviados por este formulário e ainda citados no texto (os apagados do texto ficam de fora). */
  private anexosCitados(descricao: string): number[] {
    const enviados = new Set(this.envios.envios().map((envio) => envio.anexo()?.id));
    return idsReferenciados(descricao).filter((id) => enviados.has(id));
  }

  private carregarFila(projetoId: number) {
    this.formulario.controls.posicao.setValue('');
    return this.chamados.listar({ projetoId, status: [...STATUS_DA_FILA], ordem: 'POSICAO' }, { tamanho: TAMANHO_MAXIMO }).pipe(
      map((pagina) => pagina.itens),
      catchError(() => of<ChamadoResumo[]>([])),
    );
  }
}
