import { EMPTY, Observable, catchError, concat, of, tap } from 'rxjs';

/**
 * Último valor de cada consulta, para reexibir na hora ao voltar a uma tela enquanto a versão
 * nova é buscada em segundo plano ("stale-while-revalidate"). Fica só na memória da aba.
 */
export class CacheEmMemoria<T> {
  private readonly valores = new Map<string, T>();

  constructor(private readonly limite = 20) {}

  /**
   * Emite o valor guardado (se houver) e depois o atualizado. Se a atualização falhar e havia
   * valor guardado, o erro é ignorado e a tela continua com o que já mostrava.
   */
  comAtualizacao(chave: string, fonte: Observable<T>): Observable<T> {
    const atualizar = fonte.pipe(tap((valor) => this.guardar(chave, valor)));
    if (!this.valores.has(chave)) {
      return atualizar;
    }
    return concat(of(this.valores.get(chave)!), atualizar.pipe(catchError(() => EMPTY)));
  }

  obter(chave: string): T | undefined {
    return this.valores.get(chave);
  }

  guardar(chave: string, valor: T): void {
    this.valores.delete(chave); // reinsere no fim: o mais antigo sai primeiro quando passa do limite
    this.valores.set(chave, valor);
    if (this.valores.size > this.limite) {
      this.valores.delete(this.valores.keys().next().value!);
    }
  }

  limpar(): void {
    this.valores.clear();
  }
}
