import { Ensure, equals } from '@serenity-js/assertions';

import { describe, it } from '../../src/fixtures';
import { Caracteristica, Cuando, Entonces, Escenario } from '../../src/gherkin/gherkin';
import { Estado, Respuesta } from '../../src/screenplay/questions';
import { ConsultarLaSalud } from '../../src/screenplay/tasks';

describe(Caracteristica('Salud del servicio'), () => {
    it(Escenario('la API y su base responden', '@smoke', '@plataforma'), async ({ actorCalled }) => {
        await actorCalled('Camila').attemptsTo(
            Cuando('#actor consulta la salud de la API', ConsultarLaSalud()),
            Entonces(
                'la API dice que ella y su base están bien',
                Ensure.that(Respuesta.estado(), equals(Estado.Ok)),
                Ensure.that(Respuesta.campo('status'), equals('ok')),
                Ensure.that(Respuesta.campo('db'), equals('ok')),
            ),
        );
    });
});
