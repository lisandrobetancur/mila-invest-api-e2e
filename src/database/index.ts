import { env } from '../config/env';
import { PostgresSqlClient } from './adapters/PostgresSqlClient';
import type { SqlClient } from './SqlClient';

export type { Fila, SqlClient } from './SqlClient';

/**
 * Las bases que lee la suite, un cliente por base. El fixture de worker
 * `databases` las abre una vez por worker y las cierra en su teardown.
 */
export type Databases = {
    /** La base de `mila-invest-api`. */
    mila: SqlClient;
};

/** Único lugar que conoce los drivers. Otro motor = otro adaptador acá. */
const crearCliente = (connectionString: string, applicationName: string): SqlClient => {
    const protocolo = new URL(connectionString).protocol;
    switch (protocolo) {
        case 'postgres:':
        case 'postgresql:':
            return new PostgresSqlClient(connectionString, applicationName);
        default:
            throw new Error(`No hay adaptador para ${protocolo} en src/database/adapters.`);
    }
};

export const abrirBases = (workerIndex: number): Databases => ({
    mila: crearCliente(env.databaseUrl, `mila-invest-api-tests-worker-${workerIndex}`),
});

export const cerrarBases = async (databases: Databases): Promise<void> => {
    const clientes = Object.values<SqlClient>(databases);
    await Promise.all(clientes.map((cliente) => cliente.close()));
};
