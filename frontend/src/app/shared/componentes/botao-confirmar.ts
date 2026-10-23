import { ChangeDetectionStrategy, Component, OnDestroy, input, output, signal } from '@angular/core';

const ESPERA_MS = 4000;

/** Ação destrutiva em dois cliques: o primeiro pede confirmação, o segundo executa. */
@Component({
  selector: 'app-botao-confirmar',
  template: `
    <button
      type="button"
      class="btn btn-pequeno"
      [class.btn-perigo]="confirmando()"
      [disabled]="desabilitado()"
      (click)="clicar()"
    >
      {{ confirmando() ? textoConfirmacao() : texto() }}
    </button>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BotaoConfirmar implements OnDestroy {
  readonly texto = input.required<string>();
  readonly textoConfirmacao = input('Confirmar?');
  readonly desabilitado = input(false);
  readonly confirmado = output<void>();

  protected readonly confirmando = signal(false);
  private temporizador?: ReturnType<typeof setTimeout>;

  protected clicar(): void {
    if (this.confirmando()) {
      this.cancelar();
      this.confirmado.emit();
      return;
    }
    this.confirmando.set(true);
    this.temporizador = setTimeout(() => this.confirmando.set(false), ESPERA_MS);
  }

  ngOnDestroy(): void {
    this.cancelar();
  }

  private cancelar(): void {
    clearTimeout(this.temporizador);
    this.confirmando.set(false);
  }
}
