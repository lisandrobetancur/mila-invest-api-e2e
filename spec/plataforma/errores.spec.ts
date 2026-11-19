import { Ensure, equals } from '@serenity-js/assertions';

import { describe, it } from '../../src/fixtures';
import { Caracteristica, Cuando, Entonces, Escenario, Y } from '../../src/gherkin/gherkin';
import { ErrorDeLaApi, Respuesta } from '../../src/screenplay/questions';
import { ConsultarElPortafolio, EnviarUnCuerpoMalformado, LaApiRechaza, PedirUnaRutaQueNoExiste } from '../../src/screenplay/tasks';

/**
 * Todo error es `application/problem+json` con la forma `Problem` del
 * contrato. `LaApiRechaza` lo verifica en cada escenario negativo de la suite;
 * acá están los casos de plataforma.
 */
describe(Caracteristica('Errores de la plataforma'), () => {
    it(Escenario('una ruta desconocida responde 404 con un Problem', '@plataforma'), async ({ actorCalled }) => {
        await actorCalled('Camila').attemptsTo(
            Cuando('#actor pide una ruta que no existe', PedirUnaRutaQueNoExiste()),
            Entonces('la API dice que no existe', LaApiRechaza.con('NOT_FOUND')),
            Y(
                'el error trae su título y su detalle',
                Ensure.that(Respuesta.campo('type'), equals('about:blank')),
                Ensure.that(Respuesta.campo('status'), equals(404)),
            ),
        );
    });

    it(Escenario('un endpoint protegido sin token responde 401', '@plataforma'), async ({ actorCalled }) => {
        await actorCalled('Camila').attemptsTo(
            Cuando('#actor pide un portafolio sin haber iniciado sesión', ConsultarElPortafolio()),
            Entonces('la API pide autenticarse', LaApiRechaza.con('AUTH_TOKEN_INVALID')),
            Y('el estado del cuerpo coincide con el de la respuesta', Ensure.that(Respuesta.campo('status'), equals(Respuesta.estado()))),
        );
    });

    it(Escenario('un cuerpo que no es JSON se rechaza como error de validación', '@plataforma'), async ({ actorCalled }) => {
        // El pedido original esperaba 400; la API lo responde como 422 VALIDATION_ERROR
        // (§7.3 del contrato: reemplaza el 400 de Fastify). Ver docs/api-notes.md.
        await actorCalled('Camila').attemptsTo(
            Cuando('#actor manda un login con el JSON cortado', EnviarUnCuerpoMalformado()),
            Entonces(
                'la API dice que el cuerpo no se pudo interpretar',
                LaApiRechaza.con('VALIDATION_ERROR').enElCampo('body', 'INVALID_FORMAT'),
            ),
            Y('es el único error', Ensure.that(ErrorDeLaApi.camposConError(), equals(['body:INVALID_FORMAT']))),
        );
    });
});
