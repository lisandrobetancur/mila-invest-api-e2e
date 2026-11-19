import { Ensure, equals, isGreaterThan, isLessThan } from '@serenity-js/assertions';

import { describe, it } from '../../src/fixtures';
import { Caracteristica, Cuando, Dado, Entonces, Escenario, EsquemaDelEscenario } from '../../src/gherkin/gherkin';
import { Estado, Respuesta } from '../../src/screenplay/questions';
import { CrearUsuarioDePrueba, LaApiRechaza, VerLosPrecios } from '../../src/screenplay/tasks';

describe(Caracteristica('Serie de precios'), () => {
    const conSesion = CrearUsuarioDePrueba.sinSaldo();

    describe(EsquemaDelEscenario('cada rango devuelve su serie'), () => {
        const rangos = ['1D', '1W', '1M', '3M', '1Y'] as const;

        for (const rango of rangos) {
            it(Escenario(`el rango ${rango} trae puntos en la moneda del instrumento`, '@mercado'), async ({ actorCalled }) => {
                await actorCalled('Camila').attemptsTo(
                    Dado('que #actor inició sesión', conSesion),
                    Cuando(`pide los precios de WALMEX en ${rango}`, VerLosPrecios.de('WALMEX-MX').enElRango(rango)),
                    Entonces(
                        'recibe una serie no vacía de como mucho 400 puntos, en pesos mexicanos',
                        Ensure.that(Respuesta.estado(), equals(Estado.Ok)),
                        Ensure.that(Respuesta.campo('range'), equals(rango)),
                        Ensure.that(Respuesta.campo('currency'), equals('MXN')),
                        Ensure.that(Respuesta.cantidadEn('points'), isGreaterThan(0)),
                        Ensure.that(Respuesta.cantidadEn('points'), isLessThan(401)),
                    ),
                );
            });
        }
    });

    it(Escenario('un rango que no existe se rechaza', '@mercado'), async ({ actorCalled }) => {
        await actorCalled('Camila').attemptsTo(
            Dado('que #actor inició sesión', conSesion),
            Cuando('pide los precios en un rango de 2 días', VerLosPrecios.de('ISA-CO').enUnRangoInvalido('2D')),
            Entonces('la API rechaza el rango', LaApiRechaza.con('VALIDATION_ERROR').enElCampo('range', 'NOT_ALLOWED')),
        );
    });

    it(Escenario('los precios de un instrumento que no existe dan 404', '@mercado'), async ({ actorCalled }) => {
        await actorCalled('Camila').attemptsTo(
            Dado('que #actor inició sesión', conSesion),
            Cuando('pide los precios de un instrumento inexistente', VerLosPrecios.de('NOEXISTE-PE').enElRango('1M')),
            Entonces('la API dice que no lo encuentra', LaApiRechaza.con('INSTRUMENT_NOT_FOUND')),
        );
    });
});
