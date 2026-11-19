import { equals } from '@serenity-js/assertions';
import { Check, Question, Task } from '@serenity-js/core';

import { Endpoints, Esquemas } from '../../contract/contract.generated';
import { Http } from '../../interactions/Http';
import { notas } from '../../notes/NotasDeSesion';
import { Estado, Respuesta } from '../../questions/api';

const depositoDeLaRespuesta = () =>
    Question.about('el depósito de la respuesta', async (actor) =>
        Esquemas.postAccountsByCurrencyDeposits.parse(await actor.answer(Respuesta.cuerpo())),
    );

/**
 * `Depositar.monto('1000000').en('COP')`. El monto viaja como string decimal,
 * como lo pide el contrato. Si la API lo acepta, queda en `ultimoDeposito`.
 */
export const Depositar = {
    monto: (monto: string) => ({
        en: (moneda: string): Task =>
            Task.where(
                `#actor deposita ${monto} ${moneda}`,
                Http.post(Endpoints.postAccountsByCurrencyDeposits, { amount: monto }, { ruta: { currency: moneda } }),
                Check.whether(Respuesta.estado(), equals(Estado.Creado)).andIfSo(
                    notas().set('ultimoDeposito', depositoDeLaRespuesta()),
                ),
            ),
    }),
};

/** `GET /accounts`, exigiendo éxito: para leer el saldo con `Monto.disponibleEn(…)`. */
export const ConsultarLosSaldos = (): Task =>
    Task.where('#actor consulta sus saldos', Http.exigiendoExito.get(Endpoints.getAccounts));
