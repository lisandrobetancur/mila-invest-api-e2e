import { Ensure, equals } from '@serenity-js/assertions';

import { describe, it } from '../../src/fixtures';
import { Caracteristica, Cuando, Dado, Entonces, Escenario, Y } from '../../src/gherkin/gherkin';
import { Estado, Monto, Respuesta, Saldo } from '../../src/screenplay/questions';
import { ComprarInstrumento, CrearUsuarioDePrueba } from '../../src/screenplay/tasks';

/**
 * FALLA A PROPÓSITO: muestra cómo se ve un fallo en la consola y en el
 * reporte de Serenity/JS (el paso, el valor esperado y el recibido).
 *
 * La compra sale bien; lo que está mal es la expectativa: la comisión mínima
 * en Colombia es COP 5.000, no 4.999. Se excluye con
 * `npx playwright test --grep-invert @falla-intencional`, y se borra este
 * archivo cuando ya no haga falta.
 */
describe(Caracteristica('Demostración de un fallo'), () => {
    it(Escenario('la comisión mínima no es la que esperamos', '@falla-intencional'), async ({ actorCalled }) => {
        await actorCalled('Camila').attemptsTo(
            Dado('que #actor tiene 8.000.000 COP', CrearUsuarioDePrueba.conSaldo('8000000', 'COP')),
            Cuando('compra 1 acción de ISA', ComprarInstrumento.conId('ISA-CO').cantidad(1)),
            Entonces(
                'la orden queda ejecutada',
                Ensure.that(Respuesta.estado(), equals(Estado.Creado)),
                Ensure.that(Respuesta.campo('status'), equals('FILLED')),
            ),
            Y('le cobran una comisión de COP 4.999', Ensure.that(Monto.campo('commission'), equals('4999.00'))),
            Y('este paso ya no llega a correr', Ensure.that(Saldo.enLaBase('COP'), equals('8000000.00'))),
        );
    });
});
