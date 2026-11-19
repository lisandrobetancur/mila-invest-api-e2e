# mila-invest-api-tests

Suite end-to-end **de API** de MILA Invest: Playwright Test como runner, el
patrón Screenplay de Serenity/JS, el reporte HTML de Serenity/JS y
verificación en la base de datos. Los escenarios son Gherkin dentro de
`describe`/`it`, sin Cucumber.

## Levantar la API

Desde `mila-invest-api` (por defecto, `../mila-invest-api`):

```bash
DB_HOST_PORT=5433 docker compose up -d --wait
```

La API queda en `http://localhost:8000` y su PostgreSQL en `localhost:5433`.
El `DB_HOST_PORT=5433` importa: en la máquina de trabajo el `5432` es de otro
PostgreSQL, que **no es nuestro** y la suite nunca toca.

## Correr la suite

Node 22 (`.nvmrc`):

```bash
npm ci
```

```bash
npm test
```

| Script | Qué hace |
|---|---|
| `npm test` | toda la suite: el proyecto paralelo y después el serial |
| `npm run test:smoke` | solo `@smoke` |
| `npm run test:serial` | solo los `*.serial.spec.ts` (reloj, precios, reset) |
| `npm run report` | sirve el reporte de Serenity/JS y lo abre |
| `npm run contract:sync` | regenera el contrato desde `../mila-invest-api/docs/openapi.json` |
| `npm run contract:check` | falla si el contrato generado quedó viejo (corre en CI) |
| `npm run lint` · `npm run typecheck` | estático |
| `npm run clean` | borra reportes y resultados |

No hace falta instalar navegadores: la suite no abre ninguno.

Si la API no responde, la corrida se corta antes de empezar con un mensaje
que dice cómo levantarla.

### Configuración

Todo tiene default; un `.env` (ver `.env.example`) lo pisa.

| Variable | Default |
|---|---|
| `BASE_URL` | `http://localhost:8000` |
| `DATABASE_URL` | `postgres://mila:mila@localhost:5433/mila` |
| `MILA_API_PATH` | `../mila-invest-api` |
| `WORKERS` | lo decide Playwright |

## El reporte

Cada corrida deja `reports/serenity-js/index.html`, autocontenido: se abre
con doble clic (`file://`) o con `npm run report`. Muestra capacidad →
característica → escenario, con los pasos Dado/Cuando/Entonces y, debajo,
cada petición y respuesta.

## Documentación

- [`docs/architecture.md`](docs/architecture.md): capas, piezas y la estrategia de aislamiento.
- [`docs/writing-scenarios.md`](docs/writing-scenarios.md): cómo escribir un escenario nuevo.
- [`docs/api-notes.md`](docs/api-notes.md): lo que averiguamos de la API y los pedidos a su equipo.
