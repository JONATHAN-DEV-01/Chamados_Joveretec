package br.com.joveretec.chamados.chamado.control;

import br.com.joveretec.chamados.chamado.entity.CampoHistorico;
import br.com.joveretec.chamados.chamado.entity.Chamado;
import br.com.joveretec.chamados.chamado.entity.HistoricoChamado;
import br.com.joveretec.chamados.chamado.entity.HistoricoChamadoRepository;
import br.com.joveretec.chamados.comum.paginacao.Pagina;
import br.com.joveretec.chamados.comum.paginacao.Paginacao;
import br.com.joveretec.chamados.usuario.entity.Usuario;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.List;
import java.util.Objects;

@ApplicationScoped
public class HistoricoService {

    private final HistoricoChamadoRepository historicos;

    public HistoricoService(HistoricoChamadoRepository historicos) {
        this.historicos = historicos;
    }

    public void registrarCriacao(Chamado chamado, Usuario autor) {
        historicos.persist(new HistoricoChamado(chamado, autor, CampoHistorico.CRIACAO, null, chamado.getTitulo()));
    }

    /** Registra a alteração somente se o valor realmente mudou. */
    public void registrarSeAlterado(Chamado chamado, Usuario autor, CampoHistorico campo, Object antes, Object depois) {
        if (!Objects.equals(identidade(antes), identidade(depois))) {
            historicos.persist(new HistoricoChamado(chamado, autor, campo, texto(antes), texto(depois)));
        }
    }

    /** Usuários são comparados pelo id (dois usuários podem ter o mesmo nome). */
    private static Object identidade(Object valor) {
        return valor instanceof Usuario usuario ? usuario.getId() : valor;
    }

    public Pagina<HistoricoChamado> listar(Long chamadoId, Paginacao paginacao) {
        List<HistoricoChamado> itens = historicos.listarDoChamado(chamadoId)
                .page(paginacao.pagina(), paginacao.tamanho())
                .list();
        return Pagina.de(itens, historicos.contarDoChamado(chamadoId), paginacao);
    }

    private static String texto(Object valor) {
        if (valor instanceof Usuario usuario) {
            return usuario.getNome();
        }
        return valor == null ? null : valor.toString();
    }
}
