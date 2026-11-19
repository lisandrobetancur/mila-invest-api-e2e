// @ts-check
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
    {
        ignores: [
            'node_modules/**',
            'reports/**',
            'playwright-report/**',
            'test-results/**',
            'src/screenplay/contract/contract.generated.ts',
        ],
    },
    eslint.configs.recommended,
    ...tseslint.configs.recommendedTypeChecked,
    {
        languageOptions: {
            parserOptions: {
                projectService: {
                    allowDefaultProject: ['eslint.config.mjs'],
                },
                tsconfigRootDir: import.meta.dirname,
            },
        },
        rules: {
            '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
            '@typescript-eslint/no-floating-promises': 'error',
            // Nadie más que env.ts lee la configuración del entorno.
            'no-restricted-properties': [
                'error',
                { object: 'process', property: 'env', message: 'La configuración se lee solo en src/config/env.ts.' },
            ],
        },
    },
    {
        files: ['src/config/env.ts'],
        rules: { 'no-restricted-properties': 'off' },
    },
    {
        // Reglas de capas: un spec habla de negocio. Nada de HTTP, SQL ni contrato.
        files: ['spec/**/*.ts'],
        rules: {
            'no-restricted-imports': [
                'error',
                {
                    paths: [
                        { name: '@playwright/test', message: 'describe/it salen de src/fixtures.ts.' },
                        { name: '@serenity-js/rest', message: 'Las peticiones las mandan las tareas (src/screenplay/tasks).' },
                        { name: 'axios', message: 'Las peticiones las mandan las tareas (src/screenplay/tasks).' },
                        { name: 'pg', message: 'La base se lee con preguntas (src/screenplay/questions/db).' },
                    ],
                    patterns: [
                        {
                            group: ['**/interactions/**', '**/contract/**', '**/database/**', '**/abilities/**'],
                            message: 'Un spec usa solo tareas y preguntas.',
                        },
                    ],
                },
            ],
            'no-restricted-syntax': [
                'error',
                {
                    selector: 'Literal[value=/\\b(select|insert|update|delete)\\b[\\s\\S]*\\b(from|into|set)\\b/i]',
                    message: 'El SQL vive en src/screenplay/questions/db.',
                },
                {
                    selector: 'Literal[value=/^\\/api\\//]',
                    message: 'Las rutas salen del contrato, dentro de las tareas.',
                },
            ],
        },
    },
);
