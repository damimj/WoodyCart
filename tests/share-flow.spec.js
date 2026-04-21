// @ts-check
import { test, expect } from '@playwright/test'
import {
  mockSupabase, mockClipboard, getClipboardText,
  mockNativeShare, getShareData,
  makeList, makeItem,
  SHARE_ID, LIST_ID, ITEM_1_ID,
} from './helpers/api-mock.js'

const listUrl = `/lista/${SHARE_ID}`

// ── Share flow (end-to-end) ───────────────────────────────────────────────────

test.describe('Share flow', () => {
  test('abrir el enlace copiado en una pestaña nueva carga la lista correctamente', async ({ page, context }) => {
    await mockClipboard(page)
    const list = makeList({ share_id: SHARE_ID, name: 'Lista compartida' })
    await mockSupabase(page, { lists: [list] })
    await page.goto('/')
    await expect(page.getByText('Lista compartida')).toBeVisible()

    // Copiar el enlace desde el menú del home
    await page.getByRole('button', { name: /opciones/i }).click()
    await page.getByText(/compartir/i).click()
    await expect(page.getByText(/enlace copiado/i)).toBeVisible()

    const url = await getClipboardText(page)
    expect(url).toContain(`/lista/${SHARE_ID}`)

    // Abrir el enlace en una nueva pestaña del mismo contexto
    const newPage = await context.newPage()
    await mockSupabase(newPage, {
      lists: [list],
      items: [makeItem({ id: ITEM_1_ID, name: 'Ítem en lista compartida' })],
      categories: [],
    })
    await newPage.goto(url)

    await expect(newPage.getByRole('heading', { name: 'Lista compartida' })).toBeVisible()
    await expect(newPage.getByText('Ítem en lista compartida')).toBeVisible()
    await newPage.close()
  })

  test('usar navigator.share cuando está disponible (desde home)', async ({ page }) => {
    // Cuando navigator.share está definido, Home.jsx usa navigator.clipboard.writeText
    // (la lógica de compartir en Home usa clipboard directamente, no navigator.share).
    // En ListPage.jsx SÍ hay una bifurcación: if (navigator.share) { navigator.share(...) }
    // Este test verifica el home: siempre usa clipboard independientemente de navigator.share.
    await mockClipboard(page)
    await mockNativeShare(page)
    await mockSupabase(page, { lists: [makeList({ share_id: SHARE_ID })] })
    await page.goto('/')
    await expect(page.getByText('Lista de prueba')).toBeVisible()

    await page.getByRole('button', { name: /opciones/i }).click()
    await page.getByText(/compartir/i).click()

    // Home.jsx siempre usa clipboard (no pasa por navigator.share)
    await expect(page.getByText(/enlace copiado/i)).toBeVisible()
    const url = await getClipboardText(page)
    expect(url).toContain(`/lista/${SHARE_ID}`)
  })

  test('el botón Compartir de la página de lista usa navigator.share cuando está disponible', async ({ page }) => {
    await mockNativeShare(page)
    await mockSupabase(page, {
      lists: [makeList({ share_id: SHARE_ID, name: 'Mi lista' })],
      items: [],
      categories: [],
    })
    await page.goto(listUrl)
    await expect(page.getByText('Mi lista')).toBeVisible()

    await page.getByTitle('Compartir').click()

    // ListPage.handleShare usa navigator.share cuando está disponible
    const shared = await getShareData(page)
    expect(shared).not.toBeNull()
    expect(shared.url).toContain(`/lista/${SHARE_ID}`)
    expect(shared.title).toBe('Mi lista')
  })

  test('el botón Compartir de la página de lista usa clipboard si navigator.share no está disponible', async ({ page }) => {
    await mockClipboard(page) // También deshabilita navigator.share
    await mockSupabase(page, {
      lists: [makeList({ share_id: SHARE_ID })],
      items: [],
      categories: [],
    })
    await page.goto(listUrl)
    await expect(page.getByText('Lista de prueba')).toBeVisible()

    await page.getByTitle('Compartir').click()

    await expect(page.getByText(/enlace copiado/i)).toBeVisible()
  })
})
