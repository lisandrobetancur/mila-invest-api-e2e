# Arquitectura de la suite

Screenplay con Serenity/JS sobre Playwright Test, con el reporte HTML de
Serenity/JS (`@serenity-js/html-reporter`), que genera la propia corrida. Es
la suite **de API** de MILA Invest: no abre navegadores. La UI la prueba
`mila-invest-e2e`.

La idea de fondo es la misma que en la suite web: un escenario se lee como lo
contaría una persona del negocio, y todo lo que huele a HTTP o a SQL vive lo
más abajo posible.

```
spec  →  tasks  →  interactions / questions  →  contract / database
```

Cada flecha es "puede importar". Al revés, nunca. El lint lo hace cumplir en
`spec/` (ver `eslint.config.mjs`).

| Capa | Dónde | Qué sabe | Qué no sabe |
|---|---|---|---|
| **spec** | `spec/<capacidad>/<feature>.spec.ts` | el dominio: registrarse, comprar, depositar | rutas, headers, SQL, números de estado |
| **tasks** | `src/screenplay/tasks/` | pasos del dominio, componibles, en español | axios, headers, URLs, tablas |
| **interactions** | `src/screenplay/interactions/` | **todo** lo de HTTP: token, `Idempotency-Key`, validación de la forma | el dominio |
| **questions/api** | `src/screenplay/questions/api/` | cómo leer la última respuesta: estado, campos, montos, errores | el dominio |
| **questions/db** | `src/screenplay/questions/db/` | el **único** SQL de la suite, de lectura, parametrizado | HTTP |
| **contract** | `src/screenplay/contract/contract.generated.ts` | rutas, esquemas zod y tipos, tal cual el OpenAPI | todo lo demás |
| **database** | `src/database/` | cómo abrir y cerrar una conexión, por adaptador | qué se consulta |

## Las piezas

### `src/config/env.ts`

El **único** lugar que lee `process.env` (hay una regla de lint). `BASE_URL`,
`DATABASE_URL`, `MILA_API_PATH`, `WORKERS`, `REPORT_HISTORY` y los timeouts.

### `src/fixtures.ts`

La única extensión del `test` de `@serenity-js/playwright-test`:

- `databases`: fixture de **worker**, un cliente por base y por worker, que se
  cierra en el teardown.
- `axios`: con `baseURL`, parseo **lossless** del JSON y
  `validateStatus: () => true` (los estados los afirman tareas y preguntas).
- `actors`: un cast **solo de API**. Cada actor puede `CallAnApi`,
  `QueryDatabase` y `TakeNotes`.
- `browser`: un sustituto. Serenity/JS pide el navegador del worker solo para
  poner su versión en el reporte; sin el sustituto lanzaría un Chromium por
  worker. Esta suite no necesita `playwright install`.

### `src/database/`

`SqlClient` es el contrato (`query`, `close`, parámetros `$1, $2…`) y
`adapters/PostgresSqlClient` lo implementa sobre un pool de `pg` con la sesión
en **solo lectura**. Otro motor = otro adaptador, nombrado en
`database/index.ts`.

### `src/screenplay/contract/contract.generated.ts`

**Generado** por `scripts/sync-contract.ts` desde
`mila-invest-api/docs/openapi.json`; no se edita a mano.

- `Endpoints`: método, ruta, parámetros de ruta, si pide token, si exige
  `Idempotency-Key`, estado de éxito y estados posibles de cada operación.
- `Esquemas`: un esquema zod por respuesta exitosa, más `Problem`.
- `Cuerpo<'…'>` y `Consulta<'…'>`: los tipos de cuerpo y query.
- `CodigosDeError` y `CodigosDeCampo`.

`npm run contract:check` corre en CI: si la API cambia una ruta o una forma,
la suite se entera ahí y no a mitad de un escenario.

### `src/screenplay/interactions/Http.ts`

El protocolo. `Http.get(Endpoints.getMe)` y
`Http.post(Endpoints.postOrders, cuerpo)`:

1. arman la ruta desde el contrato (`{ ruta: { id } }`);
2. ponen `Authorization: Bearer …` si la operación lo pide y el actor tiene
   sesión, e `Idempotency-Key` si el contrato la exige;
3. después de responder, **validan la forma**: un éxito contra su esquema y un
   error contra `Problem`. Si la API cambia la forma de una respuesta, falla
   el paso que la pidió, con una línea por campo.

`Http.exigiendoExito.*` además exige el estado de éxito del contrato: es lo
que usan las tareas de preparación, y si fallan dicen por qué
(`422 INSUFFICIENT_FUNDS — Available 1000.00 COP`).

### `src/screenplay/questions/`

- `api/Respuesta`: `estado()`, `cuerpo()`, `campo('tokens.access_token')`,
  `cantidadDeElementos()`, `valoresDe('country')`. Y `Estado`, los estados
  con nombre (`Estado.Creado`).
- `api/Monto`: montos con `Decimal`, nunca `number`. Devuelven la forma
  canónica (`"45040.00"`), así que se comparan con `equals`.
- `api/Errores`: `ErrorDeLaApi.codigo()`, `camposConError()` y el mapa
  código → estado.
- `api/Portafolio`: `posicionEn('ISA-CO')`, `posiciones()`, `resumen()`.
- `db`: `Fila.delUsuario()`, `Fila.deLaUltimaOrden()`, `Filas.dePosiciones()`,
  `Cantidad.deOrdenes()`, `Existe.laPosicionEn(…)`, `Saldo.enLaBase('COP')`.
  Todas sobre los datos **del actor** (su `usuarioId` en las notas).

### `src/screenplay/tasks/`

Por capacidad, en español. Dos tipos:

1. **Las que se prueban** (`Registrarse`, `IniciarSesion`, `ComprarInstrumento`,
   `Depositar`…) mandan la petición y **no afirman**: si la API la aceptó,
   anotan lo que sigue (ids, tokens, la orden). El `Entonces` decide qué se
   esperaba, así la misma tarea sirve para el camino feliz y para el error.
2. **Las de preparación** (`CrearUsuarioDePrueba`, `ConsultarLosSaldos`,
   `DetenerElReloj`…) exigen el éxito: un `Dado` que falla tiene que fallar ahí.

`LaApiRechaza.con('INSUFFICIENT_FUNDS').enElCampo('quantity', 'TOO_LARGE')`
afirma un error completo: código, estado, `problem+json` y campos.

### Notas

`NotasDeSesion` es lo que un escenario lleva de un paso a otro: el usuario,
sus tokens (como `Secreto`, que sale `******` en el reporte), la última orden.

## Aislamiento y paralelismo

Es la decisión de diseño más importante: todos los escenarios comparten una
base. La regla:

- **Cada escenario crea su propio usuario** (`CrearUsuarioDePrueba`, o
  `Registrarse` con email y documento únicos) y afirma solo sobre sus datos.
  Así el proyecto `api` corre en paralelo y en cualquier orden.
- Lo que toca **estado global** (reloj, mercado, precios, `reset`) va en
  `*.serial.spec.ts`. El proyecto `api-serial` los corre con un worker y
  **después** del paralelo, y cada spec devuelve el control en su `afterEach`.

El detalle de por qué es posible está en
[`api-notes.md`](./api-notes.md#2-aislamiento-y-paralelismo).

## Cómo crece

| Si querés… | Tocá… |
|---|---|
| un escenario nuevo | solo `spec/` (y si falta un paso, una tarea) |
| un paso de dominio nuevo | `src/screenplay/tasks/<capacidad>/` |
| leer un valor nuevo de la respuesta | `src/screenplay/questions/api/` |
| verificar algo nuevo en la base | `src/screenplay/questions/db/` (el SQL va ahí y solo ahí) |
| algo del protocolo HTTP | `src/screenplay/interactions/Http.ts` + una nota en `api-notes.md` |
| rutas o esquemas nuevos de la API | nada a mano: `npm run contract:sync` |
| otra base u otro motor | `src/database/` (un adaptador) |
