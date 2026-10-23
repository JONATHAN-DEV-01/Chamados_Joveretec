import { ChangeDetectionStrategy, Component, OnInit, inject, input, output, signal } from '@angular/core';
import { AnexoService } from '../../../../core/api/anexo.service';
import { Anexo } from '../../../../core/models/feed';
import { NotificacaoService } from '../../../../core/notificacao/notificacao.service';
import { BotaoConfirmar } from '../../../../shared/componentes/botao-confirmar';
import { TamanhoPipe, ehImagem, iconeDoArquivo } from '../../../../shared/formatos';

/** Anexos de um item do feed: ícone, nome, tamanho, download e pré-visualização de imagens. */
@Component({
  selector: 'app-lista-anexos',
  imports: [TamanhoPipe, BotaoConfirmar],
  template: `
    @if (anexos().length) {
      <ul class="anexos">
        @for (anexo of anexos(); track anexo.id) {
          <li class="anexo">
            @if (previas()[anexo.id]; as url) {
              <button type="button" class="previa" (click)="baixar(anexo)" [attr.aria-label]="'Baixar ' + anexo.nome">
                <img [src]="url" [alt]="anexo.nome" loading="lazy" />
              </button>
            }
            <div class="linha">
              <span class="icone" aria-hidden="true">{{ icone(anexo) }}</span>
              <span class="nome" [title]="anexo.nome">{{ anexo.nome }}</span>
              <span class="texto-suave tamanho">{{ anexo.tamanhoBytes | tamanho }}</span>
              <button type="button" class="btn btn-pequeno" (click)="baixar(anexo)">Baixar</button>
              @if (anexo.podeExcluir) {
                <app-botao-confirmar texto="Excluir" textoConfirmacao="Confirmar exclusão" (confirmado)="excluir(anexo)" />
              }
            </div>
          </li>
        }
      </ul>
    }
  `,
  styles: `
    .anexos { display: flex; flex-direction: column; gap: 6px; margin: 10px 0 0; padding: 0; list-style: none; }
    .anexo { padding: 6px 8px; border: 1px solid var(--cor-borda); border-radius: var(--raio); background: var(--cor-fundo); }
    .linha { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
    .nome { flex: 1 1 160px; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .tamanho { font-variant-numeric: tabular-nums; font-size: 0.85rem; }
    .previa { display: block; margin: 0 0 6px; padding: 0; border: none; background: none; cursor: zoom-in; }
    .previa img { display: block; max-width: min(100%, 360px); max-height: 240px; border-radius: 6px; object-fit: contain; }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ListaAnexos implements OnInit {
  readonly anexos = input.required<Anexo[]>();
  readonly removido = output<Anexo>();

  private readonly servico = inject(AnexoService);
  private readonly notificacao = inject(NotificacaoService);
  /** URLs assinadas (curta duração) para as miniaturas das imagens. */
  protected readonly previas = signal<Record<number, string>>({});

  ngOnInit(): void {
    for (const anexo of this.anexos().filter((a) => ehImagem(a.tipoMime))) {
      this.servico.linkDeDownload(anexo.id, true).subscribe({
        next: (url) => this.previas.update((atuais) => ({ ...atuais, [anexo.id]: url })),
        error: () => undefined, // sem prévia; o botão Baixar continua disponível
      });
    }
  }

  protected icone(anexo: Anexo): string {
    return iconeDoArquivo(anexo.tipoMime, anexo.nome);
  }

  /** O link é gerado na hora (expira em poucos minutos) e baixa como anexo, sem sair da página. */
  protected baixar(anexo: Anexo): void {
    this.servico.linkDeDownload(anexo.id).subscribe({
      next: (url) => window.location.assign(url),
      error: (erro: unknown) => this.notificacao.erro(erro),
    });
  }

  protected excluir(anexo: Anexo): void {
    this.servico.excluir(anexo.id).subscribe({
      next: () => {
        this.notificacao.sucesso(`Anexo "${anexo.nome}" excluído.`);
        this.removido.emit(anexo);
      },
      error: (erro: unknown) => this.notificacao.erro(erro),
    });
  }
}
