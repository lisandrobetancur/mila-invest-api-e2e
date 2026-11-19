import { Ensure, equals, includes, not, startsWith } from '@serenity-js/assertions';

import { describe, it } from '../../src/fixtures';
import { Caracteristica, Cuando, Dado, Entonces, Escenario, EsquemaDelEscenario, Pero, Y } from '../../src/gherkin/gherkin';
import { Cantidad, Estado, Fila, Respuesta } from '../../src/screenplay/questions';
import { LaApiRechaza, Registrarse, UsuarioNuevo } from '../../src/screenplay/tasks';

describe(Caracteristica('Crear una cuenta'), () => {
    it(Escenario('un registro válido crea el usuario con la contraseña hasheada', '@smoke', '@acceso'), async ({ actorCalled }) => {
        const datos = UsuarioNuevo.de('CO');
        await actorCalled('Camila').attemptsTo(
            Cuando('#actor se registra con sus datos', Registrarse.con(datos)),
            Entonces(
                'la API crea la cuenta y le devuelve sus tokens',
                Ensure.that(Respuesta.estado(), equals(Estado.Creado)),
                Ensure.that(Respuesta.campo('user.email'), equals(datos.email)),
                Ensure.that(Respuesta.campo('user.document_last4'), equals(datos.document_number.slice(-4))),
                Ensure.that(Respuesta.campo('tokens.token_type'), equals('bearer')),
            ),
            Y(
                'el usuario quedó en la base',
                Ensure.that(Fila.delUsuario().email, equals(datos.email)),
                Ensure.that(Fila.delUsuario().full_name, equals(datos.full_name)),
                Ensure.that(Fila.delUsuario().document_last4, equals(datos.document_number.slice(-4))),
            ),
            Pero(
                'su contraseña está hasheada con argon2id, nunca en claro',
                Ensure.that(Fila.delUsuario().password_hash, startsWith('$argon2id$')),
                Ensure.that(Fila.delUsuario().password_hash, not(includes(datos.password))),
            ),
            Y('tiene una sesión abierta', Ensure.that(Cantidad.deSesionesActivas(), equals(1))),
        );
    });

    describe(EsquemaDelEscenario('la moneda base sale del país'), () => {
        const ejemplos = [
            { pais: 'CO', moneda: 'COP', documento: 'CC' },
            { pais: 'MX', moneda: 'MXN', documento: 'CURP' },
            { pais: 'PE', moneda: 'PEN', documento: 'DNI' },
        ] as const;

        for (const ejemplo of ejemplos) {
            it(Escenario(`en ${ejemplo.pais} con ${ejemplo.documento} la moneda base es ${ejemplo.moneda}`, '@acceso'), async ({ actorCalled }) => {
                await actorCalled('Camila').attemptsTo(
                    Cuando(`#actor se registra en ${ejemplo.pais}`, Registrarse.con(UsuarioNuevo.de(ejemplo.pais))),
                    Entonces(
                        `su moneda base es ${ejemplo.moneda}`,
                        Ensure.that(Respuesta.estado(), equals(Estado.Creado)),
                        Ensure.that(Respuesta.campo('user.base_currency'), equals(ejemplo.moneda)),
                        Ensure.that(Respuesta.campo('user.document_type'), equals(ejemplo.documento)),
                    ),
                    Y('así quedó en la base', Ensure.that(Fila.delUsuario().base_currency, equals(ejemplo.moneda))),
                );
            });
        }
    });

    it(Escenario('no se puede registrar un correo repetido', '@acceso'), async ({ actorCalled }) => {
        const datos = UsuarioNuevo.de('CO');
        const otro = { ...UsuarioNuevo.de('CO'), email: datos.email.toUpperCase() };
        await actorCalled('Camila').attemptsTo(
            Dado('que #actor ya tiene una cuenta', Registrarse.con(datos), Ensure.that(Respuesta.estado(), equals(Estado.Creado))),
            Cuando('alguien se registra con el mismo correo en mayúsculas', Registrarse.con(otro)),
            Entonces('la API lo rechaza', LaApiRechaza.con('AUTH_EMAIL_TAKEN')),
            Y('en la base sigue habiendo un solo usuario con ese correo', Ensure.that(Cantidad.deUsuariosConEmail(datos.email), equals(1))),
        );
    });

    it(Escenario('no se puede registrar un documento repetido en el mismo país', '@acceso'), async ({ actorCalled }) => {
        const datos = UsuarioNuevo.de('PE');
        const otro = { ...UsuarioNuevo.de('PE'), document_number: datos.document_number };
        await actorCalled('Camila').attemptsTo(
            Dado('que #actor ya tiene una cuenta', Registrarse.con(datos), Ensure.that(Respuesta.estado(), equals(Estado.Creado))),
            Cuando('alguien se registra con su mismo documento', Registrarse.con(otro)),
            Entonces('la API lo rechaza', LaApiRechaza.con('AUTH_DOCUMENT_TAKEN')),
            Y('ese otro usuario no quedó en la base', Ensure.that(Cantidad.deUsuariosConEmail(otro.email), equals(0))),
        );
    });

    it(Escenario('los datos inválidos se rechazan campo por campo', '@acceso'), async ({ actorCalled }) => {
        const datos = { ...UsuarioNuevo.de('CO'), email: 'no-es-un-correo', password: 'corta' };
        await actorCalled('Camila').attemptsTo(
            Cuando('#actor se registra con un correo y una contraseña inválidos', Registrarse.con(datos)),
            Entonces(
                'la API dice qué campos están mal',
                LaApiRechaza.con('VALIDATION_ERROR').enElCampo('email', 'INVALID_FORMAT').enElCampo('password', 'TOO_SHORT'),
            ),
            Y('no quedó ningún usuario', Ensure.that(Cantidad.deUsuariosConEmail(datos.email), equals(0))),
        );
    });
});
