import { Ensure, equals } from '@serenity-js/assertions';

import { afterEach, describe, it } from '../../src/fixtures';
import { Caracteristica, Cuando, Dado, Entonces, Escenario, Y } from '../../src/gherkin/gherkin';
import { Estado, notas, Respuesta } from '../../src/screenplay/questions';
import {
    ConsultarElPortafolio,
    ConsultarElResumen,
    CrearUsuarioDePrueba,
    DetenerElReloj,
    DevolverElControl,
} from '../../src/screenplay/tasks';

/**
 * Serial: los precios cambian minuto a minuto, así que dos llamadas seguidas
 * pueden caer en minutos distintos. Con el reloj detenido, portafolio y
 * resumen ven exactamente los mismos precios.
 */
describe(Caracteristica('Resumen del inicio'), () => {
    afterEach(async ({ actorCalled }) => {
        await actorCalled('Camila').attemptsTo(DevolverElControl());
    });

    it(Escenario('el resumen del dashboard coincide con el portafolio', '@seguimiento', '@reloj'), async ({ actorCalled }) => {
        await actorCalled('Camila').attemptsTo(
            Dado('que el reloj de la API está detenido en un miércoles de mercado', DetenerElReloj.en('2026-11-18T16:00:00Z')),
            Y(
                '#actor tiene 2.000.000 COP, 3 ISA y 2 Credicorp',
                CrearUsuarioDePrueba.conSaldo('2000000', 'COP').yLaPosicion('ISA-CO', 3).yLaPosicion('BAP-PE', 2),
            ),
            Y('vio su portafolio', ConsultarElPortafolio(), Ensure.that(Respuesta.estado(), equals(Estado.Ok))),
            Cuando('abre el resumen del inicio', ConsultarElResumen()),
            Entonces(
                'los totales son los mismos del portafolio',
                Ensure.that(Respuesta.estado(), equals(Estado.Ok)),
                Ensure.that(Respuesta.campo('portfolio_summary'), equals(notas().get('resumenDelPortafolio'))),
            ),
            Y(
                'muestra sus 5 movimientos más recientes',
                Ensure.that(Respuesta.cantidadEn('recent_transactions'), equals(5)),
            ),
        );
    });
});
