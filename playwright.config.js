let playwrightTest;
try {
  playwrightTest = require("@playwright/test");
} catch (_error) {
  playwrightTest = require("playwright/test");
}
const { defineConfig } = playwrightTest;
const chromiumExecutable = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;
const webkitExecutable = process.env.PLAYWRIGHT_WEBKIT_EXECUTABLE_PATH;

module.exports = defineConfig({
  testDir: "tests/frontend",
  // Tests are isolated and can run in parallel, but hosted CI runners have
  // fewer cores and less memory than development machines. Limit contention
  // there and let workflow shards provide the broader parallelism.
  fullyParallel: true,
  workers: process.env.CI ? 2 : undefined,
  timeout: process.env.CI ? 90_000 : 30_000,
  outputDir: process.env.PLAYWRIGHT_OUTPUT_DIR || "test-results",
  use: {
    baseURL: "http://127.0.0.1:4173",
    headless: true,
  },
  projects: [
    { name: "chromium", use: {
      browserName: "chromium",
      ...(chromiumExecutable
        ? { launchOptions: { executablePath: chromiumExecutable } } : {}),
    } },
    { name: "webkit", use: {
      browserName: "webkit",
      ...(webkitExecutable
        ? { launchOptions: { executablePath: webkitExecutable } } : {}),
    } },
  ],
  webServer: process.env.PLAYWRIGHT_FILE_MODE === "1" ? undefined : {
    command: "python3 tests/frontend/server.py",
    port: 4173,
    reuseExistingServer: true,
  },
});
