import { Question, type QuestionAdapter } from '@serenity-js/core';
import { LastResponse } from '@serenity-js/rest';
import type { z } from 'zod';

import { Esquemas } from '../../contract/contract.generated';

export type Posicion = z.output<(typeof Esquemas)['getPortfolio']>['positions'][number];
export type ResumenDelPortafolio = Pick<
    z.output<(typeof Esquemas)['getPortfolio']>,
    'base_currency' | 'total_value' | 'cash_value' | 'invested_value' | 'day_change' | 'day_change_pct'
>;

const portafolio = () =>
    Question.about('el portafolio de la respuesta', async (actor) =>
        Esquemas.getPortfolio.parse(await actor.answer(LastResponse.body())),
    );

/** Preguntas sobre la última respuesta de `GET /portfolio`. */
export const Portafolio = {
    /** La posición en un instrumento: `Portafolio.posicionEn('ISA-CO').quantity`. */
    posicionEn: (instrumento: string): QuestionAdapter<Posicion> =>
        Question.about(`la posición en ${instrumento} del portafolio`, async (actor) => {
            const posicion = (await actor.answer(portafolio())).positions.find((una) => una.instrument.id === instrumento);
            if (posicion === undefined) throw new Error(`El portafolio no tiene posición en ${instrumento}`);
            return posicion;
        }),

    /** Las posiciones como `INSTRUMENTO:cantidad`, en el orden de la API (por id). */
    posiciones: (): QuestionAdapter<string[]> =>
        Question.about('las posiciones del portafolio', async (actor) =>
            (await actor.answer(portafolio())).positions.map((posicion) => `${posicion.instrument.id}:${posicion.quantity}`),
        ),

    /** Los totales del portafolio, como los repite el resumen del dashboard. */
    resumen: (): QuestionAdapter<ResumenDelPortafolio> =>
        Question.about('el resumen del portafolio', async (actor) => {
            const { base_currency, total_value, cash_value, invested_value, day_change, day_change_pct } =
                await actor.answer(portafolio());
            return { base_currency, total_value, cash_value, invested_value, day_change, day_change_pct };
        }),

    /** Las filas de `allocation` como `TIPO:valor`. */
    distribucion: (): QuestionAdapter<string[]> =>
        Question.about('la distribución del portafolio', async (actor) =>
            (await actor.answer(portafolio())).allocation.map((fila) => `${fila.type}:${fila.value}`),
        ),
};
