import { Ensure, equals, isFalse } from '@serenity-js/assertions';

import { describe, it } from '../../src/fixtures';
import { Caracteristica, Cuando, Dado, Entonces, Escenario, Y } from '../../src/gherkin/gherkin';
import { Cantidad, Estado, Existe, Fila, Filas, Monto, notas, Respuesta, Saldo } from '../../src/screenplay/questions';
import { CrearUsuarioDePrueba, LaApiRechaza, VenderInstrumento } from '../../src/screenplay/tasks';

describe(Caracteristica('Vender acciones a mercado'), () => {
    const conCincoIsa = CrearUsuarioDePrueba.sinSaldo().yLaPosicion('ISA-CO', 5);

    it(Escenario('una venta parcial acredita el neto y deja el resto de la posición', '@smoke', '@inversion'), async ({ actorCalled }) => {
        await actorCalled('Camila').attemptsTo(
            Dado('que #actor tiene 5 acciones de ISA y nada de efectivo', conCincoIsa),
            Cuando('vende 2', VenderInstrumento.conId('ISA-CO').cantidad(2)),
            Entonces(
                'la venta queda ejecutada por el bruto menos la comisión',
                Ensure.that(Respuesta.estado(), equals(Estado.Creado)),
                Ensure.that(Respuesta.campo('status'), equals('FILLED')),
                Ensure.that(Respuesta.campo('side'), equals('SELL')),
                Ensure.that(Monto.campo('total'), equals(Monto.resta(Monto.campo('gross'), Monto.campo('commission')))),
            ),
            Y('le quedan 3 acciones en la base', Ensure.that(Fila.deLaPosicionEn('ISA-CO').quantity, equals('3'))),
            Y(
                'el neto entró a su cuenta, con una transacción de venta y otra de comisión',
                Ensure.that(Saldo.enLaBase('COP'), equals(Monto.de(notas().get('ultimaOrden').total))),
                Ensure.that(Filas.tiposDeTransaccionesDeLaUltimaOrden(), equals(['FEE', 'SELL'])),
            ),
        );
    });

    it(Escenario('vender toda la posición la cierra', '@inversion'), async ({ actorCalled }) => {
        await actorCalled('Camila').attemptsTo(
            Dado('que #actor tiene 5 acciones de ISA', conCincoIsa),
            Cuando('vende las 5', VenderInstrumento.conId('ISA-CO').cantidad(5)),
            Entonces('la venta queda ejecutada', Ensure.that(Respuesta.campo('status'), equals('FILLED'))),
            Y('la posición ya no existe en la base', Ensure.that(Existe.laPosicionEn('ISA-CO'), isFalse())),
        );
    });

    it(Escenario('no se puede vender más de lo que se tiene', '@inversion'), async ({ actorCalled }) => {
        await actorCalled('Camila').attemptsTo(
            Dado('que #actor tiene 5 acciones de ISA', conCincoIsa),
            Cuando('intenta vender 6', VenderInstrumento.conId('ISA-CO').cantidad(6)),
            Entonces(
                'la API lo rechaza por posición insuficiente',
                LaApiRechaza.con('INSUFFICIENT_POSITION').enElCampo('quantity', 'TOO_LARGE'),
            ),
            Y(
                'no hay ninguna venta en la base y la posición sigue entera',
                Ensure.that(Cantidad.deOrdenes('SELL'), equals(0)),
                Ensure.that(Fila.deLaPosicionEn('ISA-CO').quantity, equals('5')),
            ),
        );
    });
});
