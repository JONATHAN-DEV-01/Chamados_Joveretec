import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { FormControl } from '@angular/forms';
import { startWith, switchMap } from 'rxjs';
import { Referencia } from '../../core/models/comum';
import { Usuario } from '../../core/models/usuario';
import { Avatar } from '../../shared/componentes/avatar';

interface Opcao {
  id: number;
  nome: string;
  /** Texto exibido na lista ("Eu mesmo (Ana)"). */
  rotulo: string;
}

/** Ignora acentos e maiúsculas na busca ("joao" encontra "João"). */
function normalizar(texto: string): string {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

/**
 * Seleção de vários responsáveis: chips removíveis + campo de busca com lista de sugestões
 * (combobox). Nenhum selecionado = sem responsável. O valor do controle é a lista de ids.
 */
@Component({
  selector: 'app-seletor-responsaveis',
  imports: [Avatar],
  template: `
    <div class="caixa" [class.desabilitada]="controle().disabled" (click)="focarBusca(busca)">
      @for (pessoa of selecionados(); track pessoa.id) {
        <span class="chip selecionado">
          <app-avatar [nome]="pessoa.nome" pequeno />
          <span>{{ pessoa.rotulo }}</span>
          <button
            type="button"
            class="remover"
            [disabled]="controle().disabled"
            (click)="remover(pessoa.id); $event.stopPropagation()"
            [attr.aria-label]="'Remover ' + pessoa.nome"
          >
            ×
          </button>
        </span>
      }
      <input
        #busca
        [id]="idCampo()"
        type="text"
        role="combobox"
        autocomplete="off"
        aria-autocomplete="list"
        [attr.aria-expanded]="aberta()"
        [attr.aria-controls]="idCampo() + '-opcoes'"
        [attr.aria-activedescendant]="aberta() && sugestoes().length ? idCampo() + '-opcao-' + ativa() : null"
        [placeholder]="selecionados().length ? 'Adicionar…' : 'Sem responsável — buscar pessoa…'"
        [value]="termo()"
        [disabled]="controle().disabled"
        (input)="digitar(busca.value)"
        (focus)="aberta.set(true)"
        (blur)="fechar()"
        (keydown)="teclar($event)"
      />
    </div>
    @if (aberta() && !controle().disabled) {
      <ul class="opcoes" role="listbox" [id]="idCampo() + '-opcoes'" aria-label="Pessoas">
        @for (opcao of sugestoes(); track opcao.id; let i = $index) {
          <li
            role="option"
            [id]="idCampo() + '-opcao-' + i"
            [class.ativa]="i === ativa()"
            [attr.aria-selected]="i === ativa()"
            (mousedown)="$event.preventDefault()"
            (click)="adicionar(opcao.id)"
          >
            <app-avatar [nome]="opcao.nome" pequeno />
            {{ opcao.rotulo }}
          </li>
        } @empty {
          <li class="vazio-opcoes">
            {{ termo() ? 'Ninguém encontrado.' : 'Todas as pessoas ativas já foram adicionadas.' }}
          </li>
        }
      </ul>
    }
  `,
  styles: `
    :host { position: relative; display: block; }
    .caixa {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 6px;
      min-height: 38px;
      padding: 4px 6px;
      border: 1px solid var(--cor-borda);
      border-radius: var(--raio);
      background: var(--cor-fundo);
      cursor: text;
    }
    .caixa:focus-within { outline: 2px solid var(--cor-destaque); outline-offset: 1px; }
    .caixa.desabilitada { opacity: 0.6; cursor: not-allowed; }
    .caixa input {
      flex: 1 1 140px;
      min-width: 120px;
      min-height: 28px;
      padding: 2px 4px;
      border: 0;
      background: transparent;
      color: var(--cor-texto);
      font: inherit;
      outline: none;
    }
    .selecionado {
      gap: 6px;
      min-height: 30px;
      padding: 0 4px 0 2px;
      border-color: var(--cor-destaque);
      background: var(--cor-destaque-suave);
      cursor: default;
    }
    .remover {
      display: inline-grid;
      place-items: center;
      width: 22px;
      height: 22px;
      padding: 0;
      border: 0;
      border-radius: 50%;
      background: transparent;
      color: var(--cor-texto);
      font-size: 1rem;
      line-height: 1;
      cursor: pointer;
    }
    .remover:hover:not(:disabled), .remover:focus-visible { background: var(--cor-painel-forte); }
    .opcoes {
      position: absolute;
      z-index: 20;
      top: calc(100% + 4px);
      right: 0;
      left: 0;
      max-height: 240px;
      margin: 0;
      padding: 4px;
      overflow-y: auto;
      list-style: none;
      border: 1px solid var(--cor-borda);
      border-radius: var(--raio);
      background: var(--cor-painel-forte);
      box-shadow: var(--sombra);
    }
    .opcoes li {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 8px;
      border-radius: calc(var(--raio) - 2px);
      cursor: pointer;
    }
    .opcoes li.ativa { background: var(--cor-destaque-suave); }
    .opcoes li.vazio-opcoes { color: var(--cor-texto-suave); cursor: default; }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SeletorResponsaveis {
  readonly controle = input.required<FormControl<number[]>>();
  readonly idCampo = input('responsaveis');
  readonly usuarios = input.required<Usuario[]>();
  readonly eu = input<Usuario | null>(null);
  /** Responsáveis atuais (edição): quem estiver inativo continua aparecendo e pode ser removido. */
  readonly atuais = input<Referencia[]>([]);

  protected readonly termo = signal('');
  protected readonly aberta = signal(false);
  protected readonly ativa = signal(0);

  // O valor do controle vira signal para os computed reagirem a setValue/reset feitos pela página.
  private readonly ids = toSignal(
    toObservable(this.controle).pipe(switchMap((c) => c.valueChanges.pipe(startWith(c.value)))),
    { initialValue: [] as number[] },
  );

  /** Todas as pessoas que podem aparecer: "eu" primeiro, depois ativos e, por fim, atuais inativos. */
  private readonly opcoes = computed<Opcao[]>(() => {
    const eu = this.eu();
    const lista: Opcao[] = eu ? [{ id: eu.id, nome: eu.nome, rotulo: `Eu mesmo (${eu.nome})` }] : [];
    for (const usuario of this.usuarios()) {
      if (usuario.id !== eu?.id) {
        lista.push({ id: usuario.id, nome: usuario.nome, rotulo: usuario.nome });
      }
    }
    for (const atual of this.atuais()) {
      if (!lista.some((o) => o.id === atual.id)) {
        lista.push({ id: atual.id, nome: atual.nome, rotulo: `${atual.nome} (inativo)` });
      }
    }
    return lista;
  });

  protected readonly selecionados = computed(() =>
    this.ids()
      .map((id) => this.opcoes().find((o) => o.id === id))
      .filter((o): o is Opcao => !!o),
  );

  /** Sugestões: quem ainda não foi escolhido e combina com a busca (inativos não entram de novo). */
  protected readonly sugestoes = computed(() => {
    const termo = normalizar(this.termo().trim());
    const escolhidos = new Set(this.ids());
    const inativos = new Set(this.atuais().map((a) => a.id).filter((id) => !this.estaAtivo(id)));
    return this.opcoes().filter(
      (o) => !escolhidos.has(o.id) && !inativos.has(o.id) && (!termo || normalizar(o.rotulo).includes(termo)),
    );
  });

  protected focarBusca(campo: HTMLInputElement): void {
    if (!this.controle().disabled) {
      campo.focus();
    }
  }

  protected digitar(texto: string): void {
    this.termo.set(texto);
    this.ativa.set(0);
    this.aberta.set(true);
  }

  protected adicionar(id: number): void {
    const controle = this.controle();
    if (!controle.value.includes(id)) {
      controle.setValue([...controle.value, id]);
      controle.markAsDirty();
    }
    this.termo.set('');
    this.ativa.set(0);
  }

  protected remover(id: number): void {
    const controle = this.controle();
    controle.setValue(controle.value.filter((atual) => atual !== id));
    controle.markAsDirty();
  }

  protected fechar(): void {
    this.aberta.set(false);
    this.controle().markAsTouched();
  }

  protected teclar(evento: KeyboardEvent): void {
    const total = this.sugestoes().length;
    switch (evento.key) {
      case 'ArrowDown':
        evento.preventDefault();
        this.aberta.set(true);
        this.ativa.update((i) => (total ? (i + 1) % total : 0));
        break;
      case 'ArrowUp':
        evento.preventDefault();
        this.ativa.update((i) => (total ? (i - 1 + total) % total : 0));
        break;
      case 'Enter':
        // Enter escolhe a sugestão em vez de enviar o formulário.
        if (this.aberta() && total) {
          evento.preventDefault();
          this.adicionar(this.sugestoes()[Math.min(this.ativa(), total - 1)].id);
        }
        break;
      case 'Escape':
        this.aberta.set(false);
        break;
      case 'Backspace':
        if (!this.termo() && this.ids().length) {
          this.remover(this.ids()[this.ids().length - 1]);
        }
        break;
    }
  }

  private estaAtivo(id: number): boolean {
    return id === this.eu()?.id || this.usuarios().some((u) => u.id === id);
  }
}
