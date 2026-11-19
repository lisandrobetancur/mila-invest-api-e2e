import { inspect } from 'node:util';

/**
 * Un valor que no tiene que llegar al reporte. Serenity/JS imprime las notas
 * en el paso que las guarda; un `Secreto` sale como `******` y solo
 * `revelar()` entrega el valor.
 */
export class Secreto {
    readonly #valor: string;

    constructor(valor: string) {
        this.#valor = valor;
    }

    revelar(): string {
        return this.#valor;
    }

    toJSON(): string {
        return '******';
    }

    toString(): string {
        return '******';
    }

    [inspect.custom](): string {
        return '******';
    }
}
