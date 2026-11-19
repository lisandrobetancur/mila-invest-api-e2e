import { equals } from '@serenity-js/assertions';
import { Check, Task } from '@serenity-js/core';

import { type Consulta, Endpoints } from '../../contract/contract.generated';
import { Http } from '../../interactions/Http';
import { notas } from '../../notes/NotasDeSesion';
import { Estado, Portafolio, Respuesta } from '../../questions/api';

type FiltrosDeActividad = Consulta<'getTransactions'>;

/** Si la API responde, deja los totales en `resumenDelPortafolio` para compararlos después. */
export const ConsultarElPortafolio = (): Task =>
    Task.where(
        '#actor consulta su portafolio',
        Http.get(Endpoints.getPortfolio),
        Check.whether(Respuesta.estado(), equals(Estado.Ok)).andIfSo(notas().set('resumenDelPortafolio', Portafolio.resumen())),
    );

export const ConsultarLaActividad = Object.assign(
    (): Task => Task.where('#actor consulta su actividad', Http.get(Endpoints.getTransactions)),
    {
        filtrando: (filtros: FiltrosDeActividad): Task =>
            Task.where(
                `#actor consulta su actividad (${Object.entries(filtros)
                    .map(([clave, valor]) => `${clave}=${String(valor)}`)
                    .join(', ')})`,
                Http.get(Endpoints.getTransactions, { consulta: filtros }),
            ),
    },
);

export const ConsultarElResumen = (): Task =>
    Task.where('#actor consulta el resumen de su inicio', Http.get(Endpoints.getDashboardSummary));
