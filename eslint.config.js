const globals = require("globals");
const js = require("@eslint/js");
const prettierConfig = require("eslint-config-prettier");

module.exports = [
  {
    ignores: [
      "node_modules/",
      "archive/",
      "coverage/",
      "logs/",
      "metrics/",
      "health/",
      "workflow/snapshots/",
      "experiments/",
      "dist/",
      "build/",
      "workflow/autonomous-task-generator.js" // Ignoring file with parsing error
    ]
  },
  js.configs.recommended,
  {
    files: [
      "**/*.js" // Apply to all JS files by default
    ],
    languageOptions: {
      ecmaVersion: "latest", // Compatible with Node 18.x and 20.x
      sourceType: "commonjs",
      globals: {
        ...globals.node,
        ...globals.jest, // Assuming 'tests' folder implies Jest or similar test runner.
        newPhase: "readonly" // Added to address 'newPhase' is not defined error
      }
    },
    rules: {
      "no-unused-vars": "off",
      "no-empty": "off",
      "no-useless-escape": "off",
      "preserve-caught-error": "off",
      "no-useless-assignment": "off"
      // Add any specific rules here if needed, or override recommended rules.
      // For example, if there are specific rules that are intentionally incompatible:
      // "no-unused-vars": "warn",
    }
  },
  // Override for eslint.config.js itself to ensure Node.js globals are recognized
  {
    files: ["eslint.config.js"],
    languageOptions: {
      globals: globals.node
    }
  },
  // Override to disable no-const-assign for event-validation-middleware.js
  {
    files: ["workflow/event-validation-middleware.js"],
    rules: {
      "no-const-assign": "off"
    }
  },
  // Prettier integration
  prettierConfig
];
