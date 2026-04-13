import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getAllLists, createList, updateList, deleteList } from '../lib/supabase'
import styles from './Home.module.css'

const EMOJIS = ['🛒','🏠','💊','🔧','🌿','🎁','📦','🧹','🐾','✏️']

export default function Home() {
  const [lists, setLists] = useState([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [showArchived, setShowArchived] = useState(false)
  const [menuId, setMenuId] = useState(null)
  const [renaming, setRenaming] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    load()
  }, [])

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
      const list = await createList(newName.trim())
      setLists(prev => [list, ...prev])
      setNewName('')
      setCreating(false)
      navigate(`/lista/${list.share_id}`)
    } catch (e) { console.error(e) }
  }

  async function handleArchive(list) {
    await updateList(list.id, { archived: !list.archived })
    setLists(prev => prev.map(l => l.id === list.id ? { ...l, archived: !l.archived } : l))
    setMenuId(null)
  }

  async function handleDelete(id) {
    if (!confirm('¿Eliminar esta lista?')) return
    await deleteList(id)
    setLists(prev => prev.filter(l => l.id !== id))
    setMenuId(null)
  }

  async function handleRename(list, name) {
    if (!name.trim()) return
    await updateList(list.id, { name: name.trim() })
    setLists(prev => prev.map(l => l.id === list.id ? { ...l, name: name.trim() } : l))
    setRenaming(null)
  }

  const active = lists.filter(l => !l.archived)
  const archived = lists.filter(l => l.archived)

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <div className={styles.logoWrap}>
              <img src="/favicon.svg" alt="" className={styles.logoIcon} aria-hidden="true" />
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
            {active.length === 0 && !creating && (
              <div className={styles.empty}>
                <div className={styles.emptyIcon}>🛒</div>
                <p className={styles.emptyTitle}>Sin listas todavía</p>
                <p className={styles.emptySubtitle}>Crea tu primera lista de compra</p>
                <button className={styles.emptyBtn} onClick={() => setCreating(true)}>
                  Crear lista
                </button>
              </div>
            )}

            {active.length > 0 && (
              <section>
                <p className={styles.sectionLabel}>Activas</p>
                <div className={styles.grid}>
                  {active.map((list, i) => (
                    <ListCard
                      key={list.id}
                      list={list}
                      index={i}
                      menuOpen={menuId === list.id}
                      onOpen={() => navigate(`/lista/${list.share_id}`)}
                      onMenu={(e) => { e.stopPropagation(); setMenuId(menuId === list.id ? null : list.id) }}
                      onArchive={() => handleArchive(list)}
                      onDelete={() => handleDelete(list.id)}
                      onRename={() => { setRenaming(list); setMenuId(null) }}
                      renaming={renaming?.id === list.id}
                      onRenameSubmit={(name) => handleRename(list, name)}
                      onRenameCancel={() => setRenaming(null)}
                    />
                  ))}
                </div>
              </section>
            )}

            {archived.length > 0 && (
              <section className={styles.archivedSection}>
                <button className={styles.archivedToggle} onClick={() => setShowArchived(!showArchived)}>
                  <span className={styles.sectionLabel}>Archivadas ({archived.length})</span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                    style={{ transform: showArchived ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
                    <path d="M6 9l6 6 6-6"/>
                  </svg>
                </button>
                {showArchived && (
                  <div className={styles.grid}>
                    {archived.map((list, i) => (
                      <ListCard
                        key={list.id}
                        list={list}
                        index={i}
                        menuOpen={menuId === list.id}
                        onOpen={() => navigate(`/lista/${list.share_id}`)}
                        onMenu={(e) => { e.stopPropagation(); setMenuId(menuId === list.id ? null : list.id) }}
                        onArchive={() => handleArchive(list)}
                        onDelete={() => handleDelete(list.id)}
                        onRename={() => { setRenaming(list); setMenuId(null) }}
                        renaming={renaming?.id === list.id}
                        onRenameSubmit={(name) => handleRename(list, name)}
                        onRenameCancel={() => setRenaming(null)}
                        archived
                      />
                    ))}
                  </div>
                )}
              </section>
            )}
          </>
        )}
      </main>

      {/* New List Modal */}
      {creating && (
        <div className={styles.overlay} onClick={() => setCreating(false)}>
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
              <div className={styles.modalActions}>
                <button type="button" className={styles.cancelBtn} onClick={() => setCreating(false)}>
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

      {/* Close menu on outside click */}
      {menuId && <div className={styles.menuBackdrop} onClick={() => setMenuId(null)} />}
    </div>
  )
}

function ListCard({ list, index, menuOpen, onOpen, onMenu, onArchive, onDelete, onRename, renaming, onRenameSubmit, onRenameCancel, archived }) {
  const [renameVal, setRenameVal] = useState(list.name)
  const emoji = EMOJIS[list.id?.charCodeAt(0) % EMOJIS.length] || '🛒'
  const date = new Date(list.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })

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
      className={`${styles.card} ${archived ? styles.cardArchived : ''} fade-in`}
      style={{ animationDelay: `${index * 0.05}s` }}
      onClick={onOpen}
    >
      <div className={styles.cardTop}>
        <span className={styles.cardEmoji}>{emoji}</span>
        <button className={styles.menuBtn} onClick={onMenu} aria-label="Opciones">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/>
          </svg>
        </button>
        {menuOpen && (
          <div className={styles.menu}>
            <button onClick={e => { e.stopPropagation(); onRename() }}>✏️ Renombrar</button>
            <button onClick={e => { e.stopPropagation(); onArchive() }}>
              {archived ? '📤 Desarchivar' : '📥 Archivar'}
            </button>
            <button onClick={e => { e.stopPropagation(); onDelete() }} className={styles.menuDelete}>🗑️ Eliminar</button>
          </div>
        )}
      </div>
      <h3 className={styles.cardName}>{list.name}</h3>
      <p className={styles.cardDate}>{date}</p>
    </div>
  )
}
