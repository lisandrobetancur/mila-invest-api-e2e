import { notes } from '@serenity-js/core';
import type { z } from 'zod';

import type { Esquemas } from '../contract/contract.generated';
import type { ResumenDelPortafolio } from '../questions/api/Portafolio';
import type { Secreto } from './Secreto';

export type Orden = z.output<(typeof Esquemas)['postOrders']>;
export type Transaccion = z.output<(typeof Esquemas)['postAccountsByCurrencyDeposits']>;

/**
 * Lo que un escenario lleva de un paso al siguiente. Las tareas escriben acá
 * y no devuelven valores; cada actor tiene su propia libreta.
 */
export interface NotasDeSesion {
    /** El usuario del escenario: lo crea el propio escenario, nunca se comparte. */
    usuarioId: string;
    email: string;
    password: Secreto;

    accessToken: Secreto;
    refreshToken: Secreto;
    /** El refresh token antes de la última renovación, para probar que ya no sirve. */
    refreshAnterior: Secreto;

    /** La última orden que la API aceptó (201), tal como la devolvió. */
    ultimaOrden: Orden;
    /** El último depósito que la API aceptó (201). */
    ultimoDeposito: Transaccion;
    /** Los totales del último `GET /portfolio` exitoso. */
    resumenDelPortafolio: ResumenDelPortafolio;
    /** El `next_cursor` de la última página listada. */
    siguienteCursor: string | null;
}

export const notas = () => notes<NotasDeSesion>();
