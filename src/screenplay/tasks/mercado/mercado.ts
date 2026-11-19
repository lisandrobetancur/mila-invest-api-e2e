import { equals } from '@serenity-js/assertions';
import { Check, Question, Task } from '@serenity-js/core';

import { type Consulta, Endpoints } from '../../contract/contract.generated';
import { Http } from '../../interactions/Http';
import { notas } from '../../notes/NotasDeSesion';
import { Estado, Respuesta } from '../../questions/api';

type Filtros = Consulta<'getInstruments'>;
type Rango = NonNullable<Consulta<'getInstrumentsByIdPrices'>['range']>;

const describirFiltros = (filtros: Filtros): string => {
    const partes = Object.entries(filtros).map(([clave, valor]) => `${clave}=${String(valor)}`);
    return partes.length === 0 ? '' : ` (${partes.join(', ')})`;
};

const listarInstrumentos = (descripcion: string, consulta: Filtros | ReturnType<typeof Question.about<Filtros>>): Task =>
    Task.where(
        descripcion,
        Http.get(Endpoints.getInstruments, { consulta }),
        Check.whether(Respuesta.estado(), equals(Estado.Ok)).andIfSo(
            notas().set('siguienteCursor', Respuesta.campo<string | null>('next_cursor')),
        ),
    );

/** Lista los instrumentos, con los filtros del contrato (`country`, `type`, `q`, `limit`). */
export const ExplorarElMercado = {
    todo: (): Task => listarInstrumentos('#actor explora el mercado', {}),
    con: (filtros: Filtros): Task => listarInstrumentos(`#actor explora el mercado${describirFiltros(filtros)}`, filtros),
};

/** La página siguiente a la última listada, con su `next_cursor`. */
export const VerLaSiguientePagina = (limite: number): Task =>
    listarInstrumentos(
        `#actor pide la página siguiente, de ${limite}`,
        Question.about('el cursor de la página siguiente', async (actor) => {
            const cursor = await actor.answer(notas().get('siguienteCursor'));
            if (cursor === null) throw new Error('La página anterior era la última: no hay next_cursor');
            return { cursor, limit: limite };
        }),
    );

export const VerElInstrumento = {
    conId: (id: string): Task =>
        Task.where(`#actor ve el detalle de ${id}`, Http.get(Endpoints.getInstrumentsById, { ruta: { id } })),
};

export const VerLosPrecios = {
    de: (id: string) => ({
        enElRango: (rango: Rango): Task =>
            Task.where(
                `#actor ve los precios de ${id} en el rango ${rango}`,
                Http.get(Endpoints.getInstrumentsByIdPrices, { ruta: { id }, consulta: { range: rango } }),
            ),
        /** Un rango que el contrato no admite. */
        enUnRangoInvalido: (rango: string): Task =>
            Task.where(
                `#actor pide los precios de ${id} en el rango ${rango}`,
                Http.get(Endpoints.getInstrumentsByIdPrices, { ruta: { id }, consulta: { range: rango as Rango } }),
            ),
    }),
};
