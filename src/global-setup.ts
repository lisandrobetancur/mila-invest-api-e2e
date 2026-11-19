import { env } from './config/env';

/**
 * Falla rápido y con un mensaje claro si la API no responde a `/health`.
 * La suite no levanta la API: eso lo hace docker compose, afuera.
 */
export default async function globalSetup(): Promise<void> {
    const url = new URL('/health', env.baseUrl).toString();
    let detalle: string;
    try {
        const response = await fetch(url, { signal: AbortSignal.timeout(env.timeouts.health) });
        if (response.ok) return;
        detalle = `GET /health respondió ${response.status}: ${await response.text()}`;
    } catch (error) {
        detalle = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
    }
    throw new Error(
        [
            `La API de MILA Invest no responde en ${env.baseUrl} (${detalle}).`,
            'Levantala desde mila-invest-api con:',
            '    DB_HOST_PORT=5433 docker compose up',
            'o apuntá la suite a otra con BASE_URL.',
        ].join('\n'),
    );
}
