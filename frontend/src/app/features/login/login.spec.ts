import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { urlApi } from '../../core/api/parametros';
import { apiInterceptor } from '../../core/auth/api.interceptor';
import { respostaLogin } from '../../testes/dados';
import { Login } from './login';

describe('Login', () => {
  let fixture: ComponentFixture<Login>;
  let http: HttpTestingController;
  let navegar: ReturnType<typeof vi.spyOn>;

  async function montar(retorno?: string): Promise<HTMLElement> {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      imports: [Login],
      providers: [provideRouter([]), provideHttpClient(withInterceptors([apiInterceptor])), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
    navegar = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    fixture = TestBed.createComponent(Login);
    if (retorno) {
      fixture.componentRef.setInput('retorno', retorno);
    }
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  }

  function preencher(elemento: HTMLElement, email: string, senha: string): void {
    const [campoEmail, campoSenha] = Array.from(elemento.querySelectorAll('input'));
    campoEmail.value = email;
    campoEmail.dispatchEvent(new Event('input'));
    campoSenha.value = senha;
    campoSenha.dispatchEvent(new Event('input'));
    elemento.querySelector('form')!.dispatchEvent(new Event('submit'));
  }

  afterEach(() => http.verify());

  it('não envia o formulário vazio e mostra os erros dos campos', async () => {
    const elemento = await montar();
    elemento.querySelector('form')!.dispatchEvent(new Event('submit'));
    await fixture.whenStable();

    http.expectNone(urlApi('/auth/login'));
    expect(elemento.textContent).toContain('Campo obrigatório.');
  });

  it('entra e volta para a rota pedida', async () => {
    const elemento = await montar('/chamados?status=ABERTO');
    preencher(elemento, 'ana@teste.local', 'segredo');
    http.expectOne(urlApi('/auth/login')).flush(respostaLogin());

    expect(navegar).toHaveBeenCalledWith('/chamados?status=ABERTO');
  });

  it('ignora destino externo (evita redirecionamento aberto)', async () => {
    const elemento = await montar('//site-malicioso.com');
    preencher(elemento, 'ana@teste.local', 'segredo');
    http.expectOne(urlApi('/auth/login')).flush(respostaLogin());

    expect(navegar).toHaveBeenCalledWith('/dashboard');
  });

  it('mostra a mensagem do backend quando as credenciais são inválidas', async () => {
    const elemento = await montar();
    preencher(elemento, 'ana@teste.local', 'errada');
    http
      .expectOne(urlApi('/auth/login'))
      .flush(
        { codigo: 'NAO_AUTENTICADO', mensagem: 'E-mail ou senha inválidos.', detalhes: [] },
        { status: 401, statusText: 'Unauthorized' },
      );
    await fixture.whenStable();

    expect(elemento.querySelector('[role="alert"]')?.textContent).toContain('E-mail ou senha inválidos.');
    expect(navegar).not.toHaveBeenCalled();
  });
});
