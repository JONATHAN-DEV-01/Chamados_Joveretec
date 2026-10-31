import { ChangeDetectionStrategy, Component, ElementRef, effect, inject, input, signal, untracked, viewChild } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ConfiguracaoService } from '../../core/api/configuracao.service';
import { EnvioDeArquivo } from '../../core/envio/envio-de-arquivo';
import { FilaDeEnvios } from '../../core/envio/fila-de-envios';
import { NotificacaoService } from '../../core/notificacao/notificacao.service';
import { buscaDoMarcador, marcadorDeEnvio, referenciaDoAnexo } from '../anexos-no-texto';
import { tamanhoLegivel } from '../formatos';
import { ListaDeEnvios } from './lista-de-envios';

/** "image.png" genérico de print colado vira um nome com data e hora, para dar para achar depois. */
function nomeDoArquivo(arquivo: File, agora = new Date()): File {
  if (!/^image\.(png|jpe?g|gif|webp)$/i.test(arquivo.name)) {
    return arquivo;
  }
  const doisDigitos = (n: number) => String(n).padStart(2, '0');
  const carimbo =
    `${agora.getFullYear()}${doisDigitos(agora.getMonth() + 1)}${doisDigitos(agora.getDate())}-` +
    `${doisDigitos(agora.getHours())}${doisDigitos(agora.getMinutes())}${doisDigitos(agora.getSeconds())}`;
  const extensao = arquivo.name.split('.').pop()!.toLowerCase();
  return new File([arquivo], `print-${carimbo}.${extensao}`, { type: arquivo.type, lastModified: arquivo.lastModified });
}

/**
 * Campo de texto (Markdown) que aceita anexos: colar (Ctrl+V), arrastar e soltar ou o botão de
 * clipe. Cada arquivo sobe pela {@link FilaDeEnvios} do formulário; enquanto sobe, o texto mostra
 * um marcador no ponto do cursor, trocado pela referência (`![nome](anexo:12)`) quando termina.
 */
@Component({
  selector: 'app-editor-com-anexos',
  imports: [ReactiveFormsModule, ListaDeEnvios],
  templateUrl: './editor-com-anexos.html',
  styleUrl: './editor-com-anexos.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EditorComAnexos {
  readonly controle = input.required<FormControl<string>>();
  readonly fila = input.required<FilaDeEnvios>();
  readonly idCampo = input('texto');
  readonly linhas = input(6);
  readonly placeholder = input('');
  readonly desabilitado = input(false);

  private readonly configuracao = inject(ConfiguracaoService);
  private readonly notificacao = inject(NotificacaoService);
  private readonly campo = viewChild.required<ElementRef<HTMLTextAreaElement>>('campo');

  protected readonly arrastando = signal(false);
  /** Envio → chave do marcador no texto (some quando o marcador vira referência ou é removido). */
  private readonly marcadores = new Map<EnvioDeArquivo, number>();
  private proximaChave = 0;

  constructor() {
    // Quando um envio termina, o marcador dele vira a referência definitiva.
    effect(() => {
      for (const envio of this.fila().envios()) {
        const anexo = envio.anexo();
        if (envio.concluido() && anexo && this.marcadores.has(envio)) {
          const chave = this.marcadores.get(envio)!;
          this.marcadores.delete(envio);
          untracked(() => this.trocar(chave, referenciaDoAnexo(anexo)));
        }
      }
    });
  }

  protected colar(evento: ClipboardEvent): void {
    const arquivos = evento.clipboardData?.files;
    if (arquivos?.length && !this.desabilitado()) {
      evento.preventDefault();
      this.adicionar(Array.from(arquivos));
    }
  }

  protected sobre(evento: DragEvent): void {
    if (evento.dataTransfer?.types.includes('Files')) {
      evento.preventDefault();
      this.arrastando.set(!this.desabilitado());
    }
  }

  protected soltar(evento: DragEvent): void {
    const arquivos = evento.dataTransfer?.files;
    this.arrastando.set(false);
    if (arquivos?.length) {
      evento.preventDefault();
      if (!this.desabilitado()) {
        this.adicionar(Array.from(arquivos));
      }
    }
  }

  protected selecionar(evento: Event): void {
    const entrada = evento.target as HTMLInputElement;
    if (entrada.files?.length) {
      this.adicionar(Array.from(entrada.files));
    }
    entrada.value = ''; // permite escolher o mesmo arquivo de novo
  }

  /** Remove o envio da fila e o marcador ou a referência dele no texto. */
  protected remover(envio: EnvioDeArquivo): void {
    const chave = this.marcadores.get(envio);
    this.marcadores.delete(envio);
    if (chave !== undefined) {
      this.trocar(chave, '');
    } else if (envio.anexo()) {
      this.trocarTexto(referenciaDoAnexo(envio.anexo()!), '');
    }
    this.fila().remover(envio);
  }

  private adicionar(arquivos: File[]): void {
    const aceitos = arquivos.filter((arquivo) => this.dentroDosLimites(arquivo)).map((a) => nomeDoArquivo(a));
    if (!aceitos.length) {
      return;
    }
    const chaves = aceitos.map(() => ++this.proximaChave);
    this.inserirNoCursor(aceitos.map((arquivo, i) => marcadorDeEnvio(chaves[i], arquivo.name)).join('\n'));
    this.fila()
      .adicionar(aceitos)
      .forEach((envio, i) => this.marcadores.set(envio, chaves[i]));
  }

  private dentroDosLimites(arquivo: File): boolean {
    const { tamanhoMaximoBytes, extensoesBloqueadas } = this.configuracao.atual().anexos;
    const extensao = arquivo.name.includes('.') ? arquivo.name.split('.').pop()!.toLowerCase() : '';
    if (extensoesBloqueadas.includes(extensao)) {
      this.notificacao.erro(`"${arquivo.name}" não foi anexado: arquivos .${extensao} não são permitidos.`);
      return false;
    }
    if (arquivo.size > tamanhoMaximoBytes) {
      this.notificacao.erro(
        `"${arquivo.name}" não foi anexado: tem ${tamanhoLegivel(arquivo.size)} e o limite é ${tamanhoLegivel(tamanhoMaximoBytes)}.`,
      );
      return false;
    }
    return true;
  }

  /** Insere em linha própria no ponto do cursor (ou no fim) e deixa o cursor logo depois. */
  private inserirNoCursor(trecho: string): void {
    const campo = this.campo().nativeElement;
    const valor = this.controle().value;
    const focado = document.activeElement === campo;
    const inicio = focado ? campo.selectionStart : valor.length;
    const fim = focado ? campo.selectionEnd : valor.length;
    const antes = valor.slice(0, inicio);
    const depois = valor.slice(fim);
    const inserido = (antes && !antes.endsWith('\n') ? '\n' : '') + trecho + (depois.startsWith('\n') ? '' : '\n');
    this.definirValor(antes + inserido + depois, inicio + inserido.length);
  }

  private trocar(chave: number, novo: string): void {
    const valor = this.controle().value;
    const encontrado = buscaDoMarcador(chave).exec(valor);
    if (encontrado) {
      this.substituirTrecho(encontrado.index, encontrado[0].length, novo);
    }
  }

  private trocarTexto(antigo: string, novo: string): void {
    const posicao = this.controle().value.indexOf(antigo);
    if (posicao >= 0) {
      this.substituirTrecho(posicao, antigo.length, novo);
    }
  }

  /** Troca um trecho mantendo o cursor de quem continua digitando no mesmo lugar do texto. */
  private substituirTrecho(posicao: number, tamanho: number, novo: string): void {
    const campo = this.campo().nativeElement;
    const valor = this.controle().value;
    // Sem o marcador, uma linha vazia sobraria no lugar dele.
    const removendoLinha = !novo && valor[posicao + tamanho] === '\n';
    const tamanhoReal = tamanho + (removendoLinha ? 1 : 0);
    const cursor = campo.selectionStart;
    const delta = novo.length - tamanhoReal;
    const novoCursor = cursor > posicao ? Math.max(posicao, cursor + delta) : cursor;
    this.definirValor(valor.slice(0, posicao) + novo + valor.slice(posicao + tamanhoReal), novoCursor);
  }

  private definirValor(valor: string, cursor: number): void {
    const controle = this.controle();
    const campo = this.campo().nativeElement;
    const focado = document.activeElement === campo;
    controle.setValue(valor);
    controle.markAsDirty();
    if (focado) {
      campo.setSelectionRange(cursor, cursor);
    }
  }
}
