/**
 * Configuración de la suite. **Único lugar que lee `process.env`.**
 *
 * | Variable | Default | Para qué |
 * |---|---|---|
 * | `BASE_URL` | `http://localhost:8000` | dónde responde la API bajo prueba |
 * | `DATABASE_URL` | `postgres://mila:mila@localhost:5433/mila` | la base de la API (la del compose, **nunca** la del 5432) |
 * | `MILA_API_PATH` | `../mila-invest-api` | repo de la API, para `contract:sync` |
 * | `WORKERS` | la mitad de los núcleos | workers del proyecto paralelo |
 * | `REPORT_HISTORY` | `5` | corridas que acumula el reporte de Serenity/JS (`1` = solo la última) |
 * | `CI` | ausente | activa un reintento y prohíbe `.only` |
 *
 * Un `.env` en la raíz del repo pisa los defaults (ver `.env.example`).
 */
import path from 'node:path';

import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../../.env'), quiet: true });

const read = (name: string, fallback: string): string => {
    const value = process.env[name];
    return value === undefined || value === '' ? fallback : value;
};

const readOptionalNumber = (name: string): number | undefined => {
    const raw = process.env[name];
    if (raw === undefined || raw === '') return undefined;
    const value = Number(raw);
    if (!Number.isInteger(value) || value < 1) {
        throw new Error(`${name} tiene que ser un entero positivo (vino "${raw}")`);
    }
    return value;
};

export const env = {
    /** Base de la API bajo prueba, sin `/api/v1` (las rutas del contrato ya lo traen). */
    baseUrl: read('BASE_URL', 'http://localhost:8000'),

    /** Base de datos de la API: la suite solo la lee, con una sesión de solo lectura. */
    databaseUrl: read('DATABASE_URL', 'postgres://mila:mila@localhost:5433/mila'),

    /** Raíz del repo `mila-invest-api`, relativa a la raíz de este repo o absoluta. */
    milaApiPath: read('MILA_API_PATH', '../mila-invest-api'),

    /** Workers del proyecto paralelo; sin definir, decide Playwright. */
    workers: readOptionalNumber('WORKERS'),

    /**
     * Corridas que guarda el reporte de Serenity/JS (`maxHistory`). `1` muestra
     * solo la última; con 5 o más el reporte puede clasificar la consistencia
     * (flaky, degradado…), porque usa una ventana de cinco corridas.
     */
    reportHistory: readOptionalNumber('REPORT_HISTORY') ?? 5,

    /** `true` dentro de CI. */
    isCI: Boolean(process.env.CI),

    /** Timeouts, en milisegundos. No hay esperas fijas: son techos. */
    timeouts: {
        /** Techo de cada escenario. */
        scenario: 30_000,
        /** Techo de cada petición HTTP. */
        request: 10_000,
        /** Techo del chequeo de `/health` antes de empezar. */
        health: 10_000,
    },
} as const;
