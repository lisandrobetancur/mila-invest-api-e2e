import { Ability } from '@serenity-js/core';

import type { Databases, Fila } from '../../database';

/**
 * Le permite al actor **leer** las bases de la API. Los clientes se abren una
 * vez por worker (fixture `databases`) y se cierran en su teardown.
 *
 * Solo la usan las preguntas de `questions/db`: es el único lugar con SQL.
 */
export class QueryDatabase extends Ability {
    static using(databases: Databases): QueryDatabase {
        return new QueryDatabase(databases);
    }

    constructor(private readonly databases: Databases) {
        super();
    }

    rows<T extends Fila = Fila>(database: keyof Databases, sql: string, params: readonly unknown[] = []): Promise<T[]> {
        return this.databases[database].query<T>(sql, params);
    }
}
