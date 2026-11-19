import pg from 'pg';

import type { Fila, SqlClient } from '../SqlClient';

/**
 * Adaptador de PostgreSQL sobre un pool de `pg`.
 *
 * La sesión es de **solo lectura** (`default_transaction_read_only`): la suite
 * verifica datos, nunca los escribe. Todo lo que cambia estado pasa por la API.
 *
 * `pg` devuelve `NUMERIC` y `BIGINT` como texto: los montos llegan exactos
 * (`"8000000.0000"`) y las preguntas los comparan con `Decimal`.
 */
export class PostgresSqlClient implements SqlClient {
    readonly nombre: string;
    private readonly pool: pg.Pool;

    constructor(connectionString: string, applicationName: string) {
        const url = new URL(connectionString);
        this.nombre = `${url.hostname}:${url.port || '5432'}${url.pathname}`;
        this.pool = new pg.Pool({
            connectionString,
            max: 2,
            application_name: applicationName,
            options: '-c default_transaction_read_only=on',
        });
    }

    async query<T extends Fila = Fila>(sql: string, params: readonly unknown[] = []): Promise<T[]> {
        try {
            const result = await this.pool.query<T>(sql, [...params]);
            return result.rows;
        } catch (error) {
            throw new Error(
                `La consulta a ${this.nombre} falló: ${error instanceof Error ? error.message : String(error)}\n` +
                    `SQL: ${sql.trim().replace(/\s+/g, ' ')}\nParámetros: ${JSON.stringify(params)}`,
                { cause: error },
            );
        }
    }

    async close(): Promise<void> {
        await this.pool.end();
    }
}
