import { Ensure, equals } from '@serenity-js/assertions';

import { describe, it } from '../../src/fixtures';
import { Caracteristica, Cuando, Dado, Entonces, Escenario, Pero, Y } from '../../src/gherkin/gherkin';
import { Cantidad, Estado, Respuesta } from '../../src/screenplay/questions';
import { CerrarSesion, CrearUsuarioDePrueba, LaApiRechaza, RenovarLaSesion } from '../../src/screenplay/tasks';

describe(Caracteristica('Renovar y cerrar la sesión'), () => {
    it(Escenario('el refresh rota el par y el token usado ya no sirve', '@acceso'), async ({ actorCalled }) => {
        await actorCalled('Camila').attemptsTo(
            Dado('que #actor tiene una sesión abierta', CrearUsuarioDePrueba.sinSaldo()),
            Cuando('renueva su sesión', RenovarLaSesion()),
            Entonces(
                'recibe un par nuevo',
                Ensure.that(Respuesta.estado(), equals(Estado.Ok)),
                Ensure.that(Respuesta.campo('token_type'), equals('bearer')),
            ),
            Y('en la base sigue con una sola sesión activa', Ensure.that(Cantidad.deSesionesActivas(), equals(1))),
            Pero('si alguien reusa el refresh anterior', RenovarLaSesion.conElTokenAnterior()),
            Entonces('la API lo rechaza', LaApiRechaza.con('AUTH_REFRESH_INVALID')),
            Y(
                'cierra toda la cadena: tampoco sirve el token nuevo',
                RenovarLaSesion.conSuTokenActual(),
                LaApiRechaza.con('AUTH_REFRESH_INVALID'),
                Ensure.that(Cantidad.deSesionesActivas(), equals(0)),
            ),
        );
    });

    it(Escenario('cerrar sesión invalida el refresh token', '@acceso'), async ({ actorCalled }) => {
        await actorCalled('Camila').attemptsTo(
            Dado('que #actor tiene una sesión abierta', CrearUsuarioDePrueba.sinSaldo()),
            Cuando('cierra su sesión', CerrarSesion()),
            Entonces('la API confirma sin contenido', Ensure.that(Respuesta.estado(), equals(Estado.SinContenido))),
            Y('su sesión quedó revocada en la base', Ensure.that(Cantidad.deSesionesActivas(), equals(0))),
            Y('su refresh token ya no renueva nada', RenovarLaSesion.conSuTokenActual(), LaApiRechaza.con('AUTH_REFRESH_INVALID')),
        );
    });
});
