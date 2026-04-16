import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Home from './Home'
import * as supabase from '../lib/supabase'

// Mock navigation
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal()
  return { ...actual, useNavigate: () => mockNavigate }
})

// Mock supabase helpers
vi.mock('../lib/supabase', () => ({
  getAllLists: vi.fn(),
  createList: vi.fn(),
  updateList: vi.fn(),
  deleteList: vi.fn(),
}))

const LIST_STUB = (overrides = {}) => ({
  id: '1',
  name: 'Supermercado',
  share_id: 'abc',
  created_at: '2024-01-01T00:00:00Z',
  archived: false,
  icon: null,
  ...overrides,
})

const renderHome = () => render(<MemoryRouter><Home /></MemoryRouter>)

describe('Home', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ── Loading & empty state ──────────────────────────────────────────────────

  test('shows loading spinner initially', () => {
    supabase.getAllLists.mockReturnValue(new Promise(() => {}))
    renderHome()
    expect(document.querySelector('[class*="spinner"]')).toBeInTheDocument()
  })

  test('shows empty state when no lists exist', async () => {
    supabase.getAllLists.mockResolvedValue([])
    renderHome()
    expect(await screen.findByText(/sin listas todavía/i)).toBeInTheDocument()
  })

  test('shows "Crear lista" CTA in empty state', async () => {
    supabase.getAllLists.mockResolvedValue([])
    renderHome()
    await screen.findByText(/sin listas todavía/i)
    expect(screen.getByRole('button', { name: /crear lista/i })).toBeInTheDocument()
  })

  // ── List cards ─────────────────────────────────────────────────────────────

  test('renders list cards when lists are returned', async () => {
    supabase.getAllLists.mockResolvedValue([
      LIST_STUB({ id: '1', name: 'Supermercado', share_id: 'abc' }),
      LIST_STUB({ id: '2', name: 'Farmacia', share_id: 'def' }),
    ])
    renderHome()
    expect(await screen.findByText('Supermercado')).toBeInTheDocument()
    expect(await screen.findByText('Farmacia')).toBeInTheDocument()
  })

  test('shows formatted creation date on card', async () => {
    supabase.getAllLists.mockResolvedValue([
      LIST_STUB({ created_at: '2024-03-15T12:00:00Z' }),
    ])
    renderHome()
    await screen.findByText('Supermercado')
    // Date rendered as "15 mar" in es-ES locale
    expect(screen.getByText(/15 mar/i)).toBeInTheDocument()
  })

  test('renders SVG icon on card when list.icon is set', async () => {
    supabase.getAllLists.mockResolvedValue([
      LIST_STUB({ icon: 'cart' }),
    ])
    const { container } = renderHome()
    await screen.findByText('Supermercado')
    // ListIcon renders an SVG when icon is known
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  test('does not render SVG icon on card when list.icon is null', async () => {
    supabase.getAllLists.mockResolvedValue([
      LIST_STUB({ icon: null }),
    ])
    const { container } = renderHome()
    await screen.findByText('Supermercado')
    // The header logo is outside the card; no SVG inside a card
    const card = screen.getByText('Supermercado').closest('[class*="card"]')
    expect(card.querySelector('svg')).not.toBeInTheDocument()
  })

  test('clicking a card navigates to the list', async () => {
    supabase.getAllLists.mockResolvedValue([LIST_STUB({ share_id: 'xyz' })])
    renderHome()
    await screen.findByText('Supermercado')
    fireEvent.click(screen.getByText('Supermercado').closest('[class*="card"]'))
    expect(mockNavigate).toHaveBeenCalledWith('/lista/xyz')
  })

  // ── Create modal ───────────────────────────────────────────────────────────

  test('opens new list modal when + button is clicked', async () => {
    supabase.getAllLists.mockResolvedValue([])
    renderHome()
    await screen.findByText(/sin listas/i)
    fireEvent.click(screen.getByRole('button', { name: /nueva lista/i }))
    expect(screen.getByPlaceholderText(/supermercado semanal/i)).toBeInTheDocument()
  })

  test('create button is disabled when input is empty', async () => {
    supabase.getAllLists.mockResolvedValue([])
    renderHome()
    await screen.findByText(/sin listas/i)
    fireEvent.click(screen.getByRole('button', { name: /nueva lista/i }))
    expect(screen.getByRole('button', { name: /^crear$/i })).toBeDisabled()
  })

  test('create button is enabled when input has text', async () => {
    supabase.getAllLists.mockResolvedValue([])
    renderHome()
    await screen.findByText(/sin listas/i)
    fireEvent.click(screen.getByRole('button', { name: /nueva lista/i }))
    fireEvent.change(screen.getByPlaceholderText(/supermercado semanal/i), {
      target: { value: 'Mi lista' },
    })
    expect(screen.getByRole('button', { name: /^crear$/i })).not.toBeDisabled()
  })

  test('modal closes when overlay is clicked', async () => {
    supabase.getAllLists.mockResolvedValue([])
    renderHome()
    await screen.findByText(/sin listas/i)
    fireEvent.click(screen.getByRole('button', { name: /nueva lista/i }))
    expect(screen.getByPlaceholderText(/supermercado semanal/i)).toBeInTheDocument()
    // Click the overlay (the backdrop div, which is the direct parent of the modal sheet)
    fireEvent.click(document.querySelector('[class*="overlay"]'))
    expect(screen.queryByPlaceholderText(/supermercado semanal/i)).not.toBeInTheDocument()
  })

  test('modal closes when Cancelar is clicked', async () => {
    supabase.getAllLists.mockResolvedValue([])
    renderHome()
    await screen.findByText(/sin listas/i)
    fireEvent.click(screen.getByRole('button', { name: /nueva lista/i }))
    fireEvent.click(screen.getByRole('button', { name: /cancelar/i }))
    expect(screen.queryByPlaceholderText(/supermercado semanal/i)).not.toBeInTheDocument()
  })

  // ── Icon picker ────────────────────────────────────────────────────────────

  test('icon picker renders 6 buttons (none + 5 icons)', async () => {
    supabase.getAllLists.mockResolvedValue([])
    renderHome()
    await screen.findByText(/sin listas/i)
    fireEvent.click(screen.getByRole('button', { name: /nueva lista/i }))
    const picker = document.querySelector('[class*="iconPicker"]')
    const btns = within(picker).getAllByRole('button')
    expect(btns).toHaveLength(6)
  })

  test('"Sin ícono" button is active by default in icon picker', async () => {
    supabase.getAllLists.mockResolvedValue([])
    renderHome()
    await screen.findByText(/sin listas/i)
    fireEvent.click(screen.getByRole('button', { name: /nueva lista/i }))
    const noneBtn = screen.getByRole('button', { name: /sin ícono/i })
    expect(noneBtn.className).toMatch(/Active/)
  })

  test('clicking an icon button makes it active and deactivates none', async () => {
    supabase.getAllLists.mockResolvedValue([])
    renderHome()
    await screen.findByText(/sin listas/i)
    fireEvent.click(screen.getByRole('button', { name: /nueva lista/i }))
    fireEvent.click(screen.getByRole('button', { name: /carrito/i }))
    expect(screen.getByRole('button', { name: /carrito/i }).className).toMatch(/Active/)
    expect(screen.getByRole('button', { name: /sin ícono/i }).className).not.toMatch(/Active/)
  })

  test('clicking none after an icon re-selects none', async () => {
    supabase.getAllLists.mockResolvedValue([])
    renderHome()
    await screen.findByText(/sin listas/i)
    fireEvent.click(screen.getByRole('button', { name: /nueva lista/i }))
    fireEvent.click(screen.getByRole('button', { name: /carrito/i }))
    fireEvent.click(screen.getByRole('button', { name: /sin ícono/i }))
    expect(screen.getByRole('button', { name: /sin ícono/i }).className).toMatch(/Active/)
  })

  // ── Create with icon ───────────────────────────────────────────────────────

  test('creates list with null icon when no icon selected', async () => {
    supabase.getAllLists.mockResolvedValue([])
    supabase.createList.mockResolvedValue(LIST_STUB({ share_id: 'xyz', icon: null }))
    renderHome()
    await screen.findByText(/sin listas/i)
    fireEvent.click(screen.getByRole('button', { name: /nueva lista/i }))
    fireEvent.change(screen.getByPlaceholderText(/supermercado semanal/i), {
      target: { value: 'Mi lista' },
    })
    fireEvent.click(screen.getByRole('button', { name: /^crear$/i }))
    await waitFor(() => {
      expect(supabase.createList).toHaveBeenCalledWith('Mi lista', null)
    })
  })

  test('creates list with selected icon', async () => {
    supabase.getAllLists.mockResolvedValue([])
    supabase.createList.mockResolvedValue(LIST_STUB({ share_id: 'xyz', icon: 'cart' }))
    renderHome()
    await screen.findByText(/sin listas/i)
    fireEvent.click(screen.getByRole('button', { name: /nueva lista/i }))
    fireEvent.change(screen.getByPlaceholderText(/supermercado semanal/i), {
      target: { value: 'Mi lista' },
    })
    fireEvent.click(screen.getByRole('button', { name: /carrito/i }))
    fireEvent.click(screen.getByRole('button', { name: /^crear$/i }))
    await waitFor(() => {
      expect(supabase.createList).toHaveBeenCalledWith('Mi lista', 'cart')
    })
    expect(mockNavigate).toHaveBeenCalledWith('/lista/xyz')
  })

  test('icon selection resets to null after modal closes and reopens', async () => {
    supabase.getAllLists.mockResolvedValue([])
    renderHome()
    await screen.findByText(/sin listas/i)
    // Open, select icon, cancel
    fireEvent.click(screen.getByRole('button', { name: /nueva lista/i }))
    fireEvent.click(screen.getByRole('button', { name: /casa/i }))
    fireEvent.click(screen.getByRole('button', { name: /cancelar/i }))
    // Reopen: none should be active again
    fireEvent.click(screen.getByRole('button', { name: /nueva lista/i }))
    expect(screen.getByRole('button', { name: /sin ícono/i }).className).toMatch(/Active/)
  })

  // ── Rename ─────────────────────────────────────────────────────────────────

  test('renames a list inline', async () => {
    supabase.getAllLists.mockResolvedValue([
      LIST_STUB({ id: '1', name: 'Viejo nombre', share_id: 'r' }),
    ])
    supabase.updateList.mockResolvedValue()
    renderHome()
    await screen.findByText('Viejo nombre')
    fireEvent.click(screen.getByRole('button', { name: /opciones/i }))
    fireEvent.click(screen.getByText(/renombrar/i))
    const input = screen.getByDisplayValue('Viejo nombre')
    fireEvent.change(input, { target: { value: 'Nuevo nombre' } })
    fireEvent.click(screen.getByRole('button', { name: /guardar/i }))
    await waitFor(() => {
      expect(supabase.updateList).toHaveBeenCalledWith('1', { name: 'Nuevo nombre' })
    })
    expect(await screen.findByText('Nuevo nombre')).toBeInTheDocument()
  })

  test('Escape key cancels rename', async () => {
    supabase.getAllLists.mockResolvedValue([LIST_STUB({ name: 'Original' })])
    renderHome()
    await screen.findByText('Original')
    fireEvent.click(screen.getByRole('button', { name: /opciones/i }))
    fireEvent.click(screen.getByText(/renombrar/i))
    fireEvent.keyDown(screen.getByDisplayValue('Original'), { key: 'Escape' })
    expect(screen.getByText('Original')).toBeInTheDocument()
    expect(screen.queryByDisplayValue('Original')).not.toBeInTheDocument()
  })

  // ── Delete ─────────────────────────────────────────────────────────────────

  test('deletes a list after confirmation', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    supabase.getAllLists.mockResolvedValue([
      LIST_STUB({ id: '1', name: 'Para borrar', share_id: 'del' }),
    ])
    supabase.deleteList.mockResolvedValue()
    renderHome()
    await screen.findByText('Para borrar')
    fireEvent.click(screen.getByRole('button', { name: /opciones/i }))
    fireEvent.click(screen.getByText(/eliminar/i))
    await waitFor(() => {
      expect(supabase.deleteList).toHaveBeenCalledWith('1')
    })
    expect(screen.queryByText('Para borrar')).not.toBeInTheDocument()
  })

  test('does not delete list when confirmation is cancelled', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    supabase.getAllLists.mockResolvedValue([LIST_STUB({ name: 'No borrar' })])
    renderHome()
    await screen.findByText('No borrar')
    fireEvent.click(screen.getByRole('button', { name: /opciones/i }))
    fireEvent.click(screen.getByText(/eliminar/i))
    expect(supabase.deleteList).not.toHaveBeenCalled()
    expect(screen.getByText('No borrar')).toBeInTheDocument()
  })

  // ── Share ──────────────────────────────────────────────────────────────────

  test('copies share URL and shows toast', async () => {
    const writeText = vi.fn().mockResolvedValue()
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      writable: true,
    })
    supabase.getAllLists.mockResolvedValue([
      LIST_STUB({ share_id: 'share-abc' }),
    ])
    renderHome()
    await screen.findByText('Supermercado')
    fireEvent.click(screen.getByRole('button', { name: /opciones/i }))
    fireEvent.click(screen.getByText(/compartir/i))
    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith(expect.stringContaining('share-abc'))
    })
    expect(await screen.findByText(/enlace copiado/i)).toBeInTheDocument()
  })
})
