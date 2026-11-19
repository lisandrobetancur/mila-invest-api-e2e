import { Ensure, equals } from '@serenity-js/assertions';

import { describe, it } from '../../src/fixtures';
import { Caracteristica, Cuando, Dado, Entonces, Escenario } from '../../src/gherkin/gherkin';
import { Estado, Respuesta } from '../../src/screenplay/questions';
import { CrearUsuarioDePrueba, LaApiRechaza, VerElInstrumento } from '../../src/screenplay/tasks';

describe(Caracteristica('Detalle de un instrumento'), () => {
    const conSesion = CrearUsuarioDePrueba.sinSaldo();

    it(Escenario('el detalle trae la ficha y la sesión del día', '@smoke', '@mercado'), async ({ actorCalled }) => {
        await actorCalled('Camila').attemptsTo(
            Dado('que #actor inició sesión', conSesion),
            Cuando('abre el detalle de ISA', VerElInstrumento.conId('ISA-CO')),
            Entonces(
                've la ficha de ISA en pesos colombianos',
                Ensure.that(Respuesta.estado(), equals(Estado.Ok)),
                Ensure.that(Respuesta.campo('ticker'), equals('ISA')),
                Ensure.that(Respuesta.campo('country'), equals('CO')),
                Ensure.that(Respuesta.campo('type'), equals('STOCK')),
                Ensure.that(Respuesta.campo('currency'), equals('COP')),
            ),
        );
    });

    it(Escenario('un instrumento que no existe da 404', '@mercado'), async ({ actorCalled }) => {
        await actorCalled('Camila').attemptsTo(
            Dado('que #actor inició sesión', conSesion),
            Cuando('pide un instrumento que no existe', VerElInstrumento.conId('NOEXISTE-CO')),
            Entonces('la API dice que no lo encuentra', LaApiRechaza.con('INSTRUMENT_NOT_FOUND')),
        );
    });

    it(Escenario('un id con formato inválido se rechaza antes de buscarlo', '@mercado'), async ({ actorCalled }) => {
        await actorCalled('Camila').attemptsTo(
            Dado('que #actor inició sesión', conSesion),
            Cuando('pide un id sin país', VerElInstrumento.conId('isa')),
            Entonces('la API rechaza el formato', LaApiRechaza.con('VALIDATION_ERROR').enElCampo('id', 'INVALID_FORMAT')),
        );
    });
});
