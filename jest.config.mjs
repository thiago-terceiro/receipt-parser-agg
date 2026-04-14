import nextJest from "next/jest.js";

const createJestConfig = nextJest({
  dir: "./",
});

const config = {
  clearMocks: true,
  collectCoverageFrom: [
    "components/**/*.tsx",
    "contents/**/*.tsx",
    "context/**/*.tsx",
    "app/**/GroceriesSignInCard.tsx",
    "!**/*.test.ts",
    "!**/*.test.tsx",
  ],
  coveragePathIgnorePatterns: ["/node_modules/", "/test/"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
    "^next-intl/server$": "<rootDir>/test/next-intl-server.ts",
  },
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  testEnvironment: "jsdom",
  testMatch: ["<rootDir>/**/*.test.ts", "<rootDir>/**/*.test.tsx"],
};

export default createJestConfig(config);