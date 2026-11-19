# Notas de la API (paso 0)

Lo que averiguamos **empíricamente** contra `mila-invest-api` levantada con
`DB_HOST_PORT=5433 docker compose up` (19-11-2026, commit `3999adc` de la API).
Cada respuesta dice dónde quedó codificada en la suite: solo en interacciones,
preguntas y adaptadores. Ninguna tarea ni spec repite estos detalles.

## 1. Autenticación

| Pregunta | Respuesta | Dónde vive |
|---|---|---|
| ¿Qué devuelve `POST /auth/login`? | `200 { access_token, refresh_token, token_type: "bearer", expires_in: 900 }`, en la raíz del cuerpo | `tasks/comun.ts` (`guardarLosTokens('')`) |
| ¿Y `POST /auth/register` y `POST /_testing/users`? | `201 { user, tokens }`: el mismo par, bajo `tokens` | `guardarLosTokens('tokens.')` |
| ¿Cuánto dura el access? | 15 minutos (`expires_in: 900`, `JWT_ACCESS_TTL_SECONDS`) | `spec/acceso/iniciar-sesion.spec.ts` lo afirma |
| ¿Cómo se manda? | `Authorization: Bearer <access_token>` | `interactions/Http.ts`, solo si el contrato marca la operación con `security` |
| ¿Token ausente? | `401 AUTH_TOKEN_INVALID`, `detail: "Falta el access token"` | `questions/api/Errores.ts` |
| ¿Token inválido? | `401 AUTH_TOKEN_INVALID`, `detail: "El access token no es válido"` | ídem |
| ¿Token vencido? | `401 AUTH_TOKEN_EXPIRED`. La API verifica el `exp` con su reloj inyectable, así que se prueba adelantando `POST /_testing/clock` | `spec/acceso/token-vencido.serial.spec.ts` |
| ¿Refresh? | Rota: devuelve un par nuevo y revoca el usado. Reusar uno ya usado → `401 AUTH_REFRESH_INVALID` **y revoca toda la cadena** (el par nuevo tampoco sirve) | `spec/acceso/sesiones.spec.ts` |
| ¿Logout? | `POST /auth/logout` con token **y** `{ refresh_token }` (sin cuerpo → 422). `204`; el refresh queda revocado (`refresh_tokens.revoked_at`) | ídem |
| ¿El access sigue sirviendo después del logout? | **Sí**: es un JWT sin estado y vive hasta su `exp`. No se prueba como requisito; ver pedidos al final | — |

## 2. Aislamiento y paralelismo

| Endpoint | Qué hace | Alcance |
|---|---|---|
| `POST /_testing/reset` | `TRUNCATE` de todas las tablas, vuelve a correr el seed (con la cuenta demo) y quita los overrides de reloj, mercado y precios | **Global**: borra los datos de todos |
| `POST /_testing/users` | Registra un usuario (email `qa+<ulid>@example.com` si no se da, documento válido derivado) y le carga saldos y posiciones **por el ledger**: los saldos como depósitos, cada posición como depósito + compra sin comisión. Devuelve `201 { user, tokens }`: queda listo para usar | Solo ese usuario |
| `POST /_testing/clock` | Congela el reloj del servidor (`{ now }`) o lo libera (`{ now: null }`). Afecta precios, horarios de mercado, `created_at` y el vencimiento de los JWT | **Global** |
| `POST /_testing/market/{country}` | `always_open: true/false/null`: siempre abierto, respetar horario o volver a `MARKET_ALWAYS_OPEN` (en el compose, `true`) | **Global** |
| `POST /_testing/prices/{id}` | Congela el precio de un instrumento en memoria (`{ price }`) o lo libera (`null`) | **Global** |
| `GET /_testing/ledger` | Verifica `available + reserved == SUM(ledger_entries)` por cuenta y que cada journal sume cero. Solo lee | Global, pero de lectura |

Todos los `/_testing` están exentos del rate limit.

**Estrategia (confirmada):** cada escenario crea su propio usuario con
`/_testing/users` (o `/auth/register` con email y documento únicos) y afirma
solo sobre sus datos. Las preguntas de base filtran siempre por el
`usuarioId` del actor. Así el proyecto `api` corre con `fullyParallel`.

Lo que toca estado global (reloj, mercado, precios, reset) va en
`*.serial.spec.ts`, en el proyecto `api-serial`: un worker y
`dependencies: ['api']`, o sea **después** de que termina el paralelo. Cada
spec serial devuelve el control en su `afterEach` (`DevolverElControl`).
Consecuencia de `dependencies`: si el proyecto `api` falla, Playwright no
corre `api-serial`. Para correrlo solo: `npm run test:serial`.

**Datos compartidos que sí se leen:** el catálogo de instrumentos (13, del
seed). Ningún escenario lo modifica y el reset lo vuelve a sembrar igual, así
que listarlo es determinístico.

## 3. Montos

- Los importes viajan como **string decimal** (`"8000000.00"`, `"18049.18"`);
  un número JSON en un campo de dinero se rechaza (`422 INVALID_FORMAT`).
  Precios con 2 decimales en la respuesta (se guardan con 6).
- Comprobado con un depósito de `"99999999.99"`: vuelve exacto en la
  respuesta y en `accounts.available` (`99999999.9900`).
- Viajan como número: cantidades, `limit`, `volume`, `expires_in`, `status`.
  El parseo lossless (`interactions/json.ts`) conserva cualquier número que
  `JSON.parse` cambiaría; con esta API ningún monto lo necesita, pero queda
  como red si alguno pasara a número.
- `pg` devuelve `NUMERIC` y `BIGINT` como **texto** (`"8000000.0000"`, `"2"`).
- Toda comparación de montos pasa por `Decimal` (`questions/api/Monto.ts`):
  `Monto.*` devuelve la forma canónica (`"45.00"`, conservando decimales
  significativos de más), y `esElMonto` compara por valor.

## 4. Base de datos

Tablas reales (`information_schema.tables`, esquema `public`):
`accounts`, `idempotency_records`, `instruments`, `ledger_entries`,
`ledger_journals`, `orders`, `positions`, `refresh_tokens`, `transactions`,
`users`. Definición: `mila-invest-api/drizzle/0000_init.sql`.

Columnas que lee la suite (`questions/db/index.ts`):

| Tabla | Columnas |
|---|---|
| `users` | `id`, `email` (siempre en minúsculas), `password_hash` (`$argon2id$…`), `full_name`, `country`, `base_currency`, `document_type`, `document_last4`. El documento completo **no** se guarda: solo `document_hash` (HMAC) |
| `accounts` | `user_id`, `currency`, `available` (`NUMERIC(20,4)`) |
| `orders` | `id`, `user_id`, `instrument_id`, `side`, `type`, `quantity` (`BIGINT`), `status`, `executed_price`, `gross`, `commission`, `total`, `currency`, `reject_code` |
| `transactions` | `user_id`, `type` (`DEPOSIT`/`BUY`/`SELL`/`FEE`), `amount` (con signo), `currency`, `order_id` |
| `positions` | `user_id`, `instrument_id`, `quantity`, `avg_cost`, `currency`. Con cantidad 0 la fila se borra |
| `refresh_tokens` | `user_id`, `revoked_at` |

Ojo: un usuario de `/_testing/users` con posiciones ya tiene órdenes `BUY` y
depósitos extra (los que fondean esas compras). Por eso las ventas se cuentan
con `Cantidad.deOrdenes('SELL')`.

La suite se conecta con una sesión `default_transaction_read_only=on`: no
puede escribir aunque quiera.

## 5. Consistencia

Después de un `POST /orders` 201 la fila **ya está** en la base: la API
responde después del commit de su transacción. No hace falta reintentar
consultas ni esperar; las preguntas de base consultan una vez.

## 6. Errores

Todo error es `application/problem+json` con la forma `Problem`:

```json
{ "type": "about:blank", "title": "Validation error", "status": 422,
  "code": "VALIDATION_ERROR", "detail": "La petición no cumple el contrato",
  "errors": [{ "field": "quantity", "code": "TOO_SMALL" }] }
```

| Estado | Cuándo, medido | Ejemplo de `code` |
|---|---|---|
| 400 | **Nunca.** La API reemplaza el 400 de Fastify por `422 VALIDATION_ERROR`; un JSON malformado da `errors: [{ field: "body", code: "INVALID_FORMAT" }]` | — |
| 401 | Sin token, token inválido o vencido, credenciales o refresh inválidos | `AUTH_TOKEN_INVALID`, `AUTH_TOKEN_EXPIRED`, `AUTH_INVALID_CREDENTIALS`, `AUTH_REFRESH_INVALID` |
| 404 | Ruta desconocida, instrumento u orden inexistente (u orden de otro usuario) | `NOT_FOUND`, `INSTRUMENT_NOT_FOUND`, `ORDER_NOT_FOUND` |
| 409 | Email o documento repetido | `AUTH_EMAIL_TAKEN`, `AUTH_DOCUMENT_TAKEN` |
| 422 | Validación (con `errors[]` por campo) y reglas de negocio detectadas antes de crear la orden (con `errors: [{ field: "quantity", code: "TOO_LARGE" }]`) | `VALIDATION_ERROR`, `INSUFFICIENT_FUNDS`, `INSUFFICIENT_POSITION`, `MARKET_CLOSED` |

El mapa código → estado está en `questions/api/Errores.ts`. Además, cada
llamada de `Http` valida el cuerpo: las respuestas exitosas contra su esquema
del contrato y los errores contra `Problem`.

## 7. Otros detalles del protocolo

- `Idempotency-Key` (UUID) es obligatorio en `POST /orders` y
  `POST /accounts/{currency}/deposits`; sin él → `422` en el campo
  `Idempotency-Key`. `Http` lo genera cuando el contrato lo exige.
- Un `POST` con `Content-Type: application/json` y **cuerpo vacío** da
  `422 VALIDATION_ERROR` (`body: INVALID_FORMAT`), también en `/_testing/reset`.
  `Http.post` sin cuerpo manda `{}`.
- Joi valida el TLD del email: `@example.test` se rechaza (`INVALID_FORMAT`).
  Los datos únicos usan `@example.com`.
- El documento es único **por país**; los datos de prueba generan números
  aleatorios válidos (CC de 10 dígitos, CURP con su formato, DNI de 8).
- Los precios son función del minuto: dos llamadas seguidas pueden ver
  precios distintos. Los escenarios en paralelo comparan dentro de una misma
  respuesta (o contra el `total` que devolvió la orden); los que comparan dos
  respuestas detienen el reloj (`resumen.serial.spec.ts`).
- Comisión en Colombia: 0,30 % del bruto con mínimo COP 5.000; precio de
  ejecución = último ± 0,10 %. Con el precio congelado los montos se calculan a
  mano (`precio-congelado.serial.spec.ts`).

### Rate limits

| Límite | Clave | Impacto en la suite |
|---|---|---|
| 120 peticiones/min (`RATE_LIMIT_DEFAULT`) | usuario autenticado, o **IP** si no hay token válido | Cada escenario tiene su usuario. Las peticiones sin token (registro, login, 401 a propósito) comparten el balde de la IP: la suite hace unas 20 por corrida |
| 5 logins/min (`RATE_LIMIT_LOGIN`) | IP + email | Los logins usan emails únicos. La cuenta demo solo se usa una vez por corrida (en el proyecto serial) |

Si alguna vez aparece un `429 RATE_LIMITED`, se puede subir el límite con
`RATE_LIMIT_DEFAULT` en el `docker-compose.yml` de la API, sin tocar su código.

## Pedidos al equipo de la API

1. **Moneda inexistente en `POST /accounts/{currency}/deposits`.** El pedido
   original de esta suite esperaba `404`; la API responde
   `422 VALIDATION_ERROR` con `currency: NOT_ALLOWED`. Es coherente con el
   contrato (el parámetro de ruta está validado por Joi), pero conviene
   documentarlo en `api-contract.md`. La suite afirma el 422.
2. **Cuerpo malformado.** El pedido esperaba `400`; el contrato (§7.3) dice
   que `VALIDATION_ERROR` reemplaza al 400 de Fastify. La suite afirma el 422.
   Si el equipo prefiere `400 MALFORMED_BODY`, hay que agregarlo al catálogo.
3. **Logout y access token.** Después del logout el access token sigue
   valiendo hasta su `exp` (15 min). Si es intencional, documentarlo; si no,
   hace falta una lista de revocación por `jti`.
4. **POST sin cuerpo.** `Content-Type: application/json` con cuerpo vacío
   responde 422 incluso en endpoints sin cuerpo (`/_testing/reset`). Un
   cliente que no manda cuerpo se lleva una sorpresa.
5. **Estado por código de error.** El OpenAPI enumera los `code` de `Problem`
   pero no los ata a un estado; la suite mantiene esa tabla a mano
   (`Errores.ts`). Un `x-status` por código en el OpenAPI permitiría
   generarla con `contract:sync`.
6. **Esquemas con nombre.** Salvo `Problem`, los esquemas del OpenAPI van
   en línea. Con `components.schemas` (`Order`, `Instrument`, `Transaction`…)
   los tipos generados tendrían nombres de dominio en vez de nombres de
   operación (`Esquemas.postOrders`).
