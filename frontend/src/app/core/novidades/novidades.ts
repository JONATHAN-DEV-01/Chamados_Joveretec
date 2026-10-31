/**
 * "Novidades da plataforma", em versões. Para anunciar uma atualização, acrescente uma versão
 * nova (número maior) no fim da lista e publique: o pop-up aparece uma vez para cada pessoa no
 * próximo acesso. Quem já viu fica registrado no banco (`usuario.novidades_vistas_versao`).
 */
export interface Novidade {
  titulo: string;
  texto: string;
  /** Atalho opcional para a tela nova. */
  link?: { rota: string; rotulo: string };
}

export interface VersaoDeNovidades {
  versao: number;
  /** AAAA-MM-DD */
  data: string;
  itens: Novidade[];
}

export const NOVIDADES: readonly VersaoDeNovidades[] = [
  {
    versao: 1,
    data: '2026-10-31',
    itens: [
      {
        titulo: 'Mais de um responsável por chamado',
        texto: 'Agora dá para atribuir o mesmo chamado a várias pessoas, e ele aparece para cada uma delas nos filtros e no Dashboard.',
      },
      {
        titulo: 'Fila do projeto mais enxuta, com filtros',
        texto: 'A fila mostra só os chamados abertos e em andamento e ganhou busca e filtros de responsável, urgência e status.',
        link: { rota: '/fila', rotulo: 'Abrir a fila' },
      },
      {
        titulo: 'Imagens e arquivos direto no texto',
        texto: 'Na descrição e nas mensagens, cole um print com Ctrl+V, arraste um arquivo ou use o clipe; imagens aparecem como miniatura.',
      },
      {
        titulo: 'Tempo gasto por chamado',
        texto: 'O Dashboard e a página de cada chamado mostram há quanto tempo ele está aberto e quanto tempo ficou em andamento.',
        link: { rota: '/dashboard', rotulo: 'Ver no Dashboard' },
      },
      {
        titulo: 'Sua paleta de cores',
        texto: 'Em "Meu perfil" você escolhe as cores da plataforma só para você, sem mudar as dos colegas.',
        link: { rota: '/perfil', rotulo: 'Ir para Meu perfil' },
      },
      {
        titulo: 'Plataforma mais rápida',
        texto: 'As telas que você já abriu aparecem na hora quando você volta a elas, e os carregamentos ficaram mais leves.',
      },
    ],
  },
];

export const VERSAO_ATUAL_DAS_NOVIDADES = Math.max(...NOVIDADES.map((v) => v.versao));

export function novidadesDaVersao(versao = VERSAO_ATUAL_DAS_NOVIDADES): VersaoDeNovidades {
  return NOVIDADES.find((v) => v.versao === versao) ?? NOVIDADES[NOVIDADES.length - 1];
}
