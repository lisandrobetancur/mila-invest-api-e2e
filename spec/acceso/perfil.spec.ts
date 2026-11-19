import { Ensure, equals } from '@serenity-js/assertions';

import { describe, it } from '../../src/fixtures';
import { Caracteristica, Cuando, Dado, Entonces, Escenario, Y } from '../../src/gherkin/gherkin';
import { Estado, Fila, Respuesta } from '../../src/screenplay/questions';
import { ConsultarSuPerfil, CrearUsuarioDePrueba, LaApiRechaza } from '../../src/screenplay/tasks';

describe(Caracteristica('Ver el propio perfil'), () => {
    it(Escenario('con su token ve sus datos, los mismos que hay en la base', '@acceso'), async ({ actorCalled }) => {
        await actorCalled('Camila').attemptsTo(
            Dado('que #actor tiene una sesión abierta', CrearUsuarioDePrueba.sinSaldo('MX')),
            Cuando('consulta su perfil', ConsultarSuPerfil()),
            Entonces(
                've sus datos',
                Ensure.that(Respuesta.estado(), equals(Estado.Ok)),
                Ensure.that(Respuesta.campo('country'), equals('MX')),
                Ensure.that(Respuesta.campo('base_currency'), equals('MXN')),
            ),
            Y(
                'coinciden con su fila en la base',
                Ensure.that(Respuesta.campo('id'), equals(Fila.delUsuario().id)),
                Ensure.that(Respuesta.campo('email'), equals(Fila.delUsuario().email)),
                Ensure.that(Respuesta.campo('document_last4'), equals(Fila.delUsuario().document_last4)),
            ),
        );
    });

    it(Escenario('sin token no hay perfil', '@acceso'), async ({ actorCalled }) => {
        await actorCalled('Camila').attemptsTo(
            Cuando('#actor pide su perfil sin token', ConsultarSuPerfil.sinToken()),
            Entonces('la API pide autenticarse', LaApiRechaza.con('AUTH_TOKEN_INVALID')),
        );
    });

    it(Escenario('con un token inválido tampoco', '@acceso'), async ({ actorCalled }) => {
        await actorCalled('Camila').attemptsTo(
            Cuando('#actor pide su perfil con un token inventado', ConsultarSuPerfil.conElToken('no.es-un.jwt')),
            Entonces('la API rechaza el token', LaApiRechaza.con('AUTH_TOKEN_INVALID')),
        );
    });
});
