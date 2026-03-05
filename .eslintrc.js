module.exports = {
    env: {
        node: true,
        es2022: true,
    },
    parserOptions: {
        ecmaVersion: 2022,
        sourceType: "module",
    },
    rules: {
        "no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
        "no-undef": "error",
        "no-console": "off", // Allow console in backend (logging is intentional)
        "no-constant-condition": "warn",
        "no-duplicate-case": "error",
        "eqeqeq": ["warn", "always"],
        "no-var": "error",
        "prefer-const": "warn",
        "no-throw-literal": "error",
    },
    ignorePatterns: [
        "node_modules/",
        "frontend/",
        "contracts/",
        "hardhat.config.ts",
        "scripts/",
        "data/",
    ],
};
