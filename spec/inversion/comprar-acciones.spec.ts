import { Ensure, equals, isTrue } from '@serenity-js/assertions';

import { describe, it } from '../../src/fixtures';
import { Caracteristica, Cuando, Dado, Entonces, Escenario, EsquemaDelEscenario, Y } from '../../src/gherkin/gherkin';
import {
    Cantidad,
    Estado,
    Existe,
    Fila,
    Filas,
    Monto,
    notas,
    Portafolio,
    Respuesta,
    Saldo,
} from '../../src/screenplay/questions';
import {
    ComprarInstrumento,
    ConsultarElPortafolio,
    ConsultarLosSaldos,
    CrearUsuarioDePrueba,
    LaApiRechaza,
} from '../../src/screenplay/tasks';

describe(Caracteristica('Comprar acciones a mercado'), () => {
    it(Escenario('la compra descuenta el saldo y queda en la base', '@smoke', '@inversion'), async ({ actorCalled }) => {
        await actorCalled('Camila').attemptsTo(
            Dado('que #actor tiene una cuenta con 8.000.000 COP', CrearUsuarioDePrueba.conSaldo('8000000', 'COP')),
            Cuando('compra 2 acciones de ISA a mercado', ComprarInstrumento.conId('ISA-CO').cantidad(2)),
            Entonces(
                'la API responde que la orden quedó ejecutada',
                Ensure.that(Respuesta.estado(), equals(Estado.Creado)),
                Ensure.that(Respuesta.campo('status'), equals('FILLED')),
                Ensure.that(Respuesta.campo('side'), equals('BUY')),
                Ensure.that(Monto.campo('total'), equals(Monto.suma(Monto.campo('gross'), Monto.campo('commission')))),
            ),
            Y(
                'la orden quedó registrada en la base',
                Ensure.that(Cantidad.deOrdenes(), equals(1)),
                Ensure.that(Fila.deLaUltimaOrden().status, equals('FILLED')),
                Ensure.that(Fila.deLaUltimaOrden().quantity, equals('2')),
                Ensure.that(Monto.de(Fila.deLaUltimaOrden().total), equals(Monto.de(notas().get('ultimaOrden').total))),
            ),
            Y(
                'generó una transacción por el bruto y otra por la comisión, que suman el total',
                Ensure.that(Filas.tiposDeTransaccionesDeLaUltimaOrden(), equals(['BUY', 'FEE'])),
                Ensure.that(Saldo.movidoPorLaUltimaOrden(), equals(Monto.resta('0', notas().get('ultimaOrden').total))),
            ),
            Y(
                'la posición aparece en su portafolio y en la base',
                ConsultarElPortafolio(),
                Ensure.that(Portafolio.posicionEn('ISA-CO').quantity, equals(2)),
                Ensure.that(Existe.laPosicionEn('ISA-CO'), isTrue()),
                Ensure.that(Fila.deLaPosicionEn('ISA-CO').quantity, equals('2')),
            ),
            Y(
                'el saldo bajó por el total, comisión incluida, según la API y según la base',
                ConsultarLosSaldos(),
                Ensure.that(Monto.disponibleEn('COP'), equals(Monto.resta('8000000', notas().get('ultimaOrden').total))),
                Ensure.that(Saldo.enLaBase('COP'), equals(Monto.resta('8000000', notas().get('ultimaOrden').total))),
            ),
        );
    });

    it(Escenario('sin saldo suficiente la compra se rechaza y no deja rastro', '@inversion'), async ({ actorCalled }) => {
        await actorCalled('Camila').attemptsTo(
            Dado('que #actor tiene apenas 10.000 COP', CrearUsuarioDePrueba.conSaldo('10000', 'COP')),
            Cuando('intenta comprar 2 acciones de ISA', ComprarInstrumento.conId('ISA-CO').cantidad(2)),
            Entonces(
                'la API rechaza la compra por saldo insuficiente',
                LaApiRechaza.con('INSUFFICIENT_FUNDS').enElCampo('quantity', 'TOO_LARGE'),
            ),
            Y(
                'no se creó ninguna orden y su saldo sigue intacto',
                Ensure.that(Cantidad.deOrdenes(), equals(0)),
                Ensure.that(Saldo.enLaBase('COP'), equals('10000.00')),
            ),
        );
    });

    describe(EsquemaDelEscenario('una cantidad inválida se rechaza antes de crear la orden'), () => {
        const ejemplos = [
            { cantidad: 0, codigo: 'TOO_SMALL', porque: 'cero' },
            { cantidad: -3, codigo: 'TOO_SMALL', porque: 'negativa' },
            { cantidad: 1.5, codigo: 'INVALID_FORMAT', porque: 'fraccionaria' },
            { cantidad: 1_000_001, codigo: 'TOO_LARGE', porque: 'mayor que el máximo' },
        ] as const;

        for (const ejemplo of ejemplos) {
            it(Escenario(`una cantidad ${ejemplo.porque} da ${ejemplo.codigo}`, '@inversion'), async ({ actorCalled }) => {
                await actorCalled('Camila').attemptsTo(
                    Dado('que #actor tiene saldo', CrearUsuarioDePrueba.conSaldo('8000000', 'COP')),
                    Cuando(`compra ${ejemplo.cantidad} ISA`, ComprarInstrumento.conId('ISA-CO').cantidad(ejemplo.cantidad)),
                    Entonces(
                        'la API rechaza la cantidad',
                        LaApiRechaza.con('VALIDATION_ERROR').enElCampo('quantity', ejemplo.codigo),
                    ),
                    Y('no quedó ninguna orden', Ensure.that(Cantidad.deOrdenes(), equals(0))),
                );
            });
        }
    });

    it(Escenario('comprar un instrumento que no existe da 404', '@inversion'), async ({ actorCalled }) => {
        await actorCalled('Camila').attemptsTo(
            Dado('que #actor tiene saldo', CrearUsuarioDePrueba.conSaldo('8000000', 'COP')),
            Cuando('compra un instrumento inexistente', ComprarInstrumento.conId('NOEXISTE-CO').cantidad(1)),
            Entonces('la API dice que no lo encuentra', LaApiRechaza.con('INSTRUMENT_NOT_FOUND')),
            Y('no quedó ninguna orden', Ensure.that(Cantidad.deOrdenes(), equals(0))),
        );
    });
});
