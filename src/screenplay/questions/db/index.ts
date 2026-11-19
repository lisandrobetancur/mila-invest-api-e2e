/**
 * Preguntas de **lectura** sobre la base de la API. Es el único lugar de la
 * suite con SQL (más `src/database`), siempre con parámetros posicionales
 * (`$1`), nunca interpolado. Los nombres de tablas y columnas salen del
 * esquema real (`mila-invest-api/drizzle/0000_init.sql`), ver
 * `docs/api-notes.md`.
 *
 * Todas se refieren a los datos **del actor**: leen su `usuarioId` de las
 * notas, así cada escenario afirma solo sobre lo suyo y la suite corre en
 * paralelo sin pisarse.
 *
 * Cada pregunta corre su consulta en cada uso. Las escrituras de la API son
 * inmediatas: una respuesta 201 llega después del commit, no hace falta
 * reintentar (paso 0, punto 5).
 */
import {
    type Answerable,
    type AnswersQuestions,
    Question,
    type QuestionAdapter,
    type UsesAbilities,
} from '@serenity-js/core';

import Decimal from 'decimal.js';

import { QueryDatabase } from '../../abilities/QueryDatabase';
import { notas } from '../../notes/NotasDeSesion';
import { canonico } from '../api/Monto';

// ---------- filas, con los tipos que devuelve `pg` (NUMERIC y BIGINT como texto) ----------

export type FilaDeUsuario = {
    id: string;
    email: string;
    password_hash: string;
    full_name: string;
    country: string;
    base_currency: string;
    document_type: string;
    document_last4: string;
};

export type FilaDeOrden = {
    id: string;
    instrument_id: string;
    side: string;
    type: string;
    quantity: string;
    status: string;
    executed_price: string | null;
    gross: string;
    commission: string;
    total: string;
    currency: string;
    reject_code: string | null;
};

export type FilaDeTransaccion = {
    type: string;
    amount: string;
    currency: string;
    order_id: string | null;
};

export type FilaDePosicion = {
    instrument_id: string;
    quantity: string;
    avg_cost: string;
    currency: string;
};

// ---------- SQL ----------

const Sql = {
    usuarioPorId: `
        SELECT id, email, password_hash, full_name, country, base_currency, document_type, document_last4
        FROM users WHERE id = $1`,
    usuariosPorEmail: 'SELECT COUNT(*) AS total FROM users WHERE email = $1',
    ordenPorId: `
        SELECT id, instrument_id, side, type, quantity, status, executed_price, gross, commission, total,
               currency, reject_code
        FROM orders WHERE id = $1 AND user_id = $2`,
    ordenesDelUsuario: 'SELECT COUNT(*) AS total FROM orders WHERE user_id = $1',
    ordenesDelUsuarioPorLado: 'SELECT COUNT(*) AS total FROM orders WHERE user_id = $1 AND side = $2',
    transaccionesDeLaOrden: `
        SELECT type, amount, currency, order_id
        FROM transactions WHERE order_id = $1 AND user_id = $2 ORDER BY type`,
    transaccionesDelUsuario: 'SELECT COUNT(*) AS total FROM transactions WHERE user_id = $1',
    transaccionesDelUsuarioPorTipo: 'SELECT COUNT(*) AS total FROM transactions WHERE user_id = $1 AND type = $2',
    posicion: `
        SELECT instrument_id, quantity, avg_cost, currency
        FROM positions WHERE user_id = $1 AND instrument_id = $2`,
    posicionesDelUsuario: `
        SELECT instrument_id, quantity, avg_cost, currency
        FROM positions WHERE user_id = $1 ORDER BY instrument_id`,
    saldo: 'SELECT available FROM accounts WHERE user_id = $1 AND currency = $2',
    sesionesActivas: 'SELECT COUNT(*) AS total FROM refresh_tokens WHERE user_id = $1 AND revoked_at IS NULL',
} as const;

// ---------- ayudas ----------

type Actor = AnswersQuestions & UsesAbilities;

const usuarioDelActor = (actor: Actor): Promise<string> => actor.answer(notas().get('usuarioId'));

const consultar = <T extends Record<string, unknown>>(
    actor: Actor,
    sql: string,
    params: readonly unknown[],
): Promise<T[]> => QueryDatabase.as(actor).rows<T>('mila', sql, params);

/** Una fila que falta fallaría después como "Cannot read properties of undefined": mejor decirlo acá. */
const laUnica = <T>(filas: T[], que: string): T => {
    const [fila] = filas;
    if (fila === undefined) throw new Error(`No hay fila en la base: ${que}`);
    return fila;
};

/** `COUNT(*)` llega como texto (`bigint`): se convierte acá, no en el SQL. */
const contar = async (actor: Actor, sql: string, params: readonly unknown[]): Promise<number> =>
    Number((await consultar<{ total: string }>(actor, sql, params))[0]?.total ?? 0);

// ---------- preguntas ----------

export const Fila = {
    /** La fila del usuario del actor en `users`. */
    delUsuario: (): QuestionAdapter<FilaDeUsuario> =>
        Question.about('la fila de #actor en users', async (actor) => {
            const id = await usuarioDelActor(actor);
            return laUnica(await consultar<FilaDeUsuario>(actor, Sql.usuarioPorId, [id]), `users.id = ${id}`);
        }),

    /** La fila de la última orden que la API le aceptó al actor. */
    deLaUltimaOrden: (): QuestionAdapter<FilaDeOrden> =>
        Question.about('la fila de la última orden en orders', async (actor) => {
            const orden = await actor.answer(notas().get('ultimaOrden'));
            const filas = await consultar<FilaDeOrden>(actor, Sql.ordenPorId, [orden.id, await usuarioDelActor(actor)]);
            return laUnica(filas, `orders.id = ${orden.id}`);
        }),

    /** La posición del actor en un instrumento. */
    deLaPosicionEn: (instrumento: Answerable<string>): QuestionAdapter<FilaDePosicion> =>
        Question.about('la fila de la posición en positions', async (actor) => {
            const id = await actor.answer(instrumento);
            const filas = await consultar<FilaDePosicion>(actor, Sql.posicion, [await usuarioDelActor(actor), id]);
            return laUnica(filas, `positions de ${id}`);
        }),
};

export const Filas = {
    /** Las transacciones de la última orden (`BUY`/`SELL` y `FEE`), ordenadas por tipo. */
    deTransaccionesDeLaUltimaOrden: (): QuestionAdapter<FilaDeTransaccion[]> =>
        Question.about('las transacciones de la última orden en transactions', async (actor) => {
            const orden = await actor.answer(notas().get('ultimaOrden'));
            return consultar<FilaDeTransaccion>(actor, Sql.transaccionesDeLaOrden, [orden.id, await usuarioDelActor(actor)]);
        }),

    /** Los tipos de las transacciones de la última orden (`['BUY', 'FEE']`). */
    tiposDeTransaccionesDeLaUltimaOrden: (): QuestionAdapter<string[]> =>
        Question.about('los tipos de transacción de la última orden en transactions', async (actor) =>
            (await actor.answer(Filas.deTransaccionesDeLaUltimaOrden())).map((fila) => fila.type),
        ),

    /** Las posiciones del actor como `INSTRUMENTO:cantidad`, por instrumento. */
    dePosiciones: (): QuestionAdapter<string[]> =>
        Question.about('las posiciones de #actor en positions', async (actor) =>
            (await consultar<FilaDePosicion>(actor, Sql.posicionesDelUsuario, [await usuarioDelActor(actor)])).map(
                (fila) => `${fila.instrument_id}:${fila.quantity}`,
            ),
        ),
};

export const Cantidad = {
    /** Órdenes del actor; con `lado`, solo las de compra (`BUY`) o venta (`SELL`). */
    deOrdenes: (lado?: 'BUY' | 'SELL'): QuestionAdapter<number> =>
        Question.about(`la cantidad de órdenes${lado ? ` ${lado}` : ''} de #actor en la base`, async (actor) => {
            const id = await usuarioDelActor(actor);
            return lado === undefined
                ? contar(actor, Sql.ordenesDelUsuario, [id])
                : contar(actor, Sql.ordenesDelUsuarioPorLado, [id, lado]);
        }),

    deTransacciones: (tipo?: 'DEPOSIT' | 'BUY' | 'SELL' | 'FEE'): QuestionAdapter<number> =>
        Question.about(`la cantidad de transacciones${tipo ? ` ${tipo}` : ''} de #actor en la base`, async (actor) => {
            const id = await usuarioDelActor(actor);
            return tipo === undefined
                ? contar(actor, Sql.transaccionesDelUsuario, [id])
                : contar(actor, Sql.transaccionesDelUsuarioPorTipo, [id, tipo]);
        }),

    deUsuariosConEmail: (email: Answerable<string>): QuestionAdapter<number> =>
        Question.about('la cantidad de usuarios con ese email en la base', async (actor) =>
            contar(actor, Sql.usuariosPorEmail, [(await actor.answer(email)).toLowerCase()]),
        ),

    /** Refresh tokens del actor sin revocar: sus sesiones vivas. */
    deSesionesActivas: (): QuestionAdapter<number> =>
        Question.about('la cantidad de sesiones activas de #actor en la base', async (actor) =>
            contar(actor, Sql.sesionesActivas, [await usuarioDelActor(actor)]),
        ),
};

export const Existe = {
    laPosicionEn: (instrumento: Answerable<string>): QuestionAdapter<boolean> =>
        Question.about('si existe la posición en la base', async (actor) => {
            const filas = await consultar(actor, Sql.posicion, [await usuarioDelActor(actor), await actor.answer(instrumento)]);
            return filas.length > 0;
        }),
};

export const Saldo = {
    /** Lo que movió la última orden en el saldo del actor: la suma de sus transacciones, con signo. */
    movidoPorLaUltimaOrden: (): QuestionAdapter<string> =>
        Question.about('lo que movió la última orden según transactions', async (actor) => {
            const filas = await actor.answer(Filas.deTransaccionesDeLaUltimaOrden());
            return canonico(filas.reduce((total, fila) => total.plus(fila.amount), new Decimal(0)));
        }),

    /** El saldo disponible del actor en una moneda, según `accounts.available`, en forma canónica. */
    enLaBase: (moneda: string): QuestionAdapter<string> =>
        Question.about(`el saldo disponible en ${moneda} según la base`, async (actor) => {
            const id = await usuarioDelActor(actor);
            const fila = laUnica(await consultar<{ available: string }>(actor, Sql.saldo, [id, moneda]), `accounts ${moneda} de ${id}`);
            return canonico(fila.available);
        }),
};
