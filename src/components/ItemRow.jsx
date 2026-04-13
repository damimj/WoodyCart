import { useState } from 'react'
import styles from './ItemRow.module.css'

export default function ItemRow({ item, onToggle, onEdit, onDelete }) {
  const [swiped, setSwiped] = useState(false)
  const [startX, setStartX] = useState(null)

  function handleTouchStart(e) {
    setStartX(e.touches[0].clientX)
  }
  function handleTouchEnd(e) {
    if (startX === null) return
    const dx = startX - e.changedTouches[0].clientX
    if (dx > 60) setSwiped(true)
    else if (dx < -20) setSwiped(false)
    setStartX(null)
  }

  return (
    <div className={styles.wrapper}>
      <div
        className={`${styles.row} ${item.checked ? styles.checked : ''} ${swiped ? styles.swiped : ''}`}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <button className={styles.checkbox} onClick={onToggle} aria-label={item.checked ? 'Desmarcar' : 'Marcar'}>
          <span className={`${styles.check} ${item.checked ? styles.checkActive : ''}`}>
            {item.checked && (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <path d="M20 6L9 17l-5-5"/>
              </svg>
            )}
          </span>
        </button>

        {item.image_url && (
          <img src={item.image_url} alt={item.name} className={styles.thumbnail} />
        )}

        <div className={styles.content} onClick={onEdit}>
          <span className={styles.name}>{item.name}</span>
          {item.quantity && <span className={styles.qty}>{item.quantity}</span>}
          {item.note && <span className={styles.note}>{item.note}</span>}
        </div>
      </div>

      {/* Swipe actions */}
      {swiped && (
        <div className={styles.swipeActions}>
          <button className={styles.editAction} onClick={() => { setSwiped(false); onEdit() }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </button>
          <button className={styles.deleteAction} onClick={() => { setSwiped(false); onDelete() }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/>
              <path d="M10 11v6M14 11v6M9 6V4h6v2"/>
            </svg>
          </button>
        </div>
      )}
    </div>
  )
}
