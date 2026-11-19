import { Ensure, equals } from '@serenity-js/assertions';

import { afterEach, describe, it } from '../../src/fixtures';
import { Caracteristica, Cuando, Dado, Entonces, Escenario, Y } from '../../src/gherkin/gherkin';
import { Cantidad, Saldo } from '../../src/screenplay/questions';
import {
    ComprarInstrumento,
    CrearUsuarioDePrueba,
    DetenerElReloj,
    DevolverElControl,
    ForzarElMercado,
    LaApiRechaza,
} from '../../src/screenplay/tasks';

// Serial: mueve el reloj y el horario del mercado, que son globales.
describe(Caracteristica('Operar con el mercado cerrado'), () => {
    afterEach(async ({ actorCalled }) => {
        await actorCalled('Camila').attemptsTo(DevolverElControl());
    });

    it(Escenario('un sábado no se puede comprar en Colombia', '@inversion', '@reloj'), async ({ actorCalled }) => {
        await actorCalled('Camila').attemptsTo(
            Dado(
                'que es sábado y el mercado colombiano respeta su horario',
                DetenerElReloj.en('2026-11-21T15:00:00Z'),
                ForzarElMercado.de('CO').aRespetarSuHorario(),
            ),
            Y('#actor tiene saldo', CrearUsuarioDePrueba.conSaldo('8000000', 'COP')),
            Cuando('intenta comprar 1 ISA', ComprarInstrumento.conId('ISA-CO').cantidad(1)),
            Entonces('la API le dice que el mercado está cerrado', LaApiRechaza.con('MARKET_CLOSED')),
            Y(
                'no quedó ninguna orden y su saldo sigue intacto',
                Ensure.that(Cantidad.deOrdenes(), equals(0)),
                Ensure.that(Saldo.enLaBase('COP'), equals('8000000.00')),
            ),
        );
    });
});
