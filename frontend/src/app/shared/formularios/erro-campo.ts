import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AbstractControl, ValidationErrors } from '@angular/forms';

const MENSAGENS: Record<string, (erro: ValidationErrors[string]) => string> = {
  required: () => 'Campo obrigatório.',
  email: () => 'Informe um e-mail válido.',
  minlength: (e) => `Use pelo menos ${e.requiredLength} caracteres.`,
  maxlength: (e) => `Use no máximo ${e.requiredLength} caracteres.`,
  min: (e) => `O valor mínimo é ${e.min}.`,
  max: (e) => `O valor máximo é ${e.max}.`,
  pattern: () => 'Formato inválido.',
  servidor: (mensagem) => String(mensagem),
};

/** Exibe a primeira mensagem de erro do campo depois que o usuário interagiu com ele. */
@Component({
  selector: 'app-erro-campo',
  template: `@if (mensagem(); as texto) {<span class="erro" role="alert">{{ texto }}</span>}`,
  styles: `.erro { color: var(--cor-destaque); font-size: 0.8rem; }`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ErroCampo implements OnInit {
  readonly controle = input.required<AbstractControl>();
  /** Mensagem específica para `pattern` (ex.: formato de cor). */
  readonly mensagemFormato = input<string>();

  private readonly destroyRef = inject(DestroyRef);
  private readonly versao = signal(0);

  protected readonly mensagem = computed(() => {
    this.versao();
    const controle = this.controle();
    if (!controle.errors || !(controle.touched || controle.dirty)) {
      return null;
    }
    const [chave, valor] = Object.entries(controle.errors)[0];
    if (chave === 'pattern' && this.mensagemFormato()) {
      return this.mensagemFormato()!;
    }
    return MENSAGENS[chave]?.(valor) ?? 'Valor inválido.';
  });

  ngOnInit(): void {
    // `events` emite em mudanças de valor, status e "touched" (o formulário não é um signal).
    this.controle()
      .events.pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.versao.update((v) => v + 1));
  }
}
