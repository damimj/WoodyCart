// @ts-check
import { test, expect } from '@playwright/test'
import {
  mockSupabase, mockClipboard, getClipboardText,
  makeList, makeItem, makeCategory,
  SHARE_ID, LIST_ID, CAT_1_ID, CAT_2_ID, ITEM_1_ID, ITEM_2_ID,
} from './helpers/api-mock.js'

const listUrl = `/lista/${SHARE_ID}`

// ── Add items ─────────────────────────────────────────────────────────────────

test.describe('Add items', () => {
  test('adds a new item to the list', async ({ page }) => {
    await mockSupabase(page, { lists: [makeList()], items: [], categories: [] })
    await page.goto(listUrl)
    await expect(page.getByText('Lista de prueba')).toBeVisible()

    // Open add sheet
    await page.getByRole('button', { name: /añadir/i }).click()
    await expect(page.getByPlaceholder(/leche entera/i)).toBeVisible()

    await page.getByPlaceholder(/leche entera/i).fill('Pan integral')
    await page.locator('button[type="submit"]').click()

    // Optimistic update shows the item immediately
    await expect(page.getByText('Pan integral')).toBeVisible()
  })

  test('adds an item with quantity and unit', async ({ page }) => {
    await mockSupabase(page, { lists: [makeList()], items: [], categories: [] })
    await page.goto(listUrl)
    await expect(page.getByText('Lista de prueba')).toBeVisible()

    await page.getByRole('button', { name: /añadir/i }).click()
    await page.getByPlaceholder(/leche entera/i).fill('Leche')
    await page.getByPlaceholder(/ej: 2/i).fill('3')
    await page.locator('select').selectOption('litros')
    await page.locator('button[type="submit"]').click()

    await expect(page.getByText('Leche')).toBeVisible()
    await expect(page.getByText('3 litros')).toBeVisible()
  })

  test('adds an item with a note', async ({ page }) => {
    await mockSupabase(page, { lists: [makeList()], items: [], categories: [] })
    await page.goto(listUrl)

    await page.getByRole('button', { name: /añadir/i }).click()
    await page.getByPlaceholder(/leche entera/i).fill('Yogur')
    await page.getByPlaceholder(/marca preferida/i).fill('Sin azúcar')
    await page.locator('button[type="submit"]').click()

    await expect(page.getByText('Yogur')).toBeVisible()
    await expect(page.getByText('Sin azúcar')).toBeVisible()
  })

  test('Cancelar closes the add sheet without adding', async ({ page }) => {
    await mockSupabase(page, { lists: [makeList()], items: [], categories: [] })
    await page.goto(listUrl)

    await page.getByRole('button', { name: /añadir/i }).click()
    await page.getByPlaceholder(/leche entera/i).fill('No agregar')
    await page.getByRole('button', { name: /cancelar/i }).click()

    await expect(page.getByText('No agregar')).not.toBeVisible()
  })

  test('edits an existing item', async ({ page }) => {
    await mockSupabase(page, {
      lists: [makeList()],
      items: [makeItem({ name: 'Manteca', id: ITEM_1_ID })],
      categories: [],
    })
    await page.goto(listUrl)
    await expect(page.getByText('Manteca')).toBeVisible()

    // Click on item to edit
    await page.getByText('Manteca').click()
    await expect(page.getByText(/editar artículo/i)).toBeVisible()

    const nameInput = page.getByPlaceholder(/leche entera/i)
    await nameInput.clear()
    await nameInput.fill('Manteca sin sal')
    await page.getByRole('button', { name: /guardar/i }).click()

    await expect(page.getByText('Manteca sin sal')).toBeVisible()
    await expect(page.getByText('Manteca', { exact: true })).not.toBeVisible()
  })

  test('deletes an item (optimistic)', async ({ page }) => {
    await mockSupabase(page, {
      lists: [makeList()],
      items: [makeItem({ name: 'Papel higiénico', id: ITEM_1_ID })],
      categories: [],
    })
    await page.goto(listUrl)
    await expect(page.getByText('Papel higiénico')).toBeVisible()

    await page.getByRole('button', { name: /borrar/i }).click()
    await expect(page.getByText('Papel higiénico')).not.toBeVisible()
  })

  test('sends PATCH when item is toggled', async ({ page }) => {
    await mockSupabase(page, {
      lists: [makeList()],
      items: [makeItem({ name: 'Café', id: ITEM_1_ID, checked: false })],
      categories: [],
    })
    await page.goto(listUrl)
    await expect(page.getByText('Café')).toBeVisible()

    const patchRequest = page.waitForRequest(
      req => req.method() === 'PATCH' && req.url().includes('/rest/v1/items')
    )
    await page.getByRole('button', { name: /^marcar$/i }).click()

    const req = await patchRequest
    expect(req.postDataJSON()).toMatchObject({ checked: true })
  })

  test('shows progress counter when items exist', async ({ page }) => {
    await mockSupabase(page, {
      lists: [makeList()],
      items: [
        makeItem({ id: ITEM_1_ID, checked: true }),
        makeItem({ id: ITEM_2_ID, name: 'Pan', checked: false }),
      ],
      categories: [],
    })
    await page.goto(listUrl)
    await expect(page.getByText('1/2')).toBeVisible()
  })
})

// ── Create categories ─────────────────────────────────────────────────────────

test.describe('Create categories', () => {
  test('creates a category using the + pill button', async ({ page }) => {
    await mockSupabase(page, { lists: [makeList()], items: [], categories: [] })
    await page.goto(listUrl)
    await expect(page.getByText('Lista de prueba')).toBeVisible()

    await page.getByRole('button', { name: /nueva categoría/i }).click()
    await page.getByPlaceholder(/nombre/i).fill('Carnicería')
    await page.getByPlaceholder(/nombre/i).press('Enter')

    await expect(page.getByText('Carnicería')).toBeVisible()
  })

  test('creates a category from a default suggestion pill', async ({ page }) => {
    await mockSupabase(page, { lists: [makeList()], items: [], categories: [] })
    await page.goto(listUrl)

    await page.getByText(/\+ Verdulería/i).click()

    // Category pill appears in the filter bar
    await expect(page.locator('header').getByText('Verdulería')).toBeVisible()
  })

  test('Escape key cancels inline category input', async ({ page }) => {
    await mockSupabase(page, { lists: [makeList()], items: [], categories: [] })
    await page.goto(listUrl)

    await page.getByRole('button', { name: /nueva categoría/i }).click()
    await expect(page.getByPlaceholder(/nombre/i)).toBeVisible()

    await page.getByPlaceholder(/nombre/i).press('Escape')
    await expect(page.getByPlaceholder(/nombre/i)).not.toBeVisible()
  })

  test('new category activates and items can be added to it', async ({ page }) => {
    await mockSupabase(page, { lists: [makeList()], items: [], categories: [] })
    await page.goto(listUrl)

    // Create category
    await page.getByRole('button', { name: /nueva categoría/i }).click()
    await page.getByPlaceholder(/nombre/i).fill('Lácteos')
    await page.getByPlaceholder(/nombre/i).press('Enter')

    // Category pill becomes active
    await expect(page.locator('header').getByText('Lácteos')).toBeVisible()

    // Add an item — it should go into Lácteos (the active category)
    await page.getByRole('button', { name: /añadir/i }).click()
    await page.getByPlaceholder(/leche entera/i).fill('Yogur')
    await page.locator('button[type="submit"]').click()

    await expect(page.getByText('Yogur')).toBeVisible()
  })

  test('deletes a category when active', async ({ page }) => {
    const cat = makeCategory({ id: CAT_1_ID, name: 'Panadería' })
    await mockSupabase(page, {
      lists: [makeList()],
      items: [],
      categories: [cat],
    })
    page.on('dialog', dialog => dialog.accept())
    await page.goto(listUrl)

    // Activate the category by clicking the pill
    await page.getByRole('button', { name: /^Panadería/ }).click()
    // Delete button appears only when active
    await page.getByRole('button', { name: /borrar categoría panadería/i }).click()

    // Optimistic: pill disappears
    await expect(page.getByText('Panadería')).not.toBeVisible()
  })
})

// ── Move items between categories ─────────────────────────────────────────────

test.describe('Move items between categories', () => {
  test('drags an item from uncategorized into a category', async ({ page }) => {
    const cat = makeCategory({ id: CAT_1_ID, name: 'Lácteos' })
    const item = makeItem({ id: ITEM_1_ID, name: 'Manteca', category_id: null })

    await mockSupabase(page, {
      lists: [makeList()],
      items: [item],
      categories: [cat],
    })
    await page.goto(listUrl)
    await expect(page.getByText('Manteca')).toBeVisible()
    await expect(page.locator('header').getByText('Lácteos')).toBeVisible()

    // Drag handle → Lácteos group (first named group)
    const handle       = page.getByRole('button', { name: /arrastrar artículo/i })
    const lacteosGroup = page.locator('[class*="_group_"]').filter({ hasText: 'Lácteos' })

    const handleBox = await handle.boundingBox()
    const targetBox = await lacteosGroup.boundingBox()

    await page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y + handleBox.height / 2)
    await page.mouse.down()
    await page.mouse.move(handleBox.x + handleBox.width / 2 + 10, handleBox.y + handleBox.height / 2)
    await page.mouse.move(targetBox.x + targetBox.width / 2, targetBox.y + targetBox.height / 2, { steps: 20 })
    await page.mouse.up()

    // Optimistic update: Manteca appears under Lácteos
    await expect(lacteosGroup.getByText('Manteca')).toBeVisible()
  })

  test('drags an item from one category to another', async ({ page }) => {
    const cat1 = makeCategory({ id: CAT_1_ID, name: 'Frutas',  created_at: '2024-01-01T00:00:00Z' })
    const cat2 = makeCategory({ id: CAT_2_ID, name: 'Carnes',  created_at: '2024-01-02T00:00:00Z' })
    const item = makeItem({ id: ITEM_1_ID, name: 'Manzana', category_id: CAT_1_ID })

    await mockSupabase(page, {
      lists: [makeList()],
      items: [item],
      categories: [cat1, cat2],
    })
    await page.goto(listUrl)
    await expect(page.getByText('Manzana')).toBeVisible()

    const carnesGroup = page.locator('[class*="_group_"]').filter({ hasText: 'Carnes' })
    const handle      = page.getByRole('button', { name: /arrastrar artículo/i })

    const handleBox = await handle.boundingBox()
    const targetBox = await carnesGroup.boundingBox()

    await page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y + handleBox.height / 2)
    await page.mouse.down()
    await page.mouse.move(handleBox.x + handleBox.width / 2 + 10, handleBox.y + handleBox.height / 2)
    await page.mouse.move(targetBox.x + targetBox.width / 2, targetBox.y + targetBox.height / 2, { steps: 20 })
    await page.mouse.up()

    // Optimistic update: Manzana moves to Carnes group
    await expect(carnesGroup.getByText('Manzana')).toBeVisible()
  })

  test('sends PATCH with new category_id after drag', async ({ page }) => {
    const cat = makeCategory({ id: CAT_1_ID, name: 'Almacén' })
    const item = makeItem({ id: ITEM_1_ID, name: 'Arroz', category_id: null })

    await mockSupabase(page, {
      lists: [makeList()],
      items: [item],
      categories: [cat],
    })
    await page.goto(listUrl)
    await expect(page.getByText('Arroz')).toBeVisible()

    const patchRequest = page.waitForRequest(
      req => req.method() === 'PATCH' && req.url().includes('/rest/v1/items')
    )

    const handle      = page.getByRole('button', { name: /arrastrar artículo/i })
    const targetGroup = page.locator('[class*="_group_"]').filter({ hasText: 'Almacén' })

    const handleBox = await handle.boundingBox()
    const targetBox = await targetGroup.boundingBox()

    await page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y + handleBox.height / 2)
    await page.mouse.down()
    await page.mouse.move(handleBox.x + handleBox.width / 2 + 10, handleBox.y + handleBox.height / 2)
    await page.mouse.move(targetBox.x + targetBox.width / 2, targetBox.y + targetBox.height / 2, { steps: 20 })
    await page.mouse.up()

    const req = await patchRequest
    expect(req.postDataJSON()).toMatchObject({ category_id: CAT_1_ID })
  })
})

// ── Clear checked items ───────────────────────────────────────────────────────

test.describe('Clear checked items', () => {
  test('opens confirm dialog when broom button is clicked', async ({ page }) => {
    await mockSupabase(page, { lists: [makeList()], items: [], categories: [] })
    await page.goto(listUrl)
    await expect(page.getByText('Lista de prueba')).toBeVisible()

    await page.getByTitle('Limpiar lista').click()
    await expect(page.getByText(/desleccionar todos los ítems/i)).toBeVisible()
  })

  test('Cancelar closes the dialog without clearing', async ({ page }) => {
    await mockSupabase(page, {
      lists: [makeList()],
      items: [makeItem({ id: ITEM_1_ID, name: 'Leche', checked: true })],
      categories: [],
    })
    await page.goto(listUrl)

    await page.getByTitle('Limpiar lista').click()
    await page.getByRole('button', { name: 'Cancelar' }).click()

    await expect(page.getByText(/desleccionar todos/i)).not.toBeVisible()
    // Item is still in the list
    await expect(page.getByText('Leche')).toBeVisible()
  })

  test('Limpiar sends PATCH for each checked item and closes the dialog', async ({ page }) => {
    const patches = []
    await mockSupabase(page, {
      lists: [makeList()],
      items: [
        makeItem({ id: ITEM_1_ID, name: 'Leche',  checked: true }),
        makeItem({ id: ITEM_2_ID, name: 'Pan',    checked: false }),
      ],
      categories: [],
    })
    await page.goto(listUrl)

    // Collect all PATCH requests to items
    page.on('request', req => {
      if (req.method() === 'PATCH' && req.url().includes('/rest/v1/items')) {
        patches.push(req.postDataJSON())
      }
    })

    await page.getByTitle('Limpiar lista').click()

    // Set up wait before clicking confirm so we don't miss the request
    const patchPromise = page.waitForRequest(req =>
      req.method() === 'PATCH' && req.url().includes('/rest/v1/items')
    )
    await page.getByRole('button', { name: 'Limpiar', exact: true }).click()

    // Dialog closes immediately
    await expect(page.getByText(/desleccionar todos/i)).not.toBeVisible()
    await patchPromise

    // Only the checked item (ITEM_1_ID / Leche) should be patched
    expect(patches).toHaveLength(1)
    expect(patches[0]).toMatchObject({ checked: false })
  })

  test('clicking the overlay closes the dialog', async ({ page }) => {
    await mockSupabase(page, { lists: [makeList()], items: [], categories: [] })
    await page.goto(listUrl)

    await page.getByTitle('Limpiar lista').click()
    await expect(page.getByText(/desleccionar todos/i)).toBeVisible()

    // Click the dark overlay (outside the dialog box)
    await page.mouse.click(10, 10)
    await expect(page.getByText(/desleccionar todos/i)).not.toBeVisible()
  })
})

// ── Share list from list page ─────────────────────────────────────────────────

test.describe('Share list', () => {
  test('copies list URL to clipboard and shows toast', async ({ page }) => {
    await mockClipboard(page)
    await mockSupabase(page, {
      lists: [makeList({ share_id: SHARE_ID })],
      items: [],
      categories: [],
    })
    await page.goto(listUrl)
    await expect(page.getByText('Lista de prueba')).toBeVisible()

    await page.getByTitle('Compartir').click()

    await expect(page.getByText(/enlace copiado/i)).toBeVisible()
    const copied = await getClipboardText(page)
    expect(copied).toContain(`/lista/${SHARE_ID}`)
  })

  test('logo button navigates back to home', async ({ page }) => {
    await mockSupabase(page, { lists: [makeList()], items: [], categories: [] })
    await page.goto(listUrl)
    await expect(page.getByText('Lista de prueba')).toBeVisible()

    await page.getByRole('button', { name: /ir al inicio/i }).click()
    await expect(page).toHaveURL('/')
  })
})
