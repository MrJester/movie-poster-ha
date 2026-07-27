let playwrightTest;
try {
  playwrightTest = require("@playwright/test");
} catch (_error) {
  playwrightTest = require("playwright/test");
}
const { defineConfig } = playwrightTest;
const chromiumExecutable = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;

module.exports = defineConfig({
  testDir: "tests/frontend",
  timeout: 30_000,
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
    { name: "webkit", use: { browserName: "webkit" } },
  ],
  webServer: process.env.PLAYWRIGHT_FILE_MODE === "1" ? undefined : {
    command: "python3 -m http.server 4173 --bind 127.0.0.1",
    port: 4173,
    reuseExistingServer: true,
  },
});
