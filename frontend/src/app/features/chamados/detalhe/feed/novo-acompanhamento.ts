import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { FeedService } from '../../../../core/api/feed.service';
import { Acompanhamento, TipoAcompanhamento } from '../../../../core/models/feed';
import { NotificacaoService } from '../../../../core/notificacao/notificacao.service';
import { ErroCampo } from '../../../../shared/formularios/erro-campo';
import { aplicarErrosDoServidor } from '../../../../shared/formularios/erros-servidor';

/** Caixa de novo acompanhamento, fixa no fim do feed. Ctrl+Enter publica. */
@Component({
  selector: 'app-novo-acompanhamento',
  imports: [ReactiveFormsModule, ErroCampo],
  templateUrl: './novo-acompanhamento.html',
  styleUrl: './feed.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NovoAcompanhamento {
  readonly chamadoId = input.required<number>();
  /** Status atual: "concluir o chamado" só é oferecido se ainda não estiver concluído. */
  readonly chamadoConcluido = input(false);
  readonly publicado = output<Acompanhamento>();

  private readonly feed = inject(FeedService);
  private readonly notificacao = inject(NotificacaoService);
  protected readonly publicando = signal(false);

  protected readonly formulario = inject(NonNullableFormBuilder).group({
    texto: ['', [Validators.required, Validators.maxLength(50000)]],
    tipo: ['ACOMPANHAMENTO' as TipoAcompanhamento],
    tempoGastoMinutos: [null as number | null, [Validators.min(0), Validators.max(100000)]],
    concluirChamado: [true],
  });

  private readonly tipo = toSignal(this.formulario.controls.tipo.valueChanges, {
    initialValue: this.formulario.controls.tipo.value,
  });
  protected readonly ofereceConcluir = computed(() => this.tipo() === 'SOLUCAO' && !this.chamadoConcluido());

  protected publicar(): void {
    if (this.publicando()) {
      return;
    }
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }
    const valor = this.formulario.getRawValue();
    this.publicando.set(true);
    this.feed
      .publicar(this.chamadoId(), {
        texto: valor.texto,
        tipo: valor.tipo,
        tempoGastoMinutos: valor.tempoGastoMinutos || null,
        concluirChamado: this.ofereceConcluir() && valor.concluirChamado,
        rascunhoId: null,
      })
      .subscribe({
        next: (acompanhamento) => {
          this.publicando.set(false);
          this.formulario.reset();
          this.publicado.emit(acompanhamento);
        },
        error: (erro: unknown) => {
          this.publicando.set(false);
          if (!aplicarErrosDoServidor(this.formulario, erro)) {
            this.notificacao.erro(erro);
          }
        },
      });
  }

  protected atalho(evento: KeyboardEvent): void {
    if (evento.key === 'Enter' && (evento.ctrlKey || evento.metaKey)) {
      evento.preventDefault();
      this.publicar();
    }
  }
}
