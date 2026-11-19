import { Ensure, equals } from '@serenity-js/assertions';

import { describe, it } from '../../src/fixtures';
import { Caracteristica, Cuando, Dado, Entonces, Escenario, EsquemaDelEscenario, Y } from '../../src/gherkin/gherkin';
import { Cantidad, Estado, Monto, Respuesta, Saldo } from '../../src/screenplay/questions';
import { ConsultarLosSaldos, CrearUsuarioDePrueba, Depositar, LaApiRechaza } from '../../src/screenplay/tasks';

describe(Caracteristica('Depositar dinero virtual'), () => {
    it(Escenario('un depósito sube el saldo, según la API y según la base', '@smoke', '@dinero'), async ({ actorCalled }) => {
        await actorCalled('Camila').attemptsTo(
            Dado('que #actor tiene una cuenta sin saldo', CrearUsuarioDePrueba.sinSaldo()),
            Cuando('deposita 1.500.000,50 COP', Depositar.monto('1500000.50').en('COP')),
            Entonces(
                'la API registra el depósito',
                Ensure.that(Respuesta.estado(), equals(Estado.Creado)),
                Ensure.that(Respuesta.campo('type'), equals('DEPOSIT')),
                Ensure.that(Respuesta.campo('currency'), equals('COP')),
                Ensure.that(Monto.campo('amount'), equals('1500000.50')),
            ),
            Y(
                'su saldo disponible lo refleja en la API',
                ConsultarLosSaldos(),
                Ensure.that(Monto.disponibleEn('COP'), equals('1500000.50')),
            ),
            Y(
                'y en la base: la cuenta y una transacción de depósito',
                Ensure.that(Saldo.enLaBase('COP'), equals('1500000.50')),
                Ensure.that(Cantidad.deTransacciones('DEPOSIT'), equals(1)),
            ),
        );
    });

    it(Escenario('un monto grande conserva todos sus dígitos', '@dinero'), async ({ actorCalled }) => {
        await actorCalled('Camila').attemptsTo(
            Dado('que #actor tiene una cuenta sin saldo', CrearUsuarioDePrueba.sinSaldo()),
            Cuando('deposita el máximo permitido menos un centavo', Depositar.monto('99999999.99').en('COP')),
            Entonces(
                'la API devuelve el monto exacto, sin redondear',
                Ensure.that(Respuesta.campo('amount'), equals('99999999.99')),
            ),
            Y('la base guarda el mismo valor', Ensure.that(Saldo.enLaBase('COP'), equals('99999999.99'))),
        );
    });

    describe(EsquemaDelEscenario('los montos inválidos se rechazan y no mueven el saldo'), () => {
        const ejemplos = [
            { monto: '0', campo: 'TOO_SMALL', porque: 'cero' },
            { monto: '-5000', campo: 'TOO_SMALL', porque: 'negativo' },
            { monto: '10.555', campo: 'INVALID_FORMAT', porque: 'con más de 2 decimales' },
            { monto: '100000000.01', campo: 'TOO_LARGE', porque: 'por encima del máximo por depósito' },
        ] as const;

        for (const ejemplo of ejemplos) {
            it(Escenario(`un monto ${ejemplo.porque} da ${ejemplo.campo}`, '@dinero'), async ({ actorCalled }) => {
                await actorCalled('Camila').attemptsTo(
                    Dado('que #actor tiene una cuenta sin saldo', CrearUsuarioDePrueba.sinSaldo()),
                    Cuando(`deposita ${ejemplo.monto} COP`, Depositar.monto(ejemplo.monto).en('COP')),
                    Entonces('la API rechaza el monto', LaApiRechaza.con('VALIDATION_ERROR').enElCampo('amount', ejemplo.campo)),
                    Y(
                        'su saldo sigue en cero y no hay depósitos en la base',
                        Ensure.that(Saldo.enLaBase('COP'), equals('0.00')),
                        Ensure.that(Cantidad.deTransacciones('DEPOSIT'), equals(0)),
                    ),
                );
            });
        }
    });

    describe(EsquemaDelEscenario('solo se deposita en las monedas de usuario'), () => {
        // El pedido original esperaba 404; la API responde 422 en el parámetro
        // de ruta (ver docs/api-notes.md, "Pedidos al equipo de la API").
        for (const moneda of ['USD', 'ARS']) {
            it(Escenario(`depositar en ${moneda} se rechaza`, '@dinero'), async ({ actorCalled }) => {
                await actorCalled('Camila').attemptsTo(
                    Dado('que #actor tiene una cuenta', CrearUsuarioDePrueba.sinSaldo()),
                    Cuando(`deposita 100 ${moneda}`, Depositar.monto('100').en(moneda)),
                    Entonces(
                        'la API rechaza la moneda',
                        LaApiRechaza.con('VALIDATION_ERROR').enElCampo('currency', 'NOT_ALLOWED'),
                    ),
                    Y('no hay depósitos en la base', Ensure.that(Cantidad.deTransacciones('DEPOSIT'), equals(0))),
                );
            });
        }
    });
});
