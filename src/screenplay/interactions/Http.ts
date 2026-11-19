/**
 * El protocolo HTTP de la suite, y el único lugar que lo conoce.
 *
 * Todo lo que el paso 0 averiguó sobre cómo se habla con la API vive acá
 * (ver `docs/api-notes.md`):
 *
 * - las rutas salen del contrato generado (`Endpoints`), nunca de un string
 *   armado en una tarea;
 * - el token viaja como `Authorization: Bearer <access_token>` y se pone solo
 *   cuando el contrato dice que la operación lo pide;
 * - `Idempotency-Key` (UUID) se genera solo cuando el contrato lo exige;
 * - toda respuesta exitosa se valida contra su esquema del contrato, y todo
 *   error contra `Problem`: si la forma no coincide, falla el paso que llamó.
 *
 * Las tareas nunca tocan axios ni arman headers a mano.
 */
import { randomUUID } from 'node:crypto';

import { Ensure, equals, isGreaterThan } from '@serenity-js/assertions';
import { type Answerable, Check, Question, type QuestionAdapter, Task } from '@serenity-js/core';
import { GetRequest, LastResponse, PostRequest, Send } from '@serenity-js/rest';

import {
    type Consultas,
    type Cuerpos,
    type Endpoint,
    Esquemas,
    type NombreDeEndpoint,
} from '../contract/contract.generated';
import { notas } from '../notes/NotasDeSesion';
import { estadoConElProblema, violacionesDe } from '../questions/api/Contrato';

type ParametrosDeRuta<E extends Endpoint> = E['parametrosDeRuta'][number];

type CuerpoDe<E extends Endpoint> = E['nombre'] extends keyof Cuerpos ? Cuerpos[E['nombre']] : never;
type ConsultaDe<E extends Endpoint> = E['nombre'] extends keyof Consultas ? Consultas[E['nombre']] : never;

export interface Opciones<E extends Endpoint> {
    /** Valores de los parámetros de la ruta (`{id}`, `{currency}`…). */
    ruta?: Record<ParametrosDeRuta<E>, Answerable<string>>;
    /** Parámetros de query, tipados por el contrato. */
    consulta?: Answerable<ConsultaDe<E>>;
    /**
     * El token a mandar. Sin definir: el de la sesión del actor si la operación
     * lo pide. `null`: ninguno. Un texto: ese, tal cual (un token inválido).
     */
    token?: Answerable<string> | null;
    /** Sin definir: un UUID nuevo si el contrato lo exige. `null`: no se manda. */
    idempotencyKey?: Answerable<string> | null;
}

const rutaDe = <E extends Endpoint>(endpoint: E, valores: Opciones<E>['ruta']): QuestionAdapter<string> | string => {
    if (endpoint.parametrosDeRuta.length === 0) return endpoint.ruta;
    return Question.about(endpoint.ruta, async (actor) => {
        let ruta: string = endpoint.ruta;
        for (const nombre of endpoint.parametrosDeRuta as readonly ParametrosDeRuta<E>[]) {
            const valor = valores?.[nombre];
            if (valor === undefined) {
                throw new Error(`Falta el parámetro {${String(nombre)}} de ${endpoint.metodo} ${endpoint.ruta}`);
            }
            ruta = ruta.replace(`{${String(nombre)}}`, encodeURIComponent(await actor.answer(valor)));
        }
        return ruta;
    });
};

/**
 * Los headers de la petición, resueltos al mandarla:
 *
 * - `Authorization: Bearer …` con el token de la sesión del actor, si la
 *   operación lo pide y el actor tiene sesión (sin sesión, la petición sale sin
 *   token, como la mandaría alguien que no inició sesión);
 * - `Idempotency-Key` nueva si el contrato la exige.
 */
const headersDe = <E extends Endpoint>(
    endpoint: E,
    opciones: Opciones<E>,
    extra: Record<string, string>,
): QuestionAdapter<Record<string, string>> =>
    Question.about('los headers de la petición', async (actor) => {
        const headers: Record<string, string> = { Accept: 'application/json', ...extra };

        let token: string | null = null;
        if (opciones.token === undefined) {
            if (endpoint.pideToken && (await actor.answer(notas().has('accessToken')))) {
                token = (await actor.answer(notas().get('accessToken'))).revelar();
            }
        } else if (opciones.token !== null) {
            token = await actor.answer(opciones.token);
        }
        if (token !== null) headers.Authorization = `Bearer ${token}`;

        if (opciones.idempotencyKey === undefined) {
            if (endpoint.exigeIdempotencyKey) headers['Idempotency-Key'] = randomUUID();
        } else if (opciones.idempotencyKey !== null) {
            headers['Idempotency-Key'] = await actor.answer(opciones.idempotencyKey);
        }
        return headers;
    });

const configDe = <E extends Endpoint>(endpoint: E, opciones: Opciones<E>, extra: Record<string, string> = {}) => ({
    headers: headersDe(endpoint, opciones, extra),
    ...(opciones.consulta === undefined ? {} : { params: opciones.consulta }),
});

/**
 * Después de cada llamada: si la API respondió el estado de éxito del
 * contrato, el cuerpo tiene que cumplir su esquema; si respondió un error, el
 * cuerpo tiene que ser un `Problem`.
 */
const validarLaForma = (endpoint: Endpoint) => {
    const esquema = (Esquemas as Partial<Record<NombreDeEndpoint, (typeof Esquemas)[keyof typeof Esquemas]>>)[
        endpoint.nombre
    ];
    return [
        ...(esquema === undefined
            ? []
            : [
                  Check.whether(LastResponse.status(), equals(endpoint.estadoDeExito)).andIfSo(
                      Ensure.that(violacionesDe(esquema, `la respuesta de ${endpoint.nombre}`), equals([])),
                  ),
              ]),
        Check.whether(LastResponse.status(), isGreaterThan(399)).andIfSo(
            Ensure.that(violacionesDe(Esquemas.Problem, 'Problem'), equals([])),
        ),
    ];
};

/** Falla mostrando el código y el detalle del error, no solo el estado. */
const exigirExito = (endpoint: Endpoint) =>
    Ensure.that(estadoConElProblema(), equals(String(endpoint.estadoDeExito)));

export const Http = {
    /** `GET` a una operación del contrato. */
    get: <E extends Endpoint>(endpoint: E, opciones: Opciones<E> = {}): Task =>
        Task.where(
            `#actor llama a ${endpoint.metodo} ${endpoint.ruta}`,
            Send.a(GetRequest.to(rutaDe(endpoint, opciones.ruta)).using(configDe(endpoint, opciones))),
            ...validarLaForma(endpoint),
        ),

    /**
     * `POST` a una operación del contrato, con su cuerpo tipado. Sin cuerpo se
     * manda `{}`: la API rechaza un `Content-Type: application/json` vacío
     * (422, ver `docs/api-notes.md`).
     */
    post: <E extends Endpoint>(endpoint: E, cuerpo?: Answerable<CuerpoDe<E>>, opciones: Opciones<E> = {}): Task =>
        Task.where(
            `#actor llama a ${endpoint.metodo} ${endpoint.ruta}`,
            Send.a(PostRequest.to(rutaDe(endpoint, opciones.ruta)).with(cuerpo ?? {}).using(configDe(endpoint, opciones))),
            ...validarLaForma(endpoint),
        ),

    /** `POST` con un cuerpo que no es JSON válido, para probar cómo lo rechaza la API. */
    postCrudo: <E extends Endpoint>(endpoint: E, texto: string, opciones: Opciones<E> = {}): Task =>
        Task.where(
            `#actor llama a ${endpoint.metodo} ${endpoint.ruta} con un cuerpo crudo`,
            Send.a(
                PostRequest.to(rutaDe(endpoint, opciones.ruta))
                    .with(texto)
                    .using({
                        ...configDe(endpoint, opciones, { 'Content-Type': 'application/json' }),
                        // Sin esto axios intentaría serializar el texto otra vez.
                        transformRequest: [(data: unknown) => data],
                    }),
            ),
            ...validarLaForma(endpoint),
        ),

    /** `GET` a una ruta que **no** está en el contrato (para el 404 de ruta desconocida). */
    getFueraDelContrato: (ruta: string): Task =>
        Task.where(
            `#actor llama a GET ${ruta}`,
            Send.a(GetRequest.to(ruta).using({ headers: { Accept: 'application/json' } })),
            Ensure.that(violacionesDe(Esquemas.Problem, 'Problem'), equals([])),
        ),

    /** Las mismas llamadas, pero exigen el estado de éxito del contrato: para preparar escenarios. */
    exigiendoExito: {
        get: <E extends Endpoint>(endpoint: E, opciones: Opciones<E> = {}): Task =>
            Task.where(`#actor consigue ${endpoint.metodo} ${endpoint.ruta}`, Http.get(endpoint, opciones), exigirExito(endpoint)),
        post: <E extends Endpoint>(endpoint: E, cuerpo?: Answerable<CuerpoDe<E>>, opciones: Opciones<E> = {}): Task =>
            Task.where(
                `#actor consigue ${endpoint.metodo} ${endpoint.ruta}`,
                Http.post(endpoint, cuerpo, opciones),
                exigirExito(endpoint),
            ),
    },
};
