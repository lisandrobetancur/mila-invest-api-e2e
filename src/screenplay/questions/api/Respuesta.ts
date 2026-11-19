import { Question, type QuestionAdapter } from '@serenity-js/core';
import { LastResponse } from '@serenity-js/rest';

/**
 * Los estados HTTP con nombre. Los specs nunca escriben un número: afirman
 * `equals(Estado.Creado)`.
 */
export const Estado = {
    Ok: 200,
    Creado: 201,
    SinContenido: 204,
    NoAutorizado: 401,
    NoEncontrado: 404,
    Conflicto: 409,
    NoProcesable: 422,
} as const;

/** Preguntas sobre la última respuesta. Se reevalúan en cada uso (la respuesta ya está en memoria). */
export const Respuesta = {
    estado: (): QuestionAdapter<number> => LastResponse.status(),

    cuerpo: <T = unknown>(): QuestionAdapter<T> => LastResponse.body<T>(),

    /**
     * Un campo del cuerpo por su ruta con puntos: `'status'`,
     * `'tokens.access_token'`, `'items.0.id'`. Falla si no existe.
     */
    campo: <T = unknown>(ruta: string): QuestionAdapter<T> =>
        Question.about(`el campo ${ruta} de la respuesta`, async (actor) => {
            const cuerpo: unknown = await actor.answer(LastResponse.body());
            return leerCampo<T>(cuerpo, ruta);
        }),

    /** Cuántos elementos trae un listado (`items` paginado o un arreglo plano). */
    cantidadDeElementos: (): QuestionAdapter<number> =>
        Question.about('la cantidad de elementos de la respuesta', async (actor) => elementosDe(await actor.answer(LastResponse.body())).length),

    /** Cuántos elementos tiene el arreglo en una ruta del cuerpo: `cantidadEn('points')`. */
    cantidadEn: (ruta: string): QuestionAdapter<number> =>
        Question.about(`la cantidad de elementos en ${ruta}`, async (actor) => {
            const valor = leerCampo<unknown>(await actor.answer(LastResponse.body()), ruta);
            if (!Array.isArray(valor)) throw new Error(`${ruta} no es un arreglo: ${JSON.stringify(valor)}`);
            return valor.length;
        }),

    /** Los valores de un campo en cada elemento de un listado: `valoresDe('country')`. */
    valoresDe: <T = unknown>(campo: string): QuestionAdapter<T[]> =>
        Question.about(`los valores de ${campo} en el listado`, async (actor) =>
            elementosDe(await actor.answer(LastResponse.body())).map((elemento) => leerCampo<T>(elemento, campo)),
        ),

    /** Un header de la última respuesta; vacío si no vino. */
    header: (nombre: string): QuestionAdapter<string> =>
        Question.about(`el header ${nombre}`, async (actor) => {
            const valor: unknown = (await actor.answer(LastResponse.headers()))[nombre.toLowerCase()];
            return Array.isArray(valor) ? valor.join('; ') : typeof valor === 'string' ? valor : '';
        }),
};

export function leerCampo<T>(raiz: unknown, ruta: string): T {
    let valor: unknown = raiz;
    for (const clave of ruta.split('.')) {
        if (valor === null || typeof valor !== 'object' || !(clave in valor)) {
            throw new Error(`La respuesta no tiene el campo ${ruta} (falta ${clave}): ${JSON.stringify(raiz)}`);
        }
        valor = (valor as Record<string, unknown>)[clave];
    }
    return valor as T;
}

export function elementosDe(cuerpo: unknown): unknown[] {
    if (Array.isArray(cuerpo)) return cuerpo;
    if (cuerpo !== null && typeof cuerpo === 'object' && Array.isArray((cuerpo as { items?: unknown }).items)) {
        return (cuerpo as { items: unknown[] }).items;
    }
    throw new Error(`La respuesta no es un listado: ${JSON.stringify(cuerpo)}`);
}
