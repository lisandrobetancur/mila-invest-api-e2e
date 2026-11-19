/**
 * La **única** extensión del `test` de `@serenity-js/playwright-test`. Los
 * specs importan `describe`, `it` y los hooks de acá, nunca de
 * `@playwright/test`.
 *
 * - `databases`: un cliente por base y por worker, cerrado en el teardown.
 * - `axios`: `baseURL` de `env.ts`, JSON lossless (los montos conservan todos
 *   sus dígitos) y `validateStatus: () => true` (los estados los afirman las
 *   tareas y las preguntas, no axios).
 * - `actors`: un cast **solo de API**. El de Serenity/JS le da a cada actor
 *   `BrowseTheWebWithPlaywright`, que abre una página por test.
 * - `browser`: un sustituto. Serenity/JS pide el navegador del worker solo para
 *   etiquetar el reporte con su versión; sin esto lanzaría un Chromium por
 *   worker en una suite que nunca abre una página.
 */
import { Cast, TakeNotes } from '@serenity-js/core';
import { test as base } from '@serenity-js/playwright-test';
import { CallAnApi } from '@serenity-js/rest';
import axios from 'axios';
import type { Browser } from '@playwright/test';

import { env } from './config/env';
import { abrirBases, cerrarBases, type Databases } from './database';
import { QueryDatabase } from './screenplay/abilities/QueryDatabase';
import { parsearJsonSinPerderDigitos } from './screenplay/interactions/json';
import type { NotasDeSesion } from './screenplay/notes/NotasDeSesion';

interface WorkerFixtures {
    databases: Databases;
}

/** Lo único que Serenity/JS le pregunta al navegador: su versión, para el tag del reporte. */
const sinNavegador = { version: (): string => 'sin navegador (API)' } as unknown as Browser;

export const test = base.extend<object, WorkerFixtures>({
    browser: [
        // eslint-disable-next-line no-empty-pattern
        async ({}, use) => {
            await use(sinNavegador);
        },
        { scope: 'worker' },
    ],

    databases: [
        // eslint-disable-next-line no-empty-pattern
        async ({}, use, workerInfo) => {
            const databases = abrirBases(workerInfo.workerIndex);
            await use(databases);
            await cerrarBases(databases);
        },
        { scope: 'worker' },
    ],

    axios: async ({ baseURL }, use) => {
        await use(
            axios.create({
                baseURL: baseURL ?? env.baseUrl,
                transformResponse: [parsearJsonSinPerderDigitos],
                validateStatus: () => true,
                timeout: env.timeouts.request,
            }),
        );
    },

    actors: async ({ axios: cliente, databases }, use) => {
        await use(
            Cast.where((actor) =>
                actor.whoCan(
                    CallAnApi.using(cliente),
                    QueryDatabase.using(databases),
                    TakeNotes.usingAnEmptyNotepad<NotasDeSesion>(),
                ),
            ),
        );
    },
});

// La API de Playwright Test está pensada para desestructurarse (`test.describe`, `test.afterEach`).
// eslint-disable-next-line @typescript-eslint/unbound-method
export const { describe, afterEach, beforeEach } = test;
export const it = test;
