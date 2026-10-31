import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  SecurityContext,
  effect,
  inject,
  input,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { AnexoService } from '../../core/api/anexo.service';
import { Anexo } from '../../core/models/feed';
import { NotificacaoService } from '../../core/notificacao/notificacao.service';
import { ehImagem, iconeDoArquivo, tamanhoLegivel } from '../formatos';
import { renderizarMarkdown } from '../markdown';

interface Ampliada {
  url: string;
  nome: string;
}

/**
 * Texto em Markdown com os anexos citados nele: imagens viram miniaturas (clique amplia) e os
 * demais arquivos viram um link com nome e tamanho (clique baixa). O HTML passa pelo sanitizador
 * do Angular; os anexos são completados depois, só com APIs de DOM (sem HTML vindo do usuário).
 */
@Component({
  selector: 'app-conteudo-com-anexos',
  template: `
    <div #conteudo class="texto-markdown" (click)="clicar($event)"></div>
    @if (ampliada(); as imagem) {
      <div class="ampliada" role="dialog" aria-modal="true" [attr.aria-label]="imagem.nome" (click)="ampliada.set(null)">
        <img [src]="imagem.url" [alt]="imagem.nome" (click)="$event.stopPropagation()" />
        <div class="legenda" (click)="$event.stopPropagation()">
          <span>{{ imagem.nome }}</span>
          <a class="btn btn-pequeno" [href]="imagem.url" target="_blank" rel="noopener noreferrer">Abrir original</a>
          <button #fechar type="button" class="btn btn-pequeno" (click)="ampliada.set(null)">Fechar</button>
        </div>
      </div>
    }
  `,
  styleUrl: './conteudo-com-anexos.css',
  host: { '(document:keydown.escape)': 'ampliada.set(null)' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConteudoComAnexos {
  readonly texto = input.required<string>();
  /** Metadados dos anexos do item (nome, tipo e tamanho); os citados no texto aparecem no lugar. */
  readonly anexos = input<Anexo[]>([]);

  private readonly sanitizador = inject(DomSanitizer);
  private readonly servico = inject(AnexoService);
  private readonly notificacao = inject(NotificacaoService);
  private readonly conteudo = viewChild.required<ElementRef<HTMLElement>>('conteudo');
  private readonly fechar = viewChild<ElementRef<HTMLButtonElement>>('fechar');

  protected readonly ampliada = signal<Ampliada | null>(null);

  constructor() {
    effect(() => {
      const elemento = this.conteudo().nativeElement;
      const texto = this.texto();
      const anexos = this.anexos();
      untracked(() => this.renderizar(elemento, texto, anexos));
    });
    // Foco no "Fechar" ao ampliar (teclado e leitor de tela).
    effect(() => this.fechar()?.nativeElement.focus());
  }

  private renderizar(elemento: HTMLElement, texto: string, anexos: Anexo[]): void {
    elemento.innerHTML = this.sanitizador.sanitize(SecurityContext.HTML, renderizarMarkdown(texto)) ?? '';
    const porId = new Map(anexos.map((anexo) => [anexo.id, anexo]));
    const imagens = new Map<number, HTMLImageElement>();

    for (const link of Array.from(elemento.querySelectorAll<HTMLAnchorElement>('a.ref-anexo'))) {
      const anexo = porId.get(idDoLink(link));
      if (!anexo) {
        const indisponivel = document.createElement('span');
        indisponivel.className = 'ref-indisponivel';
        indisponivel.textContent = `${link.textContent} (anexo indisponível)`;
        link.replaceWith(indisponivel);
        continue;
      }
      link.textContent = '';
      if (ehImagem(anexo.tipoMime)) {
        link.classList.add('ref-imagem');
        link.title = `Ampliar ${anexo.nome}`;
        const imagem = document.createElement('img');
        imagem.alt = anexo.nome;
        imagem.loading = 'lazy';
        imagem.decoding = 'async';
        link.append(imagem);
        imagens.set(anexo.id, imagem);
      } else {
        link.classList.remove('ref-imagem');
        link.classList.add('ref-arquivo');
        link.title = `Baixar ${anexo.nome}`;
        const icone = document.createElement('span');
        icone.setAttribute('aria-hidden', 'true');
        icone.textContent = iconeDoArquivo(anexo.tipoMime, anexo.nome);
        const nome = document.createElement('span');
        nome.className = 'nome';
        nome.textContent = anexo.nome;
        const tamanho = document.createElement('span');
        tamanho.className = 'tamanho';
        tamanho.textContent = tamanhoLegivel(anexo.tamanhoBytes);
        link.append(icone, nome, tamanho);
      }
    }

    if (imagens.size) {
      // Uma chamada para todas as miniaturas do texto (links assinados de curta duração).
      this.servico.links([...imagens.keys()]).subscribe({
        next: (urls) => imagens.forEach((imagem, id) => urls.has(id) && (imagem.src = urls.get(id)!)),
        error: () => undefined, // sem miniatura: o nome continua no alt e o clique ainda abre
      });
    }
  }

  protected clicar(evento: MouseEvent): void {
    const link = (evento.target as HTMLElement).closest<HTMLAnchorElement>('a.ref-anexo');
    if (!link) {
      return;
    }
    evento.preventDefault();
    const anexo = this.anexos().find((a) => a.id === idDoLink(link));
    if (!anexo) {
      return;
    }
    // Link novo a cada clique: os assinados expiram em poucos minutos.
    const imagem = ehImagem(anexo.tipoMime);
    this.servico.linkDeDownload(anexo.id, imagem).subscribe({
      next: (url) => (imagem ? this.ampliada.set({ url, nome: anexo.nome }) : window.location.assign(url)),
      error: (erro: unknown) => this.notificacao.erro(erro),
    });
  }
}

function idDoLink(link: HTMLAnchorElement): number {
  return Number(link.getAttribute('href')?.replace('#anexo-', ''));
}
