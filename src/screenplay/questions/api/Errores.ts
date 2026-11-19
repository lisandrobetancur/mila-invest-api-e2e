import { Question, type QuestionAdapter } from '@serenity-js/core';
import { LastResponse } from '@serenity-js/rest';

import { type CodigoDeError, Esquemas } from '../../contract/contract.generated';

/**
 * El estado HTTP de cada código de error (tabla §7.3 de
 * `mila-invest-api/docs/api-contract.md`). El OpenAPI declara los códigos pero
 * no los ata a un estado: si la API cambia uno, se cambia acá.
 */
export const EstadoDelCodigo: Readonly<Record<CodigoDeError, number>> = {
    VALIDATION_ERROR: 422,
    AUTH_INVALID_CREDENTIALS: 401,
    AUTH_EMAIL_TAKEN: 409,
    AUTH_DOCUMENT_TAKEN: 409,
    AUTH_TOKEN_EXPIRED: 401,
    AUTH_TOKEN_INVALID: 401,
    AUTH_REFRESH_INVALID: 401,
    INSUFFICIENT_FUNDS: 422,
    INSUFFICIENT_POSITION: 422,
    MARKET_CLOSED: 422,
    INSTRUMENT_NOT_FOUND: 404,
    ORDER_NOT_FOUND: 404,
    IDEMPOTENCY_CONFLICT: 409,
    RATE_LIMITED: 429,
    NOT_FOUND: 404,
    PAYLOAD_TOO_LARGE: 413,
    INTERNAL_ERROR: 500,
};

const problema = () =>
    Question.about('el error de la API', async (actor) => Esquemas.Problem.parse(await actor.answer(LastResponse.body())));

/** Preguntas sobre el `Problem` de la última respuesta. */
export const ErrorDeLaApi = {
    codigo: (): QuestionAdapter<string> =>
        Question.about('el código de error', async (actor) => (await actor.answer(problema())).code),

    /** Los errores por campo como `campo:CÓDIGO` (`quantity:TOO_SMALL`), en el orden de la API. */
    camposConError: (): QuestionAdapter<string[]> =>
        Question.about('los campos con error', async (actor) =>
            ((await actor.answer(problema())).errors ?? []).map((error) => `${error.field}:${error.code}`),
        ),

    /** El header `Content-Type`, que en un error es `application/problem+json`. */
    tipoDeContenido: (): QuestionAdapter<string> =>
        Question.about('el tipo de contenido del error', async (actor) => {
            const valor: unknown = (await actor.answer(LastResponse.headers()))['content-type'];
            return typeof valor === 'string' ? valor.split(';')[0]!.trim() : '';
        }),
};
