import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase, getList, getItems, getCategories, addItem, updateItem, deleteItem,
  addCategory, deleteCategory, uploadImage, updateList } from '../lib/supabase'
import ItemRow from '../components/ItemRow'
import AddItemSheet from '../components/AddItemSheet'
import CategorySheet from '../components/CategorySheet'
import styles from './ListPage.module.css'

const CATEGORY_COLORS = ['#c84b2f','#3a7d5a','#3a6b9e','#7a4f9e','#e8b84b','#d47a3a']

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
  const [filterCat, setFilterCat] = useState(null)
  const [shareToast, setShareToast] = useState(false)
  const [showChecked, setShowChecked] = useState(true)
  const channelRef = useRef(null)

  useEffect(() => {
    loadAll()
    return () => { channelRef.current?.unsubscribe() }
  }, [shareId])

  async function loadAll() {
    try {
      const l = await getList(shareId)
      if (!l) { setNotFound(true); return }
      setList(l)
      const [its, cats] = await Promise.all([getItems(l.id), getCategories(l.id)])
      setItems(its || [])
      setCategories(cats || [])
      subscribeRealtime(l.id)
    } catch (e) {
      setNotFound(true)
    } finally {
      setLoading(false)
    }
  }

  function subscribeRealtime(listId) {
    const channel = supabase
      .channel(`list-${listId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'items', filter: `list_id=eq.${listId}` },
        payload => {
          if (payload.eventType === 'INSERT') setItems(prev => [...prev, payload.new])
          if (payload.eventType === 'UPDATE') setItems(prev => prev.map(i => i.id === payload.new.id ? payload.new : i))
          if (payload.eventType === 'DELETE') setItems(prev => prev.filter(i => i.id !== payload.old.id))
        }
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'categories', filter: `list_id=eq.${listId}` },
        payload => {
          if (payload.eventType === 'INSERT') setCategories(prev => [...prev, payload.new])
          if (payload.eventType === 'DELETE') setCategories(prev => prev.filter(c => c.id !== payload.old.id))
        }
      )
      .subscribe()
    channelRef.current = channel
  }

  async function handleToggle(item) {
    await updateItem(item.id, { checked: !item.checked })
  }

  async function handleDeleteItem(id) {
    await deleteItem(id)
  }

  async function handleSaveItem(data) {
    if (editItem) {
      await updateItem(editItem.id, data)
    } else {
      await addItem(list.id, { ...data, checked: false, position: items.length })
    }
    setAddSheet(false)
    setEditItem(null)
  }

  async function handleAddCategory(name, color) {
    await addCategory(list.id, name, color)
  }

  async function handleDeleteCategory(id) {
    await deleteCategory(id)
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

  const grouped = groupByCategory(
    items.filter(i => (!filterCat || i.category_id === filterCat)),
    categories,
    showChecked
  )
  const checkedCount = items.filter(i => i.checked).length
  const totalCount = items.length

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
          <button className={styles.backBtn2} onClick={() => navigate('/')}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M19 12H5M12 5l-7 7 7 7"/>
            </svg>
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

        {/* Categories filter */}
        {categories.length > 0 && (
          <div className={styles.catFilter}>
            <button
              className={`${styles.catChip} ${!filterCat ? styles.catChipActive : ''}`}
              onClick={() => setFilterCat(null)}
            >Todas</button>
            {categories.map(c => (
              <button
                key={c.id}
                className={`${styles.catChip} ${filterCat === c.id ? styles.catChipActive : ''}`}
                style={filterCat === c.id ? { background: c.color, color: 'white', borderColor: c.color } : { borderColor: c.color, color: c.color }}
                onClick={() => setFilterCat(filterCat === c.id ? null : c.id)}
              >{c.name}</button>
            ))}
          </div>
        )}
      </header>

      {/* List */}
      <main className={styles.main}>
        {items.length === 0 ? (
          <div className={styles.emptyList}>
            <p className={styles.emptyListIcon}>✍️</p>
            <p className={styles.emptyListText}>Añade el primer artículo</p>
          </div>
        ) : (
          <>
            {grouped.map(group => (
              <div key={group.id || 'uncategorized'} className={styles.group}>
                {group.name && (
                  <div className={styles.groupHeader}>
                    <span className={styles.groupDot} style={{ background: group.color }} />
                    <span className={styles.groupName}>{group.name}</span>
                  </div>
                )}
                {group.items.map(item => (
                  <ItemRow
                    key={item.id}
                    item={item}
                    onToggle={() => handleToggle(item)}
                    onEdit={() => { setEditItem(item); setAddSheet(true) }}
                    onDelete={() => handleDeleteItem(item.id)}
                  />
                ))}
              </div>
            ))}

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
          categories={categories}
          listId={list.id}
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

  const catMap = {}
  categories.forEach(c => { catMap[c.id] = c })

  const groups = {}
  all.forEach(item => {
    const cid = item.category_id || '__none__'
    if (!groups[cid]) groups[cid] = { ...catMap[cid] || { id: null, name: '', color: '' }, items: [] }
    groups[cid].items.push(item)
  })

  // Sort: named categories first, uncategorized last
  return Object.values(groups).sort((a, b) => {
    if (!a.id && b.id) return 1
    if (a.id && !b.id) return -1
    return (a.name || '').localeCompare(b.name || '')
  })
}
