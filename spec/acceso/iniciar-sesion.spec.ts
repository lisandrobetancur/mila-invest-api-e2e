import { Ensure, equals } from '@serenity-js/assertions';

import { describe, it } from '../../src/fixtures';
import { Caracteristica, Cuando, Dado, Entonces, Escenario, Y } from '../../src/gherkin/gherkin';
import { Cantidad, Estado, notas, Respuesta } from '../../src/screenplay/questions';
import { ConsultarSuPerfil, CrearUsuarioDePrueba, IniciarSesion, LaApiRechaza, UsuarioNuevo } from '../../src/screenplay/tasks';

describe(Caracteristica('Iniciar sesión'), () => {
    it(Escenario('con credenciales correctas recibe un par de tokens que sirve', '@smoke', '@acceso'), async ({ actorCalled }) => {
        await actorCalled('Camila').attemptsTo(
            Dado('que #actor tiene una cuenta', CrearUsuarioDePrueba.sinSaldo()),
            Cuando('inicia sesión con su correo y su contraseña', IniciarSesion.conSusCredenciales()),
            Entonces(
                'la API le da un access token de 15 minutos y un refresh token',
                Ensure.that(Respuesta.estado(), equals(Estado.Ok)),
                Ensure.that(Respuesta.campo('token_type'), equals('bearer')),
                Ensure.that(Respuesta.campo('expires_in'), equals(15 * 60)),
            ),
            Y('la sesión nueva quedó en la base', Ensure.that(Cantidad.deSesionesActivas(), equals(2))),
            Y(
                'con ese token puede ver su perfil',
                ConsultarSuPerfil(),
                Ensure.that(Respuesta.estado(), equals(Estado.Ok)),
                Ensure.that(Respuesta.campo('email'), equals(notas().get('email'))),
            ),
        );
    });

    it(Escenario('con una contraseña incorrecta no entra', '@acceso'), async ({ actorCalled }) => {
        await actorCalled('Camila').attemptsTo(
            Dado('que #actor tiene una cuenta', CrearUsuarioDePrueba.sinSaldo()),
            Cuando('inicia sesión con una contraseña que no es la suya', IniciarSesion.conUnaContrasenaIncorrecta()),
            Entonces('la API rechaza las credenciales', LaApiRechaza.con('AUTH_INVALID_CREDENTIALS')),
            Y('no se abrió ninguna sesión nueva', Ensure.that(Cantidad.deSesionesActivas(), equals(1))),
        );
    });

    it(Escenario('con un correo que no existe recibe el mismo error', '@acceso'), async ({ actorCalled }) => {
        await actorCalled('Camila').attemptsTo(
            Cuando('#actor inicia sesión con un correo sin cuenta', IniciarSesion.con(UsuarioNuevo.de('CO').email, 'Cualquiera-123')),
            Entonces('la API no dice si el correo existe', LaApiRechaza.con('AUTH_INVALID_CREDENTIALS')),
        );
    });
});
