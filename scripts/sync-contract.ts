/**
 * Genera `src/screenplay/contract/contract.generated.ts` desde el contrato de
 * la API (`${MILA_API_PATH}/docs/openapi.json`).
 *
 * ```bash
 * npm run contract:sync    # regenera el archivo
 * npm run contract:check   # regenera en memoria y falla si difiere (corre en CI)
 * ```
 *
 * Qué sale del contrato, y de ningún otro lado:
 *
 * - `Endpoints`: método, ruta, parámetros de ruta, si pide token, si exige
 *   `Idempotency-Key` y el estado de éxito de cada operación;
 * - `Esquemas`: un esquema zod por cada respuesta exitosa con cuerpo, más
 *   `Problem` (el cuerpo de todo error);
 * - `CodigosDeError` y `CodigosDeCampo`: los enums de `Problem`;
 * - `Cuerpo<'…'>` y `Consulta<'…'>`: tipos del cuerpo y de la query de cada
 *   operación, para que las interacciones no los escriban a mano.
 *
 * La API es la fuente única: si cambia una ruta o una forma, la suite se
 * entera acá y no a mitad de un escenario.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { env } from '../src/config/env';

const SOURCE = resolve(process.cwd(), env.milaApiPath, 'docs/openapi.json');
const TARGET = resolve(process.cwd(), 'src/screenplay/contract/contract.generated.ts');
const PREFIX = '/api/v1';
const METHODS = ['get', 'post', 'put', 'patch', 'delete'] as const;

// ---------- el subconjunto de OpenAPI 3.0 que usa la API ----------

interface JsonSchema {
    type?: string;
    properties?: Record<string, JsonSchema>;
    required?: string[];
    additionalProperties?: boolean | JsonSchema;
    items?: JsonSchema;
    enum?: unknown[];
    nullable?: boolean;
    pattern?: string;
    minimum?: number;
    maximum?: number;
    minLength?: number;
    maxLength?: number;
    maxItems?: number;
    anyOf?: JsonSchema[];
    oneOf?: JsonSchema[];
    $ref?: string;
    description?: string;
}

interface Parameter {
    in: 'path' | 'query' | 'header';
    name: string;
    required?: boolean;
    schema?: JsonSchema;
}

interface Operation {
    summary?: string;
    security?: unknown[];
    parameters?: Parameter[];
    requestBody?: { content?: Record<string, { schema?: JsonSchema }> };
    responses: Record<string, { content?: Record<string, { schema?: JsonSchema }> }>;
}

interface OpenApi {
    info: { title: string; version: string };
    paths: Record<string, Partial<Record<(typeof METHODS)[number], Operation>>>;
    components?: { schemas?: Record<string, JsonSchema> };
}

// ---------- nombres ----------

const pascal = (text: string): string =>
    text
        .split(/[^A-Za-z0-9]+/)
        .filter(Boolean)
        .map((part) => part[0]!.toUpperCase() + part.slice(1))
        .join('');

/** `POST /api/v1/accounts/{currency}/deposits` → `postAccountsByCurrencyDeposits`. */
const operationName = (method: string, path: string): string => {
    const segments = path
        .replace(PREFIX, '')
        .split('/')
        .filter(Boolean)
        .map((segment) => {
            const param = /^\{(.+)\}$/.exec(segment);
            return param ? `By${pascal(param[1]!)}` : pascal(segment);
        });
    return method + segments.join('');
};

const literal = (value: unknown): string => JSON.stringify(value);

const propertyKey = (name: string): string => (/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(name) ? name : literal(name));

const indent = (text: string, levels = 1): string =>
    text
        .split('\n')
        .map((line) => (line === '' ? line : '    '.repeat(levels) + line))
        .join('\n');

const refName = (ref: string): string => {
    const name = ref.split('/').at(-1);
    if (name === undefined) throw new Error(`$ref inválido: ${ref}`);
    return name;
};

// ---------- respuestas → zod ----------

const toZod = (schema: JsonSchema): string => {
    if (schema.$ref) return `${refName(schema.$ref)}Esquema`;

    let code: string;
    const variants = schema.anyOf ?? schema.oneOf;
    if (variants) {
        code = `z.union([${variants.map(toZod).join(', ')}])`;
    } else if (schema.enum && schema.enum.every((value) => typeof value === 'string')) {
        code = `z.enum([${schema.enum.map(literal).join(', ')}])`;
    } else {
        switch (schema.type) {
            case 'object':
                code = zodObject(schema);
                break;
            case 'array': {
                code = `z.array(${toZod(schema.items ?? {})})`;
                if (schema.maxItems !== undefined) code += `.max(${schema.maxItems})`;
                break;
            }
            case 'string': {
                code = 'z.string()';
                if (schema.pattern !== undefined) code += `.regex(new RegExp(${literal(schema.pattern)}))`;
                if (schema.minLength !== undefined) code += `.min(${schema.minLength})`;
                if (schema.maxLength !== undefined) code += `.max(${schema.maxLength})`;
                break;
            }
            case 'integer':
            case 'number': {
                code = schema.type === 'integer' ? 'z.number().int()' : 'z.number()';
                if (schema.minimum !== undefined) code += `.min(${schema.minimum})`;
                if (schema.maximum !== undefined) code += `.max(${schema.maximum})`;
                break;
            }
            case 'boolean':
                code = 'z.boolean()';
                break;
            case undefined:
                code = 'z.unknown()';
                break;
            default:
                throw new Error(`Tipo de esquema sin soporte en sync-contract: ${schema.type}`);
        }
    }
    return schema.nullable ? `${code}.nullable()` : code;
};

const zodObject = (schema: JsonSchema): string => {
    const required = new Set(schema.required ?? []);
    const entries = Object.entries(schema.properties ?? {}).map(([name, property]) => {
        const value = toZod(property);
        return `${propertyKey(name)}: ${required.has(name) ? value : `${value}.optional()`},`;
    });
    const factory = schema.additionalProperties === false ? 'z.strictObject' : 'z.object';
    if (entries.length === 0) return `${factory}({})`;
    return `${factory}({\n${indent(entries.join('\n'))}\n})`;
};

// ---------- cuerpos y queries → tipos de TypeScript ----------

/**
 * Los cuerpos de petición traen `anyOf` que genera Joi para reglas
 * condicionales (el documento según el país). El tipo se queda con lo que
 * declara el nivel de arriba (`type: string`): la regla fina la valida la API.
 */
const toTs = (schema: JsonSchema): string => {
    if (schema.$ref) return refName(schema.$ref);
    let code: string;
    if (schema.enum && schema.enum.length > 0 && schema.type !== undefined) {
        code = schema.enum.map(literal).join(' | ');
    } else {
        switch (schema.type) {
            case 'object': {
                const required = new Set(schema.required ?? []);
                const entries = Object.entries(schema.properties ?? {}).map(
                    ([name, property]) =>
                        `${propertyKey(name)}${required.has(name) ? '' : '?'}: ${toTs(property)};`,
                );
                code = entries.length === 0 ? 'Record<string, never>' : `{\n${indent(entries.join('\n'))}\n}`;
                break;
            }
            case 'array':
                code = `Array<${toTs(schema.items ?? {})}>`;
                break;
            case 'string':
                code = 'string';
                break;
            case 'integer':
            case 'number':
                code = 'number';
                break;
            case 'boolean':
                code = 'boolean';
                break;
            default:
                code = 'unknown';
        }
    }
    return schema.nullable ? `${code} | null` : code;
};

// ---------- operaciones ----------

interface Endpoint {
    name: string;
    method: string;
    path: string;
    summary: string;
    pathParams: string[];
    auth: boolean;
    idempotencyKey: boolean;
    success: number;
    statuses: number[];
    responseSchema: JsonSchema | undefined;
    bodySchema: JsonSchema | undefined;
    querySchema: JsonSchema | undefined;
}

const collect = (openapi: OpenApi): Endpoint[] => {
    const endpoints: Endpoint[] = [];
    for (const path of Object.keys(openapi.paths).sort()) {
        const operations = openapi.paths[path]!;
        for (const method of METHODS) {
            const operation = operations[method];
            if (!operation) continue;

            const statuses = Object.keys(operation.responses).map(Number).sort((a, b) => a - b);
            const success = statuses.find((status) => status >= 200 && status < 300);
            if (success === undefined) throw new Error(`${method.toUpperCase()} ${path} no declara respuesta exitosa`);

            const parameters = operation.parameters ?? [];
            const query = parameters.filter((parameter) => parameter.in === 'query');
            const querySchema: JsonSchema | undefined =
                query.length === 0
                    ? undefined
                    : {
                          type: 'object',
                          properties: Object.fromEntries(query.map((parameter) => [parameter.name, parameter.schema ?? {}])),
                          required: query.filter((parameter) => parameter.required).map((parameter) => parameter.name),
                      };

            endpoints.push({
                name: operationName(method, path),
                method: method.toUpperCase(),
                path,
                summary: (operation.summary ?? '').replace(/\s+/g, ' ').replace(/\*\//g, '*\\/'),
                pathParams: [...path.matchAll(/\{([^}]+)\}/g)].map((match) => match[1]!),
                auth: (operation.security ?? []).length > 0,
                idempotencyKey: parameters.some(
                    (parameter) => parameter.in === 'header' && parameter.name === 'Idempotency-Key' && parameter.required === true,
                ),
                success,
                statuses,
                responseSchema: operation.responses[String(success)]?.content?.['application/json']?.schema,
                bodySchema: operation.requestBody?.content?.['application/json']?.schema,
                querySchema,
            });
        }
    }
    return endpoints;
};

// ---------- render ----------

const renderEndpoint = (endpoint: Endpoint): string =>
    [
        `/** ${endpoint.method} ${endpoint.path}${endpoint.summary ? ` — ${endpoint.summary}` : ''} */`,
        `${endpoint.name}: {`,
        indent(
            [
                `nombre: ${literal(endpoint.name)},`,
                `metodo: ${literal(endpoint.method)},`,
                `ruta: ${literal(endpoint.path)},`,
                `parametrosDeRuta: [${endpoint.pathParams.map(literal).join(', ')}],`,
                `pideToken: ${String(endpoint.auth)},`,
                `exigeIdempotencyKey: ${String(endpoint.idempotencyKey)},`,
                `estadoDeExito: ${endpoint.success},`,
                `estados: [${endpoint.statuses.join(', ')}],`,
            ].join('\n'),
        ),
        '},',
    ].join('\n');

export const generate = (openapi: OpenApi): string => {
    const endpoints = collect(openapi);
    const components = openapi.components?.schemas ?? {};
    const problem = components.Problem;
    if (!problem?.properties) throw new Error('El contrato no define components.schemas.Problem');

    const errorCodes = problem.properties.code?.enum ?? [];
    const fieldCodes = problem.properties.errors?.items?.properties?.code?.enum ?? [];

    const header = [
        '/**',
        ' * GENERADO por `scripts/sync-contract.ts` desde',
        ' * `mila-invest-api/docs/openapi.json`. **No se edita a mano.**',
        ' *',
        ' * `npm run contract:sync` regenera, `npm run contract:check` falla si quedó viejo.',
        ' *',
        ` * ${openapi.info.title} ${openapi.info.version}: ${endpoints.length} operaciones.`,
        ' */',
        '/* eslint-disable */',
        "import { z } from 'zod';",
    ].join('\n');

    const componentBlocks = Object.keys(components)
        .sort()
        .map((name) => `export const ${name}Esquema = ${toZod(components[name]!)};`);

    const endpointsBlock = [
        'export const Endpoints = {',
        indent(endpoints.map(renderEndpoint).join('\n')),
        '} as const;',
        '',
        'export type NombreDeEndpoint = keyof typeof Endpoints;',
        'export type Endpoint = (typeof Endpoints)[NombreDeEndpoint];',
    ].join('\n');

    const withResponse = endpoints.filter((endpoint) => endpoint.responseSchema !== undefined);
    const schemasBlock = [
        '/** El cuerpo de la respuesta exitosa de cada operación que devuelve uno. */',
        'export const Esquemas = {',
        indent(
            [
                ...withResponse.map((endpoint) => `${endpoint.name}: ${toZod(endpoint.responseSchema!)},`),
                `/** El cuerpo de todo error (\`application/problem+json\`). */`,
                'Problem: ProblemEsquema,',
            ].join('\n'),
        ),
        '} as const;',
    ].join('\n');

    const withBody = endpoints.filter((endpoint) => endpoint.bodySchema !== undefined);
    const bodiesBlock = [
        '/** El cuerpo de petición de cada operación que acepta uno. */',
        'export interface Cuerpos {',
        indent(withBody.map((endpoint) => `${endpoint.name}: ${toTs(endpoint.bodySchema!)};`).join('\n')),
        '}',
        '',
        'export type Cuerpo<N extends keyof Cuerpos> = Cuerpos[N];',
    ].join('\n');

    const withQuery = endpoints.filter((endpoint) => endpoint.querySchema !== undefined);
    const queriesBlock = [
        '/** Los parámetros de query de cada operación que acepta alguno. */',
        'export interface Consultas {',
        indent(withQuery.map((endpoint) => `${endpoint.name}: ${toTs(endpoint.querySchema!)};`).join('\n')),
        '}',
        '',
        'export type Consulta<N extends keyof Consultas> = Consultas[N];',
    ].join('\n');

    const codesBlock = [
        'export const CodigosDeError = [',
        indent(errorCodes.map((code) => `${literal(code)},`).join('\n')),
        '] as const;',
        'export type CodigoDeError = (typeof CodigosDeError)[number];',
        '',
        'export const CodigosDeCampo = [',
        indent(fieldCodes.map((code) => `${literal(code)},`).join('\n')),
        '] as const;',
        'export type CodigoDeCampo = (typeof CodigosDeCampo)[number];',
    ].join('\n');

    return `${[header, ...componentBlocks, endpointsBlock, schemasBlock, bodiesBlock, queriesBlock, codesBlock].join('\n\n')}\n`;
};

const main = (): void => {
    const openapi = JSON.parse(readFileSync(SOURCE, 'utf8')) as OpenApi;
    const generated = generate(openapi);

    if (!process.argv.includes('--check')) {
        writeFileSync(TARGET, generated);
        console.log(`contract:sync — ${TARGET} regenerado desde ${SOURCE}`);
        return;
    }

    let current = '';
    try {
        current = readFileSync(TARGET, 'utf8');
    } catch {
        // Sin archivo commiteado: cuenta como desactualizado.
    }
    if (current === generated) {
        console.log('contract:check — el contrato está al día.');
        return;
    }
    console.error(
        [
            'contract:check — `src/screenplay/contract/contract.generated.ts` no coincide con',
            `  ${SOURCE}`,
            'La API cambió su contrato. Corré `npm run contract:sync`, revisá el diff y',
            'acomodá las interacciones y preguntas que usen lo que cambió.',
        ].join('\n'),
    );
    process.exitCode = 1;
};

main();
