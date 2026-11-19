import { containItemsWhereEachItem, Ensure, equals, not } from '@serenity-js/assertions';

import { describe, it } from '../../src/fixtures';
import { Caracteristica, Cuando, Dado, Entonces, Escenario, EsquemaDelEscenario, Y } from '../../src/gherkin/gherkin';
import { Estado, Respuesta } from '../../src/screenplay/questions';
import { CrearUsuarioDePrueba, ExplorarElMercado, LaApiRechaza, VerLaSiguientePagina } from '../../src/screenplay/tasks';

/**
 * El catálogo es el del seed (13 instrumentos, ordenados por país y ticker) y
 * ningún escenario lo modifica: listarlo es determinístico.
 */
describe(Caracteristica('Explorar el mercado'), () => {
    const conSesion = CrearUsuarioDePrueba.sinSaldo();

    describe(EsquemaDelEscenario('el listado se filtra por país'), () => {
        const ejemplos = [
            { pais: 'CO', cantidad: 5 },
            { pais: 'MX', cantidad: 4 },
            { pais: 'PE', cantidad: 4 },
        ] as const;

        for (const ejemplo of ejemplos) {
            it(Escenario(`en ${ejemplo.pais} hay ${ejemplo.cantidad} instrumentos`, '@mercado'), async ({ actorCalled }) => {
                await actorCalled('Camila').attemptsTo(
                    Dado('que #actor inició sesión', conSesion),
                    Cuando(`filtra el mercado por ${ejemplo.pais}`, ExplorarElMercado.con({ country: ejemplo.pais })),
                    Entonces(
                        `ve solo los ${ejemplo.cantidad} instrumentos de ${ejemplo.pais}`,
                        Ensure.that(Respuesta.estado(), equals(Estado.Ok)),
                        Ensure.that(Respuesta.cantidadDeElementos(), equals(ejemplo.cantidad)),
                        Ensure.that(Respuesta.valoresDe<string>('country'), containItemsWhereEachItem(equals(ejemplo.pais))),
                    ),
                );
            });
        }
    });

    it(Escenario('país y tipo se combinan', '@smoke', '@mercado'), async ({ actorCalled }) => {
        await actorCalled('Camila').attemptsTo(
            Dado('que #actor inició sesión', conSesion),
            Cuando('busca los ETF de Colombia', ExplorarElMercado.con({ country: 'CO', type: 'ETF' })),
            Entonces(
                'encuentra solo ICOLCAP',
                Ensure.that(Respuesta.valoresDe('id'), equals(['ICOLCAP-CO'])),
                Ensure.that(Respuesta.campo('next_cursor'), equals(null)),
            ),
        );
    });

    it(Escenario('la búsqueda mira el ticker y el nombre', '@mercado'), async ({ actorCalled }) => {
        await actorCalled('Camila').attemptsTo(
            Dado('que #actor inició sesión', conSesion),
            Cuando('busca "ecopetrol"', ExplorarElMercado.con({ q: 'ecopetrol' })),
            Entonces('encuentra Ecopetrol', Ensure.that(Respuesta.valoresDe('id'), equals(['ECOPETROL-CO']))),
        );
    });

    it(Escenario('la paginación por cursor recorre todo sin repetir', '@mercado'), async ({ actorCalled }) => {
        await actorCalled('Camila').attemptsTo(
            Dado('que #actor inició sesión', conSesion),
            Cuando('pide el mercado de a 5', ExplorarElMercado.con({ limit: 5 })),
            Entonces(
                'la primera página son los 5 de Colombia y hay más',
                Ensure.that(
                    Respuesta.valoresDe('id'),
                    equals(['ECOPETROL-CO', 'GEB-CO', 'ICOLCAP-CO', 'ISA-CO', 'PFBCOLOM-CO']),
                ),
                Ensure.that(Respuesta.campo('next_cursor'), not(equals(null))),
            ),
            Cuando('pide la página siguiente', VerLaSiguientePagina(5)),
            Entonces(
                'siguen México y el primero de Perú',
                Ensure.that(Respuesta.valoresDe('id'), equals(['AMXB-MX', 'CEMEXCPO-MX', 'GFNORTEO-MX', 'WALMEX-MX', 'BAP-PE'])),
            ),
            Cuando('pide la última', VerLaSiguientePagina(5)),
            Entonces(
                'quedan tres y no hay más páginas',
                Ensure.that(Respuesta.valoresDe('id'), equals(['BVN-PE', 'FERREYC1-PE', 'SCCO-PE'])),
                Ensure.that(Respuesta.campo('next_cursor'), equals(null)),
            ),
        );
    });

    it(Escenario('un límite por encima de 100 se rechaza', '@mercado'), async ({ actorCalled }) => {
        await actorCalled('Camila').attemptsTo(
            Dado('que #actor inició sesión', conSesion),
            Cuando('pide 101 instrumentos por página', ExplorarElMercado.con({ limit: 101 })),
            Entonces('la API rechaza el límite', LaApiRechaza.con('VALIDATION_ERROR').enElCampo('limit', 'TOO_LARGE')),
        );
    });

    it(Escenario('sin sesión no se ve el mercado', '@mercado'), async ({ actorCalled }) => {
        await actorCalled('Camila').attemptsTo(
            Cuando('#actor explora el mercado sin haber iniciado sesión', ExplorarElMercado.todo()),
            Entonces('la API pide autenticarse', LaApiRechaza.con('AUTH_TOKEN_INVALID')),
            Y('no recibe instrumentos', Ensure.that(Respuesta.estado(), equals(Estado.NoAutorizado))),
        );
    });
});
