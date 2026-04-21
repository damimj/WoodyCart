// @ts-check
import { test, expect, devices } from '@playwright/test'
import { mockSupabase, makeList, makeItem, SHARE_ID, LIST_ID, ITEM_1_ID, ITEM_2_ID } from './helpers/api-mock.js'

const listUrl = `/lista/${SHARE_ID}`

// ── Mobile touch interactions ─────────────────────────────────────────────────
// Solo corre en el proyecto mobile-safari (iPhone 12).
// Los gestos de swipe usan TouchEvents dispatch desde el contexto de la página,
// porque React usa onTouchStart/onTouchEnd (no PointerEvents) en ItemRow.

test.beforeEach(({}, testInfo) => {
  test.skip(
    testInfo.project.name !== 'mobile-safari',
    'Solo corre en el proyecto mobile-safari'
  )
})

/**
 * Despacha un swipe sobre el elemento `row`.
 * @param {import('@playwright/test').Page} page
 * @param {import('@playwright/test').Locator} rowLocator  — el div.row del ItemRow
 * @param {number} deltaX — positivo = swipe a la izquierda (revela acciones)
 */
async function swipe(page, rowLocator, deltaX) {
  await rowLocator.evaluate((el, dx) => {
    const startX = 300
    const startY = 400
    const endX   = startX - dx

    const mkTouch = (x, y) =>
      new Touch({ identifier: 1, target: el, clientX: x, clientY: y,
                  screenX: x, screenY: y, pageX: x, pageY: y })

    el.dispatchEvent(new TouchEvent('touchstart', {
      touches:        [mkTouch(startX, startY)],
      changedTouches: [mkTouch(startX, startY)],
      bubbles: true, cancelable: true,
    }))
    el.dispatchEvent(new TouchEvent('touchend', {
      touches:        [],
      changedTouches: [mkTouch(endX, startY)],
      bubbles: true, cancelable: true,
    }))
  }, deltaX)
}

test.describe('Mobile touch — swipe gestures', () => {
  test('swipe a la izquierda (>60px) revela los botones de acción', async ({ page }) => {
    await mockSupabase(page, {
      lists: [makeList({ share_id: SHARE_ID })],
      items: [makeItem({ id: ITEM_1_ID, name: 'Leche', list_id: LIST_ID })],
      categories: [],
    })
    await page.goto(listUrl)
    await expect(page.getByText('Leche')).toBeVisible()

    const row = page.locator('[class*="_row_"]').filter({ hasText: 'Leche' })
    // Swipe 100px a la izquierda (> umbral de 60px)
    await swipe(page, row, 100)

    // Los botones de swipe deben aparecer
    await expect(page.locator('[class*="swipeActions"]')).toBeVisible()
  })

  test('swipe a la derecha (>20px) cierra los botones de acción', async ({ page }) => {
    await mockSupabase(page, {
      lists: [makeList({ share_id: SHARE_ID })],
      items: [makeItem({ id: ITEM_1_ID, name: 'Pan', list_id: LIST_ID })],
      categories: [],
    })
    await page.goto(listUrl)
    await expect(page.getByText('Pan')).toBeVisible()

    const row = page.locator('[class*="_row_"]').filter({ hasText: 'Pan' })

    // Abrir acciones con swipe izquierda
    await swipe(page, row, 100)
    await expect(page.locator('[class*="swipeActions"]')).toBeVisible()

    // Swipe derecha (deltaX negativo → endX > startX → dx < -20)
    await swipe(page, row, -50)
    await expect(page.locator('[class*="swipeActions"]')).not.toBeVisible()
  })

  test('tocar el botón de editar en swipe llama a onEdit y cierra las acciones', async ({ page }) => {
    await mockSupabase(page, {
      lists: [makeList({ share_id: SHARE_ID })],
      items: [makeItem({ id: ITEM_1_ID, name: 'Yogur', list_id: LIST_ID })],
      categories: [],
    })
    await page.goto(listUrl)
    await expect(page.getByText('Yogur')).toBeVisible()

    const row = page.locator('[class*="_row_"]').filter({ hasText: 'Yogur' })
    await swipe(page, row, 100)
    await expect(page.locator('[class*="swipeActions"]')).toBeVisible()

    await page.locator('[class*="editAction"]').click()

    // El sheet de edición se abre
    await expect(page.getByText(/editar artículo/i)).toBeVisible()
    // Las acciones de swipe se cierran
    await expect(page.locator('[class*="swipeActions"]')).not.toBeVisible()
  })

  test('tocar el botón de borrar en swipe elimina el ítem y cierra las acciones', async ({ page }) => {
    await mockSupabase(page, {
      lists: [makeList({ share_id: SHARE_ID })],
      items: [makeItem({ id: ITEM_1_ID, name: 'Manteca', list_id: LIST_ID })],
      categories: [],
    })
    await page.goto(listUrl)
    await expect(page.getByText('Manteca')).toBeVisible()

    const row = page.locator('[class*="_row_"]').filter({ hasText: 'Manteca' })
    await swipe(page, row, 100)
    await expect(page.locator('[class*="swipeActions"]')).toBeVisible()

    await page.locator('[class*="deleteAction"]').click()

    // El ítem se elimina (borrado optimista)
    await expect(page.getByText('Manteca')).not.toBeVisible()
    await expect(page.locator('[class*="swipeActions"]')).not.toBeVisible()
  })

  test.skip(
    // TODO: ItemRow no tiene un handler para cerrar las acciones al tocar
    // fuera del ítem. No hay click-outside implementado en el componente.
    // El único cierre es swipe-derecha o tocar los botones de acción.
    'tocar fuera del ítem con acciones abiertas las cierra',
    true,
    'TODO: click-outside no implementado en ItemRow (swiped state no tiene handler externo)'
  )
})
