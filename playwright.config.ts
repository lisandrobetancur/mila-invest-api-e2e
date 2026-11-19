/**
 * Playwright Test corre la suite; Serenity/JS agrega Screenplay y su reporte HTML.
 *
 * Dos proyectos, porque todos los escenarios comparten una base:
 *
 * - `api`: el grueso, en paralelo. Cada escenario crea su propio usuario y
 *   afirma solo sobre sus datos, así que el orden no importa.
 * - `api-serial`: los `*.serial.spec.ts`, que tocan estado global de la API
 *   (reloj, mercado, precios congelados, reset). Un solo worker y **después**
 *   de `api` (`dependencies`), para no mezclarse nunca con el resto.
 *
 * Pasar `--reporter=…` por línea de comandos reemplaza los reporters de acá, y
 * entonces no se genera el reporte de Serenity/JS.
 */
import { defineConfig } from '@playwright/test';
import type { SerenityFixtures, SerenityWorkerFixtures } from '@serenity-js/playwright-test';

import { env } from './src/config/env';

const SERIAL = /.*\.serial\.spec\.ts$/;

export default defineConfig<SerenityFixtures, SerenityWorkerFixtures>({
    testDir: './spec',
    outputDir: './test-results',
    globalSetup: './src/global-setup.ts',
    fullyParallel: true,
    forbidOnly: env.isCI,
    retries: env.isCI ? 1 : 0,
    workers: env.workers,
    timeout: env.timeouts.scenario,

    reporter: [
        ['line'],
        ['html', { open: 'never' }],
        [
            '@serenity-js/playwright-test',
            {
                crew: [
                    '@serenity-js/console-reporter',
                    // El reporte HTML de Serenity/JS: un `index.html` autocontenido que
                    // genera la propia corrida. No necesita Java ni el CLI de Serenity BDD.
                    [
                        '@serenity-js/html-reporter',
                        {
                            outputDirectory: './reports/serenity-js',
                            specDirectory: './spec',
                            title: 'MILA Invest · API',
                            // Cuántas corridas acumula (`REPORT_HISTORY`, 5 por defecto).
                            // Sin límite `data.js` crece sin parar. `npm run clean` lo reinicia.
                            maxHistory: env.reportHistory,
                        },
                    ],
                ],
            },
        ],
    ],

    use: {
        baseURL: env.baseUrl,
        defaultActorName: 'Camila',
        // Solo API: sin fotógrafo (necesita una página). El reporte trae las
        // peticiones y respuestas de cada `Send`.
        crew: [],
    },

    projects: [
        {
            name: 'api',
            testIgnore: SERIAL,
        },
        {
            name: 'api-serial',
            testMatch: SERIAL,
            workers: 1,
            fullyParallel: false,
            dependencies: ['api'],
        },
    ],
});
