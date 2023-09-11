/** @type {import('jest').Config} */
module.exports = {
  collectCoverageFrom: ["src/**/*.ts"],
  resetMocks: true,
  restoreMocks: true,
  setupFiles: ["./jest.setup.js"],
  testEnvironment: "jsdom",
};
