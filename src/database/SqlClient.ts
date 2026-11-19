/**
 * Contrato de los adaptadores de base de datos.
 *
 * Las consultas usan parámetros posicionales `$1, $2…` y nunca interpolan
 * valores. Un adaptador para otro motor traduce los marcadores a la sintaxis
 * de su driver; cambiar de motor es escribir otro adaptador y nombrarlo en
 * `database/index.ts`.
 */
export type Fila = Record<string, unknown>;

export interface SqlClient {
    /** Nombre legible de la base, para los mensajes de error. */
    readonly nombre: string;
    query<T extends Fila = Fila>(sql: string, params?: readonly unknown[]): Promise<T[]>;
    close(): Promise<void>;
}
