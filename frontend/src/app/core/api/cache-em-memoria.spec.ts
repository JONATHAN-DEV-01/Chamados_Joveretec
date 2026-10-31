import { Subject, firstValueFrom, of, throwError, toArray } from 'rxjs';
import { CacheEmMemoria } from './cache-em-memoria';

describe('CacheEmMemoria', () => {
  it('na primeira vez só busca; depois reemite o guardado e o atualizado', async () => {
    const cache = new CacheEmMemoria<string[]>();
    expect(await firstValueFrom(cache.comAtualizacao('a', of(['v1'])).pipe(toArray()))).toEqual([['v1']]);
    expect(await firstValueFrom(cache.comAtualizacao('a', of(['v2'])).pipe(toArray()))).toEqual([['v1'], ['v2']]);
    expect(cache.obter('a')).toEqual(['v2']);
  });

  it('mostra o guardado na hora, antes de a atualização responder', () => {
    const cache = new CacheEmMemoria<number>();
    cache.guardar('a', 1);
    const resposta = new Subject<number>();
    const recebidos: number[] = [];
    cache.comAtualizacao('a', resposta).subscribe((v) => recebidos.push(v));
    expect(recebidos).toEqual([1]);
    resposta.next(2);
    expect(recebidos).toEqual([1, 2]);
  });

  it('se a atualização falhar, fica com o guardado (sem erro); sem guardado, o erro passa', async () => {
    const cache = new CacheEmMemoria<number>();
    await expect(firstValueFrom(cache.comAtualizacao('a', throwError(() => new Error('rede'))))).rejects.toThrow('rede');
    cache.guardar('a', 1);
    expect(await firstValueFrom(cache.comAtualizacao('a', throwError(() => new Error('rede'))).pipe(toArray()))).toEqual([1]);
  });

  it('descarta o mais antigo ao passar do limite e limpa tudo', () => {
    const cache = new CacheEmMemoria<number>(2);
    cache.guardar('a', 1);
    cache.guardar('b', 2);
    cache.guardar('a', 3); // "a" passa a ser o mais recente
    cache.guardar('c', 4);
    expect(cache.obter('b')).toBeUndefined();
    expect(cache.obter('a')).toBe(3);
    cache.limpar();
    expect(cache.obter('c')).toBeUndefined();
  });
});
