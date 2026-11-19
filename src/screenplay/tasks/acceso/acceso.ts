import { equals } from '@serenity-js/assertions';
import { type Answerable, Check, Question, Task } from '@serenity-js/core';

import { Endpoints } from '../../contract/contract.generated';
import { Http } from '../../interactions/Http';
import { notas } from '../../notes/NotasDeSesion';
import { Secreto } from '../../notes/Secreto';
import { Estado, Respuesta } from '../../questions/api';
import { AnotarLaSesion, guardarLosTokens } from '../comun';
import { CuentaDemo, type DatosDeRegistro } from '../preparacion/datos';

/**
 * Tareas de acceso. Las que se prueban (registrarse, iniciar sesión,
 * renovar…) **no afirman** el resultado: mandan la petición, y si la API la
 * aceptó dejan en las notas lo que sigue (ids, tokens). El `Entonces` del
 * escenario decide qué esperaba.
 */

const revelado = (clave: 'refreshToken' | 'refreshAnterior' | 'password') =>
    Question.about(`el ${clave} de #actor`, async (actor) => (await actor.answer(notas().get(clave))).revelar());

export const Registrarse = {
    con: (datos: DatosDeRegistro): Task =>
        Task.where(
            `#actor se registra con ${datos.email} (${datos.country}, ${datos.document_type})`,
            Http.post(Endpoints.postAuthRegister, datos),
            Check.whether(Respuesta.estado(), equals(Estado.Creado)).andIfSo(
                AnotarLaSesion(
                    notas().set('usuarioId', Respuesta.campo<string>('user.id')),
                    notas().set('email', Respuesta.campo<string>('user.email')),
                    notas().set('password', new Secreto(datos.password)),
                    ...guardarLosTokens('tokens.'),
                ),
            ),
        ),
};

const iniciarSesion = (descripcion: string, email: Answerable<string>, password: Answerable<string>): Task =>
    Task.where(
        descripcion,
        Http.post(Endpoints.postAuthLogin, Question.fromObject({ email, password })),
        Check.whether(Respuesta.estado(), equals(Estado.Ok)).andIfSo(AnotarLaSesion(...guardarLosTokens())),
    );

export const IniciarSesion = {
    con: (email: string, password: string): Task => iniciarSesion(`#actor inicia sesión como ${email}`, email, password),

    /** Con el email y la contraseña que quedaron en sus notas al crear su usuario. */
    conSusCredenciales: (): Task =>
        iniciarSesion('#actor inicia sesión con sus credenciales', notas().get('email'), revelado('password')),

    /** Con su email y una contraseña que no es la suya. */
    conUnaContrasenaIncorrecta: (): Task =>
        iniciarSesion('#actor inicia sesión con una contraseña incorrecta', notas().get('email'), 'NoEsLaClave-123'),

    /** La cuenta sembrada de la API. Solo para el proyecto serial (ver `CuentaDemo`). */
    conLaCuentaDemo: (): Task => iniciarSesion('#actor inicia sesión con la cuenta demo', CuentaDemo.email, CuentaDemo.password),
};

export const ConsultarSuPerfil = Object.assign(
    (): Task =>
        Task.where(
            '#actor consulta su perfil',
            Http.get(Endpoints.getMe),
            Check.whether(Respuesta.estado(), equals(Estado.Ok)).andIfSo(
                AnotarLaSesion(
                    notas().set('usuarioId', Respuesta.campo<string>('id')),
                    notas().set('email', Respuesta.campo<string>('email')),
                ),
            ),
        ),
    {
        sinToken: (): Task => Task.where('#actor consulta su perfil sin token', Http.get(Endpoints.getMe, { token: null })),
        conElToken: (token: string): Task =>
            Task.where(`#actor consulta su perfil con el token "${token}"`, Http.get(Endpoints.getMe, { token })),
    },
);

export const RenovarLaSesion = Object.assign(
    (): Task =>
        Task.where(
            '#actor renueva su sesión con el refresh token',
            AnotarLaSesion(notas().set('refreshAnterior', notas().get('refreshToken'))),
            Http.post(Endpoints.postAuthRefresh, Question.fromObject({ refresh_token: revelado('refreshToken') })),
            Check.whether(Respuesta.estado(), equals(Estado.Ok)).andIfSo(AnotarLaSesion(...guardarLosTokens())),
        ),
    {
        /** Con el refresh token que ya se usó en la renovación anterior. */
        conElTokenAnterior: (): Task =>
            Task.where(
                '#actor intenta renovar con el refresh token ya usado',
                Http.post(Endpoints.postAuthRefresh, Question.fromObject({ refresh_token: revelado('refreshAnterior') })),
            ),
        /** Con el refresh token vigente en sus notas (para probar que el logout lo invalidó). */
        conSuTokenActual: (): Task =>
            Task.where(
                '#actor intenta renovar con su refresh token',
                Http.post(Endpoints.postAuthRefresh, Question.fromObject({ refresh_token: revelado('refreshToken') })),
            ),
    },
);

export const CerrarSesion = (): Task =>
    Task.where(
        '#actor cierra su sesión',
        Http.post(Endpoints.postAuthLogout, Question.fromObject({ refresh_token: revelado('refreshToken') })),
    );
