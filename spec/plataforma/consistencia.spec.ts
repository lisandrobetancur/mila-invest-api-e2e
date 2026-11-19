import { Ensure, equals, isTrue } from '@serenity-js/assertions';

import { describe, it } from '../../src/fixtures';
import { Caracteristica, Cuando, Dado, Entonces, Escenario, Y } from '../../src/gherkin/gherkin';
import { Estado, Fila, Filas, Monto, Portafolio, Respuesta, Saldo } from '../../src/screenplay/questions';
import {
    ComprarInstrumento,
    ConsultarElPortafolio,
    ConsultarLaOrden,
    ConsultarLosSaldos,
    CrearUsuarioDePrueba,
    Depositar,
    VenderInstrumento,
    VerificarElLedger,
} from '../../src/screenplay/tasks';

describe(Caracteristica('La API y la base dicen lo mismo'), () => {
    it(Escenario('después de operar, saldos, órdenes y posiciones coinciden', '@smoke', '@plataforma'), async ({ actorCalled }) => {
        await actorCalled('Camila').attemptsTo(
            Dado(
                'que #actor tiene 3.000.000 COP y 5 ISA',
                CrearUsuarioDePrueba.conSaldo('3000000', 'COP').yLaPosicion('ISA-CO', 5),
            ),
            Cuando(
                'deposita, vende 2 ISA y compra 4 Ecopetrol',
                Depositar.monto('1000.25').en('COP'),
                Ensure.that(Respuesta.estado(), equals(Estado.Creado)),
                VenderInstrumento.conId('ISA-CO').cantidad(2),
                Ensure.that(Respuesta.estado(), equals(Estado.Creado)),
                ComprarInstrumento.conId('ECOPETROL-CO').cantidad(4),
                Ensure.that(Respuesta.estado(), equals(Estado.Creado)),
            ),
            Entonces(
                'el saldo de la API es el de la base',
                ConsultarLosSaldos(),
                Ensure.that(Monto.disponibleEn('COP'), equals(Saldo.enLaBase('COP'))),
                Ensure.that(Monto.disponibleEn('MXN'), equals(Saldo.enLaBase('MXN'))),
            ),
            Y(
                'la última orden de la API es la de la base',
                ConsultarLaOrden.ultima(),
                Ensure.that(Respuesta.campo('status'), equals(Fila.deLaUltimaOrden().status)),
                Ensure.that(Respuesta.campo('instrument_id'), equals(Fila.deLaUltimaOrden().instrument_id)),
                Ensure.that(Monto.campo('total'), equals(Monto.de(Fila.deLaUltimaOrden().total))),
                Ensure.that(Monto.campo('commission'), equals(Monto.de(Fila.deLaUltimaOrden().commission))),
            ),
            Y(
                'las posiciones del portafolio son las de la base',
                ConsultarElPortafolio(),
                Ensure.that(Portafolio.posiciones(), equals(['ECOPETROL-CO:4', 'ISA-CO:3'])),
                Ensure.that(Portafolio.posiciones(), equals(Filas.dePosiciones())),
            ),
            Y(
                'el ledger de doble partida cuadra',
                VerificarElLedger(),
                Ensure.that(Respuesta.campo<boolean>('balanced'), isTrue()),
                Ensure.that(Respuesta.campo('mismatched_accounts'), equals([])),
            ),
        );
    });
});
