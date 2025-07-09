module.exports = {
  root: true,
  env: {
    es6: true,
    node: true,
  },
  extends: [
    "eslint:recommended",
  ],
  parserOptions: {
    ecmaVersion: 2020,
  },
  rules: {
    "quotes": ["error", "double"],
    "indent": ["error", 2],
    "object-curly-spacing": ["error", "always"],
    "max-len": ["error", { "code": 120 }],
  },
};