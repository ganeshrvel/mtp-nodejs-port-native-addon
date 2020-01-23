module.exports = {
  env: {
    node: true,
    es6: true
  },
  parser: 'babel-eslint',
  extends: ['plugin:prettier/recommended'],
  plugins: ['import', 'promise', 'compat', 'prettier'],
  rules: {
    'arrow-body-style': 'off',
    'arrow-parens': 'off',
    'class-methods-use-this': 'off',
    'comma-dangle': 'off',
    'compat/compat': 0,
    'consistent-return': 'off',
    'generator-star-spacing': 'off',
    'import/export': 'off',
    'import/named': 'off',
    'import/no-cycle': 'off',
    'import/no-dynamic-require': 'off',
    'import/no-extraneous-dependencies': [
      'error',
      {
        devDependencies: true,
        optionalDependencies: false,
        peerDependencies: false,
        packageDir: './'
      }
    ],
    'import/no-named-as-default': 0,
    'import/no-named-as-default-member': 0,
    'import/no-unresolved': 'error',
    'import/order': [
      'error',
      { groups: [['builtin', 'external', 'internal']] }
    ],
    'import/prefer-default-export': 'off',
    'no-async-promise-executor': 'off',
    'no-console': [
      'error',
      {
        allow: ['info', 'error', 'warn']
      }
    ],
    'no-multi-assign': 'off',
    'no-shadow': 'off',
    'no-underscore-dangle': 'off',
    'no-use-before-define': 'off',
    'no-unused-vars': ['error'],
    'padding-line-between-statements': [
      'error',
      { blankLine: 'always', prev: '*', next: 'return' },
      { blankLine: 'always', prev: ['block-like'], next: '*' },
      { blankLine: 'always', prev: ['const', 'let', 'var'], next: '*' },
      {
        blankLine: 'any',
        prev: ['const', 'let', 'var'],
        next: ['const', 'let', 'var']
      }
    ],
    'no-return-await': 0,
    'no-nested-ternary': 0,
    'no-undef': 'error',
    'prettier/prettier': ['error', { singleQuote: true }],
    'promise/always-return': 0,
    'promise/catch-or-return': 0,
    'promise/no-native': 'off',
    'promise/param-names': 'error'
  },
  parserOptions: {
    ecmaVersion: 6,
    sourceType: 'module',
    ecmaFeatures: {
      experimentalObjectRestSpread: true
    }
  }
};
