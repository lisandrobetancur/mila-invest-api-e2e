import { Ensure, equals, isTrue } from '@serenity-js/assertions';

import { describe, it } from '../../src/fixtures';
import { Caracteristica, Cuando, Dado, Entonces, Escenario, Y } from '../../src/gherkin/gherkin';
import { Cantidad, Estado, Filas, notas, Respuesta } from '../../src/screenplay/questions';
import {
    ConsultarSuPerfil,
    CrearUsuarioDePrueba,
    CuentaDemo,
    IniciarSesion,
    RestablecerLosDatos,
    VerificarElLedger,
} from '../../src/screenplay/tasks';

/**
 * Serial: `POST /_testing/reset` trunca la base entera. Corre en
 * `api-serial`, después de todo el proyecto paralelo.
 */
describe(Caracteristica('Restablecer los datos de prueba'), () => {
    it(Escenario('el reset borra todo y vuelve a sembrar la cuenta demo', '@plataforma', '@reset'), async ({ actorCalled }) => {
        await actorCalled('Camila').attemptsTo(
            Dado('que #actor tiene un usuario de prueba', CrearUsuarioDePrueba.conSaldo('1000', 'COP')),
            Cuando('restablece los datos de la API', RestablecerLosDatos()),
            Entonces('su usuario ya no existe', Ensure.that(Cantidad.deUsuariosConEmail(notas().get('email')), equals(0))),
            Y(
                'la cuenta demo vuelve a estar, con sus posiciones sembradas',
                IniciarSesion.conLaCuentaDemo(),
                Ensure.that(Respuesta.estado(), equals(Estado.Ok)),
                ConsultarSuPerfil(),
                Ensure.that(Respuesta.campo('email'), equals(CuentaDemo.email)),
                Ensure.that(Filas.dePosiciones(), equals([...CuentaDemo.posiciones])),
            ),
            Y('el ledger cuadra', VerificarElLedger(), Ensure.that(Respuesta.campo<boolean>('balanced'), isTrue())),
        );
    });
});
