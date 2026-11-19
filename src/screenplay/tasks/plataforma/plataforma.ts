import { Task } from '@serenity-js/core';

import { Endpoints } from '../../contract/contract.generated';
import { Http } from '../../interactions/Http';

export const ConsultarLaSalud = (): Task => Task.where('#actor consulta la salud de la API', Http.get(Endpoints.getHealth));

export const ConsultarLosPaises = (): Task =>
    Task.where('#actor consulta los países disponibles', Http.get(Endpoints.getMetaCountries));

export const PedirUnaRutaQueNoExiste = (): Task =>
    Task.where('#actor pide una ruta que no existe', Http.getFueraDelContrato('/api/v1/esta-ruta-no-existe'));

/** Un login con JSON cortado a la mitad. */
export const EnviarUnCuerpoMalformado = (): Task =>
    Task.where('#actor envía un cuerpo que no es JSON válido', Http.postCrudo(Endpoints.postAuthLogin, '{"email":'));

/** `GET /_testing/ledger`: las invariantes de la doble partida sobre toda la base. Solo lee. */
export const VerificarElLedger = (): Task =>
    Task.where('#actor verifica las invariantes del ledger', Http.exigiendoExito.get(Endpoints.getTestingLedger));
