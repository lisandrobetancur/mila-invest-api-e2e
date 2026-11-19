import { contain, Ensure, equals } from '@serenity-js/assertions';
import { type Activity, type Answerable, type AnswersQuestions, type PerformsActivities, Question, Task } from '@serenity-js/core';

import type { CodigoDeCampo, CodigoDeError } from '../contract/contract.generated';
import { Secreto } from '../notes/Secreto';
import { notas } from '../notes/NotasDeSesion';
import { ErrorDeLaApi, EstadoDelCodigo, Respuesta } from '../questions/api';

/** Un valor de la respuesta envuelto en `Secreto`, para que no salga en el reporte. */
export const secretoDe = (valor: Answerable<string>) =>
    Question.about('un valor secreto', async (actor: AnswersQuestions) => new Secreto(await actor.answer(valor)));

/**
 * Guarda el par de tokens de la última respuesta. `en` es dónde vienen:
 * en la raíz (`/auth/login`, `/auth/refresh`) o bajo `tokens` (`/auth/register`).
 */
export const guardarLosTokens = (en: '' | 'tokens.' = ''): Activity[] => [
    notas().set('accessToken', secretoDe(Respuesta.campo<string>(`${en}access_token`))),
    notas().set('refreshToken', secretoDe(Respuesta.campo<string>(`${en}refresh_token`))),
];

/**
 * La API rechazó la última petición con un código de error del contrato: el
 * estado es el que corresponde a ese código, el cuerpo es un `Problem` y el
 * tipo de contenido es `application/problem+json`.
 *
 * ```ts
 * Entonces('la API rechaza la compra', LaApiRechaza.con('INSUFFICIENT_FUNDS'))
 * Entonces('la cantidad es inválida', LaApiRechaza.con('VALIDATION_ERROR').enElCampo('quantity', 'TOO_SMALL'))
 * ```
 */
export class LaApiRechaza extends Task {
    static con(codigo: CodigoDeError): LaApiRechaza {
        return new LaApiRechaza(codigo, []);
    }

    private constructor(
        private readonly codigo: CodigoDeError,
        private readonly campos: readonly string[],
    ) {
        super(`#actor ve que la API rechaza la petición con ${codigo}`);
    }

    /** Además, el `Problem` trae ese error en ese campo. */
    enElCampo(campo: string, codigo: CodigoDeCampo): LaApiRechaza {
        return new LaApiRechaza(this.codigo, [...this.campos, `${campo}:${codigo}`]);
    }

    override async performAs(actor: PerformsActivities): Promise<void> {
        await actor.attemptsTo(
            Ensure.that(ErrorDeLaApi.codigo(), equals(this.codigo)),
            Ensure.that(Respuesta.estado(), equals(EstadoDelCodigo[this.codigo])),
            Ensure.that(ErrorDeLaApi.tipoDeContenido(), equals('application/problem+json')),
            ...this.campos.map((campo) => Ensure.that(ErrorDeLaApi.camposConError(), contain(campo))),
        );
    }
}
