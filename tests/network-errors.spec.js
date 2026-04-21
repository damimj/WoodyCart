// @ts-check
import { test, expect } from '@playwright/test'
import {
  mockSupabase, withErrors,
  makeList, makeItem, makeCategory,
  SHARE_ID, LIST_ID, ITEM_1_ID, CAT_1_ID,
} from './helpers/api-mock.js'

const listUrl = `/lista/${SHARE_ID}`

// ── Network error handling ────────────────────────────────────────────────────
// Usa withErrors() para activar flags de fallo por recurso y método.

test.describe('Network errors — Home (POST /lists 500)', () => {
  test('el modal permanece abierto para que el usuario pueda reintentar', async ({ page }) => {
    // Comportamiento correcto: handleCreate hace catch silencioso y no cierra el modal.
    await mockSupabase(page, { lists: [] }, withErrors({ failPOST: { lists: 500 } }))
    await page.goto('/')
    await expect(page.getByText(/sin listas/i)).toBeVisible()

    await page.getByRole('button', { name: /nueva lista/i }).click()
    await page.getByPlaceholder(/supermercado semanal/i).fill('Lista con fallo')
    await page.getByRole('button', { name: /^crear$/i }).click()

    // El modal NO debe cerrarse (el usuario puede reintentar)
    await expect(page.getByPlaceholder(/supermercado semanal/i)).toBeVisible()
    // La lista no debe aparecer en ningún lado
    await expect(page.getByText('Lista con fallo')).not.toBeVisible()
  })

  test('la UI muestra un mensaje de error cuando falla la creación de lista', async ({ page }) => {
    await mockSupabase(page, { lists: [] }, withErrors({ failPOST: { lists: 500 } }))
    await page.goto('/')
    await expect(page.getByText(/sin listas/i)).toBeVisible()

    await page.getByRole('button', { name: /nueva lista/i }).click()
    await page.getByPlaceholder(/supermercado semanal/i).fill('Lista fallida')
    await page.getByRole('button', { name: /^crear$/i }).click()

    await expect(page.getByText(/error|no se pudo|intentá de nuevo/i)).toBeVisible({ timeout: 3000 })
  })
})

test.describe('Network errors — Home (PATCH /lists 500)', () => {
  test('al fallar el renombrado el nombre original queda visible', async ({ page }) => {
    // handleRename() tiene setLists() después del await — si falla, nunca se ejecuta,
    // así que el nombre original persiste en el estado. finally { setRenaming(null) }
    // cierra el modo edición. Comportamiento correcto (datos seguros, sin corrupción).
    await mockSupabase(
      page,
      { lists: [makeList({ id: LIST_ID, name: 'Nombre original' })] },
      withErrors({ failPATCH: { lists: 500 } })
    )
    await page.goto('/')
    await expect(page.getByText('Nombre original')).toBeVisible()

    await page.getByRole('button', { name: /opciones/i }).click()
    await page.getByText(/renombrar/i).click()
    const input = page.getByRole('textbox')
    await input.clear()
    await input.fill('Nombre nuevo')
    await page.getByRole('button', { name: /guardar/i }).click()

    // El nombre original debe seguir visible (la actualización falló)
    await expect(page.getByText('Nombre original')).toBeVisible()
    // No debe quedar en modo edición (el finally cierra el rename)
    await expect(input).not.toBeVisible()
  })
})

test.describe('Network errors — Home (DELETE /lists 500)', () => {
  test('al fallar el borrado la lista se restaura automáticamente', async ({ page }) => {
    // handleDelete() hace una eliminación optimista y llama a load() en el catch.
    // load() re-fetcha las listas (que el mock devuelve correctamente) y restaura la lista.
    page.on('dialog', dialog => dialog.accept())
    await mockSupabase(
      page,
      { lists: [makeList({ id: LIST_ID, name: 'Lista a borrar' })] },
      withErrors({ failDELETE: { lists: 500 } })
    )
    await page.goto('/')
    await expect(page.getByText('Lista a borrar')).toBeVisible()

    await page.getByRole('button', { name: /opciones/i }).click()
    await page.getByText(/eliminar/i).click()

    // Primero desaparece (optimistic), luego vuelve tras el re-fetch
    await expect(page.getByText('Lista a borrar')).toBeVisible()
  })
})

test.describe('Network errors — Home (GET /lists 500)', () => {
  test('la UI muestra un mensaje de error cuando falla la carga inicial', async ({ page }) => {
    await mockSupabase(page, { lists: [] }, withErrors({ failGET: { lists: 500 } }))
    await page.goto('/')

    await expect(page.getByText('No se pudo cargar las listas')).toBeVisible({ timeout: 5000 })
  })

  test('el spinner desaparece aunque falle el GET inicial', async ({ page }) => {
    // finally { setLoading(false) } siempre corre → el spinner se quita.
    await mockSupabase(page, { lists: [] }, withErrors({ failGET: { lists: 500 } }))
    await page.goto('/')

    await expect(page.locator('[class*="spinner"]')).not.toBeVisible({ timeout: 5000 })
  })
})

test.describe('Network errors — List page (POST /items abortado)', () => {
  test('la UI da feedback cuando falla el agregado de un ítem', async ({ page }) => {
    await mockSupabase(
      page,
      { lists: [makeList({ share_id: SHARE_ID })], items: [], categories: [] },
      withErrors({ failPOST: { items: 'timeout' } })
    )
    await page.goto(listUrl)
    await expect(page.getByText('Lista de prueba')).toBeVisible()

    await page.getByRole('button', { name: /añadir/i }).click()
    await page.getByPlaceholder(/leche entera/i).fill('Mantequilla')
    await page.locator('button[type="submit"]').click()

    // El sheet debe cerrarse aunque la petición falle
    await expect(page.getByPlaceholder(/leche entera/i)).not.toBeVisible({ timeout: 3000 })
  })
})

test.describe('Network errors — 429 rate limit', () => {
  test('la UI muestra algún feedback ante un 429 en la creación de lista', async ({ page }) => {
    await mockSupabase(page, { lists: [] }, withErrors({ failPOST: { lists: 429 } }))
    await page.goto('/')
    await expect(page.getByText(/sin listas/i)).toBeVisible()

    await page.getByRole('button', { name: /nueva lista/i }).click()
    await page.getByPlaceholder(/supermercado semanal/i).fill('Lista 429')
    await page.getByRole('button', { name: /^crear$/i }).click()

    await expect(page.getByText(/error|demasiadas|intentá más tarde|limit/i)).toBeVisible({ timeout: 3000 })
  })
})
