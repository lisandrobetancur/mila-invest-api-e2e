/**
 * GENERADO por `scripts/sync-contract.ts` desde
 * `mila-invest-api/docs/openapi.json`. **No se edita a mano.**
 *
 * `npm run contract:sync` regenera, `npm run contract:check` falla si quedó viejo.
 *
 * MILA Invest API 1.0.0: 25 operaciones.
 */
/* eslint-disable */
import { z } from 'zod';

export const ProblemEsquema = z.strictObject({
    type: z.string(),
    title: z.string(),
    status: z.number().int().min(400).max(599),
    code: z.enum(["VALIDATION_ERROR", "AUTH_INVALID_CREDENTIALS", "AUTH_EMAIL_TAKEN", "AUTH_DOCUMENT_TAKEN", "AUTH_TOKEN_EXPIRED", "AUTH_TOKEN_INVALID", "AUTH_REFRESH_INVALID", "INSUFFICIENT_FUNDS", "INSUFFICIENT_POSITION", "MARKET_CLOSED", "INSTRUMENT_NOT_FOUND", "ORDER_NOT_FOUND", "IDEMPOTENCY_CONFLICT", "RATE_LIMITED", "NOT_FOUND", "PAYLOAD_TOO_LARGE", "INTERNAL_ERROR"]),
    detail: z.string().optional(),
    errors: z.array(z.strictObject({
        field: z.string(),
        code: z.enum(["REQUIRED", "INVALID_FORMAT", "TOO_SHORT", "TOO_LONG", "TOO_SMALL", "TOO_LARGE", "NOT_ALLOWED"]),
    })).optional(),
});

export const Endpoints = {
    /** POST /api/v1/_testing/clock — Fija el reloj del servidor, o lo libera con `now: null` */
    postTestingClock: {
        nombre: "postTestingClock",
        metodo: "POST",
        ruta: "/api/v1/_testing/clock",
        parametrosDeRuta: [],
        pideToken: false,
        exigeIdempotencyKey: false,
        estadoDeExito: 200,
        estados: [200, 413, 422, 429, 500],
    },
    /** GET /api/v1/_testing/ledger — Verifica las invariantes del ledger sobre toda la base */
    getTestingLedger: {
        nombre: "getTestingLedger",
        metodo: "GET",
        ruta: "/api/v1/_testing/ledger",
        parametrosDeRuta: [],
        pideToken: false,
        exigeIdempotencyKey: false,
        estadoDeExito: 200,
        estados: [200, 429, 500],
    },
    /** POST /api/v1/_testing/market/{country} — Fuerza el mercado de un país a estar siempre abierto o a respetar su horario */
    postTestingMarketByCountry: {
        nombre: "postTestingMarketByCountry",
        metodo: "POST",
        ruta: "/api/v1/_testing/market/{country}",
        parametrosDeRuta: ["country"],
        pideToken: false,
        exigeIdempotencyKey: false,
        estadoDeExito: 200,
        estados: [200, 413, 422, 429, 500],
    },
    /** POST /api/v1/_testing/prices/{instrument_id} — Congela el precio de un instrumento, o lo libera con `price: null` */
    postTestingPricesByInstrumentId: {
        nombre: "postTestingPricesByInstrumentId",
        metodo: "POST",
        ruta: "/api/v1/_testing/prices/{instrument_id}",
        parametrosDeRuta: ["instrument_id"],
        pideToken: false,
        exigeIdempotencyKey: false,
        estadoDeExito: 200,
        estados: [200, 404, 413, 422, 429, 500],
    },
    /** POST /api/v1/_testing/reset — Trunca los datos y vuelve a correr el seed */
    postTestingReset: {
        nombre: "postTestingReset",
        metodo: "POST",
        ruta: "/api/v1/_testing/reset",
        parametrosDeRuta: [],
        pideToken: false,
        exigeIdempotencyKey: false,
        estadoDeExito: 204,
        estados: [204, 429, 500],
    },
    /** POST /api/v1/_testing/users — Crea un usuario con saldos y posiciones dados y devuelve sus tokens */
    postTestingUsers: {
        nombre: "postTestingUsers",
        metodo: "POST",
        ruta: "/api/v1/_testing/users",
        parametrosDeRuta: [],
        pideToken: false,
        exigeIdempotencyKey: false,
        estadoDeExito: 201,
        estados: [201, 404, 409, 413, 422, 429, 500],
    },
    /** GET /api/v1/accounts — Cuentas del usuario, una por moneda */
    getAccounts: {
        nombre: "getAccounts",
        metodo: "GET",
        ruta: "/api/v1/accounts",
        parametrosDeRuta: [],
        pideToken: true,
        exigeIdempotencyKey: false,
        estadoDeExito: 200,
        estados: [200, 401, 429, 500],
    },
    /** POST /api/v1/accounts/{currency}/deposits — Depósito de dinero virtual en la cuenta de una moneda */
    postAccountsByCurrencyDeposits: {
        nombre: "postAccountsByCurrencyDeposits",
        metodo: "POST",
        ruta: "/api/v1/accounts/{currency}/deposits",
        parametrosDeRuta: ["currency"],
        pideToken: true,
        exigeIdempotencyKey: true,
        estadoDeExito: 201,
        estados: [201, 401, 409, 413, 422, 429, 500],
    },
    /** POST /api/v1/auth/login — Login con email y contraseña */
    postAuthLogin: {
        nombre: "postAuthLogin",
        metodo: "POST",
        ruta: "/api/v1/auth/login",
        parametrosDeRuta: [],
        pideToken: false,
        exigeIdempotencyKey: false,
        estadoDeExito: 200,
        estados: [200, 401, 413, 422, 429, 500],
    },
    /** POST /api/v1/auth/logout — Revoca el refresh token enviado */
    postAuthLogout: {
        nombre: "postAuthLogout",
        metodo: "POST",
        ruta: "/api/v1/auth/logout",
        parametrosDeRuta: [],
        pideToken: true,
        exigeIdempotencyKey: false,
        estadoDeExito: 204,
        estados: [204, 401, 413, 422, 429, 500],
    },
    /** POST /api/v1/auth/refresh — Rota el refresh token y devuelve un par nuevo */
    postAuthRefresh: {
        nombre: "postAuthRefresh",
        metodo: "POST",
        ruta: "/api/v1/auth/refresh",
        parametrosDeRuta: [],
        pideToken: false,
        exigeIdempotencyKey: false,
        estadoDeExito: 200,
        estados: [200, 401, 413, 422, 429, 500],
    },
    /** POST /api/v1/auth/register — Registro de un usuario en un país */
    postAuthRegister: {
        nombre: "postAuthRegister",
        metodo: "POST",
        ruta: "/api/v1/auth/register",
        parametrosDeRuta: [],
        pideToken: false,
        exigeIdempotencyKey: false,
        estadoDeExito: 201,
        estados: [201, 409, 413, 422, 429, 500],
    },
    /** GET /api/v1/dashboard/summary — Resumen para el dashboard: portafolio, movimientos del mercado y últimas transacciones */
    getDashboardSummary: {
        nombre: "getDashboardSummary",
        metodo: "GET",
        ruta: "/api/v1/dashboard/summary",
        parametrosDeRuta: [],
        pideToken: true,
        exigeIdempotencyKey: false,
        estadoDeExito: 200,
        estados: [200, 401, 429, 500],
    },
    /** GET /api/v1/instruments — Catálogo de instrumentos con su último precio */
    getInstruments: {
        nombre: "getInstruments",
        metodo: "GET",
        ruta: "/api/v1/instruments",
        parametrosDeRuta: [],
        pideToken: true,
        exigeIdempotencyKey: false,
        estadoDeExito: 200,
        estados: [200, 401, 422, 429, 500],
    },
    /** GET /api/v1/instruments/{id} — Detalle de un instrumento */
    getInstrumentsById: {
        nombre: "getInstrumentsById",
        metodo: "GET",
        ruta: "/api/v1/instruments/{id}",
        parametrosDeRuta: ["id"],
        pideToken: true,
        exigeIdempotencyKey: false,
        estadoDeExito: 200,
        estados: [200, 401, 404, 422, 429, 500],
    },
    /** GET /api/v1/instruments/{id}/prices — Historial de precios de un instrumento */
    getInstrumentsByIdPrices: {
        nombre: "getInstrumentsByIdPrices",
        metodo: "GET",
        ruta: "/api/v1/instruments/{id}/prices",
        parametrosDeRuta: ["id"],
        pideToken: true,
        exigeIdempotencyKey: false,
        estadoDeExito: 200,
        estados: [200, 401, 404, 422, 429, 500],
    },
    /** GET /api/v1/me — Perfil del usuario autenticado */
    getMe: {
        nombre: "getMe",
        metodo: "GET",
        ruta: "/api/v1/me",
        parametrosDeRuta: [],
        pideToken: true,
        exigeIdempotencyKey: false,
        estadoDeExito: 200,
        estados: [200, 401, 429, 500],
    },
    /** GET /api/v1/meta/countries — Países soportados, con su moneda, documentos y estado del mercado */
    getMetaCountries: {
        nombre: "getMetaCountries",
        metodo: "GET",
        ruta: "/api/v1/meta/countries",
        parametrosDeRuta: [],
        pideToken: false,
        exigeIdempotencyKey: false,
        estadoDeExito: 200,
        estados: [200, 429, 500],
    },
    /** GET /api/v1/orders — Órdenes del usuario */
    getOrders: {
        nombre: "getOrders",
        metodo: "GET",
        ruta: "/api/v1/orders",
        parametrosDeRuta: [],
        pideToken: true,
        exigeIdempotencyKey: false,
        estadoDeExito: 200,
        estados: [200, 401, 422, 429, 500],
    },
    /** POST /api/v1/orders — Ejecuta una orden a mercado */
    postOrders: {
        nombre: "postOrders",
        metodo: "POST",
        ruta: "/api/v1/orders",
        parametrosDeRuta: [],
        pideToken: true,
        exigeIdempotencyKey: true,
        estadoDeExito: 201,
        estados: [201, 401, 404, 409, 413, 422, 429, 500],
    },
    /** POST /api/v1/orders/preview — Simula una orden a mercado sin ejecutarla */
    postOrdersPreview: {
        nombre: "postOrdersPreview",
        metodo: "POST",
        ruta: "/api/v1/orders/preview",
        parametrosDeRuta: [],
        pideToken: true,
        exigeIdempotencyKey: false,
        estadoDeExito: 200,
        estados: [200, 401, 404, 413, 422, 429, 500],
    },
    /** GET /api/v1/orders/{id} — Detalle de una orden propia */
    getOrdersById: {
        nombre: "getOrdersById",
        metodo: "GET",
        ruta: "/api/v1/orders/{id}",
        parametrosDeRuta: ["id"],
        pideToken: true,
        exigeIdempotencyKey: false,
        estadoDeExito: 200,
        estados: [200, 401, 404, 422, 429, 500],
    },
    /** GET /api/v1/portfolio — Posiciones y valorización del portafolio */
    getPortfolio: {
        nombre: "getPortfolio",
        metodo: "GET",
        ruta: "/api/v1/portfolio",
        parametrosDeRuta: [],
        pideToken: true,
        exigeIdempotencyKey: false,
        estadoDeExito: 200,
        estados: [200, 401, 429, 500],
    },
    /** GET /api/v1/transactions — Historial de movimientos del usuario */
    getTransactions: {
        nombre: "getTransactions",
        metodo: "GET",
        ruta: "/api/v1/transactions",
        parametrosDeRuta: [],
        pideToken: true,
        exigeIdempotencyKey: false,
        estadoDeExito: 200,
        estados: [200, 401, 422, 429, 500],
    },
    /** GET /health — Estado del servicio y de la base de datos */
    getHealth: {
        nombre: "getHealth",
        metodo: "GET",
        ruta: "/health",
        parametrosDeRuta: [],
        pideToken: false,
        exigeIdempotencyKey: false,
        estadoDeExito: 200,
        estados: [200, 429, 500],
    },
} as const;

export type NombreDeEndpoint = keyof typeof Endpoints;
export type Endpoint = (typeof Endpoints)[NombreDeEndpoint];

/** El cuerpo de la respuesta exitosa de cada operación que devuelve uno. */
export const Esquemas = {
    postTestingClock: z.strictObject({
        now: z.string().regex(new RegExp("^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}Z$")),
        frozen: z.boolean(),
    }),
    getTestingLedger: z.strictObject({
        balanced: z.boolean(),
        accounts_checked: z.number().int().min(0),
        mismatched_accounts: z.array(z.strictObject({
            account_id: z.string(),
            cached: z.string().regex(new RegExp("^-?\\d{1,16}(\\.\\d{1,6})?$")),
            ledger: z.string().regex(new RegExp("^-?\\d{1,16}(\\.\\d{1,6})?$")),
        })),
        unbalanced_journals: z.array(z.string()),
    }),
    postTestingMarketByCountry: z.strictObject({
        country: z.enum(["CO", "MX", "PE"]),
        always_open: z.boolean(),
        market: z.strictObject({
            status: z.enum(["OPEN", "CLOSED"]),
            opens_at: z.string().regex(new RegExp("^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}Z$")),
            closes_at: z.string().regex(new RegExp("^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}Z$")),
        }),
    }),
    postTestingPricesByInstrumentId: z.strictObject({
        instrument_id: z.string().regex(new RegExp("^[A-Z0-9]{1,12}-(CO|MX|PE)$")),
        frozen: z.boolean(),
        last_price: z.string().regex(new RegExp("^-?\\d{1,16}(\\.\\d{1,6})?$")),
    }),
    postTestingUsers: z.strictObject({
        user: z.strictObject({
            id: z.string().regex(new RegExp("^usr_[0-9ABCDEFGHJKMNPQRSTVWXYZ]{26}$")),
            email: z.string(),
            full_name: z.string(),
            country: z.enum(["CO", "MX", "PE"]),
            base_currency: z.enum(["COP", "MXN", "PEN"]),
            document_type: z.enum(["CC", "CE", "CURP", "DNI"]),
            document_last4: z.string().min(1).max(4),
        }),
        tokens: z.strictObject({
            access_token: z.string(),
            refresh_token: z.string(),
            token_type: z.enum(["bearer"]),
            expires_in: z.number().int().min(1),
        }),
    }),
    getAccounts: z.array(z.strictObject({
        id: z.string().regex(new RegExp("^acc_[0-9ABCDEFGHJKMNPQRSTVWXYZ]{26}$")),
        currency: z.enum(["COP", "MXN", "PEN"]),
        available: z.string().regex(new RegExp("^-?\\d{1,16}(\\.\\d{1,6})?$")),
        reserved: z.string().regex(new RegExp("^-?\\d{1,16}(\\.\\d{1,6})?$")),
    })),
    postAccountsByCurrencyDeposits: z.strictObject({
        id: z.string().regex(new RegExp("^txn_[0-9ABCDEFGHJKMNPQRSTVWXYZ]{26}$")),
        type: z.enum(["DEPOSIT", "BUY", "SELL", "FEE"]),
        amount: z.string().regex(new RegExp("^-?\\d{1,16}(\\.\\d{1,6})?$")),
        currency: z.enum(["COP", "MXN", "PEN"]),
        description: z.string(),
        order_id: z.string().regex(new RegExp("^ord_[0-9ABCDEFGHJKMNPQRSTVWXYZ]{26}$")).nullable(),
        created_at: z.string().regex(new RegExp("^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}Z$")),
    }),
    postAuthLogin: z.strictObject({
        access_token: z.string(),
        refresh_token: z.string(),
        token_type: z.enum(["bearer"]),
        expires_in: z.number().int().min(1),
    }),
    postAuthRefresh: z.strictObject({
        access_token: z.string(),
        refresh_token: z.string(),
        token_type: z.enum(["bearer"]),
        expires_in: z.number().int().min(1),
    }),
    postAuthRegister: z.strictObject({
        user: z.strictObject({
            id: z.string().regex(new RegExp("^usr_[0-9ABCDEFGHJKMNPQRSTVWXYZ]{26}$")),
            email: z.string(),
            full_name: z.string(),
            country: z.enum(["CO", "MX", "PE"]),
            base_currency: z.enum(["COP", "MXN", "PEN"]),
            document_type: z.enum(["CC", "CE", "CURP", "DNI"]),
            document_last4: z.string().min(1).max(4),
        }),
        tokens: z.strictObject({
            access_token: z.string(),
            refresh_token: z.string(),
            token_type: z.enum(["bearer"]),
            expires_in: z.number().int().min(1),
        }),
    }),
    getDashboardSummary: z.strictObject({
        portfolio_summary: z.strictObject({
            base_currency: z.enum(["COP", "MXN", "PEN"]),
            total_value: z.string().regex(new RegExp("^-?\\d{1,16}(\\.\\d{1,6})?$")),
            cash_value: z.string().regex(new RegExp("^-?\\d{1,16}(\\.\\d{1,6})?$")),
            invested_value: z.string().regex(new RegExp("^-?\\d{1,16}(\\.\\d{1,6})?$")),
            day_change: z.string().regex(new RegExp("^-?\\d{1,16}(\\.\\d{1,6})?$")),
            day_change_pct: z.string().regex(new RegExp("^-?\\d{1,16}(\\.\\d{1,6})?$")),
        }),
        top_movers: z.strictObject({
            gainers: z.array(z.strictObject({
                id: z.string().regex(new RegExp("^[A-Z0-9]{1,12}-(CO|MX|PE)$")),
                ticker: z.string().regex(new RegExp("^[A-Z0-9]{1,12}$")),
                name: z.string(),
                country: z.enum(["CO", "MX", "PE"]),
                type: z.enum(["STOCK", "ETF"]),
                currency: z.enum(["COP", "MXN", "PEN"]),
                last_price: z.string().regex(new RegExp("^-?\\d{1,16}(\\.\\d{1,6})?$")),
                change: z.string().regex(new RegExp("^-?\\d{1,16}(\\.\\d{1,6})?$")),
                change_pct: z.string().regex(new RegExp("^-?\\d{1,16}(\\.\\d{1,6})?$")),
                updated_at: z.string().regex(new RegExp("^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}Z$")),
            })).max(3),
            losers: z.array(z.strictObject({
                id: z.string().regex(new RegExp("^[A-Z0-9]{1,12}-(CO|MX|PE)$")),
                ticker: z.string().regex(new RegExp("^[A-Z0-9]{1,12}$")),
                name: z.string(),
                country: z.enum(["CO", "MX", "PE"]),
                type: z.enum(["STOCK", "ETF"]),
                currency: z.enum(["COP", "MXN", "PEN"]),
                last_price: z.string().regex(new RegExp("^-?\\d{1,16}(\\.\\d{1,6})?$")),
                change: z.string().regex(new RegExp("^-?\\d{1,16}(\\.\\d{1,6})?$")),
                change_pct: z.string().regex(new RegExp("^-?\\d{1,16}(\\.\\d{1,6})?$")),
                updated_at: z.string().regex(new RegExp("^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}Z$")),
            })).max(3),
        }),
        recent_transactions: z.array(z.strictObject({
            id: z.string().regex(new RegExp("^txn_[0-9ABCDEFGHJKMNPQRSTVWXYZ]{26}$")),
            type: z.enum(["DEPOSIT", "BUY", "SELL", "FEE"]),
            amount: z.string().regex(new RegExp("^-?\\d{1,16}(\\.\\d{1,6})?$")),
            currency: z.enum(["COP", "MXN", "PEN"]),
            description: z.string(),
            order_id: z.string().regex(new RegExp("^ord_[0-9ABCDEFGHJKMNPQRSTVWXYZ]{26}$")).nullable(),
            created_at: z.string().regex(new RegExp("^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}Z$")),
        })).max(5),
    }),
    getInstruments: z.strictObject({
        items: z.array(z.strictObject({
            id: z.string().regex(new RegExp("^[A-Z0-9]{1,12}-(CO|MX|PE)$")),
            ticker: z.string().regex(new RegExp("^[A-Z0-9]{1,12}$")),
            name: z.string(),
            country: z.enum(["CO", "MX", "PE"]),
            type: z.enum(["STOCK", "ETF"]),
            currency: z.enum(["COP", "MXN", "PEN"]),
            last_price: z.string().regex(new RegExp("^-?\\d{1,16}(\\.\\d{1,6})?$")),
            change: z.string().regex(new RegExp("^-?\\d{1,16}(\\.\\d{1,6})?$")),
            change_pct: z.string().regex(new RegExp("^-?\\d{1,16}(\\.\\d{1,6})?$")),
            updated_at: z.string().regex(new RegExp("^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}Z$")),
        })),
        next_cursor: z.string().nullable(),
    }),
    getInstrumentsById: z.strictObject({
        id: z.string().regex(new RegExp("^[A-Z0-9]{1,12}-(CO|MX|PE)$")),
        ticker: z.string().regex(new RegExp("^[A-Z0-9]{1,12}$")),
        name: z.string(),
        country: z.enum(["CO", "MX", "PE"]),
        type: z.enum(["STOCK", "ETF"]),
        currency: z.enum(["COP", "MXN", "PEN"]),
        last_price: z.string().regex(new RegExp("^-?\\d{1,16}(\\.\\d{1,6})?$")),
        change: z.string().regex(new RegExp("^-?\\d{1,16}(\\.\\d{1,6})?$")),
        change_pct: z.string().regex(new RegExp("^-?\\d{1,16}(\\.\\d{1,6})?$")),
        updated_at: z.string().regex(new RegExp("^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}Z$")),
        open: z.string().regex(new RegExp("^-?\\d{1,16}(\\.\\d{1,6})?$")),
        high: z.string().regex(new RegExp("^-?\\d{1,16}(\\.\\d{1,6})?$")),
        low: z.string().regex(new RegExp("^-?\\d{1,16}(\\.\\d{1,6})?$")),
        prev_close: z.string().regex(new RegExp("^-?\\d{1,16}(\\.\\d{1,6})?$")),
        volume: z.number().int().min(0),
        description: z.string(),
    }),
    getInstrumentsByIdPrices: z.strictObject({
        range: z.enum(["1D", "1W", "1M", "3M", "1Y"]),
        currency: z.enum(["COP", "MXN", "PEN"]),
        points: z.array(z.strictObject({
            t: z.string().regex(new RegExp("^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}Z$")),
            price: z.string().regex(new RegExp("^-?\\d{1,16}(\\.\\d{1,6})?$")),
        })).max(400),
    }),
    getMe: z.strictObject({
        id: z.string().regex(new RegExp("^usr_[0-9ABCDEFGHJKMNPQRSTVWXYZ]{26}$")),
        email: z.string(),
        full_name: z.string(),
        country: z.enum(["CO", "MX", "PE"]),
        base_currency: z.enum(["COP", "MXN", "PEN"]),
        document_type: z.enum(["CC", "CE", "CURP", "DNI"]),
        document_last4: z.string().min(1).max(4),
    }),
    getMetaCountries: z.array(z.strictObject({
        code: z.enum(["CO", "MX", "PE"]),
        currency: z.enum(["COP", "MXN", "PEN"]),
        time_zone: z.string(),
        document_types: z.array(z.enum(["CC", "CE", "CURP", "DNI"])),
        market: z.strictObject({
            status: z.enum(["OPEN", "CLOSED"]),
            opens_at: z.string().regex(new RegExp("^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}Z$")),
            closes_at: z.string().regex(new RegExp("^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}Z$")),
        }),
    })),
    getOrders: z.strictObject({
        items: z.array(z.strictObject({
            id: z.string().regex(new RegExp("^ord_[0-9ABCDEFGHJKMNPQRSTVWXYZ]{26}$")),
            instrument_id: z.string().regex(new RegExp("^[A-Z0-9]{1,12}-(CO|MX|PE)$")),
            side: z.enum(["BUY", "SELL"]),
            type: z.enum(["MARKET", "LIMIT"]),
            quantity: z.number().int().min(1).max(1000000),
            status: z.enum(["PENDING", "FILLED", "REJECTED", "CANCELLED"]),
            executed_price: z.string().regex(new RegExp("^-?\\d{1,16}(\\.\\d{1,6})?$")).nullable(),
            gross: z.string().regex(new RegExp("^-?\\d{1,16}(\\.\\d{1,6})?$")),
            commission: z.string().regex(new RegExp("^-?\\d{1,16}(\\.\\d{1,6})?$")),
            total: z.string().regex(new RegExp("^-?\\d{1,16}(\\.\\d{1,6})?$")),
            currency: z.enum(["COP", "MXN", "PEN"]),
            reject_code: z.string().nullable(),
            created_at: z.string().regex(new RegExp("^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}Z$")),
            filled_at: z.string().regex(new RegExp("^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}Z$")).nullable(),
        })),
        next_cursor: z.string().nullable(),
    }),
    postOrders: z.strictObject({
        id: z.string().regex(new RegExp("^ord_[0-9ABCDEFGHJKMNPQRSTVWXYZ]{26}$")),
        instrument_id: z.string().regex(new RegExp("^[A-Z0-9]{1,12}-(CO|MX|PE)$")),
        side: z.enum(["BUY", "SELL"]),
        type: z.enum(["MARKET", "LIMIT"]),
        quantity: z.number().int().min(1).max(1000000),
        status: z.enum(["PENDING", "FILLED", "REJECTED", "CANCELLED"]),
        executed_price: z.string().regex(new RegExp("^-?\\d{1,16}(\\.\\d{1,6})?$")).nullable(),
        gross: z.string().regex(new RegExp("^-?\\d{1,16}(\\.\\d{1,6})?$")),
        commission: z.string().regex(new RegExp("^-?\\d{1,16}(\\.\\d{1,6})?$")),
        total: z.string().regex(new RegExp("^-?\\d{1,16}(\\.\\d{1,6})?$")),
        currency: z.enum(["COP", "MXN", "PEN"]),
        reject_code: z.string().nullable(),
        created_at: z.string().regex(new RegExp("^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}Z$")),
        filled_at: z.string().regex(new RegExp("^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}Z$")).nullable(),
    }),
    postOrdersPreview: z.strictObject({
        estimated_price: z.string().regex(new RegExp("^-?\\d{1,16}(\\.\\d{1,6})?$")),
        gross: z.string().regex(new RegExp("^-?\\d{1,16}(\\.\\d{1,6})?$")),
        commission: z.string().regex(new RegExp("^-?\\d{1,16}(\\.\\d{1,6})?$")),
        total: z.string().regex(new RegExp("^-?\\d{1,16}(\\.\\d{1,6})?$")),
        currency: z.enum(["COP", "MXN", "PEN"]),
        available_after: z.string().regex(new RegExp("^-?\\d{1,16}(\\.\\d{1,6})?$")),
        warnings: z.array(z.enum(["MARKET_CLOSING_SOON", "PRICE_MAY_CHANGE"])),
    }),
    getOrdersById: z.strictObject({
        id: z.string().regex(new RegExp("^ord_[0-9ABCDEFGHJKMNPQRSTVWXYZ]{26}$")),
        instrument_id: z.string().regex(new RegExp("^[A-Z0-9]{1,12}-(CO|MX|PE)$")),
        side: z.enum(["BUY", "SELL"]),
        type: z.enum(["MARKET", "LIMIT"]),
        quantity: z.number().int().min(1).max(1000000),
        status: z.enum(["PENDING", "FILLED", "REJECTED", "CANCELLED"]),
        executed_price: z.string().regex(new RegExp("^-?\\d{1,16}(\\.\\d{1,6})?$")).nullable(),
        gross: z.string().regex(new RegExp("^-?\\d{1,16}(\\.\\d{1,6})?$")),
        commission: z.string().regex(new RegExp("^-?\\d{1,16}(\\.\\d{1,6})?$")),
        total: z.string().regex(new RegExp("^-?\\d{1,16}(\\.\\d{1,6})?$")),
        currency: z.enum(["COP", "MXN", "PEN"]),
        reject_code: z.string().nullable(),
        created_at: z.string().regex(new RegExp("^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}Z$")),
        filled_at: z.string().regex(new RegExp("^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}Z$")).nullable(),
    }),
    getPortfolio: z.strictObject({
        base_currency: z.enum(["COP", "MXN", "PEN"]),
        total_value: z.string().regex(new RegExp("^-?\\d{1,16}(\\.\\d{1,6})?$")),
        cash_value: z.string().regex(new RegExp("^-?\\d{1,16}(\\.\\d{1,6})?$")),
        invested_value: z.string().regex(new RegExp("^-?\\d{1,16}(\\.\\d{1,6})?$")),
        day_change: z.string().regex(new RegExp("^-?\\d{1,16}(\\.\\d{1,6})?$")),
        day_change_pct: z.string().regex(new RegExp("^-?\\d{1,16}(\\.\\d{1,6})?$")),
        positions: z.array(z.strictObject({
            instrument: z.strictObject({
                id: z.string().regex(new RegExp("^[A-Z0-9]{1,12}-(CO|MX|PE)$")),
                ticker: z.string().regex(new RegExp("^[A-Z0-9]{1,12}$")),
                name: z.string(),
                country: z.enum(["CO", "MX", "PE"]),
                type: z.enum(["STOCK", "ETF"]),
                currency: z.enum(["COP", "MXN", "PEN"]),
                last_price: z.string().regex(new RegExp("^-?\\d{1,16}(\\.\\d{1,6})?$")),
                change: z.string().regex(new RegExp("^-?\\d{1,16}(\\.\\d{1,6})?$")),
                change_pct: z.string().regex(new RegExp("^-?\\d{1,16}(\\.\\d{1,6})?$")),
                updated_at: z.string().regex(new RegExp("^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}Z$")),
            }),
            quantity: z.number().int().min(1),
            avg_cost: z.string().regex(new RegExp("^-?\\d{1,16}(\\.\\d{1,6})?$")),
            market_value: z.string().regex(new RegExp("^-?\\d{1,16}(\\.\\d{1,6})?$")),
            unrealized_pnl: z.string().regex(new RegExp("^-?\\d{1,16}(\\.\\d{1,6})?$")),
            unrealized_pnl_pct: z.string().regex(new RegExp("^-?\\d{1,16}(\\.\\d{1,6})?$")),
            currency: z.enum(["COP", "MXN", "PEN"]),
        })),
        allocation: z.array(z.strictObject({
            type: z.enum(["CASH", "STOCK", "ETF"]),
            value: z.string().regex(new RegExp("^-?\\d{1,16}(\\.\\d{1,6})?$")),
            pct: z.string().regex(new RegExp("^-?\\d{1,16}(\\.\\d{1,6})?$")),
        })),
        fx_rates_used: z.array(z.strictObject({
            from: z.enum(["COP", "MXN", "PEN"]),
            to: z.enum(["COP", "MXN", "PEN"]),
            rate: z.string().regex(new RegExp("^-?\\d{1,16}(\\.\\d{1,6})?$")),
            as_of: z.string().regex(new RegExp("^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}Z$")),
        })),
    }),
    getTransactions: z.strictObject({
        items: z.array(z.strictObject({
            id: z.string().regex(new RegExp("^txn_[0-9ABCDEFGHJKMNPQRSTVWXYZ]{26}$")),
            type: z.enum(["DEPOSIT", "BUY", "SELL", "FEE"]),
            amount: z.string().regex(new RegExp("^-?\\d{1,16}(\\.\\d{1,6})?$")),
            currency: z.enum(["COP", "MXN", "PEN"]),
            description: z.string(),
            order_id: z.string().regex(new RegExp("^ord_[0-9ABCDEFGHJKMNPQRSTVWXYZ]{26}$")).nullable(),
            created_at: z.string().regex(new RegExp("^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}Z$")),
        })),
        next_cursor: z.string().nullable(),
    }),
    getHealth: z.strictObject({
        status: z.enum(["ok"]),
        db: z.enum(["ok"]),
    }),
    /** El cuerpo de todo error (`application/problem+json`). */
    Problem: ProblemEsquema,
} as const;

/** El cuerpo de petición de cada operación que acepta uno. */
export interface Cuerpos {
    postTestingClock: {
        now: string | null;
    };
    postTestingMarketByCountry: {
        always_open: boolean | null;
    };
    postTestingPricesByInstrumentId: {
        price: string | null;
    };
    postTestingUsers: {
        email?: string;
        password?: string;
        full_name?: string;
        country?: "CO" | "MX" | "PE";
        balances?: {
            COP?: string;
            MXN?: string;
            PEN?: string;
        };
        positions?: Array<{
            instrument_id: string;
            quantity: number;
            avg_cost?: string;
        }>;
    };
    postAccountsByCurrencyDeposits: {
        amount: string;
    };
    postAuthLogin: {
        email: string;
        password: string;
    };
    postAuthLogout: {
        refresh_token: string;
    };
    postAuthRefresh: {
        refresh_token: string;
    };
    postAuthRegister: {
        email: string;
        password: string;
        full_name: string;
        country: "CO" | "MX" | "PE";
        document_type: string;
        document_number: string;
    };
    postOrders: {
        instrument_id: string;
        side: "BUY" | "SELL";
        type: "MARKET";
        quantity: number;
    };
    postOrdersPreview: {
        instrument_id: string;
        side: "BUY" | "SELL";
        type: "MARKET";
        quantity: number;
    };
}

export type Cuerpo<N extends keyof Cuerpos> = Cuerpos[N];

/** Los parámetros de query de cada operación que acepta alguno. */
export interface Consultas {
    getInstruments: {
        country?: "CO" | "MX" | "PE";
        type?: "STOCK" | "ETF";
        q?: string;
        cursor?: string;
        limit?: number;
    };
    getInstrumentsByIdPrices: {
        range?: "1D" | "1W" | "1M" | "3M" | "1Y";
    };
    getOrders: {
        status?: "PENDING" | "FILLED" | "REJECTED" | "CANCELLED";
        cursor?: string;
        limit?: number;
    };
    getTransactions: {
        type?: "DEPOSIT" | "BUY" | "SELL" | "FEE";
        from?: string;
        to?: string;
        cursor?: string;
        limit?: number;
    };
}

export type Consulta<N extends keyof Consultas> = Consultas[N];

export const CodigosDeError = [
    "VALIDATION_ERROR",
    "AUTH_INVALID_CREDENTIALS",
    "AUTH_EMAIL_TAKEN",
    "AUTH_DOCUMENT_TAKEN",
    "AUTH_TOKEN_EXPIRED",
    "AUTH_TOKEN_INVALID",
    "AUTH_REFRESH_INVALID",
    "INSUFFICIENT_FUNDS",
    "INSUFFICIENT_POSITION",
    "MARKET_CLOSED",
    "INSTRUMENT_NOT_FOUND",
    "ORDER_NOT_FOUND",
    "IDEMPOTENCY_CONFLICT",
    "RATE_LIMITED",
    "NOT_FOUND",
    "PAYLOAD_TOO_LARGE",
    "INTERNAL_ERROR",
] as const;
export type CodigoDeError = (typeof CodigosDeError)[number];

export const CodigosDeCampo = [
    "REQUIRED",
    "INVALID_FORMAT",
    "TOO_SHORT",
    "TOO_LONG",
    "TOO_SMALL",
    "TOO_LARGE",
    "NOT_ALLOWED",
] as const;
export type CodigoDeCampo = (typeof CodigosDeCampo)[number];
