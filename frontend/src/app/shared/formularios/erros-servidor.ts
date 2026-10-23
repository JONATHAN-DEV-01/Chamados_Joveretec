import { FormGroup } from '@angular/forms';
import { ApiErro } from '../../core/api/api-erro';

/**
 * Copia os erros de validação do backend (`detalhes[].campo`) para os campos do formulário
 * com o mesmo nome. Retorna `true` se algum erro foi associado a um campo.
 */
export function aplicarErrosDoServidor(formulario: FormGroup, erro: unknown): boolean {
  if (!(erro instanceof ApiErro)) {
    return false;
  }
  let associou = false;
  for (const { campo, mensagem } of erro.detalhes) {
    const controle = formulario.get(campo);
    if (controle) {
      controle.setErrors({ ...controle.errors, servidor: mensagem });
      controle.markAsTouched();
      associou = true;
    }
  }
  return associou;
}
