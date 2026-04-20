// Construye la URL de compartir para una lista.
// Extraído de Home.jsx (handleShare) y ListPage.jsx (handleShare).
export function getShareUrl(shareId) {
  return `${window.location.origin}/lista/${shareId}`
}

// Devuelve la siguiente posición libre: max(position) + 1, o 0 si no hay ítems.
// La lógica equivalente en ListPage.jsx usa items.length como posición al crear.
export function getNextPosition(items) {
  if (items.length === 0) return 0
  return Math.max(...items.map(i => i.position)) + 1
}

// Cuenta ítems tachados y total.
// Extraído de ListPage.jsx (checkedCount / totalCount, líneas 269-270).
export function countChecked(items) {
  return {
    checked: items.filter(i => i.checked).length,
    total: items.length,
  }
}

// Valida que un nombre de ítem/categoría no sea vacío ni solo espacios.
// Refleja el guard `if (!name.trim()) return` presente en AddItemSheet y CategorySheet.
export function isValidItemName(name) {
  return typeof name === 'string' && name.trim().length > 0
}

// Valida formato de color hexadecimal (#rgb o #rrggbb).
export function isValidHexColor(hex) {
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(hex)
}
