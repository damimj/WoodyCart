/**
 * CategorySheet no llama a Supabase directamente: recibe todo por props.
 * No se necesita mock de supabase en estos tests.
 */
import { render, screen, fireEvent, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import CategorySheet from './CategorySheet'

const COLORS = ['#c84b2f', '#3a7d5a', '#3a6b9e', '#7a4f9e', '#e8b84b', '#d47a3a']

function renderSheet(props = {}) {
  const handlers = {
    categories: [],
    colors: COLORS,
    onAdd: vi.fn().mockResolvedValue(undefined),
    onDelete: vi.fn(),
    onClose: vi.fn(),
    ...props,
  }
  render(<CategorySheet {...handlers} />)
  return handlers
}

function getNameInput() {
  return screen.getByPlaceholderText(/lácteos/i)
}

function getSubmitBtn() {
  return screen.getByRole('button', { name: /^añadir$/i })
}

describe('CategorySheet', () => {
  beforeEach(() => vi.clearAllMocks())

  // ── Validaciones de nombre ────────────────────────────────────────────────

  it('deshabilita el botón Añadir cuando el nombre está vacío', () => {
    renderSheet()
    expect(getSubmitBtn()).toBeDisabled()
  })

  it('deshabilita el botón Añadir con nombre de solo espacios', () => {
    renderSheet()
    fireEvent.change(getNameInput(), { target: { value: '   ' } })
    expect(getSubmitBtn()).toBeDisabled()
  })

  it('habilita el botón Añadir al escribir un nombre válido', () => {
    renderSheet()
    fireEvent.change(getNameInput(), { target: { value: 'Lácteos' } })
    expect(getSubmitBtn()).toBeEnabled()
  })

  it('respeta maxLength de 40 en el input de nombre', () => {
    renderSheet()
    expect(getNameInput()).toHaveAttribute('maxLength', '40')
  })

  // ── Color por defecto ─────────────────────────────────────────────────────

  it('usa el primer color del array como default si no se elige otro', async () => {
    const onAdd = vi.fn().mockResolvedValue(undefined)
    renderSheet({ onAdd })
    fireEvent.change(getNameInput(), { target: { value: 'Verduras' } })
    await act(async () => {
      fireEvent.submit(getSubmitBtn().closest('form'))
    })
    expect(onAdd).toHaveBeenCalledWith('Verduras', COLORS[0])
  })

  // ── Selector de color ─────────────────────────────────────────────────────

  it('renderiza un botón por cada color del array', () => {
    renderSheet()
    COLORS.forEach(c => {
      expect(screen.getByRole('button', { name: c })).toBeInTheDocument()
    })
  })

  it('seleccionar un color lo pasa correctamente a onAdd al hacer submit', async () => {
    const onAdd = vi.fn().mockResolvedValue(undefined)
    renderSheet({ onAdd })
    fireEvent.change(getNameInput(), { target: { value: 'Carnes' } })
    // Seleccionar el segundo color
    fireEvent.click(screen.getByRole('button', { name: COLORS[1] }))
    await act(async () => {
      fireEvent.submit(getSubmitBtn().closest('form'))
    })
    expect(onAdd).toHaveBeenCalledWith('Carnes', COLORS[1])
  })

  it('el botón del color activo tiene la clase colorBtnActive', () => {
    renderSheet()
    const firstColorBtn = screen.getByRole('button', { name: COLORS[0] })
    expect(firstColorBtn.className).toMatch(/colorBtnActive/)
  })

  it('cambiar el color activo aplica la clase colorBtnActive al nuevo botón', () => {
    renderSheet()
    fireEvent.click(screen.getByRole('button', { name: COLORS[2] }))
    expect(screen.getByRole('button', { name: COLORS[2] }).className).toMatch(/colorBtnActive/)
    expect(screen.getByRole('button', { name: COLORS[0] }).className).not.toMatch(/colorBtnActive/)
  })

  // ── Submit limpia el input ─────────────────────────────────────────────────

  it('limpia el input de nombre después de un submit exitoso', async () => {
    renderSheet()
    fireEvent.change(getNameInput(), { target: { value: 'Frutas' } })
    await act(async () => {
      fireEvent.submit(getSubmitBtn().closest('form'))
    })
    expect(getNameInput()).toHaveValue('')
  })

  // ── Categorías existentes ─────────────────────────────────────────────────

  it('renderiza las categorías existentes con su nombre', () => {
    renderSheet({
      categories: [
        { id: '1', name: 'Verdulería', color: '#3a7d5a' },
        { id: '2', name: 'Carnicería', color: '#c84b2f' },
      ],
    })
    expect(screen.getByText('Verdulería')).toBeInTheDocument()
    expect(screen.getByText('Carnicería')).toBeInTheDocument()
  })

  it('click en eliminar categoría llama a onDelete con el id correcto', () => {
    const onDelete = vi.fn()
    renderSheet({
      categories: [{ id: 'cat-42', name: 'Bebidas', color: '#3a6b9e' }],
      onDelete,
    })
    fireEvent.click(screen.getByRole('button', { name: /eliminar categoría/i }))
    expect(onDelete).toHaveBeenCalledWith('cat-42')
  })

  // ── Cierre ─────────────────────────────────────────────────────────────────

  it('click en Cerrar llama a onClose', () => {
    const onClose = vi.fn()
    renderSheet({ onClose })
    fireEvent.click(screen.getByRole('button', { name: /cerrar/i }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('click en el overlay llama a onClose', () => {
    const onClose = vi.fn()
    renderSheet({ onClose })
    fireEvent.click(document.querySelector('[class*="overlay"]'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
