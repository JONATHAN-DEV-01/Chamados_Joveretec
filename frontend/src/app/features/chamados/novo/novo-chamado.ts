import { ChangeDetectionStrategy, Component, OnInit, computed, effect, inject, input, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { catchError, map, of, startWith, switchMap } from 'rxjs';
import { ChamadoService } from '../../../core/api/chamado.service';
import { ProjetoService, TAMANHO_MAXIMO } from '../../../core/api/projeto.service';
import { UsuarioService } from '../../../core/api/usuario.service';
import { AuthService } from '../../../core/auth/auth.service';
import { filaDeEnvios } from '../../../core/envio/fila-de-envios';
import { Chamado, ChamadoResumo, URGENCIAS, Urgencia } from '../../../core/models/chamado';
import { NotificacaoService } from '../../../core/notificacao/notificacao.service';
import { listaDeApoio } from '../../../shared/carregamento';
import { AreaDeAnexos } from '../../../shared/componentes/area-de-anexos';
import { ErroCampo } from '../../../shared/formularios/erro-campo';
import { aplicarErrosDoServidor } from '../../../shared/formularios/erros-servidor';
import { RotuloUrgenciaPipe } from '../../../shared/rotulos';
import { SeletorResponsavel } from '../seletor-responsavel';

@Component({
  selector: 'app-novo-chamado',
  imports: [ReactiveFormsModule, RouterLink, ErroCampo, RotuloUrgenciaPipe, SeletorResponsavel, AreaDeAnexos],
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
  /** Anexos da abertura: escolhidos antes e enviados logo depois de o chamado ser criado. */
  protected readonly envios = filaDeEnvios();
  protected readonly criado = signal<Chamado | null>(null);

  protected readonly formulario = inject(NonNullableFormBuilder).group({
    projetoId: ['', Validators.required],
    titulo: ['', [Validators.required, Validators.maxLength(200)]],
    descricao: ['', [Validators.required, Validators.maxLength(20000)]],
    urgencia: ['MEDIA' as Urgencia, Validators.required],
    responsavelId: [''],
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

  constructor() {
    // Com o chamado criado e todos os anexos enviados, segue para o detalhe.
    effect(() => {
      const chamado = this.criado();
      if (chamado && this.envios.prontos()) {
        void this.router.navigate(['/chamados', chamado.id]);
      }
    });
  }

  ngOnInit(): void {
    const projetoId = this.projetoId();
    if (projetoId) {
      this.formulario.controls.projetoId.setValue(projetoId);
    }
  }

  protected salvar(): void {
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
        responsavelId: valor.responsavelId ? Number(valor.responsavelId) : null,
        posicao: valor.posicao ? Number(valor.posicao) : null,
      })
      .subscribe({
        next: (criado) => {
          this.notificacao.sucesso('Chamado criado.');
          this.formulario.disable();
          this.criado.set(criado);
          this.envios.iniciarTodos(() => of({ chamadoId: criado.id, acompanhamentoId: null }));
        },
        error: (erro: unknown) => {
          if (!aplicarErrosDoServidor(this.formulario, erro)) {
            this.notificacao.erro(erro);
          }
          this.salvando.set(false);
        },
      });
  }

  private carregarFila(projetoId: number) {
    this.formulario.controls.posicao.setValue('');
    return this.chamados.listar({ projetoId, ordem: 'POSICAO' }, { tamanho: TAMANHO_MAXIMO }).pipe(
      map((pagina) => pagina.itens),
      catchError(() => of<ChamadoResumo[]>([])),
    );
  }
}
