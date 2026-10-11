import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

// Telas da Fase 3 (só leitura) contra o vault de fixture, com hoje = 2026-10-11.

async function semRolagemHorizontal(page: Page) {
  const excesso = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  expect(excesso, 'a página não deve rolar na horizontal').toBeLessThanOrEqual(0)
}

async function semViolacoesA11y(page: Page) {
  const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()
  const resumo = r.violations.map((v) => `${v.id}: ${v.help} (${v.nodes.map((n) => n.target.join(' ')).join(' | ')})`)
  expect(resumo).toEqual([])
}

const TELAS = [
  { rota: '/', titulo: 'Visão geral', nav: 'Visão geral' },
  { rota: '/competencias', titulo: 'Competências', nav: 'Competências' },
  { rota: '/trilhas', titulo: 'Trilhas de carreira', nav: 'Trilhas de carreira' },
  { rota: '/planejamentos', titulo: 'Planejamentos', nav: /^Planejamentos/ },
  { rota: '/reunioes', titulo: 'Reuniões 1:1', nav: /^Reuniões 1:1/ },
  { rota: '/feedbacks', titulo: 'Feedbacks', nav: 'Feedbacks' },
  { rota: '/projetos', titulo: 'Projetos', nav: 'Projetos' },
] as const

for (const t of TELAS) {
  test.describe(`tela ${t.titulo}`, () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(t.rota)
      await expect(page.getByRole('heading', { level: 1, name: t.titulo })).toBeVisible()
      // Espera as consultas: nenhum "Lendo o vault…" na tela.
      await expect(page.getByText('Lendo o vault…')).toHaveCount(0)
      await page.evaluate(() => document.fonts.ready)
    })

    test('passa no axe e não rola na horizontal', async ({ page }) => {
      await semViolacoesA11y(page)
      await semRolagemHorizontal(page)
    })

    test('marca o item ativo na barra lateral', async ({ page }) => {
      await expect(page.getByRole('link', { name: t.nav })).toHaveAttribute('aria-current', 'page')
    })
  })
}

test('Visão geral mostra trilhas, próxima 1:1, prazos e feedbacks do vault', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByText('Ciclo 2026.2 · jul–dez')).toBeVisible()
  await expect(page.getByText('de 15', { exact: true })).toBeVisible()
  await expect(page.getByText('de 18', { exact: true })).toBeVisible()
  await expect(page.getByRole('link', { name: /System Design e Arquitetura/ }).first()).toBeVisible()
  await expect(page.getByRole('region', { name: 'Próxima 1:1' })).toContainText('Quinta, 15 out, 10:00–10:45')
  await expect(page.getByRole('region', { name: 'Próxima 1:1' })).toContainText('em 4 dias')
  await expect(page.getByRole('region', { name: 'Próximos prazos' })).toContainText('Guia de prompts de code review')
  await expect(page.getByRole('img', { name: /^Ações do ciclo:/ })).toBeVisible()
  await expect(page.getByText('Arquivos com erro')).toHaveCount(0)
  // Contadores da barra lateral.
  await expect(page.getByRole('link', { name: /^Planejamentos.*1 meta atrasada$/ })).toBeVisible()
  await expect(page.getByRole('link', { name: /^Reuniões 1:1.*próxima em 15\/10$/ })).toBeVisible()
})

test('Competências filtra por pilar, trilha e busca, mantendo o filtro na URL', async ({ page }) => {
  await page.goto('/competencias')
  const linhas = page.getByRole('region', { name: 'Tabela de competências' }).locator('tbody tr')
  await expect(linhas).toHaveCount(18)

  await page.getByRole('tab', { name: /Técnicas/ }).click()
  await expect(linhas).toHaveCount(9)
  await expect(page).toHaveURL(/pilar=tecnica/)

  await page.getByRole('combobox', { name: /Trilha/ }).selectOption('T5')
  await expect(linhas).toHaveCount(3)

  await page.getByRole('searchbox', { name: 'Buscar competência' }).fill('segur')
  await expect(linhas).toHaveCount(1)
  await expect(linhas.first()).toContainText('Segurança')

  await page.reload()
  await expect(linhas).toHaveCount(1)
  await expect(page.getByRole('tab', { name: /Técnicas/ })).toHaveAttribute('aria-selected', 'true')
})

test('Trilhas troca a trilha selecionada pela URL e mostra o quadro', async ({ page }) => {
  await page.goto('/trilhas')
  await expect(page.getByRole('heading', { level: 2, name: 'System Design e Arquitetura' })).toBeVisible()
  await expect(page.getByRole('region', { name: /^Em andamento:/ }).getByRole('article')).toHaveCount(1)

  await page.getByRole('link', { name: /^T5 Cloud, Infra e Segurança/ }).click()
  await expect(page).toHaveURL(/\/trilhas\/T5$/)
  await expect(page.getByRole('heading', { level: 2, name: 'Cloud, Infra e Segurança' })).toBeVisible()
  await expect(page.getByRole('region', { name: /^Concluído:/ })).toContainText('PDI-14')
  // Só leitura: nenhum botão de mover card nesta fase.
  await expect(page.getByRole('button', { name: /^Mover PDI-/ })).toHaveCount(0)
})

test('Planejamentos navega pelo calendário e filtra metas por estado', async ({ page }) => {
  await page.goto('/planejamentos')
  await expect(page.getByRole('heading', { level: 2, name: 'Outubro 2026' })).toBeVisible()
  await expect(page.getByRole('heading', { level: 2, name: 'Domingo, 11 out' })).toBeVisible()

  await page.getByRole('button', { name: /^15 out, / }).click()
  await expect(page.getByRole('heading', { level: 2, name: 'Quinta, 15 out' })).toBeVisible()
  await expect(page.getByRole('region', { name: 'Quinta, 15 out' })).toContainText('1:1 · 10:00–10:45')

  await page.getByRole('button', { name: 'Próximo mês' }).click()
  await expect(page.getByRole('heading', { level: 2, name: 'Novembro 2026' })).toBeVisible()
  await expect(page).toHaveURL(/mes=2026-11/)

  await page.getByRole('radio', { name: /Atrasadas/ }).click()
  const metas = page.getByRole('region', { name: 'Metas do ciclo' }).getByRole('listitem')
  await expect(metas).toHaveCount(1)
  await expect(metas.first()).toContainText('M-05')
})

test('Reuniões mostra a semana, a pauta da próxima 1:1 e o histórico', async ({ page }) => {
  await page.goto('/reunioes')
  // Hoje é domingo: a agenda abre na semana seguinte.
  await expect(page.getByRole('heading', { level: 2, name: '12 out – 16 out' })).toBeVisible()
  const agenda = page.getByRole('region', { name: 'Agenda da semana' })
  await expect(agenda).toContainText('Estudo AWS · M-03')
  await expect(agenda).toContainText('Preparar pauta da 1:1')
  await expect(page.getByRole('region', { name: 'Próxima 1:1' })).toContainText('Pauta ·')

  await page.getByRole('button', { name: 'Semana anterior' }).click()
  await expect(page.getByRole('heading', { level: 2, name: '05 out – 09 out' })).toBeVisible()
  await page.getByRole('button', { name: 'Esta semana' }).click()
  await expect(page.getByRole('heading', { level: 2, name: '12 out – 16 out' })).toBeVisible()

  await expect(page.getByRole('region', { name: 'Histórico' }).getByRole('link')).toHaveCount(3)
})

test('Feedbacks filtra por 1:1 e tipo', async ({ page }) => {
  await page.goto('/feedbacks')
  const cards = page.getByRole('article')
  await expect(cards).toHaveCount(7)

  await page.getByRole('button', { name: /^Quinta, 01 out/ }).click()
  await expect(page).toHaveURL(/reuniao=2026-10-01/)
  await expect(cards).toHaveCount(3)

  await page.getByRole('radio', { name: 'Insight' }).click()
  await expect(cards).toHaveCount(1)
  await expect(cards.first()).toContainText('alternativas que você descartou')
})

test('Projetos filtra por pasta e mostra o detalhe do projeto', async ({ page }) => {
  await page.goto('/projetos')
  const lista = page.getByRole('region', { name: /Todos os projetos|Portfólio pessoal/ })
  await expect(lista.getByRole('listitem')).toHaveCount(5)

  await page.getByRole('button', { name: /^Portfólio pessoal:/ }).click()
  await expect(page.getByRole('region', { name: 'Portfólio pessoal' }).getByRole('listitem')).toHaveCount(3)

  await page.getByRole('button', { name: /raeccoon-dev/ }).click()
  await expect(page).toHaveURL(/projeto=raeccoon-dev/)
  await expect(page.getByRole('complementary', { name: 'raeccoon-dev' })).toContainText('Portfólio bilíngue em React')
})
