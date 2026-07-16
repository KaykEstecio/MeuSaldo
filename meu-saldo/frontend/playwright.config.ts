import { defineConfig, devices } from "@playwright/test";
import { resolve } from "node:path";

const backendDirectory = resolve(import.meta.dirname, "../backend");
const backendPython = process.platform === "win32" ? "venv\\Scripts\\python.exe" : "python";

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:5173",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: [
    {
      command: `${backendPython} -m uvicorn app.main:app --host localhost --port 8000`,
      cwd: backendDirectory,
      url: "http://localhost:8000/health",
      reuseExistingServer: !process.env.CI,
      env: {
        APP_ENV: "test",
        DATABASE_URL:
          process.env.DATABASE_URL ?? "postgresql+psycopg://postgres:postgres@localhost:5432/meusaldodb",
        CORS_ORIGINS: "http://localhost:5173",
        JWT_SECRET_KEY: process.env.JWT_SECRET_KEY ?? "local-e2e-secret-key",
        AI_PROVIDER: "rules",
        OPENAI_API_KEY: "",
      },
    },
    {
      command: "npm run dev -- --host localhost --port 5173",
      cwd: import.meta.dirname,
      url: "http://localhost:5173/login",
      reuseExistingServer: !process.env.CI,
      env: { VITE_API_URL: "http://localhost:8000/api/v1" },
    },
  ],
});
