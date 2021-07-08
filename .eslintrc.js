
module.exports = {
   env: {
      commonjs: true,
      es2021: true,
      node: true,
   },
   extends: [
      'airbnb-base',
   ],
   parserOptions: {
      ecmaVersion: 12,
   },
   rules: {
      indent: ['error', 3, { SwitchCase: 1 }],
      'linebreak-style': ['error', 'unix'],
      quotes: ['error', 'single'],
      semi: ['error', 'always'],
      'comma-dangle': ['error', 'always-multiline'],
      'no-underscore-dangle': ['error', { allow: ['_id'] }],
      'no-bitwise': ['error', { allow: ['~'] }],
      'arrow-parens': ['error', 'always'],
      'no-console': ['error', { allow: ['log'] }],
      'no-await-in-loop': 'off',
      'no-constant-condition': 'off',
      'no-unused-expressions': 'off',
      'no-case-declarations': 'off',
   },
};
