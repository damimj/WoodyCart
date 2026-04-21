/**
 * Supabase REST API mock for Playwright E2E tests.
 *
 * Intercepts rest/v1 routes and responds from an in-memory db.
 * Returns the db object so tests can inspect or mutate state after setup.
 */

// ── Stable IDs used across tests ──────────────────────────────────────────────
export const SHARE_ID    = 'e2e-share-id'
export const LIST_ID     = 'e2e-list-id'
export const CAT_1_ID    = 'e2e-cat-1'
export const CAT_2_ID    = 'e2e-cat-2'
export const ITEM_1_ID   = 'e2e-item-1'
export const ITEM_2_ID   = 'e2e-item-2'

// ── Factory helpers ───────────────────────────────────────────────────────────
export const makeList = (overrides = {}) => ({
  id: LIST_ID,
  name: 'Lista de prueba',
  share_id: SHARE_ID,
  archived: false,
  icon: null,
  created_at: '2024-01-15T10:00:00.000Z',
  ...overrides,
})

export const makeItem = (overrides = {}) => ({
  id: ITEM_1_ID,
  list_id: LIST_ID,
  name: 'Leche',
  quantity: null,
  note: null,
  checked: false,
  image_url: null,
  category_id: null,
  position: 0,
  created_at: '2024-01-15T10:01:00.000Z',
  ...overrides,
})

export const makeCategory = (overrides = {}) => ({
  id: CAT_1_ID,
  list_id: LIST_ID,
  name: 'Verdulería',
  color: '#3a7d5a',
  created_at: '2024-01-15T10:02:00.000Z',
  ...overrides,
})

// ── Clipboard mock ────────────────────────────────────────────────────────────
/**
 * Injects a clipboard stub before the page loads.
 * Ensures navigator.share is undefined so the app falls back to clipboard.
 */
export async function mockClipboard(page) {
  await page.addInitScript(() => {
    window.__clipboardText = null
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: async (text) => { window.__clipboardText = text },
        readText:  async ()     => window.__clipboardText ?? '',
      },
      writable: true,
      configurable: true,
    })
    Object.defineProperty(navigator, 'share', {
      value: undefined,
      writable: true,
      configurable: true,
    })
  })
}

export const getClipboardText = (page) =>
  page.evaluate(() => window.__clipboardText)

// ── Supabase REST mock ────────────────────────────────────────────────────────

/** @private */
function sleep(ms) {
  return new Promise(r => setTimeout(r, ms))
}

/**
 * Convenience wrapper to make error config explicit at the call site.
 * @param {object} errors
 */
export const withErrors = (errors) => errors

/**
 * Sets up route interceptors for /rest/v1/lists, /rest/v1/items, /rest/v1/categories.
 * Also aborts the Supabase realtime WebSocket to prevent noisy console errors.
 *
 * @param {import('@playwright/test').Page} page
 * @param {{ lists?: object[], items?: object[], categories?: object[] }} initial
 * @param {{
 *   failPOST?:   { lists?: number|'timeout', items?: number|'timeout', categories?: number|'timeout' },
 *   failPATCH?:  { lists?: number|'timeout', items?: number|'timeout', categories?: number|'timeout' },
 *   failDELETE?: { lists?: number|'timeout', items?: number|'timeout', categories?: number|'timeout' },
 *   failGET?:    { lists?: number|'timeout', items?: number|'timeout', categories?: number|'timeout' },
 *   delay?:      number,
 * }} [errors]
 * @returns {object} mutable db — inspect or modify in tests
 */
export async function mockSupabase(
  page,
  { lists = [], items = [], categories = [] } = {},
  {
    failPOST   = {},
    failPATCH  = {},
    failDELETE = {},
    failGET    = {},
    delay      = 0,
  } = {}
) {
  const db = {
    lists:      structuredClone(lists),
    items:      structuredClone(items),
    categories: structuredClone(categories),
  }

  // Map HTTP method → fail-flag object
  const failMap = { GET: failGET, POST: failPOST, PATCH: failPATCH, DELETE: failDELETE }

  /**
   * Checks whether the request should fail.
   * Returns true if the route was fulfilled (failed), false to continue normally.
   */
  async function tryFail(route, method, resource) {
    if (delay > 0) await sleep(delay)
    const flag = (failMap[method] ?? {})[resource]
    if (!flag) return false
    if (flag === 'timeout') {
      await route.abort('timedout')
      return true
    }
    await route.fulfill({ json: { error: 'simulated' }, status: flag })
    return true
  }

  // Abort realtime WebSocket — tests rely on optimistic UI updates instead
  await page.route('**/realtime/v1/**', route => route.abort())

  // ── /rest/v1/lists ──────────────────────────────────────────────────────────
  await page.route('**/rest/v1/lists**', async (route) => {
    const method = route.request().method()
    const url    = route.request().url()

    if (await tryFail(route, method, 'lists')) return

    if (method === 'GET') {
      const shareMatch = url.match(/share_id=eq\.([^&]+)/)
      if (shareMatch) {
        const found = db.lists.find(l => l.share_id === decodeURIComponent(shareMatch[1]))
        await route.fulfill({ json: found ?? null, status: found ? 200 : 404 })
      } else {
        await route.fulfill({ json: db.lists })
      }

    } else if (method === 'POST') {
      const body = route.request().postDataJSON() ?? {}
      const newList = {
        id: `list-${Date.now()}`,
        archived: false,
        icon: null,
        created_at: new Date().toISOString(),
        ...body,
      }
      db.lists.unshift(newList)
      await route.fulfill({ json: newList, status: 201 })

    } else if (method === 'PATCH') {
      const body    = route.request().postDataJSON() ?? {}
      const idMatch = url.match(/id=eq\.([^&]+)/)
      if (idMatch) {
        const i = db.lists.findIndex(l => l.id === idMatch[1])
        if (i >= 0) db.lists[i] = { ...db.lists[i], ...body }
      }
      await route.fulfill({ json: {}, status: 200 })

    } else if (method === 'DELETE') {
      const idMatch = url.match(/id=eq\.([^&]+)/)
      if (idMatch) db.lists = db.lists.filter(l => l.id !== idMatch[1])
      await route.fulfill({ json: {}, status: 200 })

    } else {
      await route.continue()
    }
  })

  // ── /rest/v1/items ──────────────────────────────────────────────────────────
  await page.route('**/rest/v1/items**', async (route) => {
    const method = route.request().method()
    const url    = route.request().url()

    if (await tryFail(route, method, 'items')) return

    if (method === 'GET') {
      const listMatch = url.match(/list_id=eq\.([^&]+)/)
      const result = listMatch
        ? db.items.filter(i => i.list_id === decodeURIComponent(listMatch[1]))
        : db.items
      await route.fulfill({ json: result })

    } else if (method === 'POST') {
      const body = route.request().postDataJSON() ?? {}
      const newItem = {
        id: `item-${Date.now()}`,
        checked: false,
        image_url: null,
        created_at: new Date().toISOString(),
        position: db.items.length,
        ...body,
      }
      db.items.push(newItem)
      await route.fulfill({ json: newItem, status: 201 })

    } else if (method === 'PATCH') {
      const body    = route.request().postDataJSON() ?? {}
      const idMatch = url.match(/id=eq\.([^&]+)/)
      if (idMatch) {
        const i = db.items.findIndex(it => it.id === idMatch[1])
        if (i >= 0) db.items[i] = { ...db.items[i], ...body }
      }
      await route.fulfill({ json: {}, status: 200 })

    } else if (method === 'DELETE') {
      const idMatch = url.match(/id=eq\.([^&]+)/)
      if (idMatch) db.items = db.items.filter(i => i.id !== idMatch[1])
      await route.fulfill({ json: {}, status: 200 })

    } else {
      await route.continue()
    }
  })

  // ── /rest/v1/categories ─────────────────────────────────────────────────────
  await page.route('**/rest/v1/categories**', async (route) => {
    const method = route.request().method()
    const url    = route.request().url()

    if (await tryFail(route, method, 'categories')) return

    if (method === 'GET') {
      const listMatch = url.match(/list_id=eq\.([^&]+)/)
      const result = listMatch
        ? db.categories.filter(c => c.list_id === decodeURIComponent(listMatch[1]))
        : db.categories
      await route.fulfill({ json: result })

    } else if (method === 'POST') {
      const body = route.request().postDataJSON() ?? {}
      const newCat = {
        id: `cat-${Date.now()}`,
        created_at: new Date().toISOString(),
        ...body,
      }
      db.categories.push(newCat)
      await route.fulfill({ json: newCat, status: 201 })

    } else if (method === 'DELETE') {
      const idMatch = url.match(/id=eq\.([^&]+)/)
      if (idMatch) db.categories = db.categories.filter(c => c.id !== idMatch[1])
      await route.fulfill({ json: {}, status: 200 })

    } else {
      await route.continue()
    }
  })

  return db
}

// ── mockNativeShare ───────────────────────────────────────────────────────────
/**
 * Stubs navigator.share so the app uses it instead of falling back to clipboard.
 * Call getShareData(page) after triggering a share to inspect the shared payload.
 */
export async function mockNativeShare(page) {
  await page.addInitScript(() => {
    window.__shareData = null
    Object.defineProperty(navigator, 'share', {
      value: async (data) => { window.__shareData = data },
      writable: true,
      configurable: true,
    })
  })
}

export const getShareData = (page) => page.evaluate(() => window.__shareData)
