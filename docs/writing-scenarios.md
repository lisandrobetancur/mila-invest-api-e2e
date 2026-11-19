# Escribir un escenario

Gherkin dentro de `describe`/`it`. **No hay Cucumber ni archivos de features**:
la estructura es la de Playwright Test y las palabras clave son tareas de
Serenity, así que el reporte HTML de Serenity/JS muestra los pasos
Dado/Cuando/Entonces igual que si vinieran de un archivo de Gherkin, pero el código se
navega, se refactoriza y se tipa como código. Es la misma convención que
`mila-invest-e2e`.

## La convención

| Gherkin | En código |
|---|---|
| `Característica:` | `describe(Caracteristica('…'))`, uno por archivo |
| `Regla:` | `describe(Regla('…'))` anidado |
| `Antecedentes:` | una constante con las tareas comunes |
| `Escenario:` | `it(Escenario('…', '@tag'))` |
| `Esquema del escenario:` + `Ejemplos:` | `describe(EsquemaDelEscenario('…'))` + un `for` sobre los ejemplos |
| Tags | argumentos de `Escenario(...)`, filtrables con `--grep` |

Los helpers están en [`src/gherkin/gherkin.ts`](../src/gherkin/gherkin.ts).

`describe`, `it` y los hooks se importan **siempre** de
[`src/fixtures.ts`](../src/fixtures.ts), nunca de `@playwright/test`: es la
extensión que le da al actor sus habilidades de API y de base de datos.

## Un escenario entero

```ts
import { Ensure, equals } from '@serenity-js/assertions';

import { describe, it } from '../../src/fixtures';
import { Caracteristica, Cuando, Dado, Entonces, Escenario, Y } from '../../src/gherkin/gherkin';
import { Cantidad, Estado, Monto, notas, Respuesta, Saldo } from '../../src/screenplay/questions';
import { ComprarInstrumento, CrearUsuarioDePrueba } from '../../src/screenplay/tasks';

describe(Caracteristica('Comprar acciones a mercado'), () => {
    it(Escenario('la compra descuenta el saldo y queda en la base', '@smoke', '@inversion'), async ({ actorCalled }) => {
        await actorCalled('Camila').attemptsTo(
            Dado('que #actor tiene una cuenta con saldo', CrearUsuarioDePrueba.conSaldo('8000000', 'COP')),
            Cuando('compra 2 acciones de ISA a mercado', ComprarInstrumento.conId('ISA-CO').cantidad(2)),
            Entonces(
                'la API responde que la orden quedó ejecutada',
                Ensure.that(Respuesta.estado(), equals(Estado.Creado)),
                Ensure.that(Respuesta.campo('status'), equals('FILLED')),
            ),
            Y('la orden quedó registrada en la base', Ensure.that(Cantidad.deOrdenes(), equals(1))),
            Y(
                'el saldo bajó por el total más la comisión',
                Ensure.that(Saldo.enLaBase('COP'), equals(Monto.resta('8000000', notas().get('ultimaOrden').total))),
            ),
        );
    });
});
```

`#actor` se reemplaza por el nombre del actor en el reporte: "Dado que Camila
tiene una cuenta con saldo".

## Un error

```ts
Entonces('la API rechaza la compra', LaApiRechaza.con('INSUFFICIENT_FUNDS').enElCampo('quantity', 'TOO_LARGE')),
Y('no dejó rastro', Ensure.that(Cantidad.deOrdenes(), equals(0))),
```

`LaApiRechaza` afirma el código, el estado que le corresponde, el
`application/problem+json` y los errores por campo.

## Esquema del escenario

```ts
describe(EsquemaDelEscenario('una cantidad inválida se rechaza'), () => {
    const ejemplos = [
        { cantidad: 0, codigo: 'TOO_SMALL' },
        { cantidad: 1.5, codigo: 'INVALID_FORMAT' },
    ] as const;

    for (const ejemplo of ejemplos) {
        it(Escenario(`la cantidad ${ejemplo.cantidad} da ${ejemplo.codigo}`, '@inversion'), async ({ actorCalled }) => {
            // …
        });
    }
});
```

## Reglas de la casa

**Cada escenario crea su usuario.** El primer `Dado` casi siempre es
`CrearUsuarioDePrueba…` (saldos y posiciones a medida) o `Registrarse.con(…)`.
Nunca operes con la cuenta demo ni con datos de otro escenario: la suite corre
en paralelo contra una sola base.

**Un spec usa solo tareas y preguntas.** Nada de rutas, headers, SQL ni
números de estado (`Estado.Creado`, no `201`). Si te falta algo, falta una
tarea o una pregunta. El lint lo impide.

**Todo lo que cambia estado se verifica en la base.** No alcanza con que la
API responda 201: un `Y('… quedó en la base', …)` con `Fila`, `Filas`,
`Cantidad`, `Existe` o `Saldo`.

**Los montos, con `Monto`.** Nunca `Number(...)` ni `+`. `Monto.campo('total')`,
`Monto.suma(…)`, `Monto.resta(…)`, `Monto.producto(precio, cantidad)` y
`Saldo.enLaBase('COP')` devuelven la forma canónica, así que se comparan con
`equals('45040.00')`.

**Comparar dentro de una misma respuesta.** Los precios cambian minuto a
minuto: afirmá `total = gross + commission` sobre la misma respuesta, o contra
el `total` que devolvió la orden (`notas().get('ultimaOrden').total`), nunca
contra un precio leído antes.

**Lo global, en serie.** Si el escenario necesita mover el reloj, cerrar un
mercado, congelar un precio o hacer `reset`, el archivo se llama
`*.serial.spec.ts` y tiene un `afterEach` con `DevolverElControl(…)`. Corre en
el proyecto `api-serial`, después de todo lo demás.

**Nada de esperas fijas.** La API responde después del commit: lo que dice una
respuesta ya está en la base. No hay esperas fijas ni reintentos en esta suite.

## Tags

| Tag | Para qué |
|---|---|
| `@smoke` | el camino crítico; `npm run test:smoke` |
| `@acceso` `@mercado` `@inversion` `@dinero` `@seguimiento` `@plataforma` | por capacidad |
| `@reloj` `@precios` `@reset` | escenarios seriales, por lo que tocan |

```bash
npm run test:smoke
npx playwright test --grep @inversion
```

## Dónde va cada archivo

`spec/<capacidad>/<característica>.spec.ts`. La carpeta es la capacidad y el
archivo la característica: así sale la jerarquía del reporte (capacidad →
característica → escenario). Si tu escenario no entra en ninguna capacidad
existente, creá la carpeta con su `README.md`.
