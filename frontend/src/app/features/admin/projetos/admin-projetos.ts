import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Observable } from 'rxjs';
import { ProjetoService } from '../../../core/api/projeto.service';
import { Projeto } from '../../../core/models/projeto';
import { NotificacaoService } from '../../../core/notificacao/notificacao.service';
import { buscaComAtraso } from '../../../shared/busca-com-atraso';
import { carregarComParametros } from '../../../shared/carregamento';
import { BotaoConfirmar } from '../../../shared/componentes/botao-confirmar';
import { Paginacao } from '../../../shared/componentes/paginacao';
import { ErroCampo } from '../../../shared/formularios/erro-campo';
import { aplicarErrosDoServidor } from '../../../shared/formularios/erros-servidor';

@Component({
  selector: 'app-admin-projetos',
  imports: [ReactiveFormsModule, DatePipe, ErroCampo, Paginacao, BotaoConfirmar],
  templateUrl: './admin-projetos.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminProjetos {
  private readonly projetos = inject(ProjetoService);
  private readonly notificacao = inject(NotificacaoService);

  protected readonly campoBusca = new FormControl('', { nonNullable: true });
  protected readonly incluirArquivados = signal(false);
  protected readonly pagina = signal(0);
  private readonly busca = buscaComAtraso(this.campoBusca);

  private readonly consulta = computed(() => ({
    filtro: { busca: this.busca(), incluirArquivados: this.incluirArquivados() },
    pagina: this.pagina(),
  }));
  protected readonly lista = carregarComParametros(this.consulta, ({ filtro, pagina }) =>
    this.projetos.listar(filtro, { pagina }),
  );

  protected readonly emEdicao = signal<Projeto | null>(null);
  protected readonly salvando = signal(false);
  protected readonly formulario = inject(NonNullableFormBuilder).group({
    nome: ['', [Validators.required, Validators.maxLength(120)]],
    descricao: ['', Validators.maxLength(5000)],
  });

  constructor() {
    this.campoBusca.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => this.pagina.set(0));
  }

  protected alternarArquivados(evento: Event): void {
    this.incluirArquivados.set((evento.target as HTMLInputElement).checked);
    this.pagina.set(0);
  }

  protected editar(projeto: Projeto): void {
    this.emEdicao.set(projeto);
    this.formulario.reset({ nome: projeto.nome, descricao: projeto.descricao ?? '' });
  }

  protected cancelarEdicao(): void {
    this.emEdicao.set(null);
    this.formulario.reset();
  }

  protected salvar(): void {
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }
    const { nome, descricao } = this.formulario.getRawValue();
    const requisicao = { nome: nome.trim(), descricao: descricao.trim() || null };
    const projeto = this.emEdicao();
    const operacao = projeto ? this.projetos.editar(projeto.id, requisicao) : this.projetos.criar(requisicao);
    this.salvando.set(true);
    operacao.subscribe({
      next: (salvo) => {
        this.notificacao.sucesso(projeto ? 'Projeto atualizado.' : `Projeto "${salvo.nome}" criado.`);
        this.cancelarEdicao();
        this.salvando.set(false);
        this.lista.recarregar();
      },
      error: (erro: unknown) => {
        if (!aplicarErrosDoServidor(this.formulario, erro)) {
          this.notificacao.erro(erro);
        }
        this.salvando.set(false);
      },
    });
  }

  protected arquivar(projeto: Projeto): void {
    this.executar(this.projetos.arquivar(projeto.id), `Projeto "${projeto.nome}" arquivado.`);
  }

  protected desarquivar(projeto: Projeto): void {
    this.executar(this.projetos.desarquivar(projeto.id), `Projeto "${projeto.nome}" reativado.`);
  }

  private executar(operacao: Observable<Projeto>, sucesso: string): void {
    operacao.subscribe({
      next: () => {
        this.notificacao.sucesso(sucesso);
        this.lista.recarregar();
      },
      error: (erro: unknown) => this.notificacao.erro(erro),
    });
  }
}
