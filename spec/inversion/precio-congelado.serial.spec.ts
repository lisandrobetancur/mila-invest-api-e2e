import { Ensure, equals, isTrue } from '@serenity-js/assertions';

import { afterEach, describe, it } from '../../src/fixtures';
import { Caracteristica, Cuando, Dado, Entonces, Escenario, EsquemaDelEscenario, Y } from '../../src/gherkin/gherkin';
import { Estado, Monto, Respuesta, Saldo } from '../../src/screenplay/questions';
import {
    ComprarInstrumento,
    CongelarElPrecio,
    CrearUsuarioDePrueba,
    DevolverElControl,
    PrevisualizarLaOrden,
    VerificarElLedger,
} from '../../src/screenplay/tasks';

/**
 * Serial: congela el precio de ISA para todos. Con el precio fijo, cada monto
 * se calcula a mano y se compara exacto, centavo por centavo.
 *
 * ISA a 20.000,00 → compra a 20.020,00 (spread de 0,10 %).
 * Comisión en Colombia: 0,30 % del bruto, mínimo COP 5.000.
 */
describe(Caracteristica('Montos exactos con el precio congelado'), () => {
    afterEach(async ({ actorCalled }) => {
        await actorCalled('Camila').attemptsTo(DevolverElControl('ISA-CO'));
    });

    describe(EsquemaDelEscenario('la comisión es el 0,30 % del bruto, con un mínimo de COP 5.000'), () => {
        const ejemplos = [
            { cantidad: 2, bruto: '40040.00', comision: '5000.00', total: '45040.00', saldo: '7954960.00', regla: 'el mínimo' },
            { cantidad: 100, bruto: '2002000.00', comision: '6006.00', total: '2008006.00', saldo: '5991994.00', regla: 'el 0,30 %' },
        ] as const;

        for (const ejemplo of ejemplos) {
            it(
                Escenario(`comprar ${ejemplo.cantidad} ISA cobra ${ejemplo.regla} de comisión`, '@inversion', '@precios'),
                async ({ actorCalled }) => {
                    await actorCalled('Camila').attemptsTo(
                        Dado('que ISA cotiza a 20.000,00', CongelarElPrecio.de('ISA-CO').en('20000.00')),
                        Y('#actor tiene 8.000.000 COP', CrearUsuarioDePrueba.conSaldo('8000000', 'COP')),
                        Cuando(`previsualiza la compra de ${ejemplo.cantidad}`, PrevisualizarLaOrden.deCompra('ISA-CO').cantidad(ejemplo.cantidad)),
                        Entonces(
                            'el preview trae los montos calculados',
                            Ensure.that(Respuesta.estado(), equals(Estado.Ok)),
                            Ensure.that(Monto.campo('estimated_price'), equals('20020.00')),
                            Ensure.that(Monto.campo('gross'), equals(ejemplo.bruto)),
                            Ensure.that(Monto.campo('commission'), equals(ejemplo.comision)),
                            Ensure.that(Monto.campo('total'), equals(ejemplo.total)),
                            Ensure.that(Monto.campo('available_after'), equals(ejemplo.saldo)),
                        ),
                        Cuando('confirma la compra', ComprarInstrumento.conId('ISA-CO').cantidad(ejemplo.cantidad)),
                        Entonces(
                            'la orden se ejecuta exactamente por esos montos',
                            Ensure.that(Respuesta.campo('status'), equals('FILLED')),
                            Ensure.that(Monto.campo('executed_price'), equals('20020.00')),
                            Ensure.that(Monto.campo('total'), equals(ejemplo.total)),
                        ),
                        Y('en la base le queda exactamente lo que anticipó el preview', Ensure.that(Saldo.enLaBase('COP'), equals(ejemplo.saldo))),
                        Y(
                            'el ledger sigue cuadrando',
                            VerificarElLedger(),
                            Ensure.that(Respuesta.campo<boolean>('balanced'), isTrue()),
                        ),
                    );
                },
            );
        }
    });
});
