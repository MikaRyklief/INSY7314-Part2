module.exports = {
  env: {
    es2021: true,
    node: true
  },
  extends: [
    'standard'
  ],
  parserOptions: {
    ecmaVersion: 2021,
    sourceType: 'module'
  },
  rules: {
    'no-console': 'warn',
    semi: ['error', 'always'],
    'space-before-function-paren': 'off',
    'n/handle-callback-err': 'off'
  }
};
