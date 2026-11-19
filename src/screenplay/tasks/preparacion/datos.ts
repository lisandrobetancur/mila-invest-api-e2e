import { randomBytes, randomInt } from 'node:crypto';

import type { Cuerpo } from '../../contract/contract.generated';

/**
 * Datos únicos por escenario: ningún escenario depende de otro ni de lo que
 * dejó una corrida anterior, así corren en paralelo y en cualquier orden.
 */
const sufijo = (): string => randomBytes(5).toString('hex');

const digitos = (cantidad: number): string => Array.from({ length: cantidad }, () => String(randomInt(10))).join('');

const letras = (cantidad: number): string =>
    Array.from({ length: cantidad }, () => String.fromCharCode(65 + randomInt(26))).join('');

export type Pais = 'CO' | 'MX' | 'PE';
export type Moneda = 'COP' | 'MXN' | 'PEN';
export type DatosDeRegistro = Cuerpo<'postAuthRegister'>;

/** Un documento válido para el país, con las reglas de §8.2 de `domain-rules.md`. */
const documentoDe = (pais: Pais): Pick<DatosDeRegistro, 'document_type' | 'document_number'> => {
    switch (pais) {
        case 'CO':
            return { document_type: 'CC', document_number: `1${digitos(9)}` };
        case 'MX':
            return { document_type: 'CURP', document_number: `${letras(4)}${digitos(6)}H${letras(5)}0${digitos(1)}` };
        case 'PE':
            return { document_type: 'DNI', document_number: digitos(8) };
    }
};

export const unico = {
    email: (): string => `camila.${sufijo()}@example.com`,
    /** Una contraseña descartable que cumple las reglas de la API; no es un secreto real. */
    password: (): string => `Clave-${sufijo()}9`,
};

export const UsuarioNuevo = {
    /** Datos de registro válidos y únicos para un país. */
    de: (pais: Pais): DatosDeRegistro => ({
        email: unico.email(),
        password: unico.password(),
        full_name: 'Camila Prueba',
        country: pais,
        ...documentoDe(pais),
    }),
};

/**
 * La cuenta demo sembrada por `db:seed` (ver `mila-invest-api/docs/domain-rules.md`).
 * Es pública y compartida: los escenarios no operan con ella, y solo la usa
 * el proyecto serial (el login tiene un límite de 5 por minuto por IP + email).
 */
export const CuentaDemo = {
    email: 'demo@milainvest.app',
    password: 'Demo1234!',
    posiciones: ['BAP-PE:10', 'ECOPETROL-CO:120', 'WALMEX-MX:50'],
} as const;
