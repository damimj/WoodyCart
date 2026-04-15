import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getAllLists, createList, updateList, deleteList } from '../lib/supabase'
import styles from './Home.module.css'

const LIST_ICONS = [
  { id: 'cart',     label: 'Carrito de compras' },
  { id: 'house',    label: 'Casa' },
  { id: 'hospital', label: 'Salud' },
  { id: 'lipstick', label: 'Maquillaje' },
  { id: 'carrot',   label: 'Verdulería' },
]

export default function Home() {
  const [lists, setLists] = useState([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [newIcon, setNewIcon] = useState(null)
  const [menuId, setMenuId] = useState(null)
  const [renaming, setRenaming] = useState(null)
  const [toast, setToast] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    load()
  }, [])

  // Close menu on outside click
  useEffect(() => {
    if (!menuId) return
    function closeMenu() { setMenuId(null) }
    document.addEventListener('click', closeMenu)
    return () => document.removeEventListener('click', closeMenu)
  }, [menuId])

  // Auto-dismiss toast
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 2500)
    return () => clearTimeout(t)
  }, [toast])

  async function load() {
    try {
      const data = await getAllLists()
      setLists(data || [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  async function handleCreate(e) {
    e.preventDefault()
    if (!newName.trim()) return
    try {
      const list = await createList(newName.trim(), newIcon)
      setLists(prev => [list, ...prev])
      setNewName('')
      setNewIcon(null)
      setCreating(false)
      navigate(`/lista/${list.share_id}`)
    } catch (e) { console.error(e) }
  }

  async function handleDelete(id) {
    if (!confirm('¿Eliminar esta lista? Esta acción no se puede deshacer.')) return
    setMenuId(null)
    setLists(prev => prev.filter(l => l.id !== id))
    try {
      await deleteList(id)
    } catch (e) {
      console.error('Error al eliminar:', e)
      load() // reload on error to restore state
    }
  }

  async function handleRename(list, name) {
    if (!name.trim()) return
    try {
      await updateList(list.id, { name: name.trim() })
      setLists(prev => prev.map(l => l.id === list.id ? { ...l, name: name.trim() } : l))
    } catch (e) {
      console.error('Error al renombrar:', e)
    } finally {
      setRenaming(null)
    }
  }

  function handleShare(list) {
    setMenuId(null)
    const url = `${window.location.origin}/lista/${list.share_id}`
    navigator.clipboard.writeText(url).then(() => {
      setToast('Enlace copiado')
    }).catch(() => {
      // Fallback for browsers that block clipboard
      prompt('Copia este enlace:', url)
    })
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <div className={styles.logoWrap}>
            <img src="/logo_new.png" alt="" className={styles.logoIcon} aria-hidden="true" />
            <h1 className={styles.logo}>WoodyCart</h1>
          </div>
          <button className={styles.addBtn} onClick={() => setCreating(true)} aria-label="Nueva lista">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 5v14M5 12h14"/>
            </svg>
          </button>
        </div>
      </header>

      <main className={styles.main}>
        {loading ? (
          <div className={styles.loading}><span className={styles.spinner}/></div>
        ) : (
          <>
            {lists.length === 0 && !creating && (
              <div className={styles.empty}>
                <div className={styles.emptyIcon}>🛒</div>
                <p className={styles.emptyTitle}>Sin listas todavía</p>
                <p className={styles.emptySubtitle}>Crea tu primera lista de compra</p>
                <button className={styles.emptyBtn} onClick={() => setCreating(true)}>
                  Crear lista
                </button>
              </div>
            )}

            {lists.length > 0 && (
              <section>
                <p className={styles.sectionLabel}>Mis listas</p>
                <div className={styles.grid}>
                  {lists.map((list, i) => (
                    <ListCard
                      key={list.id}
                      list={list}
                      index={i}
                      menuOpen={menuId === list.id}
                      onOpen={() => navigate(`/lista/${list.share_id}`)}
                      onMenu={(e) => { e.stopPropagation(); setMenuId(menuId === list.id ? null : list.id) }}
                      onDelete={() => handleDelete(list.id)}
                      onRename={() => { setRenaming(list); setMenuId(null) }}
                      onShare={() => handleShare(list)}
                      renaming={renaming?.id === list.id}
                      onRenameSubmit={(name) => handleRename(list, name)}
                      onRenameCancel={() => setRenaming(null)}
                    />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </main>

      {/* New List Modal */}
      {creating && (
        <div className={styles.overlay} onClick={() => { setCreating(false); setNewIcon(null) }}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <h2 className={styles.modalTitle}>Nueva lista</h2>
            <form onSubmit={handleCreate}>
              <input
                autoFocus
                placeholder="Ej: Supermercado semanal"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                className={styles.modalInput}
                maxLength={60}
              />
              <div className={styles.iconPicker}>
                <button
                  type="button"
                  className={`${styles.iconPickerBtn} ${newIcon === null ? styles.iconPickerBtnActive : ''}`}
                  onClick={() => setNewIcon(null)}
                  title="Sin ícono"
                  aria-label="Sin ícono"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <line x1="5" y1="12" x2="19" y2="12"/>
                  </svg>
                </button>
                {LIST_ICONS.map(icon => (
                  <button
                    key={icon.id}
                    type="button"
                    className={`${styles.iconPickerBtn} ${newIcon === icon.id ? styles.iconPickerBtnActive : ''}`}
                    onClick={() => setNewIcon(icon.id)}
                    title={icon.label}
                    aria-label={icon.label}
                  >
                    <ListIcon id={icon.id} size={20} />
                  </button>
                ))}
              </div>
              <div className={styles.modalActions}>
                <button type="button" className={styles.cancelBtn} onClick={() => { setCreating(false); setNewIcon(null) }}>
                  Cancelar
                </button>
                <button type="submit" className={styles.createBtn} disabled={!newName.trim()}>
                  Crear
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {toast && <div className={styles.toast}>{toast}</div>}
    </div>
  )
}

function ListCard({ list, index, menuOpen, onOpen, onMenu, onDelete, onRename, onShare, renaming, onRenameSubmit, onRenameCancel }) {
  const [renameVal, setRenameVal] = useState(list.name)
  const date = new Date(list.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })

  // Sync rename input when switching to rename mode
  useEffect(() => {
    if (renaming) setRenameVal(list.name)
  }, [renaming, list.name])

  if (renaming) {
    return (
      <div className={styles.card} style={{ animationDelay: `${index * 0.05}s` }}>
        <form onSubmit={e => { e.preventDefault(); onRenameSubmit(renameVal) }}>
          <input
            autoFocus
            value={renameVal}
            onChange={e => setRenameVal(e.target.value)}
            className={styles.renameInput}
            onKeyDown={e => e.key === 'Escape' && onRenameCancel()}
          />
          <div className={styles.renameActions}>
            <button type="button" onClick={onRenameCancel} className={styles.renameCancelBtn}>Cancelar</button>
            <button type="submit" className={styles.renameSaveBtn}>Guardar</button>
          </div>
        </form>
      </div>
    )
  }

  return (
    <div
      className={`${styles.card} fade-in`}
      style={{ animationDelay: `${index * 0.05}s`, zIndex: menuOpen ? 30 : undefined }}
      onClick={onOpen}
    >
      <div className={styles.cardTop}>
        {list.icon && <ListIcon id={list.icon} size={28} className={styles.cardIcon} />}
        <button className={styles.menuBtn} onClick={onMenu} aria-label="Opciones">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/>
          </svg>
        </button>
        {menuOpen && (
          <div className={styles.menu}>
            <button onClick={e => { e.stopPropagation(); onShare() }}>🔗 Compartir enlace</button>
            <button onClick={e => { e.stopPropagation(); onRename() }}>✏️ Renombrar</button>
            <button onClick={e => { e.stopPropagation(); onDelete() }} className={styles.menuDelete}>🗑️ Eliminar</button>
          </div>
        )}
      </div>
      <h3 className={styles.cardName}>{list.name}</h3>
      <p className={styles.cardDate}>{date}</p>
    </div>
  )
}

function ListIcon({ id, size = 24, className }) {
  const p = {
    width: size, height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: '2',
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    className,
  }
  switch (id) {
    case 'cart':
      return <svg {...p}><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 001.98 1.61h9.72a2 2 0 001.98-1.67L23 6H6"/></svg>
    case 'house':
      return <svg {...p}><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
    case 'hospital':
      return <svg {...p}><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M12 8v8M8 12h8"/></svg>
    case 'lipstick':
      return <svg {...p}><path d="M12 2l2.5 4h-5L12 2z"/><rect x="9.5" y="6" width="5" height="9" rx="0.5"/><rect x="8" y="15" width="8" height="7" rx="1"/></svg>
    case 'carrot':
      return <svg {...p}><path d="M2.27 21.7s9.87-3.5 12.73-6.36a4.5 4.5 0 00-6.36-6.37C5.77 11.84 2.27 21.7 2.27 21.7z"/><path d="M8.64 14l-2.05-2.04M15.34 15l-2.46-2.46"/><path d="M22 9s-1.33-2-3.5-2C16.86 7 15 9 15 9s1.33 2 3.5 2S22 9 22 9z"/><path d="M15 2s-2 1.33-2 3.5S15 9 15 9s2-1.33 2-3.5S15 2 15 2z"/></svg>
    default:
      return null
  }
}
