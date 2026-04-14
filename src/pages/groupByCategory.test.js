import { groupByCategory } from './ListPage'

// Minimal factory helpers
const cat = (id, name, created_at = '2024-01-01T00:00:00Z') => ({
  id, name, color: '#aaa', created_at,
})
const item = (id, category_id = null, checked = false) => ({
  id, name: `Item ${id}`, category_id, checked,
})

describe('groupByCategory', () => {
  describe('no categories', () => {
    test('returns a single uncategorized group with all items', () => {
      const items = [item('a'), item('b')]
      const groups = groupByCategory(items, [], true)
      expect(groups).toHaveLength(1)
      expect(groups[0].id).toBeNull()
      expect(groups[0].items).toHaveLength(2)
    })

    test('returns empty array when no items and no categories', () => {
      const groups = groupByCategory([], [], true)
      expect(groups).toHaveLength(0)
    })
  })

  describe('with categories', () => {
    test('creates a group for each category', () => {
      const cats = [cat('c1', 'Verdulería'), cat('c2', 'Carnicería')]
      const groups = groupByCategory([], cats, true)
      const ids = groups.map(g => g.id)
      expect(ids).toContain('c1')
      expect(ids).toContain('c2')
    })

    test('always includes a "Sin categoría" group when categories exist', () => {
      const cats = [cat('c1', 'Lácteos')]
      const groups = groupByCategory([], cats, true)
      const noneGroup = groups.find(g => g.id === null)
      expect(noneGroup).toBeDefined()
      expect(noneGroup.name).toBe('Sin categoría')
    })

    test('"Sin categoría" is always last', () => {
      const cats = [cat('c1', 'A'), cat('c2', 'B')]
      const groups = groupByCategory([item('x')], cats, true)
      expect(groups[groups.length - 1].id).toBeNull()
    })

    test('places items into their matching category group', () => {
      const cats = [cat('c1', 'Frutas'), cat('c2', 'Carnes')]
      const items = [item('i1', 'c1'), item('i2', 'c2'), item('i3', 'c1')]
      const groups = groupByCategory(items, cats, true)
      const frutas = groups.find(g => g.id === 'c1')
      const carnes = groups.find(g => g.id === 'c2')
      expect(frutas.items).toHaveLength(2)
      expect(carnes.items).toHaveLength(1)
    })

    test('items with unknown category_id fall into "Sin categoría"', () => {
      const cats = [cat('c1', 'Frutas')]
      const items = [item('i1', 'nonexistent-id')]
      const groups = groupByCategory(items, cats, true)
      const none = groups.find(g => g.id === null)
      expect(none.items).toHaveLength(1)
      expect(none.items[0].id).toBe('i1')
    })

    test('items with null category_id fall into "Sin categoría"', () => {
      const cats = [cat('c1', 'Frutas')]
      const items = [item('i1', null)]
      const groups = groupByCategory(items, cats, true)
      const none = groups.find(g => g.id === null)
      expect(none.items).toHaveLength(1)
    })

    test('categories are ordered by created_at ascending', () => {
      const cats = [
        cat('c2', 'Beta',  '2024-01-02T00:00:00Z'),
        cat('c1', 'Alpha', '2024-01-01T00:00:00Z'),
        cat('c3', 'Gamma', '2024-01-03T00:00:00Z'),
      ]
      const groups = groupByCategory([], cats, true)
      const catGroups = groups.filter(g => g.id !== null)
      expect(catGroups.map(g => g.id)).toEqual(['c1', 'c2', 'c3'])
    })
  })

  describe('checked item visibility', () => {
    test('checked items appear after unchecked items when showChecked=true', () => {
      const cats = [cat('c1', 'Todo')]
      const items = [
        item('checked1', 'c1', true),
        item('unchecked1', 'c1', false),
      ]
      const groups = groupByCategory(items, cats, true)
      const group = groups.find(g => g.id === 'c1')
      expect(group.items[0].id).toBe('unchecked1')
      expect(group.items[1].id).toBe('checked1')
    })

    test('checked items are hidden when showChecked=false', () => {
      const cats = [cat('c1', 'Todo')]
      const items = [
        item('checked1', 'c1', true),
        item('unchecked1', 'c1', false),
      ]
      const groups = groupByCategory(items, cats, false)
      const group = groups.find(g => g.id === 'c1')
      expect(group.items).toHaveLength(1)
      expect(group.items[0].id).toBe('unchecked1')
    })

    test('returns only unchecked items when showChecked=false', () => {
      const items = [item('a', null, true), item('b', null, false)]
      const groups = groupByCategory(items, [], false)
      const all = groups.flatMap(g => g.items)
      expect(all).toHaveLength(1)
      expect(all[0].id).toBe('b')
    })
  })
})
