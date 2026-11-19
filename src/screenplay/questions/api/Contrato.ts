import { Question, type QuestionAdapter } from '@serenity-js/core';
import { LastResponse } from '@serenity-js/rest';
import type { z } from 'zod';

/**
 * Las violaciones de un esquema del contrato en la última respuesta, una
 * línea legible por campo: `total: expected string, received 41098.36`.
 * Vacía si el cuerpo cumple.
 */
export const violacionesDe = (esquema: z.ZodType, nombre: string): QuestionAdapter<string[]> =>
    Question.about(`las violaciones del contrato en ${nombre}`, async (actor) => {
        const cuerpo: unknown = await actor.answer(LastResponse.body());
        const resultado = esquema.safeParse(cuerpo);
        return resultado.success ? [] : resultado.error.issues.map((issue) => describir(issue, cuerpo));
    });

/**
 * El estado de la última respuesta y, si es un error, su código y detalle:
 * `"201"` o `"422 INSUFFICIENT_FUNDS — Available 12000.00 COP"`. Para que un
 * paso de preparación que falla diga por qué.
 */
export const estadoConElProblema = (): QuestionAdapter<string> =>
    Question.about('el estado de la última respuesta', async (actor) => {
        const estado = await actor.answer(LastResponse.status());
        if (estado < 400) return String(estado);
        const cuerpo: unknown = await actor.answer(LastResponse.body());
        const problema = (cuerpo ?? {}) as { code?: unknown; detail?: unknown };
        const codigo = typeof problema.code === 'string' ? problema.code : '';
        const detalle = typeof problema.detail === 'string' ? problema.detail : JSON.stringify(cuerpo);
        return `${estado} ${codigo} — ${detalle}`;
    });

function describir(issue: z.core.$ZodIssue, raiz: unknown): string {
    const ruta = issue.path.map(String).join('.') || '(raíz)';
    const recibido = issue.path.reduce<unknown>(
        (valor, clave) =>
            valor !== null && typeof valor === 'object' ? (valor as Record<PropertyKey, unknown>)[clave] : undefined,
        raiz,
    );
    if (issue.code === 'invalid_type') {
        return recibido === undefined
            ? `${ruta}: falta (se esperaba ${issue.expected})`
            : `${ruta}: se esperaba ${issue.expected}, llegó ${JSON.stringify(recibido)}`;
    }
    return `${ruta}: ${issue.message} (llegó ${JSON.stringify(recibido)})`;
}
