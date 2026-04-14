import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase, getList, getItems, getCategories, addItem, updateItem, deleteItem,
  addCategory, deleteCategory, uploadImage, updateList } from '../lib/supabase'
import ItemRow from '../components/ItemRow'
import AddItemSheet from '../components/AddItemSheet'
import CategorySheet from '../components/CategorySheet'
import styles from './ListPage.module.css'

const CATEGORY_COLORS = ['#c84b2f','#3a7d5a','#3a6b9e','#7a4f9e','#e8b84b','#d47a3a']

const DEFAULT_SUGGESTIONS = [
  { name: 'Verdulería', color: '#3a7d5a' },
  { name: 'Carnicería', color: '#c84b2f' },
  { name: 'Congelados', color: '#3a6b9e' },
  { name: 'Lácteos',    color: '#e8b84b' },
  { name: 'Almacén',    color: '#d47a3a' },
]

export default function ListPage() {
  const { shareId } = useParams()
  const navigate = useNavigate()
  const [list, setList] = useState(null)
  const [items, setItems] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [addSheet, setAddSheet] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [catSheet, setCatSheet] = useState(false)
  const [activeCategoryId, setActiveCategoryId] = useState(null)
  const [creatingCat, setCreatingCat] = useState(false)
  const [newCatName, setNewCatName] = useState('')
  const [hiddenPillIds, setHiddenPillIds] = useState(() => new Set())
  const [shareToast, setShareToast] = useState(false)
  const [showChecked, setShowChecked] = useState(true)
  const channelRef = useRef(null)

  useEffect(() => {
    let cancelled = false
    let channel = null

    async function run() {
      try {
        const l = await getList(shareId)
        if (cancelled) return
        if (!l) { setNotFound(true); return }
        setList(l)
        const [its, cats] = await Promise.all([getItems(l.id), getCategories(l.id)])
        if (cancelled) return
        setItems(its || [])
        setCategories(cats || [])
        channel = supabase
          .channel(`list-${l.id}-${Math.random().toString(36).slice(2)}`)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'items', filter: `list_id=eq.${l.id}` },
            payload => {
              if (payload.eventType === 'INSERT') {
                setItems(prev => prev.some(i => i.id === payload.new.id) ? prev : [...prev, payload.new])
              }
              if (payload.eventType === 'UPDATE') setItems(prev => prev.map(i => i.id === payload.new.id ? payload.new : i))
              if (payload.eventType === 'DELETE') setItems(prev => prev.filter(i => i.id !== payload.old.id))
            }
          )
          .on('postgres_changes', { event: '*', schema: 'public', table: 'categories', filter: `list_id=eq.${l.id}` },
            payload => {
              if (payload.eventType === 'INSERT') {
                setCategories(prev => prev.some(c => c.id === payload.new.id) ? prev : [...prev, payload.new])
              }
              if (payload.eventType === 'DELETE') setCategories(prev => prev.filter(c => c.id !== payload.old.id))
            }
          )
          .subscribe()
        if (cancelled) {
          supabase.removeChannel(channel)
          channel = null
        } else {
          channelRef.current = channel
        }
      } catch (e) {
        if (cancelled) return
        console.error('loadAll failed:', e, 'shareId:', shareId)
        setNotFound(true)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    run()

    return () => {
      cancelled = true
      if (channel) supabase.removeChannel(channel)
      channelRef.current = null
    }
  }, [shareId])

  async function handleToggle(item) {
    await updateItem(item.id, { checked: !item.checked })
  }

  async function handleDeleteItem(id) {
    setItems(prev => prev.filter(i => i.id !== id))
    try {
      await deleteItem(id)
    } catch (e) {
      console.error('deleteItem failed:', e)
    }
  }

  async function handleSaveItem(data) {
    if (editItem) {
      await updateItem(editItem.id, data)
    } else {
      await addItem(list.id, {
        ...data,
        category_id: activeCategoryId,
        checked: false,
        position: items.length,
      })
    }
    setAddSheet(false)
    setEditItem(null)
  }

  async function handleAddCategory(name, color) {
    await addCategory(list.id, name, color)
  }

  async function handleDeleteCategory(id) {
    const cat = categories.find(c => c.id === id)
    const itemsInCat = items.filter(i => i.category_id === id)
    const msg = itemsInCat.length > 0
      ? `¿Borrar "${cat?.name}" y sus ${itemsInCat.length} artículo${itemsInCat.length === 1 ? '' : 's'}?`
      : `¿Borrar "${cat?.name}"?`
    if (!confirm(msg)) return
    const itemIds = new Set(itemsInCat.map(i => i.id))
    setItems(prev => prev.filter(i => !itemIds.has(i.id)))
    setCategories(prev => prev.filter(c => c.id !== id))
    setHiddenPillIds(prev => {
      if (!prev.has(id)) return prev
      const next = new Set(prev)
      next.delete(id)
      return next
    })
    if (activeCategoryId === id) setActiveCategoryId(null)
    try {
      await Promise.all(itemsInCat.map(i => deleteItem(i.id)))
      await deleteCategory(id)
    } catch (e) {
      console.error('deleteCategory failed:', e)
    }
  }

  async function createAndActivate(name, color) {
    const trimmed = name.trim()
    if (!trimmed) return
    // If a category with this name already exists, reuse it (unhide the pill).
    const existing = categories.find(c => c.name.toLowerCase() === trimmed.toLowerCase())
    if (existing) {
      setHiddenPillIds(prev => {
        if (!prev.has(existing.id)) return prev
        const next = new Set(prev)
        next.delete(existing.id)
        return next
      })
      setActiveCategoryId(existing.id)
      return
    }
    try {
      const cat = await addCategory(list.id, trimmed, color)
      setCategories(prev => prev.some(c => c.id === cat.id) ? prev : [...prev, cat])
      setActiveCategoryId(cat.id)
    } catch (e) {
      console.error('createAndActivate failed:', e)
    }
  }

  function handleHidePill(id) {
    const cat = categories.find(c => c.id === id)
    if (!cat) return
    if (!confirm(`¿Quitar "${cat.name}" de los accesos rápidos? La categoría y sus artículos no se borran.`)) return
    setHiddenPillIds(prev => new Set(prev).add(id))
  }

  async function handleCreateSuggestion(sugg) {
    await createAndActivate(sugg.name, sugg.color)
  }

  async function handleCreateCustom(e) {
    e.preventDefault()
    const color = CATEGORY_COLORS[categories.length % CATEGORY_COLORS.length]
    await createAndActivate(newCatName, color)
    setNewCatName('')
    setCreatingCat(false)
  }

  function activateCategory(id) {
    setActiveCategoryId(id)
  }

  function handleShare() {
    const url = window.location.href
    if (navigator.share) {
      navigator.share({ title: list.name, url })
    } else {
      navigator.clipboard.writeText(url)
      setShareToast(true)
      setTimeout(() => setShareToast(false), 2000)
    }
  }

  async function handleUncheckAll() {
    const checked = items.filter(i => i.checked)
    await Promise.all(checked.map(i => updateItem(i.id, { checked: false })))
  }

  const grouped = groupByCategory(items, categories, showChecked)
  const checkedCount = items.filter(i => i.checked).length
  const totalCount = items.length
  const visiblePillCats = categories.filter(c => !hiddenPillIds.has(c.id))
  const suggestions = DEFAULT_SUGGESTIONS.filter(
    s => !visiblePillCats.some(c => c.name.toLowerCase() === s.name.toLowerCase())
  )

  if (loading) return (
    <div className={styles.loadingPage}>
      <span className={styles.spinner} />
    </div>
  )

  if (notFound) return (
    <div className={styles.notFound}>
      <p className={styles.notFoundIcon}>🔍</p>
      <h2>Lista no encontrada</h2>
      <p>El enlace puede ser incorrecto o la lista fue eliminada.</p>
      <button onClick={() => navigate('/')} className={styles.backBtn}>Ir al inicio</button>
    </div>
  )

  return (
    <div className={styles.page}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerTop}>
          <button className={styles.logoBtn} onClick={() => navigate('/')} aria-label="Ir al inicio">
            <img src="/favicon.svg" alt="WoodyCart" className={styles.headerLogo} />
          </button>
          <h1 className={styles.title}>{list.name}</h1>
          <div className={styles.headerActions}>
            <button className={styles.iconBtn} onClick={() => setCatSheet(true)} title="Categorías">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
                <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
              </svg>
            </button>
            <button className={styles.iconBtn} onClick={handleShare} title="Compartir">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Progress bar */}
        {totalCount > 0 && (
          <div className={styles.progress}>
            <div className={styles.progressBar}>
              <div className={styles.progressFill} style={{ width: `${(checkedCount / totalCount) * 100}%` }} />
            </div>
            <span className={styles.progressLabel}>{checkedCount}/{totalCount}</span>
          </div>
        )}

        {/* Category pills: existing + suggestions + create */}
        <div className={styles.catFilter}>
          {visiblePillCats.map(c => {
            const active = activeCategoryId === c.id
            return (
              <div
                key={c.id}
                role="button"
                tabIndex={0}
                className={`${styles.catChipWrap} ${active ? styles.catChipWrapActive : ''}`}
                style={{
                  background: active ? c.color : 'transparent',
                  borderColor: c.color,
                  color: active ? 'white' : c.color,
                }}
                onClick={() => activateCategory(c.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    activateCategory(c.id)
                  }
                }}
              >
                <span className={styles.catChipBody}>{c.name}</span>
                <button
                  type="button"
                  className={styles.catChipDelete}
                  onClick={(e) => { e.stopPropagation(); handleHidePill(c.id) }}
                  aria-label={`Quitar pill ${c.name}`}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <path d="M6 6l12 12M18 6L6 18"/>
                  </svg>
                </button>
              </div>
            )
          })}
          {suggestions.map(s => (
            <button
              key={s.name}
              className={`${styles.catChip} ${styles.catChipGhost}`}
              style={{ borderColor: s.color, color: s.color }}
              onClick={() => handleCreateSuggestion(s)}
            >+ {s.name}</button>
          ))}
          {creatingCat ? (
            <form className={styles.catInlineForm} onSubmit={handleCreateCustom}>
              <input
                autoFocus
                className={styles.catInlineInput}
                placeholder="Nombre…"
                value={newCatName}
                onChange={e => setNewCatName(e.target.value)}
                onBlur={() => { if (!newCatName.trim()) setCreatingCat(false) }}
                onKeyDown={e => {
                  if (e.key === 'Escape') { setCreatingCat(false); setNewCatName('') }
                }}
                maxLength={24}
              />
            </form>
          ) : (
            <button
              type="button"
              className={`${styles.catChip} ${styles.catChipAdd}`}
              onClick={() => setCreatingCat(true)}
              aria-label="Nueva categoría"
            >+</button>
          )}
        </div>
      </header>

      {/* List */}
      <main className={styles.main}>
        {categories.length === 0 && items.length === 0 ? (
          <div className={styles.emptyList}>
            <p className={styles.emptyListIcon}>🏷️</p>
            <p className={styles.emptyListText}>Elige una categoría para empezar</p>
          </div>
        ) : (
          <>
            {grouped.map(group => {
              const isActive = group.id && group.id === activeCategoryId
              return (
                <div
                  key={group.id || 'uncategorized'}
                  className={`${styles.group} ${isActive ? styles.groupActive : ''}`}
                >
                  {group.name && (
                    <div
                      className={styles.groupHeader}
                      onClick={() => activateCategory(group.id)}
                      style={{ cursor: 'pointer' }}
                    >
                      <span className={styles.groupDot} style={{ background: group.color }} />
                      <span className={styles.groupName}>{group.name}</span>
                      {isActive && (
                        <>
                          <span className={styles.groupActiveBadge}>activa</span>
                          <button
                            type="button"
                            className={styles.groupDeleteBtn}
                            onClick={(e) => { e.stopPropagation(); handleDeleteCategory(group.id) }}
                            aria-label={`Borrar categoría ${group.name}`}
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="3 6 5 6 21 6"/>
                              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                              <path d="M10 11v6M14 11v6"/>
                              <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                            </svg>
                          </button>
                        </>
                      )}
                    </div>
                  )}
                  {group.items.length === 0 ? (
                    <p className={styles.groupEmpty}>
                      {isActive ? 'Añade artículos a esta categoría' : 'Sin artículos'}
                    </p>
                  ) : (
                    group.items.map(item => (
                      <ItemRow
                        key={item.id}
                        item={item}
                        onToggle={() => handleToggle(item)}
                        onEdit={() => { setEditItem(item); setAddSheet(true) }}
                        onDelete={() => handleDeleteItem(item.id)}
                      />
                    ))
                  )}
                </div>
              )
            })}

            {checkedCount > 0 && (
              <div className={styles.checkedActions}>
                <button className={styles.toggleCheckedBtn} onClick={() => setShowChecked(!showChecked)}>
                  {showChecked ? `Ocultar tachados (${checkedCount})` : `Mostrar tachados (${checkedCount})`}
                </button>
                <button className={styles.uncheckAllBtn} onClick={handleUncheckAll}>
                  Desmarcar todos
                </button>
              </div>
            )}
          </>
        )}
      </main>

      {/* FAB */}
      <button className={styles.fab} onClick={() => { setEditItem(null); setAddSheet(true) }}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M12 5v14M5 12h14"/>
        </svg>
        <span>Añadir</span>
      </button>

      {/* Sheets */}
      {addSheet && (
        <AddItemSheet
          item={editItem}
          onSave={handleSaveItem}
          onClose={() => { setAddSheet(false); setEditItem(null) }}
        />
      )}
      {catSheet && (
        <CategorySheet
          categories={categories}
          colors={CATEGORY_COLORS}
          onAdd={handleAddCategory}
          onDelete={handleDeleteCategory}
          onClose={() => setCatSheet(false)}
        />
      )}

      {/* Share toast */}
      {shareToast && <div className={styles.toast}>📋 Enlace copiado</div>}
    </div>
  )
}

function groupByCategory(items, categories, showChecked) {
  const unchecked = items.filter(i => !i.checked)
  const checked = showChecked ? items.filter(i => i.checked) : []
  const all = [...unchecked, ...checked]

  // Preserve creation order so newest category appears last.
  const sortedCats = [...categories].sort((a, b) =>
    new Date(a.created_at) - new Date(b.created_at)
  )

  const groups = {}
  const order = []
  sortedCats.forEach(c => {
    groups[c.id] = { id: c.id, name: c.name, color: c.color, items: [] }
    order.push(c.id)
  })

  all.forEach(item => {
    const cid = item.category_id && groups[item.category_id] ? item.category_id : '__none__'
    if (!groups[cid]) {
      groups[cid] = { id: null, name: '', color: '', items: [] }
      order.push(cid)
    }
    groups[cid].items.push(item)
  })

  // Uncategorized at the end.
  return order.map(id => groups[id]).sort((a, b) => {
    if (!a.id && b.id) return 1
    if (a.id && !b.id) return -1
    return 0
  })
}
