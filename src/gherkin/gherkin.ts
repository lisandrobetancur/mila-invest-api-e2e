/**
 * Gherkin dentro de `describe`/`it`, sin Cucumber.
 *
 * Cada palabra clave envuelve actividades en una `Task` cuyo nombre empieza
 * con ella, así el reporte HTML de Serenity/JS muestra los pasos
 * Dado/Cuando/Entonces como pasos de primer nivel del escenario.
 *
 * ```ts
 * await actorCalled('Camila').attemptsTo(
 *     Dado('que #actor tiene una cuenta con saldo', CrearUsuarioDePrueba.conSaldo('8000000', 'COP')),
 *     Cuando('compra 2 acciones de ISA', ComprarInstrumento.conId('ISA-CO').cantidad(2)),
 *     Entonces('la orden quedó ejecutada', LaOrdenQuedo.ejecutada()),
 * );
 * ```
 *
 * La convención completa está en
 * [`docs/writing-scenarios.md`](../../docs/writing-scenarios.md).
 */
import { type Activity, Task } from '@serenity-js/core';

const paso =
    (palabraClave: string) =>
    (descripcion: string, ...actividades: Activity[]): Task =>
        Task.where(`${palabraClave} ${descripcion}`, ...actividades);

/** Contexto del escenario. */
export const Dado = paso('Dado');

/** La acción que se está probando. */
export const Cuando = paso('Cuando');

/** El resultado observable. */
export const Entonces = paso('Entonces');

/** Encadena con el paso anterior. */
export const Y = paso('Y');

/** Contrasta con el paso anterior. */
export const Pero = paso('Pero');

/** Título de una característica, para el `describe` de cada archivo. */
export const Caracteristica = (titulo: string): string => `Característica: ${titulo}`;

/** Título de una regla, para un `describe` anidado. */
export const Regla = (titulo: string): string => `Regla: ${titulo}`;

/** Título de un escenario, con sus tags al final. */
export const Escenario = (titulo: string, ...tags: string[]): string =>
    [`Escenario: ${titulo}`, ...tags].join(' ');

/** Título de un esquema del escenario, para un `describe` anidado. */
export const EsquemaDelEscenario = (titulo: string): string => `Esquema del escenario: ${titulo}`;
