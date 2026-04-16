import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import AddItemSheet from './AddItemSheet'

vi.mock('../lib/supabase', () => ({
  uploadImage: vi.fn(),
}))
import * as supabaseLib from '../lib/supabase'

const renderNew = (props = {}) =>
  render(<AddItemSheet item={null} onSave={vi.fn()} onClose={vi.fn()} {...props} />)

const renderEdit = (item, props = {}) =>
  render(<AddItemSheet item={item} onSave={vi.fn()} onClose={vi.fn()} {...props} />)

const EDIT_ITEM = {
  id: 'i1',
  name: 'Leche',
  quantity: '2 litros',
  note: 'Entera',
  image_url: 'https://example.com/img.jpg',
  category_id: 'cat-1',
}

describe('AddItemSheet', () => {
  beforeEach(() => vi.clearAllMocks())

  // ── Title and submit label ─────────────────────────────────────────────────

  test('shows "Nuevo artículo" title for new item', () => {
    renderNew()
    expect(screen.getByText('Nuevo artículo')).toBeInTheDocument()
  })

  test('shows "Editar artículo" title when editing', () => {
    renderEdit(EDIT_ITEM)
    expect(screen.getByText('Editar artículo')).toBeInTheDocument()
  })

  test('submit button shows "Añadir" for new item', () => {
    renderNew()
    expect(screen.getByRole('button', { name: /^añadir$/i })).toBeInTheDocument()
  })

  test('submit button shows "Guardar" when editing', () => {
    renderEdit(EDIT_ITEM)
    expect(screen.getByRole('button', { name: /guardar/i })).toBeInTheDocument()
  })

  // ── Form validation ────────────────────────────────────────────────────────

  test('submit button is disabled when name is empty', () => {
    renderNew()
    expect(screen.getByRole('button', { name: /^añadir$/i })).toBeDisabled()
  })

  test('submit button is enabled when name has text', () => {
    renderNew()
    fireEvent.change(screen.getByPlaceholderText(/leche entera/i), {
      target: { value: 'Pan' },
    })
    expect(screen.getByRole('button', { name: /^añadir$/i })).not.toBeDisabled()
  })

  test('does not call onSave if name is empty when form is submitted', () => {
    const onSave = vi.fn()
    renderNew({ onSave })
    fireEvent.submit(screen.getByRole('button', { name: /^añadir$/i }).closest('form'))
    expect(onSave).not.toHaveBeenCalled()
  })

  // ── Pre-population when editing ────────────────────────────────────────────

  test('prepopulates name field when editing', () => {
    renderEdit(EDIT_ITEM)
    expect(screen.getByDisplayValue('Leche')).toBeInTheDocument()
  })

  test('prepopulates note field when editing', () => {
    renderEdit(EDIT_ITEM)
    expect(screen.getByDisplayValue('Entera')).toBeInTheDocument()
  })

  test('prepopulates quantity value when editing', () => {
    renderEdit(EDIT_ITEM) // quantity '2 litros' → value '2'
    expect(screen.getByDisplayValue('2')).toBeInTheDocument()
  })

  test('prepopulates unit select when editing', () => {
    renderEdit(EDIT_ITEM) // quantity '2 litros' → unit 'litros'
    expect(screen.getByDisplayValue('litros')).toBeInTheDocument()
  })

  test('shows image preview when editing item with image', () => {
    renderEdit(EDIT_ITEM)
    const img = screen.getByAltText('preview')
    expect(img).toHaveAttribute('src', 'https://example.com/img.jpg')
  })

  // ── onSave payload ─────────────────────────────────────────────────────────

  test('calls onSave with trimmed name and null image when no image', () => {
    const onSave = vi.fn()
    renderNew({ onSave })
    fireEvent.change(screen.getByPlaceholderText(/leche entera/i), {
      target: { value: '  Pan  ' },
    })
    fireEvent.click(screen.getByRole('button', { name: /^añadir$/i }))
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
      name: 'Pan',
      image_url: null,
    }))
  })

  test('calls onSave with combined quantity and unit string', () => {
    const onSave = vi.fn()
    renderNew({ onSave })
    fireEvent.change(screen.getByPlaceholderText(/leche entera/i), { target: { value: 'Leche' } })
    fireEvent.change(screen.getByPlaceholderText(/ej: 2/i), { target: { value: '3' } })
    fireEvent.change(screen.getByDisplayValue('—'), { target: { value: 'litros' } })
    fireEvent.click(screen.getByRole('button', { name: /^añadir$/i }))
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
      name: 'Leche',
      quantity: '3 litros',
    }))
  })

  test('calls onSave with quantity only (no unit)', () => {
    const onSave = vi.fn()
    renderNew({ onSave })
    fireEvent.change(screen.getByPlaceholderText(/leche entera/i), { target: { value: 'Pan' } })
    fireEvent.change(screen.getByPlaceholderText(/ej: 2/i), { target: { value: '2' } })
    // leave unit as '—' (empty)
    fireEvent.click(screen.getByRole('button', { name: /^añadir$/i }))
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
      quantity: '2',
    }))
  })

  test('calls onSave with empty quantity when both value and unit are empty', () => {
    const onSave = vi.fn()
    renderNew({ onSave })
    fireEvent.change(screen.getByPlaceholderText(/leche entera/i), { target: { value: 'Pan' } })
    fireEvent.click(screen.getByRole('button', { name: /^añadir$/i }))
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
      quantity: '',
    }))
  })

  test('preserves category_id from existing item in onSave payload', () => {
    const onSave = vi.fn()
    renderEdit(EDIT_ITEM, { onSave })
    fireEvent.change(screen.getByDisplayValue('Leche'), { target: { value: 'Leche descremada' } })
    fireEvent.click(screen.getByRole('button', { name: /guardar/i }))
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
      category_id: 'cat-1',
    }))
  })

  test('category_id is null for new item', () => {
    const onSave = vi.fn()
    renderNew({ onSave })
    fireEvent.change(screen.getByPlaceholderText(/leche entera/i), { target: { value: 'Pan' } })
    fireEvent.click(screen.getByRole('button', { name: /^añadir$/i }))
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
      category_id: null,
    }))
  })

  // ── Close behaviour ────────────────────────────────────────────────────────

  test('calls onClose when Cancelar is clicked', () => {
    const onClose = vi.fn()
    renderNew({ onClose })
    fireEvent.click(screen.getByRole('button', { name: /cancelar/i }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  test('calls onClose when overlay backdrop is clicked', () => {
    const onClose = vi.fn()
    renderNew({ onClose })
    fireEvent.click(document.querySelector('[class*="overlay"]'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  test('does not call onClose when the sheet itself is clicked', () => {
    const onClose = vi.fn()
    renderNew({ onClose })
    fireEvent.click(document.querySelector('[class*="sheet"]'))
    expect(onClose).not.toHaveBeenCalled()
  })

  // ── Image handling ─────────────────────────────────────────────────────────

  test('shows "Añadir foto" button when no image', () => {
    renderNew()
    expect(screen.getByRole('button', { name: /añadir foto/i })).toBeInTheDocument()
  })

  test('remove image button clears the preview', () => {
    renderEdit(EDIT_ITEM)
    expect(screen.getByAltText('preview')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /✕/i }))
    expect(screen.queryByAltText('preview')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /añadir foto/i })).toBeInTheDocument()
  })

  test('calls uploadImage and sets preview on file input change', async () => {
    supabaseLib.uploadImage.mockResolvedValue('https://cdn.example.com/new.jpg')
    renderNew()
    const fileInput = document.querySelector('input[type="file"]')
    const file = new File(['img'], 'photo.jpg', { type: 'image/jpeg' })
    fireEvent.change(fileInput, { target: { files: [file] } })
    await waitFor(() => {
      expect(supabaseLib.uploadImage).toHaveBeenCalledWith(file)
    })
    expect(await screen.findByAltText('preview')).toHaveAttribute('src', 'https://cdn.example.com/new.jpg')
  })

  test('image upload error shows alert', async () => {
    supabaseLib.uploadImage.mockRejectedValue(new Error('red'))
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {})
    renderNew()
    const fileInput = document.querySelector('input[type="file"]')
    const file = new File(['img'], 'photo.jpg', { type: 'image/jpeg' })
    fireEvent.change(fileInput, { target: { files: [file] } })
    await waitFor(() => expect(alertSpy).toHaveBeenCalled())
  })
})
