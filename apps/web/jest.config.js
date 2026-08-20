// eslint-disable-next-line @typescript-eslint/no-require-imports -- Jest's own config-loading convention (CommonJS), matching next/jest's documented setup verbatim.
const nextJest = require('next/jest');

// next/jest's createJestConfig() requires next.config.ts to read its
// settings, and that file imports ./env for its own fail-fast validation
// (see its own comment) - which throws in a plain Jest process where
// .env.local was never loaded (unlike `next dev`/`next build`). A
// placeholder value here is enough; nothing under test calls the real API.
process.env.NEXT_PUBLIC_API_URL ??= 'http://localhost:3001';

// Official Next.js jest preset - handles the Next.js compiler (SWC),
// CSS/asset mocks, and env loading, so this project's own tsconfig/postcss
// config are respected automatically without duplicating them here.
const createJestConfig = nextJest({ dir: './' });

/** @type {import('jest').Config} */
const customJestConfig = {
  testEnvironment: 'jest-environment-jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  testPathIgnorePatterns: ['<rootDir>/.next/', '<rootDir>/node_modules/'],
};

module.exports = createJestConfig(customJestConfig);
