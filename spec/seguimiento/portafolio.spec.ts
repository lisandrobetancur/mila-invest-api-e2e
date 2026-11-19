import { Ensure, equals } from '@serenity-js/assertions';

import { describe, it } from '../../src/fixtures';
import { Caracteristica, Cuando, Dado, Entonces, Escenario, Y } from '../../src/gherkin/gherkin';
import { Estado, Filas, Monto, Portafolio, Respuesta } from '../../src/screenplay/questions';
import { ConsultarElPortafolio, CrearUsuarioDePrueba } from '../../src/screenplay/tasks';

describe(Caracteristica('Ver el portafolio'), () => {
    it(Escenario('el portafolio muestra posiciones, efectivo y totales coherentes', '@smoke', '@seguimiento'), async ({ actorCalled }) => {
        await actorCalled('Camila').attemptsTo(
            Dado(
                'que #actor tiene 1.000.000 COP, 10 Ecopetrol y 5 Walmex',
                CrearUsuarioDePrueba.conSaldo('1000000', 'COP').yLaPosicion('ECOPETROL-CO', 10).yLaPosicion('WALMEX-MX', 5),
            ),
            Cuando('consulta su portafolio', ConsultarElPortafolio()),
            Entonces(
                've sus dos posiciones y su efectivo en pesos colombianos',
                Ensure.that(Respuesta.estado(), equals(Estado.Ok)),
                Ensure.that(Respuesta.campo('base_currency'), equals('COP')),
                Ensure.that(Portafolio.posiciones(), equals(['ECOPETROL-CO:10', 'WALMEX-MX:5'])),
                Ensure.that(Monto.campo('cash_value'), equals('1000000.00')),
            ),
            Y(
                'el total es el efectivo más lo invertido',
                Ensure.that(Monto.campo('total_value'), equals(Monto.suma(Monto.campo('cash_value'), Monto.campo('invested_value')))),
            ),
            Y(
                'el valor de cada posición es su cantidad por el último precio',
                Ensure.that(
                    Monto.de(Portafolio.posicionEn('ECOPETROL-CO').market_value),
                    equals(Monto.producto(Portafolio.posicionEn('ECOPETROL-CO').instrument.last_price, 10)),
                ),
                Ensure.that(
                    Monto.de(Portafolio.posicionEn('WALMEX-MX').market_value),
                    equals(Monto.producto(Portafolio.posicionEn('WALMEX-MX').instrument.last_price, 5)),
                ),
            ),
            Y(
                'la distribución arranca por el efectivo',
                Ensure.that(Respuesta.campo('allocation.0.type'), equals('CASH')),
                Ensure.that(Monto.campo('allocation.0.value'), equals('1000000.00')),
            ),
            Y('las posiciones son las mismas que hay en la base', Ensure.that(Portafolio.posiciones(), equals(Filas.dePosiciones()))),
        );
    });

    it(Escenario('un usuario nuevo tiene el portafolio vacío', '@seguimiento'), async ({ actorCalled }) => {
        await actorCalled('Camila').attemptsTo(
            Dado('que #actor acaba de crear su cuenta en Perú', CrearUsuarioDePrueba.sinSaldo('PE')),
            Cuando('consulta su portafolio', ConsultarElPortafolio()),
            Entonces(
                'no tiene posiciones ni valor, en soles',
                Ensure.that(Respuesta.campo('base_currency'), equals('PEN')),
                Ensure.that(Portafolio.posiciones(), equals([])),
                Ensure.that(Monto.campo('total_value'), equals('0.00')),
            ),
        );
    });
});
