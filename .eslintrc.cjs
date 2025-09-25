/* Root ESLint configuration for monorepo */
module.exports = {
  root: true,
  ignorePatterns: ['dist', 'node_modules'],
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended'
  ],
  overrides: [
    {
      files: ['frontend/**/*.{ts,tsx,js,jsx}'],
      extends: ['next', 'next/core-web-vitals'],
      rules: {
        // Using the app/ directory, so disable rule expecting pages/ structure
        '@next/next/no-html-link-for-pages': 'off'
      }
    }
  ],
  rules: {
    // Allow explicit any temporarily in backend until types are refined
    '@typescript-eslint/no-explicit-any': 'off'
  }
};

