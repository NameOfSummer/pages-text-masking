import js from "@eslint/js";
import prettier from "eslint-config-prettier";
import jsdoc from "eslint-plugin-jsdoc";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import { defineConfig, globalIgnores } from "eslint/config";
import globals from "globals";
import tseslint from "typescript-eslint";

/**
 * 全リポジトリ共通の JSDoc ルール（_templates/common/eslint.config.js と同じ内容）。
 * function 宣言、およびファイル直下の const / var / type に JSDoc を必須にする。
 */
const jsdocRules = {
  "jsdoc/require-jsdoc": [
    "error",
    {
      publicOnly: false,
      require: {
        FunctionDeclaration: true,
        ArrowFunctionExpression: false,
        FunctionExpression: false,
        MethodDefinition: false,
        ClassDeclaration: false,
      },
      contexts: [
        "Program > VariableDeclaration[kind='const']",
        "Program > VariableDeclaration[kind='var']",
        // JSDoc は export の直前に付く。内側の VariableDeclaration には紐づかない。
        "ExportNamedDeclaration[declaration.kind='const']",
        "ExportNamedDeclaration[declaration.kind='var']",
        "TSTypeAliasDeclaration",
      ],
    },
  ],
  "jsdoc/require-description": "error",
  "jsdoc/require-param": [
    "error",
    {
      contexts: ["FunctionDeclaration"],
      checkDestructured: false,
      unnamedRootBase: ["props"],
    },
  ],
  "jsdoc/require-returns": [
    "error",
    {
      contexts: ["FunctionDeclaration"],
      forceRequireReturn: true,
    },
  ],
  "jsdoc/require-returns-type": [
    "error",
    {
      contexts: ["FunctionDeclaration"],
    },
  ],
};

/**
 * React を使うリポジトリ（pages-web-app / google-apps-script-web-app）の共通ルール。
 */
const reactRules = {
  // React Compiler 向けの厳格ルールは既存パターンと衝突するため、Hooks の基本ルールのみ適用する。
  "react-hooks/rules-of-hooks": "error",
  "react-hooks/exhaustive-deps": "warn",
  "react-refresh/only-export-components": [
    "warn",
    { allowConstantExport: true },
  ],
};

export default defineConfig(
  globalIgnores(["dist", "coverage", ".claude.local"]),
  {
    files: ["**/*.{ts,tsx}"],
    extends: [js.configs.recommended, tseslint.configs.recommended],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
    },
    plugins: {
      jsdoc,
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    settings: {
      jsdoc: {
        mode: "typescript",
      },
    },
    rules: {
      ...jsdocRules,
      ...reactRules,
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
    },
  },
  // 整形は Prettier に任せるため、競合する ESLint ルールを無効にする（必ず最後に置く）
  prettier,
);
