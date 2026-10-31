import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { FeedService } from '../../../../core/api/feed.service';
import { Acompanhamento, Anexo, TipoAcompanhamento } from '../../../../core/models/feed';
import { NotificacaoService } from '../../../../core/notificacao/notificacao.service';
import { Avatar } from '../../../../shared/componentes/avatar';
import { BotaoConfirmar } from '../../../../shared/componentes/botao-confirmar';
import { DuracaoPipe, TempoRelativoPipe } from '../../../../shared/formatos';
import { ErroCampo } from '../../../../shared/formularios/erro-campo';
import { aplicarErrosDoServidor } from '../../../../shared/formularios/erros-servidor';
import { naoReferenciados } from '../../../../shared/anexos-no-texto';
import { ConteudoComAnexos } from '../../../../shared/componentes/conteudo-com-anexos';
import { ListaAnexos } from './lista-anexos';

/** Card de um acompanhamento no feed, com edição e exclusão para quem tem permissão. */
@Component({
  selector: 'app-card-acompanhamento',
  imports: [ReactiveFormsModule, DatePipe, Avatar, BotaoConfirmar, DuracaoPipe, TempoRelativoPipe, ErroCampo,
    ConteudoComAnexos, ListaAnexos],
  templateUrl: './card-acompanhamento.html',
  styleUrl: './feed.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CardAcompanhamento {
  readonly chamadoId = input.required<number>();
  readonly acompanhamento = input.required<Acompanhamento>();
  readonly atualizado = output<Acompanhamento>();
  readonly excluido = output<void>();
  /** Um anexo foi removido (o feed recarrega para mostrar o evento). */
  readonly anexoRemovido = output<Anexo>();

  private readonly feed = inject(FeedService);
  private readonly notificacao = inject(NotificacaoService);
  protected readonly editando = signal(false);
  /** Os citados no texto aparecem no lugar; o resto (inclusive do modelo antigo) fica na lista. */
  protected readonly anexosForaDoTexto = computed(() =>
    naoReferenciados(this.acompanhamento().texto, this.acompanhamento().anexos),
  );
  protected readonly salvando = signal(false);

  protected readonly formulario = inject(NonNullableFormBuilder).group({
    texto: ['', [Validators.required, Validators.maxLength(50000)]],
    tipo: ['ACOMPANHAMENTO' as TipoAcompanhamento],
    tempoGastoMinutos: [null as number | null, [Validators.min(0), Validators.max(100000)]],
  });

  protected editar(): void {
    const { texto, tipo, tempoGastoMinutos } = this.acompanhamento();
    this.formulario.reset({ texto, tipo, tempoGastoMinutos });
    this.editando.set(true);
  }

  protected salvar(): void {
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }
    const valor = this.formulario.getRawValue();
    this.salvando.set(true);
    this.feed
      .editar(this.chamadoId(), this.acompanhamento().id, {
        texto: valor.texto,
        tipo: valor.tipo,
        tempoGastoMinutos: valor.tempoGastoMinutos || null,
      })
      .subscribe({
        next: (atualizado) => {
          this.salvando.set(false);
          this.editando.set(false);
          this.atualizado.emit(atualizado);
        },
        error: (erro: unknown) => {
          this.salvando.set(false);
          if (!aplicarErrosDoServidor(this.formulario, erro)) {
            this.notificacao.erro(erro);
          }
        },
      });
  }

  protected excluir(): void {
    this.feed.excluir(this.chamadoId(), this.acompanhamento().id).subscribe({
      next: () => {
        this.notificacao.sucesso('Acompanhamento excluído.');
        this.excluido.emit();
      },
      error: (erro: unknown) => this.notificacao.erro(erro),
    });
  }

  /** Ctrl+Enter (ou Cmd+Enter) salva a edição. */
  protected atalho(evento: KeyboardEvent): void {
    if (evento.key === 'Enter' && (evento.ctrlKey || evento.metaKey)) {
      evento.preventDefault();
      this.salvar();
    }
  }
}
