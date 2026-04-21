// @ts-check
import { test, expect } from '@playwright/test'
import { mockSupabase, makeList, makeItem, makeCategory, SHARE_ID, LIST_ID, CAT_1_ID, ITEM_1_ID } from './helpers/api-mock.js'

const listUrl = `/lista/${SHARE_ID}`

// ── Deep-linking ──────────────────────────────────────────────────────────────

test.describe('Deep-linking', () => {
  test('navegar directamente a /lista/<share_id> carga la lista sin pasar por home', async ({ page }) => {
    await mockSupabase(page, {
      lists: [makeList({ share_id: SHARE_ID })],
      items: [makeItem({ id: ITEM_1_ID, name: 'Manteca' })],
      categories: [],
    })

    await page.goto(listUrl)

    await expect(page.getByText('Lista de prueba')).toBeVisible()
    await expect(page.getByText('Manteca')).toBeVisible()
    // No debe quedar en loading ni en estado roto
    await expect(page.locator('[class*="spinner"]')).not.toBeVisible()
  })

  test('navegar a un share_id inexistente muestra el estado de lista no encontrada', async ({ page }) => {
    await mockSupabase(page, { lists: [] })

    await page.goto('/lista/share-id-que-no-existe')

    await expect(page.getByText(/lista no encontrada/i)).toBeVisible()
    // No debe quedar en spinner eterno
    await expect(page.locator('[class*="spinner"]')).not.toBeVisible()
  })

  test('navegar a un id malformado muestra el estado de lista no encontrada', async ({ page }) => {
    await mockSupabase(page, { lists: [] })

    await page.goto('/lista/not-a-uuid-at-all-!!!')

    await expect(page.getByText(/lista no encontrada/i)).toBeVisible()
    await expect(page.locator('[class*="spinner"]')).not.toBeVisible()
  })

  test('el botón "Ir al inicio" en lista-no-encontrada navega al home', async ({ page }) => {
    await mockSupabase(page, { lists: [] })

    await page.goto('/lista/no-existe')

    await expect(page.getByText(/lista no encontrada/i)).toBeVisible()
    await page.getByRole('button', { name: /ir al inicio/i }).click()

    await expect(page).toHaveURL('/')
  })

  test('goBack() desde una lista vuelve al home con las listas cargadas', async ({ page }) => {
    await mockSupabase(page, { lists: [makeList({ share_id: SHARE_ID })] })

    await page.goto('/')
    await expect(page.getByText('Lista de prueba')).toBeVisible()

    // Navegar a la lista vía la UI (como lo haría un usuario real)
    await page.getByText('Lista de prueba').click()
    await expect(page.getByText('Lista de prueba')).toBeVisible()
    await expect(page).toHaveURL(new RegExp(`/lista/${SHARE_ID}`))

    await page.goBack()

    await expect(page).toHaveURL('/')
    await expect(page.getByText('Lista de prueba')).toBeVisible()
  })

  test('hacer reload en la página de una lista mantiene el contenido', async ({ page }) => {
    await mockSupabase(page, {
      lists: [makeList({ share_id: SHARE_ID })],
      items: [makeItem({ id: ITEM_1_ID, name: 'Yerba' })],
      categories: [],
    })

    await page.goto(listUrl)
    await expect(page.getByText('Yerba')).toBeVisible()

    // El reload dispara una nueva petición al mock
    await page.reload()

    await expect(page.getByText('Lista de prueba')).toBeVisible()
    await expect(page.getByText('Yerba')).toBeVisible()
  })

  test('navegar a una lista con archived=true carga la lista normalmente (sin redirección)', async ({ page }) => {
    // El frontend no filtra por archived en ListPage, así que deja entrar.
    // Este test documenta el comportamiento actual; si se implementa redirección,
    // habrá que actualizarlo.
    const archivedList = makeList({ share_id: SHARE_ID, archived: true })
    await mockSupabase(page, {
      lists: [archivedList],
      items: [],
      categories: [],
    })

    await page.goto(listUrl)

    // Actualmente no hay redirección ni mensaje de "lista archivada"
    await expect(page.getByText('Lista de prueba')).toBeVisible()
    await expect(page.getByText(/lista no encontrada/i)).not.toBeVisible()
  })
})
