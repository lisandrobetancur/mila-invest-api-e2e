import { type Answerable, type AnswersQuestions, Expectation, Question, type QuestionAdapter } from '@serenity-js/core';
import { LastResponse } from '@serenity-js/rest';
import Decimal from 'decimal.js';

import { Respuesta } from './Respuesta';

/** Un monto tal como llega de la API (string decimal) o de la base (`NUMERIC` como texto). */
export type ValorDeMonto = string | number | Decimal;

/**
 * Forma canónica de un monto, con `Decimal` y nunca con `number`: `"45"`,
 * `"45.0"` y `"45.0000"` dan `"45.00"`. Si trae decimales significativos más
 * allá del segundo, se conservan (`"1.2345"` sigue siendo `"1.2345"`): una
 * diferencia de precisión no queda escondida por un redondeo.
 */
export const canonico = (valor: ValorDeMonto): string => {
    const decimal = new Decimal(valor);
    return decimal.decimalPlaces() <= 2 ? decimal.toFixed(2) : decimal.toString();
};

const resolver = async (actor: AnswersQuestions, valor: Answerable<ValorDeMonto>): Promise<Decimal> =>
    new Decimal(await actor.answer(valor));

/**
 * Montos como preguntas. Todas devuelven la forma canónica (texto), así que se
 * comparan con `equals` sin que la representación importe:
 *
 * ```ts
 * Ensure.that(Monto.campo('total'), equals('41098.36'))
 * Ensure.that(Saldo.enLaBase('COP'), equals(Monto.resta('8000000', notas().get('ultimaOrden').total)))
 * ```
 */
export const Monto = {
    de: (valor: Answerable<ValorDeMonto>): QuestionAdapter<string> =>
        Question.about('el monto', async (actor) => canonico(await resolver(actor, valor))),

    /** Un campo monetario de la última respuesta. */
    campo: (ruta: string): QuestionAdapter<string> =>
        Question.about(`el monto ${ruta}`, async (actor) => canonico(await actor.answer(Respuesta.campo<string>(ruta)))),

    suma: (...valores: Answerable<ValorDeMonto>[]): QuestionAdapter<string> =>
        Question.about('la suma de los montos', async (actor) => {
            let total = new Decimal(0);
            for (const valor of valores) total = total.plus(await resolver(actor, valor));
            return canonico(total);
        }),

    resta: (minuendo: Answerable<ValorDeMonto>, sustraendo: Answerable<ValorDeMonto>): QuestionAdapter<string> =>
        Question.about('la diferencia de los montos', async (actor) =>
            canonico((await resolver(actor, minuendo)).minus(await resolver(actor, sustraendo))),
        ),

    /** `precio × cantidad`, cuantizado a 2 decimales con redondeo bancario, como la API. */
    producto: (precio: Answerable<ValorDeMonto>, cantidad: Answerable<number>): QuestionAdapter<string> =>
        Question.about('el producto', async (actor) =>
            canonico(
                (await resolver(actor, precio))
                    .times(await actor.answer(cantidad))
                    .toDecimalPlaces(2, Decimal.ROUND_HALF_EVEN),
            ),
        ),

    /**
     * El saldo disponible en una moneda, según la última respuesta de
     * `GET /accounts` (ver `ConsultarLosSaldos`).
     */
    disponibleEn: (moneda: string): QuestionAdapter<string> =>
        Question.about(`el saldo disponible en ${moneda} según la API`, async (actor) => {
            const cuentas = await actor.answer(LastResponse.body<{ currency: string; available: string }[]>());
            const cuenta = Array.isArray(cuentas) ? cuentas.find((una) => una.currency === moneda) : undefined;
            if (cuenta === undefined) {
                throw new Error(`La última respuesta no trae la cuenta ${moneda}: ${JSON.stringify(cuentas)}`);
            }
            return canonico(cuenta.available);
        }),
};

/** Igualdad de montos por valor exacto (`Decimal`), cualquiera sea su representación. */
export const esElMonto = Expectation.define(
    'esElMonto',
    (esperado) =>
        `ser el monto ${esperado instanceof Decimal || typeof esperado === 'string' || typeof esperado === 'number' ? esperado.toString() : 'esperado'}`,
    (actual: ValorDeMonto, esperado: ValorDeMonto) => new Decimal(actual).equals(new Decimal(esperado)),
);
