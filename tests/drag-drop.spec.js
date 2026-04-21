// @ts-check
import { test, expect } from '@playwright/test'
import {
  mockSupabase, makeList, makeItem, makeCategory,
  SHARE_ID, LIST_ID, CAT_1_ID, CAT_2_ID, ITEM_1_ID, ITEM_2_ID,
} from './helpers/api-mock.js'

const listUrl = `/lista/${SHARE_ID}`

/** Realiza un drag del handle al centro del target usando el mouse. */
async function dragTo(page, handle, targetLocator) {
  const handleBox = await handle.boundingBox()
  const targetBox = await targetLocator.boundingBox()

  await page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y + handleBox.height / 2)
  await page.mouse.down()
  // Pequeño movimiento inicial para superar el activationConstraint (distance: 6)
  await page.mouse.move(handleBox.x + handleBox.width / 2 + 10, handleBox.y + handleBox.height / 2)
  await page.mouse.move(targetBox.x + targetBox.width / 2, targetBox.y + targetBox.height / 2, { steps: 20 })
  await page.mouse.up()
}

// ── Drag & drop ───────────────────────────────────────────────────────────────

test.describe('Drag and drop — category changes', () => {
  test.skip(
    // BUG/TODO: el drag en dnd-kit solo cambia category_id, no reordena posición
    // dentro de una misma categoría. La lógica handleDragEnd en ListPage.jsx solo
    // procesa cambios de category_id; si el origen y destino son la misma categoría,
    // retorna sin hacer nada (item.category_id === newCategoryId → return).
    // Cuando se implemente reordenar por posición, este test debe activarse.
    'reordenar ítems dentro de la misma categoría actualiza position en db',
    true,
    'TODO: reordenar dentro de la misma categoría no está implementado'
  )

  test('el estado de db.items refleja el nuevo category_id después del drag', async ({ page }) => {
    // Complementa el test de PATCH en list.spec.js inspeccionando el objeto db
    // en lugar de solo el payload de la request.
    const cat = makeCategory({ id: CAT_1_ID, name: 'Almacén', created_at: '2024-01-01T00:00:00Z' })
    const item = makeItem({ id: ITEM_1_ID, name: 'Arroz', category_id: null, list_id: LIST_ID })

    const db = await mockSupabase(page, {
      lists: [makeList()],
      items: [item],
      categories: [cat],
    })

    await page.goto(listUrl)
    await expect(page.getByText('Arroz')).toBeVisible()

    const handle      = page.getByRole('button', { name: /arrastrar artículo/i })
    const targetGroup = page.locator('[class*="_group_"]').filter({ hasText: 'Almacén' })

    await dragTo(page, handle, targetGroup)

    // Esperar que el PATCH se complete (el grupo de Almacén debe tener el ítem)
    await expect(targetGroup.getByText('Arroz')).toBeVisible()

    // Verificar que el estado interno del mock quedó actualizado
    const updatedItem = db.items.find(i => i.id === ITEM_1_ID)
    expect(updatedItem?.category_id).toBe(CAT_1_ID)
  })

  test('mover un ítem entre dos categorías actualiza db.items con el nuevo category_id', async ({ page }) => {
    const cat1 = makeCategory({ id: CAT_1_ID, name: 'Frutas',  created_at: '2024-01-01T00:00:00Z' })
    const cat2 = makeCategory({ id: CAT_2_ID, name: 'Carnes',  created_at: '2024-01-02T00:00:00Z' })
    const item = makeItem({ id: ITEM_1_ID, name: 'Manzana', category_id: CAT_1_ID, list_id: LIST_ID })

    const db = await mockSupabase(page, {
      lists: [makeList()],
      items: [item],
      categories: [cat1, cat2],
    })

    await page.goto(listUrl)
    await expect(page.getByText('Manzana')).toBeVisible()

    const handle      = page.getByRole('button', { name: /arrastrar artículo/i })
    const carnesGroup = page.locator('[class*="_group_"]').filter({ hasText: 'Carnes' })

    await dragTo(page, handle, carnesGroup)
    await expect(carnesGroup.getByText('Manzana')).toBeVisible()

    // Verificar en db
    expect(db.items.find(i => i.id === ITEM_1_ID)?.category_id).toBe(CAT_2_ID)
  })

  test('presionar Escape durante el drag cancela el movimiento y el ítem queda en su lugar', async ({ page }) => {
    const cat = makeCategory({ id: CAT_1_ID, name: 'Verduras', created_at: '2024-01-01T00:00:00Z' })
    const item = makeItem({ id: ITEM_1_ID, name: 'Zanahoria', category_id: null, list_id: LIST_ID })

    const db = await mockSupabase(page, {
      lists: [makeList()],
      items: [item],
      categories: [cat],
    })

    await page.goto(listUrl)
    await expect(page.getByText('Zanahoria')).toBeVisible()

    const handle      = page.getByRole('button', { name: /arrastrar artículo/i })
    const targetGroup = page.locator('[class*="_group_"]').filter({ hasText: 'Verduras' })

    const handleBox = await handle.boundingBox()
    const targetBox = await targetGroup.boundingBox()

    // Iniciar drag
    await page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y + handleBox.height / 2)
    await page.mouse.down()
    await page.mouse.move(handleBox.x + handleBox.width / 2 + 10, handleBox.y + handleBox.height / 2)
    await page.mouse.move(targetBox.x + targetBox.width / 2, targetBox.y + targetBox.height / 2, { steps: 10 })

    // Cancelar con Escape — dnd-kit PointerSensor escucha keydown en window
    await page.keyboard.press('Escape')
    await page.mouse.up()

    // El ítem debe seguir en "Sin categoría" (sin cambio de categoría)
    const noneGroup = page.locator('[class*="_group_"]').filter({ hasText: 'Sin categoría' })
    await expect(noneGroup.getByText('Zanahoria')).toBeVisible()

    // El db no debe haber mutado
    expect(db.items.find(i => i.id === ITEM_1_ID)?.category_id).toBeNull()
  })

  test('lista con 20+ ítems carga y permite drag sin degradación visible', async ({ page }) => {
    const cat = makeCategory({ id: CAT_1_ID, name: 'Almacén', created_at: '2024-01-01T00:00:00Z' })

    // 20 ítems sin categoría para ejercitar la renderización
    const items = Array.from({ length: 20 }, (_, i) =>
      makeItem({
        id:         `perf-item-${i}`,
        name:       `Ítem ${i + 1}`,
        category_id: null,
        list_id:    LIST_ID,
        position:   i,
      })
    )

    await mockSupabase(page, {
      lists:      [makeList()],
      items,
      categories: [cat],
    })

    await page.goto(listUrl)

    // Todos los ítems deben ser visibles
    await expect(page.getByText('Ítem 1')).toBeVisible()
    await expect(page.getByText('Ítem 20')).toBeVisible()

    // Drag del primer ítem al grupo de Almacén
    const handle      = page.getByRole('button', { name: /arrastrar artículo/i }).first()
    const targetGroup = page.locator('[class*="_group_"]').filter({ hasText: 'Almacén' })

    await dragTo(page, handle, targetGroup)

    // El ítem 1 debe moverse a Almacén
    await expect(targetGroup.getByText('Ítem 1')).toBeVisible()
  })
})
