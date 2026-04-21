import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase, getList, getItems, getCategories, addItem, updateItem, deleteItem,
  addCategory, deleteCategory, uploadImage, updateList } from '../lib/supabase'
import { DndContext, DragOverlay, PointerSensor, TouchSensor, useSensor, useSensors, useDroppable } from '@dnd-kit/core'
import ItemRow from '../components/ItemRow'
import AddItemSheet from '../components/AddItemSheet'
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
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [activeCategoryId, setActiveCategoryId] = useState(null)
  const [creatingCat, setCreatingCat] = useState(false)
  const [newCatName, setNewCatName] = useState('')
  const [hiddenPillIds, setHiddenPillIds] = useState(() => new Set())
  const [shareToast, setShareToast] = useState(false)
  const [showChecked, setShowChecked] = useState(true)
  const channelRef = useRef(null)
  const scrollTargetId = useRef(null)
  const [draggingItem, setDraggingItem] = useState(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor,   { activationConstraint: { delay: 200, tolerance: 6 } })
  )

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
    try {
      if (editItem) {
        setItems(prev => prev.map(i => i.id === editItem.id ? { ...i, ...data } : i))
        await updateItem(editItem.id, data)
      } else {
        const newItem = await addItem(list.id, {
          ...data,
          category_id: activeCategoryId,
          checked: false,
          position: items.length,
        })
        setItems(prev => prev.some(i => i.id === newItem.id) ? prev : [...prev, newItem])
        scrollTargetId.current = newItem.id
      }
    } catch (e) {
      console.error(e)
    }
    setAddSheet(false)
    setEditItem(null)
  }

  // Scroll to newly added item, clearing the sticky header
  useEffect(() => {
    if (!scrollTargetId.current) return
    const id = scrollTargetId.current
    requestAnimationFrame(() => {
      const el = document.querySelector(`[data-item-id="${id}"]`)
      if (!el) return
      const headerH = document.querySelector('header')?.offsetHeight ?? 0
      const rect = el.getBoundingClientRect()
      const hiddenUnderHeader = rect.top < headerH + 8
      const belowViewport = rect.bottom > window.innerHeight - 8
      if (hiddenUnderHeader || belowViewport) {
        window.scrollTo({ top: window.scrollY + rect.top - headerH - 8, behavior: 'smooth' })
      }
      scrollTargetId.current = null
    })
  }, [items])

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

  function handleDragStart({ active }) {
    setDraggingItem(items.find(i => i.id === active.id) ?? null)
  }

  async function handleDragEnd({ active, over }) {
    setDraggingItem(null)
    if (!over) return
    const item = items.find(i => i.id === active.id)
    if (!item) return
    const newCategoryId = over.id === '__none__' ? null : over.id
    if (item.category_id === newCategoryId) return
    // Optimistic move
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, category_id: newCategoryId } : i))
    try {
      await updateItem(item.id, { category_id: newCategoryId })
    } catch (e) {
      console.error('move failed:', e)
    }
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
            <img src="/logo_new.png" alt="WoodyCart" className={styles.headerLogo} />
          </button>
          <h1 className={styles.title}>{list.name}</h1>
          <div className={styles.headerActions}>
            <button className={styles.iconBtn} onClick={() => setShowClearConfirm(true)} title="Limpiar lista">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m9.06 11.9 8.07-8.06a2.85 2.85 0 1 1 4.03 4.03l-8.06 8.08"/>
                <path d="M7.07 14.94c-1.66 0-3 1.35-3 3.02 0 1.33-2.5 1.52-2 2.02 1 1 2.23 1.52 3.98 1.52 2.23 0 3.98-1.63 3.98-3.5 0-1.67-1.42-3.06-2.96-3.06z"/>
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
          <DndContext
            sensors={sensors}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            {grouped.map(group => {
              const isActive = group.id && group.id === activeCategoryId
              return (
                <GroupSection
                  key={group.id ?? '__none__'}
                  group={group}
                  isActive={isActive}
                  isDraggingAny={!!draggingItem}
                  onActivate={activateCategory}
                  onDelete={handleDeleteCategory}
                >
                  {group.items.length === 0 ? (
                    <p className={styles.groupEmpty}>
                      {isActive
                        ? 'Añade artículos a esta categoría'
                        : draggingItem ? 'Suelta aquí' : 'Sin artículos'}
                    </p>
                  ) : (
                    group.items.map(item => (
                      <div key={item.id} data-item-id={item.id}>
                        <ItemRow
                          item={item}
                          onToggle={() => handleToggle(item)}
                          onEdit={() => { setEditItem(item); setAddSheet(true) }}
                          onDelete={() => handleDeleteItem(item.id)}
                        />
                      </div>
                    ))
                  )}
                </GroupSection>
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

            <DragOverlay dropAnimation={null}>
              {draggingItem ? (
                <div className={styles.dragOverlay}>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor" style={{ color: 'var(--border)', flexShrink: 0 }}>
                    <circle cx="4.5" cy="2.5"  r="1.2"/>
                    <circle cx="9.5" cy="2.5"  r="1.2"/>
                    <circle cx="4.5" cy="7"    r="1.2"/>
                    <circle cx="9.5" cy="7"    r="1.2"/>
                    <circle cx="4.5" cy="11.5" r="1.2"/>
                    <circle cx="9.5" cy="11.5" r="1.2"/>
                  </svg>
                  <span className={styles.dragOverlayName}>{draggingItem.name}</span>
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
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
      {/* Confirm clear dialog */}
      {showClearConfirm && (
        <div className={styles.confirmOverlay} onClick={() => setShowClearConfirm(false)}>
          <div className={styles.confirmDialog} onClick={e => e.stopPropagation()}>
            <p className={styles.confirmMessage}>¿Estás seguro que querés desleccionar todos los ítems?</p>
            <div className={styles.confirmActions}>
              <button className={styles.confirmCancelBtn} onClick={() => setShowClearConfirm(false)}>
                Cancelar
              </button>
              <button
                className={styles.confirmClearBtn}
                onClick={() => { handleUncheckAll(); setShowClearConfirm(false) }}
              >
                Limpiar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Share toast */}
      {shareToast && <div className={styles.toast}>📋 Enlace copiado</div>}
    </div>
  )
}

// Droppable category section
function GroupSection({ group, isActive, isDraggingAny, onActivate, onDelete, children }) {
  const droppableId = group.id ?? '__none__'
  const { setNodeRef, isOver } = useDroppable({ id: droppableId })

  return (
    <div
      ref={setNodeRef}
      className={[
        styles.group,
        isActive && styles.groupActive,
        isOver && isDraggingAny && styles.groupOver,
      ].filter(Boolean).join(' ')}
    >
      {group.name && (
        <div
          className={styles.groupHeader}
          onClick={() => onActivate(group.id)}
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
                onClick={(e) => { e.stopPropagation(); onDelete(group.id) }}
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
      {children}
    </div>
  )
}

export function groupByCategory(items, categories, showChecked) {
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

  // Always include uncategorized when categories exist (needed as a drop target)
  if (categories.length > 0 && !groups['__none__']) {
    groups['__none__'] = { id: null, name: 'Sin categoría', color: '#8a7a6a', items: [] }
    order.push('__none__')
  }

  all.forEach(item => {
    const cid = item.category_id && groups[item.category_id] ? item.category_id : '__none__'
    if (!groups[cid]) {
      groups[cid] = { id: null, name: 'Sin categoría', color: '#8a7a6a', items: [] }
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
