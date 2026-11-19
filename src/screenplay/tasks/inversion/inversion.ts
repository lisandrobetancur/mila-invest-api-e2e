import { equals } from '@serenity-js/assertions';
import { Check, Question, Task } from '@serenity-js/core';

import { Endpoints, Esquemas } from '../../contract/contract.generated';
import { Http } from '../../interactions/Http';
import { notas } from '../../notes/NotasDeSesion';
import { Estado, Respuesta } from '../../questions/api';

type Lado = 'BUY' | 'SELL';

const cuerpoDeLaOrden = (instrumento: string, lado: Lado, cantidad: number) => ({
    instrument_id: instrumento,
    side: lado,
    type: 'MARKET' as const,
    quantity: cantidad,
});

const ordenDeLaRespuesta = () =>
    Question.about('la orden de la respuesta', async (actor) => Esquemas.postOrders.parse(await actor.answer(Respuesta.cuerpo())));

/** Manda la orden. Si la API la acepta (201, ejecutada o rechazada), la guarda en `ultimaOrden`. */
const ordenar = (descripcion: string, instrumento: string, lado: Lado, cantidad: number): Task =>
    Task.where(
        descripcion,
        Http.post(Endpoints.postOrders, cuerpoDeLaOrden(instrumento, lado, cantidad)),
        Check.whether(Respuesta.estado(), equals(Estado.Creado)).andIfSo(notas().set('ultimaOrden', ordenDeLaRespuesta())),
    );

export const ComprarInstrumento = {
    conId: (instrumento: string) => ({
        cantidad: (cantidad: number): Task =>
            ordenar(`#actor compra ${cantidad} de ${instrumento} a mercado`, instrumento, 'BUY', cantidad),
    }),
};

export const VenderInstrumento = {
    conId: (instrumento: string) => ({
        cantidad: (cantidad: number): Task =>
            ordenar(`#actor vende ${cantidad} de ${instrumento} a mercado`, instrumento, 'SELL', cantidad),
    }),
};

const previsualizar = (instrumento: string, lado: Lado, cantidad: number): Task =>
    Task.where(
        `#actor previsualiza una ${lado === 'BUY' ? 'compra' : 'venta'} de ${cantidad} ${instrumento}`,
        Http.post(Endpoints.postOrdersPreview, cuerpoDeLaOrden(instrumento, lado, cantidad)),
    );

export const PrevisualizarLaOrden = {
    deCompra: (instrumento: string) => ({ cantidad: (cantidad: number): Task => previsualizar(instrumento, 'BUY', cantidad) }),
    deVenta: (instrumento: string) => ({ cantidad: (cantidad: number): Task => previsualizar(instrumento, 'SELL', cantidad) }),
};

export const ConsultarLaOrden = {
    /** `GET /orders/{id}` de la última orden aceptada. */
    ultima: (): Task =>
        Task.where(
            '#actor consulta su última orden',
            Http.get(Endpoints.getOrdersById, { ruta: { id: notas().get('ultimaOrden').id } }),
        ),
    conId: (id: string): Task => Task.where(`#actor consulta la orden ${id}`, Http.get(Endpoints.getOrdersById, { ruta: { id } })),
};

export const ConsultarSusOrdenes = (): Task => Task.where('#actor consulta sus órdenes', Http.get(Endpoints.getOrders));
