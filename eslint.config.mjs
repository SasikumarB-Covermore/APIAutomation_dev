import globals from "globals";
import pluginJs from "@eslint/js";
import pluginReact from "eslint-plugin-react";


/** @type {import('eslint').Linter.Config[]} */
export default [
  { files: ["**/*.{js,mjs,cjs,jsx}"] },
  { files: ["**/*.js"], languageOptions: { sourceType: "commonjs" } },
  { languageOptions: { globals: globals.browser } },
  pluginJs.configs.recommended,
  pluginReact.configs.flat.recommended,
  {
    "ecmaFeatures": {
      "modules": true,
      "spread": true,
      "restParams": true
    },
    "env": {
      "browser": true,
      "node": true,
      "es6": true
    },
    "rules": {
      "no-unused-vars": 2,
      "no-undef": 2
    },
    "parserOptions": {
      "sourceType": "module"
    }
  }
];


