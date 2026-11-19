import { contain, Ensure, equals } from '@serenity-js/assertions';

import { describe, it } from '../../src/fixtures';
import { Caracteristica, Cuando, Dado, Entonces, Escenario, Y } from '../../src/gherkin/gherkin';
import { Cantidad, Estado, Monto, Respuesta } from '../../src/screenplay/questions';
import { CrearUsuarioDePrueba, LaApiRechaza, PrevisualizarLaOrden } from '../../src/screenplay/tasks';

describe(Caracteristica('Previsualizar una orden'), () => {
    it(Escenario('el preview calcula comisión y total sin escribir nada', '@smoke', '@inversion'), async ({ actorCalled }) => {
        await actorCalled('Camila').attemptsTo(
            Dado('que #actor tiene 8.000.000 COP', CrearUsuarioDePrueba.conSaldo('8000000', 'COP')),
            Cuando('previsualiza la compra de 2 ISA', PrevisualizarLaOrden.deCompra('ISA-CO').cantidad(2)),
            Entonces(
                've el bruto, la comisión mínima de COP 5.000 y el total',
                Ensure.that(Respuesta.estado(), equals(Estado.Ok)),
                Ensure.that(Respuesta.campo('currency'), equals('COP')),
                Ensure.that(Monto.campo('gross'), equals(Monto.producto(Respuesta.campo<string>('estimated_price'), 2))),
                Ensure.that(Monto.campo('commission'), equals('5000.00')),
                Ensure.that(Monto.campo('total'), equals(Monto.suma(Monto.campo('gross'), Monto.campo('commission')))),
            ),
            Y(
                'cuánto le quedaría disponible',
                Ensure.that(Monto.campo('available_after'), equals(Monto.resta('8000000', Monto.campo('total')))),
                Ensure.that(Respuesta.campo<string[]>('warnings'), contain('PRICE_MAY_CHANGE')),
            ),
            Y('no se creó ninguna orden en la base', Ensure.that(Cantidad.deOrdenes(), equals(0))),
        );
    });

    it(Escenario('el preview ya avisa si no alcanza el saldo', '@inversion'), async ({ actorCalled }) => {
        await actorCalled('Camila').attemptsTo(
            Dado('que #actor tiene apenas 1.000 COP', CrearUsuarioDePrueba.conSaldo('1000', 'COP')),
            Cuando('previsualiza la compra de 1 ISA', PrevisualizarLaOrden.deCompra('ISA-CO').cantidad(1)),
            Entonces(
                'la API le avisa que no le alcanza',
                LaApiRechaza.con('INSUFFICIENT_FUNDS').enElCampo('quantity', 'TOO_LARGE'),
            ),
        );
    });
});
