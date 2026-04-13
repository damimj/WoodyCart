import { useState } from 'react'
import styles from './Sheet.module.css'

export default function CategorySheet({ categories, colors, onAdd, onDelete, onClose }) {
  const [name, setName] = useState('')
  const [color, setColor] = useState(colors[0])
  const [saving, setSaving] = useState(false)

  async function handleAdd(e) {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    try {
      await onAdd(name.trim(), color)
      setName('')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.sheet} onClick={e => e.stopPropagation()}>
        <div className={styles.handle} />
        <h2 className={styles.sheetTitle}>Categorías</h2>

        {/* Existing */}
        {categories.length > 0 && (
          <div className={styles.catList}>
            {categories.map(c => (
              <div key={c.id} className={styles.catItem}>
                <span className={styles.catDot} style={{ background: c.color }} />
                <span className={styles.catItemName}>{c.name}</span>
                <button
                  className={styles.catDeleteBtn}
                  onClick={() => onDelete(c.id)}
                  aria-label="Eliminar categoría"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 6L6 18M6 6l12 12"/>
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Add new */}
        <form onSubmit={handleAdd} className={styles.form}>
          <div className={styles.field}>
            <label className={styles.label}>Nueva categoría</label>
            <input
              placeholder="Ej: Lácteos, Verduras…"
              value={name}
              onChange={e => setName(e.target.value)}
              maxLength={40}
              autoFocus
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Color</label>
            <div className={styles.colorPicker}>
              {colors.map(c => (
                <button
                  key={c}
                  type="button"
                  className={`${styles.colorBtn} ${color === c ? styles.colorBtnActive : ''}`}
                  style={{ background: c }}
                  onClick={() => setColor(c)}
                  aria-label={c}
                />
              ))}
            </div>
          </div>
          <div className={styles.actions}>
            <button type="button" className={styles.cancelBtn} onClick={onClose}>Cerrar</button>
            <button type="submit" className={styles.saveBtn} disabled={!name.trim() || saving}>
              Añadir
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
