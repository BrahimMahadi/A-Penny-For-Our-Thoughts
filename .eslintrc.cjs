/* eslint-env node */
module.exports = {
  root: true,
  env: {
    browser: true,
    es2022: true,
    node: true,
  },
  parser: 'vue-eslint-parser',
  parserOptions: {
    parser: '@typescript-eslint/parser',
    ecmaVersion: 'latest',
    sourceType: 'module',
    extraFileExtensions: ['.vue'],
  },
  extends: [
    'eslint:recommended',
    'plugin:vue/vue3-recommended',
    'plugin:@typescript-eslint/recommended',
  ],
  plugins: ['@typescript-eslint'],
  rules: {
    // Prevents the BUG-004/-005/-007/-008 pattern: bare identifiers
    // used without imports. Hard error at lint time.
    'no-undef': 'error',

    // Unused vars: TS rule supersedes the base rule
    'no-unused-vars': 'off',
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],

    // BaseCard / BaseModal / WantsDonut are intentionally single-word
    'vue/multi-word-component-names': 'off',

    // Allow `any` in initial migration; tighten later
    '@typescript-eslint/no-explicit-any': 'warn',
  },
  ignorePatterns: ['dist/', 'node_modules/', '*.config.cjs', 'src/**/*.js'],
};
