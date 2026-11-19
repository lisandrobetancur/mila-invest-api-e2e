import { isSafeNumber, parse } from 'lossless-json';

/**
 * `transformResponse` de axios: parsea JSON sin perder dígitos.
 *
 * La API manda los montos como string decimal (`"8000000.00"`), así que ya
 * llegan exactos; esto cubre lo que sí viaja como número (cantidades,
 * volumen): un número que `JSON.parse` cambiaría (más de ~15 dígitos
 * significativos) llega como su texto original. Lo que no es JSON pasa intacto.
 */
export function parsearJsonSinPerderDigitos(data: unknown): unknown {
    if (typeof data !== 'string' || data.trim() === '') {
        return data;
    }
    try {
        return parse(data, null, (valor: string) => (isSafeNumber(valor) ? Number(valor) : valor));
    } catch {
        return data;
    }
}
