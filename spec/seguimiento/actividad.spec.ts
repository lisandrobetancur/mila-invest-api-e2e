import { containItemsWhereEachItem, Ensure, equals } from '@serenity-js/assertions';

import { describe, it } from '../../src/fixtures';
import { Caracteristica, Cuando, Dado, Entonces, Escenario, Y } from '../../src/gherkin/gherkin';
import { Cantidad, Estado, Monto, notas, Respuesta } from '../../src/screenplay/questions';
import {
    ComprarInstrumento,
    ConsultarLaActividad,
    CrearUsuarioDePrueba,
    Depositar,
    LaApiRechaza,
} from '../../src/screenplay/tasks';

describe(Caracteristica('Ver la actividad'), () => {
    const conUnaCompraYUnDeposito = [
        CrearUsuarioDePrueba.conSaldo('8000000', 'COP'),
        ComprarInstrumento.conId('ISA-CO').cantidad(2),
        Ensure.that(Respuesta.estado(), equals(Estado.Creado)),
        Depositar.monto('250000').en('COP'),
        Ensure.that(Respuesta.estado(), equals(Estado.Creado)),
    ];

    it(Escenario('sin filtros lista todos sus movimientos, los mismos que hay en la base', '@seguimiento'), async ({ actorCalled }) => {
        await actorCalled('Camila').attemptsTo(
            Dado('que #actor compró ISA y depositó', ...conUnaCompraYUnDeposito),
            Cuando('consulta su actividad', ConsultarLaActividad()),
            Entonces(
                've tantos movimientos como transacciones tiene en la base',
                Ensure.that(Respuesta.estado(), equals(Estado.Ok)),
                Ensure.that(Respuesta.cantidadDeElementos(), equals(Cantidad.deTransacciones())),
            ),
            Y('el más reciente es el depósito', Ensure.that(Respuesta.campo('items.0.type'), equals('DEPOSIT'))),
        );
    });

    it(Escenario('filtrar por tipo muestra solo ese tipo', '@smoke', '@seguimiento'), async ({ actorCalled }) => {
        await actorCalled('Camila').attemptsTo(
            Dado('que #actor compró ISA y depositó', ...conUnaCompraYUnDeposito),
            Cuando('filtra su actividad por comisiones', ConsultarLaActividad.filtrando({ type: 'FEE' })),
            Entonces(
                've solo la comisión de su compra',
                Ensure.that(Respuesta.valoresDe<string>('type'), containItemsWhereEachItem(equals('FEE'))),
                Ensure.that(Respuesta.cantidadDeElementos(), equals(1)),
                Ensure.that(Respuesta.campo('items.0.order_id'), equals(notas().get('ultimaOrden').id)),
                Ensure.that(Monto.campo('items.0.amount'), equals(Monto.resta('0', notas().get('ultimaOrden').commission))),
            ),
            Cuando('filtra por compras', ConsultarLaActividad.filtrando({ type: 'BUY' })),
            Entonces(
                've solo la compra, como en la base',
                Ensure.that(Respuesta.valoresDe<string>('type'), containItemsWhereEachItem(equals('BUY'))),
                Ensure.that(Respuesta.cantidadDeElementos(), equals(Cantidad.deTransacciones('BUY'))),
            ),
        );
    });

    it(Escenario('un rango de fechas futuro no trae nada', '@seguimiento'), async ({ actorCalled }) => {
        await actorCalled('Camila').attemptsTo(
            Dado('que #actor compró ISA y depositó', ...conUnaCompraYUnDeposito),
            Cuando('consulta su actividad desde 2099', ConsultarLaActividad.filtrando({ from: '2099-01-01T00:00:00Z' })),
            Entonces(
                'la lista está vacía',
                Ensure.that(Respuesta.cantidadDeElementos(), equals(0)),
                Ensure.that(Respuesta.campo('next_cursor'), equals(null)),
            ),
        );
    });

    it(Escenario('una fecha mal escrita se rechaza', '@seguimiento'), async ({ actorCalled }) => {
        await actorCalled('Camila').attemptsTo(
            Dado('que #actor tiene una cuenta', CrearUsuarioDePrueba.sinSaldo()),
            Cuando('filtra su actividad desde "ayer"', ConsultarLaActividad.filtrando({ from: 'ayer' })),
            Entonces('la API rechaza la fecha', LaApiRechaza.con('VALIDATION_ERROR').enElCampo('from', 'INVALID_FORMAT')),
        );
    });
});
