import { useState, useRef } from 'react'
import { uploadImage } from '../lib/supabase'
import styles from './Sheet.module.css'

const UNITS = ['unidades', 'litros', 'ml', 'kilos', 'gramos', 'paquetes', 'latas', 'botellas', 'docenas']

function parseQuantity(raw) {
  if (!raw) return { value: '', unit: '' }
  const m = raw.match(/^\s*([\d.,]+)\s*(.*)$/)
  if (!m) return { value: '', unit: raw.trim() }
  const unit = m[2].trim()
  return { value: m[1], unit: UNITS.includes(unit) ? unit : '' }
}

export default function AddItemSheet({ item, onSave, onClose }) {
  const initial = parseQuantity(item?.quantity)
  const [name, setName] = useState(item?.name || '')
  const [qtyValue, setQtyValue] = useState(initial.value)
  const [unit, setUnit] = useState(initial.unit)
  const [note, setNote] = useState(item?.note || '')
  const [imageUrl, setImageUrl] = useState(item?.image_url || '')
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef()

  async function handleImageChange(e) {
    const file = e.target.files[0]
    if (!file) return
    setUploading(true)
    try {
      const url = await uploadImage(file)
      setImageUrl(url)
    } catch (err) {
      alert('Error al subir imagen: ' + err.message)
    } finally {
      setUploading(false)
    }
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (!name.trim()) return
    const quantity = [qtyValue.trim(), unit].filter(Boolean).join(' ')
    onSave({
      name: name.trim(),
      quantity,
      note: note.trim(),
      category_id: item?.category_id ?? null,
      image_url: imageUrl || null,
    })
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.sheet} onClick={e => e.stopPropagation()}>
        <div className={styles.handle} />
        <h2 className={styles.sheetTitle}>{item ? 'Editar artículo' : 'Nuevo artículo'}</h2>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <label className={styles.label}>Artículo *</label>
            <input
              autoFocus
              placeholder="Ej: Leche entera"
              value={name}
              onChange={e => setName(e.target.value)}
              maxLength={80}
            />
          </div>

          <div className={styles.row2}>
            <div className={styles.field}>
              <label className={styles.label}>Cantidad</label>
              <input
                inputMode="decimal"
                placeholder="Ej: 2"
                value={qtyValue}
                onChange={e => setQtyValue(e.target.value)}
                maxLength={10}
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Unidades</label>
              <select
                className={styles.select}
                value={unit}
                onChange={e => setUnit(e.target.value)}
              >
                <option value="">—</option>
                {UNITS.map(u => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Nota</label>
            <input
              placeholder="Ej: Marca preferida, sin lactosa…"
              value={note}
              onChange={e => setNote(e.target.value)}
              maxLength={120}
            />
          </div>

          {/* Image */}
          <div className={styles.field}>
            <label className={styles.label}>Imagen (opcional)</label>
            <div className={styles.imageArea}>
              {imageUrl ? (
                <div className={styles.imagePreview}>
                  <img src={imageUrl} alt="preview" className={styles.previewImg} />
                  <button type="button" className={styles.removeImg} onClick={() => setImageUrl('')}>✕</button>
                </div>
              ) : (
                <button
                  type="button"
                  className={styles.uploadBtn}
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? (
                    <span className={styles.spinner} />
                  ) : (
                    <>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <rect x="3" y="3" width="18" height="18" rx="3"/>
                        <circle cx="8.5" cy="8.5" r="1.5"/>
                        <path d="M21 15l-5-5L5 21"/>
                      </svg>
                      <span>Añadir foto</span>
                    </>
                  )}
                </button>
              )}
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                style={{ display: 'none' }}
              />
            </div>
          </div>

          <div className={styles.actions}>
            <button type="button" className={styles.cancelBtn} onClick={onClose}>Cancelar</button>
            <button type="submit" className={styles.saveBtn} disabled={!name.trim()}>
              {item ? 'Guardar' : 'Añadir'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
