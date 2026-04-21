// @ts-check
import { test, expect } from '@playwright/test'
import { mockSupabase, makeList, makeItem, makeCategory, SHARE_ID, LIST_ID, CAT_1_ID, ITEM_1_ID } from './helpers/api-mock.js'

// ── Archive / unarchive ───────────────────────────────────────────────────────
// El campo `archived` existe en el schema (lists.archived boolean default false),
// pero la UI actual de Home.jsx no tiene botón ni flujo para archivar/desarchivar.
// getAllLists() no filtra por archived, por lo que las listas con archived=true
// siguen apareciendo en el home junto a las activas.

test.describe('Archive list', () => {
  test.skip('archivar una lista la saca del listado principal',
    // TODO: no existe UI para archivar listas (no hay botón ni acción de menú).
    // Cuando se implemente, verificar que la lista deja de aparecer en home
    // tras ser archivada.
    true, 'TODO: UI de archivo no implementada'
  )

  test.skip('una sección de archivadas muestra las listas archivadas',
    // TODO: no existe sección/tab de "archivadas" en Home.jsx.
    // Cuando se implemente, verificar que aparece al haber al menos una lista
    // con archived=true.
    true, 'TODO: sección de archivadas no implementada'
  )

  test.skip('desarchivar una lista la devuelve al listado principal',
    // TODO: no existe UI para desarchivar.
    true, 'TODO: UI de desarchivar no implementada'
  )

  test.skip('archivar y desarchivar preserva ítems y categorías',
    // TODO: no existe UI de archivo. Cuando se implemente, verificar que
    // items y categories siguen en db.items / db.categories tras el ciclo.
    true, 'TODO: UI de archivo no implementada'
  )

  test.skip('listas archivadas no aparecen mezcladas con las activas',
    // TODO: getAllLists() no filtra por archived, así que actualmente una
    // lista con archived=true sí aparece en home (comportamiento incorrecto).
    // Cuando se implemente el filtro, este test debe pasar.
    true, 'TODO: getAllLists() no filtra por archived'
  )

  // Esta sí es comprobable hoy: una lista con archived=true aparece en el home
  // (porque no hay filtro) y puede eliminarse con el mismo flujo normal.
  test('eliminar una lista con archived=true funciona igual que una activa', async ({ page }) => {
    page.on('dialog', dialog => dialog.accept())
    const archivedList = makeList({ id: LIST_ID, name: 'Lista archivada', archived: true })
    await mockSupabase(page, { lists: [archivedList] })
    await page.goto('/')

    // La lista aparece (getAllLists no filtra por archived)
    await expect(page.getByText('Lista archivada')).toBeVisible()

    await page.getByRole('button', { name: /opciones/i }).click()
    await page.getByText(/eliminar/i).click()

    // Borrado optimista: desaparece de inmediato
    await expect(page.getByText('Lista archivada')).not.toBeVisible()
  })

  // Documenta el comportamiento actual: listas con archived=true sí se muestran.
  // Esto es un bug / feature pendiente según el diseño final.
  test('listas con archived=true aparecen en el home (comportamiento actual)', async ({ page }) => {
    const archivedList = makeList({ id: LIST_ID, name: 'Archivada visible', archived: true })
    const activeList   = makeList({ id: 'active-id', name: 'Activa', share_id: 'active-share', archived: false })
    await mockSupabase(page, { lists: [archivedList, activeList] })
    await page.goto('/')

    await expect(page.getByText('Archivada visible')).toBeVisible()
    await expect(page.getByText('Activa')).toBeVisible()
  })
})
