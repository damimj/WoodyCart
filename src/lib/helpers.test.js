import { describe, it, expect } from 'vitest'
import {
  getShareUrl,
  getNextPosition,
  countChecked,
  isValidItemName,
  isValidHexColor,
} from './helpers'
import { groupByCategory } from '../pages/ListPage'

// ── getShareUrl ───────────────────────────────────────────────────────────────

describe('getShareUrl', () => {
  it('construye la URL con window.location.origin y el shareId', () => {
    const url = getShareUrl('abc-123')
    expect(url).toBe(`${window.location.origin}/lista/abc-123`)
  })

  it('incluye el shareId sin modificarlo', () => {
    const shareId = 'mi-lista-especial-2024'
    expect(getShareUrl(shareId)).toMatch(`/lista/${shareId}`)
  })

  it('no agrega barra final después del shareId', () => {
    expect(getShareUrl('xyz')).not.toMatch(/\/lista\/xyz\/$/)
  })
})

// ── sortItemsByPosition ───────────────────────────────────────────────────────
// TODO: extract from src/lib/supabase.js — el orden viene del ORDER BY de la query,
// no existe función JS de ordenamiento en el código.
it.skip('sortItemsByPosition — no existe en el codebase JS', () => {})

// ── groupByCategory (importada de ListPage) ───────────────────────────────────

describe('groupByCategory', () => {
  const makeItem = (overrides = {}) => ({
    id: `item-${Math.random().toString(36).slice(2)}`,
    name: 'Ítem',
    checked: false,
    category_id: null,
    position: 0,
    ...overrides,
  })

  const makeCat = (id, name, createdAt = '2024-01-01T00:00:00Z') => ({
    id,
    name,
    color: '#3a7d5a',
    created_at: createdAt,
  })

  it('ítems con category_id null caen en el grupo Sin categoría cuando hay categorías', () => {
    const cat = makeCat('cat-1', 'Frutas')
    const item = makeItem({ category_id: null })
    const groups = groupByCategory([item], [cat], true)
    const sinCat = groups.find(g => g.name === 'Sin categoría')
    expect(sinCat).toBeDefined()
    expect(sinCat.items).toContainEqual(expect.objectContaining({ id: item.id }))
  })

  it('ítems con category_id válido caen en su categoría correspondiente', () => {
    const cat = makeCat('cat-1', 'Carnes')
    const item = makeItem({ category_id: 'cat-1' })
    const groups = groupByCategory([item], [cat], true)
    const carnes = groups.find(g => g.name === 'Carnes')
    expect(carnes).toBeDefined()
    expect(carnes.items).toContainEqual(expect.objectContaining({ id: item.id }))
  })

  it('excluye ítems tachados cuando showChecked es false', () => {
    const item = makeItem({ checked: true })
    const groups = groupByCategory([item], [], false)
    const total = groups.reduce((n, g) => n + g.items.length, 0)
    expect(total).toBe(0)
  })

  it('incluye ítems tachados cuando showChecked es true', () => {
    const item = makeItem({ checked: true })
    const groups = groupByCategory([item], [], true)
    const total = groups.reduce((n, g) => n + g.items.length, 0)
    expect(total).toBe(1)
  })

  it('uncategorized aparece al final cuando hay otras categorías', () => {
    const cat = makeCat('cat-1', 'Frutas')
    const itemCat = makeItem({ category_id: 'cat-1' })
    const itemNone = makeItem({ category_id: null })
    const groups = groupByCategory([itemCat, itemNone], [cat], true)
    const last = groups[groups.length - 1]
    expect(last.name).toBe('Sin categoría')
  })
})

// ── getNextPosition ───────────────────────────────────────────────────────────

describe('getNextPosition', () => {
  it('devuelve 0 para lista vacía', () => {
    expect(getNextPosition([])).toBe(0)
  })

  it('devuelve max(position) + 1', () => {
    const items = [{ position: 0 }, { position: 2 }, { position: 1 }]
    expect(getNextPosition(items)).toBe(3)
  })

  it('funciona con un solo ítem', () => {
    expect(getNextPosition([{ position: 5 }])).toBe(6)
  })

  it('funciona cuando todas las posiciones son iguales', () => {
    const items = [{ position: 3 }, { position: 3 }, { position: 3 }]
    expect(getNextPosition(items)).toBe(4)
  })
})

// ── countChecked ─────────────────────────────────────────────────────────────

describe('countChecked', () => {
  it('devuelve { checked: 0, total: 0 } para lista vacía', () => {
    expect(countChecked([])).toEqual({ checked: 0, total: 0 })
  })

  it('devuelve checked === total cuando todos están tachados', () => {
    const items = [{ checked: true }, { checked: true }]
    expect(countChecked(items)).toEqual({ checked: 2, total: 2 })
  })

  it('devuelve checked === 0 cuando ninguno está tachado', () => {
    const items = [{ checked: false }, { checked: false }]
    expect(countChecked(items)).toEqual({ checked: 0, total: 2 })
  })

  it('cuenta correctamente en lista mixta', () => {
    const items = [
      { checked: true },
      { checked: false },
      { checked: true },
      { checked: false },
    ]
    expect(countChecked(items)).toEqual({ checked: 2, total: 4 })
  })
})

// ── isValidItemName ───────────────────────────────────────────────────────────

describe('isValidItemName', () => {
  it('rechaza string vacío', () => {
    expect(isValidItemName('')).toBe(false)
  })

  it('rechaza string de solo espacios', () => {
    expect(isValidItemName('   ')).toBe(false)
  })

  it('rechaza string de tabs y newlines', () => {
    expect(isValidItemName('\t\n')).toBe(false)
  })

  it('acepta nombre con caracteres especiales', () => {
    expect(isValidItemName('Café con ñ')).toBe(true)
  })

  it('acepta nombre con emojis', () => {
    expect(isValidItemName('Leche 🥛')).toBe(true)
  })

  it('acepta strings con apariencia de inyección HTML', () => {
    expect(isValidItemName('<script>alert(1)</script>')).toBe(true)
  })

  it('acepta nombre de un solo carácter no-espacio', () => {
    expect(isValidItemName('A')).toBe(true)
  })
})

// ── isValidHexColor ───────────────────────────────────────────────────────────

describe('isValidHexColor', () => {
  it('acepta hex de 6 dígitos con #', () => {
    expect(isValidHexColor('#3a7d5a')).toBe(true)
    expect(isValidHexColor('#FFFFFF')).toBe(true)
    expect(isValidHexColor('#000000')).toBe(true)
  })

  it('acepta hex de 3 dígitos con #', () => {
    expect(isValidHexColor('#fff')).toBe(true)
    expect(isValidHexColor('#abc')).toBe(true)
  })

  it('rechaza color sin símbolo #', () => {
    expect(isValidHexColor('3a7d5a')).toBe(false)
    expect(isValidHexColor('red')).toBe(false)
  })

  it('rechaza hex con caracteres inválidos', () => {
    expect(isValidHexColor('#zzz')).toBe(false)
    expect(isValidHexColor('#xyz123')).toBe(false)
  })

  it('rechaza hex de longitud incorrecta', () => {
    expect(isValidHexColor('#ff')).toBe(false)
    expect(isValidHexColor('#ffff')).toBe(false)
    expect(isValidHexColor('#fffff')).toBe(false)
  })
})
