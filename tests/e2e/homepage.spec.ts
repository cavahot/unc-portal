import { test, expect } from '@playwright/test'

test.describe('Homepage', () => {
  test('shows 3 news cards', async ({ page }) => {
    await page.goto('/es', { waitUntil: 'networkidle' })
    const newsCards = page.locator('a[href*="/noticias/"]')
    await expect(newsCards).toHaveCount(3)
  })

  test('shows stats section with 6 counters', async ({ page }) => {
    await page.goto('/es', { waitUntil: 'networkidle' })
    const statsSection = page.locator('section').filter({ hasText: 'Estadísticas institucionales' })
    await statsSection.scrollIntoViewIfNeeded()
    await page.waitForTimeout(1500)
    await expect(statsSection.getByText('Días de actividad', { exact: true })).toBeVisible()
    await expect(statsSection.getByText('Estudiantes', { exact: true })).toBeVisible()
    await expect(statsSection.getByText('Carreras acreditadas', { exact: true })).toBeVisible()
    await expect(statsSection.getByText('Docentes y colaboradores', { exact: true })).toBeVisible()
    await expect(statsSection.getByText('Facultades', { exact: true })).toBeVisible()
    await expect(statsSection.getByText('Egresados', { exact: true })).toBeVisible()
  })

  test('stats counters animate to non-zero values', async ({ page }) => {
    await page.goto('/es', { waitUntil: 'networkidle' })
    const statsSection = page.locator('section').filter({ hasText: 'Estadísticas institucionales' })
    await statsSection.scrollIntoViewIfNeeded()
    await page.waitForTimeout(1500)
    const counters = statsSection.locator('span.tabular-nums')
    const count = await counters.count()
    expect(count).toBeGreaterThanOrEqual(6)
    for (let i = 0; i < count; i++) {
      const text = await counters.nth(i).innerText()
      const value = parseInt(text.replace(/[^0-9]/g, ''), 10)
      expect(value).toBeGreaterThan(0)
    }
  })
})
