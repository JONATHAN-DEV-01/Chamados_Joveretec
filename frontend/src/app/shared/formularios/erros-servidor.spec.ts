import { FormControl, FormGroup } from '@angular/forms';
import { ApiErro } from '../../core/api/api-erro';
import { aplicarErrosDoServidor } from './erros-servidor';

describe('aplicarErrosDoServidor', () => {
  function formulario() {
    return new FormGroup({ titulo: new FormControl(''), senha: new FormControl('') });
  }

  it('associa os detalhes do backend aos campos com o mesmo nome', () => {
    const form = formulario();
    const erro = new ApiErro(400, 'VALIDACAO', 'Dados inválidos.', [
      { campo: 'titulo', mensagem: 'O título é obrigatório.' },
    ]);

    expect(aplicarErrosDoServidor(form, erro)).toBe(true);
    expect(form.controls.titulo.errors).toEqual({ servidor: 'O título é obrigatório.' });
    expect(form.controls.titulo.touched).toBe(true);
  });

  it('aceita aliases de nome de campo', () => {
    const form = formulario();
    const erro = new ApiErro(400, 'VALIDACAO', 'x', [{ campo: 'novaSenha', mensagem: 'Muito curta.' }]);
    expect(aplicarErrosDoServidor(form, erro, { novaSenha: 'senha' })).toBe(true);
    expect(form.controls.senha.errors?.['servidor']).toBe('Muito curta.');
  });

  it('retorna false quando não há campo correspondente (o chamador mostra um aviso)', () => {
    expect(aplicarErrosDoServidor(formulario(), new ApiErro(409, 'CONFLITO', 'Já existe.'))).toBe(false);
    expect(aplicarErrosDoServidor(formulario(), new Error('rede'))).toBe(false);
  });
});
