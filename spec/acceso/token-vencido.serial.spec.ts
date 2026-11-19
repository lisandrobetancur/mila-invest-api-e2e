import { afterEach, describe, it } from '../../src/fixtures';
import { Caracteristica, Cuando, Dado, Entonces, Escenario, Y } from '../../src/gherkin/gherkin';
import { ConsultarSuPerfil, CrearUsuarioDePrueba, DetenerElReloj, DevolverElControl, LaApiRechaza } from '../../src/screenplay/tasks';

// Serial: mueve el reloj de la API, que es global.
describe(Caracteristica('Vencimiento del access token'), () => {
    afterEach(async ({ actorCalled }) => {
        await actorCalled('Camila').attemptsTo(DevolverElControl());
    });

    it(Escenario('pasados 15 minutos el access token vence', '@acceso', '@reloj'), async ({ actorCalled }) => {
        await actorCalled('Camila').attemptsTo(
            Dado('que #actor tiene una sesión abierta', CrearUsuarioDePrueba.sinSaldo()),
            Y('pasan 16 minutos en el reloj de la API', DetenerElReloj.dentroDe(16)),
            Cuando('consulta su perfil', ConsultarSuPerfil()),
            Entonces('la API le dice que su token venció', LaApiRechaza.con('AUTH_TOKEN_EXPIRED')),
        );
    });
});
