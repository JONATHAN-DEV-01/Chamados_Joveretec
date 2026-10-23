import { duracao, ehImagem, iconeDoArquivo, iniciais, tamanhoLegivel, tempoRelativo } from './formatos';

describe('formatos', () => {
  it('tamanho legível em KB/MB/GB', () => {
    expect(tamanhoLegivel(0)).toBe('0 B');
    expect(tamanhoLegivel(512)).toBe('512 B');
    expect(tamanhoLegivel(1536)).toBe('1,5 KB');
    expect(tamanhoLegivel(25 * 1024 * 1024)).toBe('25 MB');
    expect(tamanhoLegivel(3.4 * 1024 ** 3)).toBe('3,4 GB');
  });

  it('duração em horas e minutos', () => {
    expect(duracao(null)).toBe('0min');
    expect(duracao(45)).toBe('45min');
    expect(duracao(120)).toBe('2h');
    expect(duracao(90)).toBe('1h 30min');
  });

  it('tempo relativo em português', () => {
    const agora = new Date('2026-10-23T12:00:00Z');
    expect(tempoRelativo('2026-10-23T11:59:50Z', agora)).toBe('agora');
    expect(tempoRelativo('2026-10-23T11:55:00Z', agora)).toBe('há 5 minutos');
    expect(tempoRelativo('2026-10-23T09:00:00Z', agora)).toBe('há 3 horas');
    expect(tempoRelativo('2026-10-22T12:00:00Z', agora)).toBe('ontem');
  });

  it('iniciais do nome', () => {
    expect(iniciais('Ana Paula Dev')).toBe('AD');
    expect(iniciais('bruno')).toBe('B');
    expect(iniciais('  ')).toBe('?');
  });

  it('ícone e detecção de imagem pelo tipo', () => {
    expect(ehImagem('image/png')).toBe(true);
    expect(ehImagem('image/svg+xml')).toBe(false);
    expect(iconeDoArquivo('application/pdf', 'a.pdf')).toBe('📕');
    expect(iconeDoArquivo('', 'planilha.xlsx')).toBe('📊');
    expect(iconeDoArquivo('application/octet-stream', 'x.bin')).toBe('📎');
  });
});
