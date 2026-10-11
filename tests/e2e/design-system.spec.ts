import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

async function semRolagemHorizontal(page: Page) {
  const excesso = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  expect(excesso, 'a página não deve rolar na horizontal').toBeLessThanOrEqual(0)
}

async function semViolacoesA11y(page: Page) {
  const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()
  const resumo = r.violations.map((v) => `${v.id}: ${v.help} (${v.nodes.map((n) => n.target.join(' ')).join(' | ')})`)
  expect(resumo).toEqual([])
}

test.describe('catálogo /_fundamentos', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/_fundamentos')
    await expect(page.getByRole('heading', { level: 1, name: 'Fundamentos' })).toBeVisible()
    await page.evaluate(() => document.fonts.ready)
  })

  test('passa no axe (WCAG 2.1 AA, incluindo contraste)', async ({ page }) => {
    await semViolacoesA11y(page)
  })

  test('não rola na horizontal', async ({ page }) => {
    await semRolagemHorizontal(page)
  })

  test('mantém a aparência (regressão visual)', async ({ page }) => {
    // Baselines geradas no Windows local; a renderização de fonte muda entre sistemas.
    test.skip(!!process.env.CI, 'regressão visual roda só localmente')
    await expect(page).toHaveScreenshot('fundamentos.png', { fullPage: true })
  })

  test('componentes interativos funcionam pelo teclado', async ({ page }) => {
    const avancar = page.getByRole('button', { name: 'Mover PDI-02 para Em revisão' })
    await avancar.focus()
    await page.keyboard.press('Enter')
    await expect(page.getByRole('status').filter({ hasText: 'PDI-02 movida para Em revisão' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Mover PDI-02 para Concluído' })).toBeVisible()

    await page.getByRole('radio', { name: 'Em risco' }).click()
    await expect(page.getByRole('radio', { name: 'Em risco' })).toHaveAttribute('aria-checked', 'true')

    await page.getByRole('button', { name: 'Definir Comunicação como Pleno' }).click()
    await expect(page.getByRole('button', { name: 'Definir Comunicação como Pleno' })).toHaveAttribute('aria-pressed', 'true')
  })
})
