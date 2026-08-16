import type { Config } from "jest";

const config: Config = {
  preset: "ts-jest",
  testEnvironment: "node",
  setupFiles: ["<rootDir>/jest.env.setup.ts"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
    "^e2b$": "<rootDir>/__mocks__/e2b.ts",
  },
  testMatch: ["**/__tests__/**/*.test.ts", "**/__tests__/**/*.test.tsx"],
  transform: {
    "^.+\\.tsx?$": ["ts-jest", { tsconfig: { jsx: "react", target: "es2017" } }],
  },
  // CI imports modules that leave pg pools / timers open; all tests pass but
  // Jest would otherwise hang waiting for handles to close.
  forceExit: process.env.CI === "true",
};

export default config;
