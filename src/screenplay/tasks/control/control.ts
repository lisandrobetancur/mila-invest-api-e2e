/**
 * Control del estado **global** de la API (`/_testing`): reloj, mercado,
 * precios y reset. Afectan a todos los usuarios, así que solo se usan en
 * specs `*.serial.spec.ts`, que corren en el proyecto `api-serial`, con un
 * worker y después del proyecto paralelo.
 */
import { type Answerable, Question, Task } from '@serenity-js/core';

import { Endpoints } from '../../contract/contract.generated';
import { Http } from '../../interactions/Http';
import type { Pais } from '../preparacion/datos';

const PAISES: readonly Pais[] = ['CO', 'MX', 'PE'];

const fijarElReloj = (descripcion: string, instante: Answerable<string | null>): Task =>
    Task.where(descripcion, Http.exigiendoExito.post(Endpoints.postTestingClock, Question.fromObject({ now: instante })));

export const DetenerElReloj = {
    /** En un instante ISO 8601 (`2026-11-21T15:00:00Z`). */
    en: (instante: string): Task => fijarElReloj(`#actor detiene el reloj de la API en ${instante}`, instante),
    /** Tantos minutos después de ahora: para que venza un token emitido antes. */
    dentroDe: (minutos: number): Task =>
        fijarElReloj(
            `#actor adelanta y detiene el reloj de la API ${minutos} minutos`,
            Question.about(`dentro de ${minutos} minutos`, () => new Date(Date.now() + minutos * 60_000).toISOString()),
        ),
};

export const LiberarElReloj = (): Task => fijarElReloj('#actor libera el reloj de la API', null);

export const CongelarElPrecio = {
    de: (instrumento: string) => ({
        en: (precio: string): Task =>
            Task.where(
                `#actor congela el precio de ${instrumento} en ${precio}`,
                Http.exigiendoExito.post(
                    Endpoints.postTestingPricesByInstrumentId,
                    { price: precio },
                    { ruta: { instrument_id: instrumento } },
                ),
            ),
    }),
};

export const LiberarElPrecio = {
    de: (instrumento: string): Task =>
        Task.where(
            `#actor libera el precio de ${instrumento}`,
            Http.exigiendoExito.post(Endpoints.postTestingPricesByInstrumentId, { price: null }, { ruta: { instrument_id: instrumento } }),
        ),
};

const forzarElMercado = (pais: Pais, siempreAbierto: boolean | null, como: string): Task =>
    Task.where(
        `#actor hace que el mercado de ${pais} ${como}`,
        Http.exigiendoExito.post(Endpoints.postTestingMarketByCountry, { always_open: siempreAbierto }, { ruta: { country: pais } }),
    );

export const ForzarElMercado = {
    de: (pais: Pais) => ({
        /** Cerrado fuera del horario simulado de §8.1. */
        aRespetarSuHorario: (): Task => forzarElMercado(pais, false, 'respete su horario'),
        aEstarSiempreAbierto: (): Task => forzarElMercado(pais, true, 'esté siempre abierto'),
    }),
};

/** Trunca la base y vuelve a correr el seed. Borra los datos de **todos**. */
export const RestablecerLosDatos = (): Task =>
    Task.where('#actor restablece los datos de la API', Http.exigiendoExito.post(Endpoints.postTestingReset));

/**
 * Deja la API como la encontró: reloj libre y mercados con su valor por
 * defecto (`MARKET_ALWAYS_OPEN`). Para el `afterEach` de los specs seriales.
 */
export const DevolverElControl = (...preciosCongelados: string[]): Task =>
    Task.where(
        '#actor devuelve el reloj, el mercado y los precios a su estado normal',
        LiberarElReloj(),
        ...PAISES.map((pais) => forzarElMercado(pais, null, 'vuelva a su valor por defecto')),
        ...preciosCongelados.map((instrumento) => LiberarElPrecio.de(instrumento)),
    );
