import { defineConfig, devices } from '@playwright/test'

// Roda contra o vault de fixture, em portas próprias (5183/5184) para não
// reaproveitar um `npm run dev` aberto no vault real. As larguras seguem
// CodingPreferences: 375, 768 e 1440 px.
const WEB = 'http://127.0.0.1:5183'

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: WEB,
    trace: 'retain-on-failure',
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
  },
  expect: {
    toHaveScreenshot: { maxDiffPixelRatio: 0.01, animations: 'disabled' },
  },
  // Baselines de screenshot dependem do sistema; o sufixo do projeto separa os tamanhos.
  snapshotPathTemplate: '{testDir}/__screenshots__/{testFilePath}/{arg}-{projectName}{ext}',
  projects: [
    { name: 'mobile-375', use: { ...devices['Desktop Chrome'], viewport: { width: 375, height: 812 } } },
    { name: 'tablet-768', use: { ...devices['Desktop Chrome'], viewport: { width: 768, height: 1024 } } },
    { name: 'desktop-1440', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
  ],
  webServer: {
    command: 'npm run dev:fixture',
    url: `${WEB}/api/saude`,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
    env: { PDI_HOJE: '2026-10-11', PDI_PORT: '5184', PDI_WEB_PORT: '5183' },
  },
})
