package br.com.joveretec.chamados.chamado.control;

import br.com.joveretec.chamados.chamado.entity.Acompanhamento;
import br.com.joveretec.chamados.chamado.entity.AcompanhamentoRepository;
import br.com.joveretec.chamados.chamado.entity.Anexo;
import br.com.joveretec.chamados.chamado.entity.AnexoRepository;
import br.com.joveretec.chamados.chamado.entity.Chamado;
import br.com.joveretec.chamados.chamado.entity.FeedRepository;
import br.com.joveretec.chamados.chamado.entity.FeedRepository.Ordem;
import br.com.joveretec.chamados.chamado.entity.FeedRepository.Referencia;
import br.com.joveretec.chamados.chamado.entity.FeedRepository.TipoItem;
import br.com.joveretec.chamados.chamado.entity.HistoricoChamado;
import br.com.joveretec.chamados.chamado.entity.HistoricoChamadoRepository;
import br.com.joveretec.chamados.comum.paginacao.Pagina;
import br.com.joveretec.chamados.comum.paginacao.Paginacao;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Monta a página do feed: 1 consulta para as referências ordenadas + no máximo 4 consultas
 * em lote para os detalhes (acompanhamentos, seus anexos, eventos e anexos da abertura).
 */
@ApplicationScoped
public class FeedService {

    private final ChamadoService chamados;
    private final FeedRepository feed;
    private final AcompanhamentoRepository acompanhamentos;
    private final AnexoRepository anexos;
    private final HistoricoChamadoRepository historicos;

    public FeedService(ChamadoService chamados, FeedRepository feed, AcompanhamentoRepository acompanhamentos,
                       AnexoRepository anexos, HistoricoChamadoRepository historicos) {
        this.chamados = chamados;
        this.feed = feed;
        this.acompanhamentos = acompanhamentos;
        this.anexos = anexos;
        this.historicos = historicos;
    }

    public record Feed(Chamado chamado, Pagina<ItemFeed> pagina) {
    }

    public Feed listar(Long chamadoId, Ordem ordem, Paginacao paginacao) {
        Chamado chamado = chamados.buscar(chamadoId);
        List<Referencia> referencias = feed.listar(chamadoId, ordem, paginacao.pagina(), paginacao.tamanho());

        Map<Long, Acompanhamento> porAcompanhamento = indexar(
                acompanhamentos.listarComAutor(ids(referencias, TipoItem.ACOMPANHAMENTO)), Acompanhamento::getId);
        Map<Long, List<Anexo>> anexosPorAcompanhamento = anexos
                .concluidosDosAcompanhamentos(porAcompanhamento.keySet()).stream()
                .collect(Collectors.groupingBy(a -> a.getAcompanhamento().getId()));
        Map<Long, HistoricoChamado> porEvento = indexar(
                historicos.listarComUsuario(ids(referencias, TipoItem.EVENTO)), HistoricoChamado::getId);
        boolean temAbertura = referencias.stream().anyMatch(r -> r.tipo() == TipoItem.ABERTURA);
        List<Anexo> anexosDaAbertura = temAbertura ? anexos.concluidosDaAbertura(chamadoId) : List.of();

        List<ItemFeed> itens = referencias.stream()
                .map(r -> switch (r.tipo()) {
                    case ABERTURA -> (ItemFeed) new ItemFeed.Abertura(chamado, anexosDaAbertura);
                    case ACOMPANHAMENTO -> new ItemFeed.DeAcompanhamento(porAcompanhamento.get(r.id()),
                            anexosPorAcompanhamento.getOrDefault(r.id(), List.of()));
                    case EVENTO -> new ItemFeed.Evento(porEvento.get(r.id()));
                })
                .toList();
        return new Feed(chamado, Pagina.de(itens, feed.contar(chamadoId), paginacao));
    }

    private static List<Long> ids(List<Referencia> referencias, TipoItem tipo) {
        return referencias.stream().filter(r -> r.tipo() == tipo).map(Referencia::id).toList();
    }

    private static <T> Map<Long, T> indexar(List<T> itens, Function<T, Long> id) {
        return itens.stream().collect(Collectors.toMap(id, Function.identity()));
    }
}
