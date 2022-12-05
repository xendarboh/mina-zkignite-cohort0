/** @type {import('@ts-jest/dist/types').InitialOptionsTsJest} */
export default {
  verbose: true,
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  transform: {
    '^.+\\.(t)s$': [
      'ts-jest',
      {
        useESM: true,
      },
    ],
    '^.+\\.(j)s$': 'babel-jest',
  },
  resolver: '<rootDir>/jest-resolver.cjs',
  transformIgnorePatterns: [
    '<rootDir>/node_modules/(?!snarkyjs/node_modules/tslib)',
  ],
  modulePathIgnorePatterns: ['<rootDir>/build/'],
};
