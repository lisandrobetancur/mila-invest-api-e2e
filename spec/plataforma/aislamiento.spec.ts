import { Ensure, equals } from '@serenity-js/assertions';

import { describe, it } from '../../src/fixtures';
import { Caracteristica, Cuando, Dado, Entonces, Escenario } from '../../src/gherkin/gherkin';
import { Estado, notas, Respuesta } from '../../src/screenplay/questions';
import { ComprarInstrumento, ConsultarLaOrden, CrearUsuarioDePrueba, LaApiRechaza } from '../../src/screenplay/tasks';

describe(Caracteristica('Cada usuario ve solo lo suyo'), () => {
    it(Escenario('la orden de otro usuario responde 404', '@plataforma'), async ({ actorCalled }) => {
        await actorCalled('Camila').attemptsTo(
            Dado('que #actor compró ISA', CrearUsuarioDePrueba.conSaldo('8000000', 'COP'), ComprarInstrumento.conId('ISA-CO').cantidad(1)),
            Entonces('la orden es suya', ConsultarLaOrden.ultima(), Ensure.that(Respuesta.estado(), equals(Estado.Ok))),
        );
        const ordenDeCamila = await actorCalled('Camila').answer(notas().get('ultimaOrden').id);

        await actorCalled('Lucía').attemptsTo(
            Dado('que #actor tiene su propia cuenta', CrearUsuarioDePrueba.sinSaldo()),
            Cuando('pide la orden de Camila', ConsultarLaOrden.conId(ordenDeCamila)),
            Entonces('la API responde como si no existiera', LaApiRechaza.con('ORDER_NOT_FOUND')),
        );
    });
});
