import { type PerformsActivities, Task } from '@serenity-js/core';

import { Endpoints } from '../../contract/contract.generated';
import { Http } from '../../interactions/Http';
import { notas } from '../../notes/NotasDeSesion';
import { Secreto } from '../../notes/Secreto';
import { Respuesta } from '../../questions/api';
import { guardarLosTokens } from '../comun';
import { type Moneda, type Pais, unico } from './datos';

interface Posicion {
    instrument_id: string;
    quantity: number;
}

/**
 * Crea el usuario del escenario con `POST /_testing/users`: saldos y
 * posiciones a medida, cargados por el ledger como depósitos y compras sin
 * comisión. Deja en las notas su id, email, contraseña y tokens.
 *
 * Cada escenario crea el suyo y afirma solo sobre él: es lo que permite
 * correr la suite en paralelo contra una sola base.
 *
 * ```ts
 * CrearUsuarioDePrueba.conSaldo('8000000', 'COP').yLaPosicion('ISA-CO', 5)
 * ```
 */
export class CrearUsuarioDePrueba extends Task {
    static sinSaldo(pais: Pais = 'CO'): CrearUsuarioDePrueba {
        return new CrearUsuarioDePrueba(pais, {}, []);
    }

    static conSaldo(monto: string, moneda: Moneda): CrearUsuarioDePrueba {
        return new CrearUsuarioDePrueba('CO', { [moneda]: monto }, []);
    }

    private constructor(
        private readonly pais: Pais,
        private readonly saldos: Partial<Record<Moneda, string>>,
        private readonly posiciones: readonly Posicion[],
    ) {
        super(CrearUsuarioDePrueba.describir(pais, saldos, posiciones));
    }

    yConSaldo(monto: string, moneda: Moneda): CrearUsuarioDePrueba {
        return new CrearUsuarioDePrueba(this.pais, { ...this.saldos, [moneda]: monto }, this.posiciones);
    }

    yLaPosicion(instrumento: string, cantidad: number): CrearUsuarioDePrueba {
        return new CrearUsuarioDePrueba(this.pais, this.saldos, [
            ...this.posiciones,
            { instrument_id: instrumento, quantity: cantidad },
        ]);
    }

    deUnPais(pais: Pais): CrearUsuarioDePrueba {
        return new CrearUsuarioDePrueba(pais, this.saldos, this.posiciones);
    }

    override async performAs(actor: PerformsActivities): Promise<void> {
        const password = unico.password();
        await actor.attemptsTo(
            Http.exigiendoExito.post(Endpoints.postTestingUsers, {
                password,
                full_name: 'Camila Prueba',
                country: this.pais,
                balances: this.saldos,
                positions: [...this.posiciones],
            }),
            notas().set('usuarioId', Respuesta.campo<string>('user.id')),
            notas().set('email', Respuesta.campo<string>('user.email')),
            notas().set('password', new Secreto(password)),
            ...guardarLosTokens('tokens.'),
        );
    }

    private static describir(pais: Pais, saldos: Partial<Record<Moneda, string>>, posiciones: readonly Posicion[]): string {
        const partes = [
            ...Object.entries(saldos).map(([moneda, monto]) => `${moneda} ${monto}`),
            ...posiciones.map((posicion) => `${posicion.quantity} ${posicion.instrument_id}`),
        ];
        return `#actor crea su usuario de prueba en ${pais}${partes.length > 0 ? ` con ${partes.join(', ')}` : ' sin saldo'}`;
    }
}
