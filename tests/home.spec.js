// @ts-check
import { test, expect } from '@playwright/test'
import {
  mockSupabase, mockClipboard, getClipboardText,
  makeList, SHARE_ID, LIST_ID,
} from './helpers/api-mock.js'

// ── Create list ───────────────────────────────────────────────────────────────

test.describe('Create list', () => {
  test('shows empty state when no lists exist', async ({ page }) => {
    await mockSupabase(page, { lists: [] })
    await page.goto('/')
    await expect(page.getByText(/sin listas todavía/i)).toBeVisible()
  })

  test('creates a list and navigates to its page', async ({ page }) => {
    await mockSupabase(page, { lists: [] })
    await page.goto('/')
    await expect(page.getByText(/sin listas todavía/i)).toBeVisible()

    // Open modal
    await page.getByRole('button', { name: /nueva lista/i }).click()
    await expect(page.getByPlaceholder(/supermercado semanal/i)).toBeVisible()

    // Fill name
    await page.getByPlaceholder(/supermercado semanal/i).fill('Compra del fin de semana')

    // Crear is enabled
    await expect(page.getByRole('button', { name: /^crear$/i })).toBeEnabled()
    await page.getByRole('button', { name: /^crear$/i }).click()

    // App navigates to the new list page
    await expect(page).toHaveURL(/\/lista\//)
    await expect(page.getByText('Compra del fin de semana')).toBeVisible()
  })

  test('Crear button is disabled while name is empty', async ({ page }) => {
    await mockSupabase(page, { lists: [] })
    await page.goto('/')
    await page.getByRole('button', { name: /nueva lista/i }).click()
    await expect(page.getByRole('button', { name: /^crear$/i })).toBeDisabled()
  })

  test('creates a list with an icon', async ({ page }) => {
    await mockSupabase(page, { lists: [] })
    await page.goto('/')
    await page.getByRole('button', { name: /nueva lista/i }).click()
    await page.getByPlaceholder(/supermercado semanal/i).fill('Farmacia')

    // Select the hospital/health icon
    await page.getByRole('button', { name: /salud/i }).click()
    await expect(page.getByRole('button', { name: /salud/i })).toHaveClass(/Active/)

    await page.getByRole('button', { name: /^crear$/i }).click()
    await expect(page).toHaveURL(/\/lista\//)
    await expect(page.getByText('Farmacia')).toBeVisible()
  })

  test('Cancelar closes the modal without creating a list', async ({ page }) => {
    await mockSupabase(page, { lists: [] })
    await page.goto('/')
    await page.getByRole('button', { name: /nueva lista/i }).click()
    await page.getByPlaceholder(/supermercado semanal/i).fill('Lista temporal')
    await page.getByRole('button', { name: /cancelar/i }).click()

    await expect(page.getByPlaceholder(/supermercado semanal/i)).not.toBeVisible()
    // Still on home with empty state
    await expect(page.getByText(/sin listas todavía/i)).toBeVisible()
  })

  test('clicking the backdrop closes the modal', async ({ page }) => {
    await mockSupabase(page, { lists: [] })
    await page.goto('/')
    await page.getByRole('button', { name: /nueva lista/i }).click()
    await expect(page.getByPlaceholder(/supermercado semanal/i)).toBeVisible()

    // Click outside the modal sheet
    await page.mouse.click(10, 10)
    await expect(page.getByPlaceholder(/supermercado semanal/i)).not.toBeVisible()
  })

  test('shows created list card on home page', async ({ page }) => {
    await mockSupabase(page, { lists: [makeList({ name: 'Mi super lista', icon: 'cart' })] })
    await page.goto('/')
    await expect(page.getByText('Mi super lista')).toBeVisible()
  })
})

// ── Delete list ───────────────────────────────────────────────────────────────

test.describe('Delete list', () => {
  test('deletes a list after confirming the dialog', async ({ page }) => {
    await mockSupabase(page, { lists: [makeList({ name: 'Lista para borrar' })] })
    page.on('dialog', dialog => dialog.accept())
    await page.goto('/')

    await expect(page.getByText('Lista para borrar')).toBeVisible()
    await page.getByRole('button', { name: /opciones/i }).click()
    await page.getByText(/eliminar/i).click()

    // Optimistic removal — card disappears immediately
    await expect(page.getByText('Lista para borrar')).not.toBeVisible()
  })

  test('keeps the list when deletion is cancelled', async ({ page }) => {
    await mockSupabase(page, { lists: [makeList({ name: 'No borrar esta' })] })
    page.on('dialog', dialog => dialog.dismiss())
    await page.goto('/')

    await expect(page.getByText('No borrar esta')).toBeVisible()
    await page.getByRole('button', { name: /opciones/i }).click()
    await page.getByText(/eliminar/i).click()

    await expect(page.getByText('No borrar esta')).toBeVisible()
  })

  test('shows empty state after deleting the last list', async ({ page }) => {
    await mockSupabase(page, { lists: [makeList({ name: 'Única lista' })] })
    page.on('dialog', dialog => dialog.accept())
    await page.goto('/')

    await page.getByRole('button', { name: /opciones/i }).click()
    await page.getByText(/eliminar/i).click()

    await expect(page.getByText(/sin listas todavía/i)).toBeVisible()
  })
})

// ── Rename list ───────────────────────────────────────────────────────────────

test.describe('Rename list', () => {
  test('renames a list inline', async ({ page }) => {
    await mockSupabase(page, { lists: [makeList({ name: 'Nombre original' })] })
    await page.goto('/')

    await expect(page.getByText('Nombre original')).toBeVisible()
    await page.getByRole('button', { name: /opciones/i }).click()
    await page.getByText(/renombrar/i).click()

    const input = page.getByRole('textbox')
    await input.clear()
    await input.fill('Nombre actualizado')
    await page.getByRole('button', { name: /guardar/i }).click()

    await expect(page.getByText('Nombre actualizado')).toBeVisible()
    await expect(page.getByText('Nombre original')).not.toBeVisible()
  })

  test('Escape key cancels rename', async ({ page }) => {
    await mockSupabase(page, { lists: [makeList({ name: 'Sin cambiar' })] })
    await page.goto('/')

    await page.getByRole('button', { name: /opciones/i }).click()
    await page.getByText(/renombrar/i).click()
    await page.getByRole('textbox').press('Escape')

    await expect(page.getByText('Sin cambiar')).toBeVisible()
    await expect(page.getByRole('textbox')).not.toBeVisible()
  })
})

// ── Share list ────────────────────────────────────────────────────────────────

test.describe('Share list', () => {
  test('copies share URL to clipboard and shows toast', async ({ page }) => {
    await mockClipboard(page)
    await mockSupabase(page, { lists: [makeList({ share_id: SHARE_ID })] })
    await page.goto('/')

    await expect(page.getByText('Lista de prueba')).toBeVisible()
    await page.getByRole('button', { name: /opciones/i }).click()
    await page.getByText(/compartir/i).click()

    // Toast confirms copy
    await expect(page.getByText(/enlace copiado/i)).toBeVisible()

    // Clipboard contains the share URL
    const copied = await getClipboardText(page)
    expect(copied).toContain(`/lista/${SHARE_ID}`)
  })

  test('share URL points to the correct list', async ({ page }) => {
    await mockClipboard(page)
    const shareId = 'my-unique-share-id'
    await mockSupabase(page, { lists: [makeList({ name: 'Lista compartida', share_id: shareId })] })
    await page.goto('/')

    await page.getByRole('button', { name: /opciones/i }).click()
    await page.getByText(/compartir/i).click()

    const copied = await getClipboardText(page)
    expect(copied).toMatch(new RegExp(`/lista/${shareId}$`))
  })
})
