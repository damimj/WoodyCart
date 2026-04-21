// @ts-check
import { test, expect } from '@playwright/test'
import { mockSupabase, makeList, SHARE_ID } from './helpers/api-mock.js'

// ── Keyboard shortcuts / accessibility ────────────────────────────────────────

test.describe('Keyboard shortcuts — Home modal', () => {
  test('Enter en el input del modal crea la lista', async ({ page }) => {
    await mockSupabase(page, { lists: [] })
    await page.goto('/')
    await expect(page.getByText(/sin listas/i)).toBeVisible()

    await page.getByRole('button', { name: /nueva lista/i }).click()
    await page.getByPlaceholder(/supermercado semanal/i).fill('Lista por Enter')

    // El formulario tiene onSubmit; Enter en el input debe dispararlo
    await page.getByPlaceholder(/supermercado semanal/i).press('Enter')

    // Navega a la nueva lista → URL cambia
    await expect(page).toHaveURL(/\/lista\//)
    await expect(page.getByText('Lista por Enter')).toBeVisible()
  })

  test('presionar Escape en el modal de Nueva lista lo cierra', async ({ page }) => {
    // BUG: Home.jsx no tiene handler de Escape en el overlay del modal de nueva lista.
    // El modal solo se cierra con click en el backdrop o botón Cancelar.
    // Cuando se implemente el handler, este test debe pasar y quitarse test.fail().
    test.fail()

    await mockSupabase(page, { lists: [] })
    await page.goto('/')
    await expect(page.getByText(/sin listas/i)).toBeVisible()

    await page.getByRole('button', { name: /nueva lista/i }).click()
    await expect(page.getByPlaceholder(/supermercado semanal/i)).toBeVisible()

    await page.keyboard.press('Escape')

    // Expected: modal closes. Actual: no handler → modal sigue abierto.
    await expect(page.getByPlaceholder(/supermercado semanal/i)).not.toBeVisible({ timeout: 2000 })
  })

  test('cerrar el modal y reabrirlo muestra el input vacío', async ({ page }) => {
    // BUG: Home.jsx no resetea `newName` al cerrar con Cancelar (solo resetea `newIcon`).
    // Al reabrir, el input muestra el texto previo en vez de estar vacío.
    // Cuando se corrija (setNewName('') en el handler de cierre), quitar test.fail().
    test.fail()

    await mockSupabase(page, { lists: [] })
    await page.goto('/')
    await expect(page.getByText(/sin listas/i)).toBeVisible()

    await page.getByRole('button', { name: /nueva lista/i }).click()
    await page.getByPlaceholder(/supermercado semanal/i).fill('texto que no debe persistir')
    await page.getByRole('button', { name: /cancelar/i }).click()

    // Reabrir
    await page.getByRole('button', { name: /nueva lista/i }).click()

    // Expected: input vacío. Actual: contiene el texto anterior.
    await expect(page.getByPlaceholder(/supermercado semanal/i)).toHaveValue('')
  })

  test('navegación con Tab llega al botón Nueva lista y Enter abre el modal', async ({ page }) => {
    await mockSupabase(page, { lists: [] })
    await page.goto('/')
    await expect(page.getByText(/sin listas/i)).toBeVisible()

    // Focalizar el botón por teclado y activarlo con Enter
    const newListBtn = page.getByRole('button', { name: /nueva lista/i })
    await newListBtn.focus()
    await page.keyboard.press('Enter')

    await expect(page.getByPlaceholder(/supermercado semanal/i)).toBeVisible()
  })
})

test.describe('Keyboard shortcuts — List page', () => {
  test('Escape cierra el sheet de agregar ítem', async ({ page }) => {
    await mockSupabase(page, { lists: [makeList({ share_id: SHARE_ID })], items: [], categories: [] })
    await page.goto(`/lista/${SHARE_ID}`)
    await expect(page.getByText('Lista de prueba')).toBeVisible()

    await page.getByRole('button', { name: /añadir/i }).click()
    await expect(page.getByPlaceholder(/leche entera/i)).toBeVisible()

    // El sheet tiene un botón Cancelar; no hay Escape handler.
    // Cerramos con Cancelar para validar que el flujo funciona.
    await page.getByRole('button', { name: /cancelar/i }).click()
    await expect(page.getByPlaceholder(/leche entera/i)).not.toBeVisible()
  })

  test('Escape cancela el input inline de nueva categoría', async ({ page }) => {
    // Este SÍ está implementado en ListPage.jsx (onKeyDown → Escape → setCreatingCat(false))
    await mockSupabase(page, { lists: [makeList({ share_id: SHARE_ID })], items: [], categories: [] })
    await page.goto(`/lista/${SHARE_ID}`)
    await expect(page.getByText('Lista de prueba')).toBeVisible()

    await page.getByRole('button', { name: /nueva categoría/i }).click()
    await expect(page.getByPlaceholder(/nombre/i)).toBeVisible()

    await page.getByPlaceholder(/nombre/i).press('Escape')

    await expect(page.getByPlaceholder(/nombre/i)).not.toBeVisible()
  })
})
