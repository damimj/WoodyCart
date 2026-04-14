import { render, screen, fireEvent, waitFor } from '@testing-library/react'
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

const renderHome = () => render(<MemoryRouter><Home /></MemoryRouter>)

describe('Home', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('shows loading spinner initially', () => {
    // getAllLists never resolves so the spinner stays visible
    supabase.getAllLists.mockReturnValue(new Promise(() => {}))
    renderHome()
    expect(document.querySelector('[class*="spinner"]')).toBeInTheDocument()
  })

  test('shows empty state when no lists exist', async () => {
    supabase.getAllLists.mockResolvedValue([])
    renderHome()
    expect(await screen.findByText(/sin listas todavía/i)).toBeInTheDocument()
  })

  test('renders list cards when lists are returned', async () => {
    supabase.getAllLists.mockResolvedValue([
      { id: '1', name: 'Supermercado', share_id: 'abc', created_at: '2024-01-01T00:00:00Z', archived: false },
      { id: '2', name: 'Farmacia',     share_id: 'def', created_at: '2024-01-02T00:00:00Z', archived: false },
    ])
    renderHome()
    expect(await screen.findByText('Supermercado')).toBeInTheDocument()
    expect(await screen.findByText('Farmacia')).toBeInTheDocument()
  })

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
    expect(screen.getByRole('button', { name: /crear/i })).toBeDisabled()
  })

  test('create button is enabled when input has text', async () => {
    supabase.getAllLists.mockResolvedValue([])
    renderHome()
    await screen.findByText(/sin listas/i)
    fireEvent.click(screen.getByRole('button', { name: /nueva lista/i }))
    fireEvent.change(screen.getByPlaceholderText(/supermercado semanal/i), {
      target: { value: 'Mi lista' },
    })
    expect(screen.getByRole('button', { name: /crear/i })).not.toBeDisabled()
  })

  test('creates list and navigates to it on form submit', async () => {
    supabase.getAllLists.mockResolvedValue([])
    supabase.createList.mockResolvedValue({
      id: '99', name: 'Mi lista', share_id: 'xyz', created_at: new Date().toISOString(),
    })
    renderHome()
    await screen.findByText(/sin listas/i)
    fireEvent.click(screen.getByRole('button', { name: /nueva lista/i }))
    fireEvent.change(screen.getByPlaceholderText(/supermercado semanal/i), {
      target: { value: 'Mi lista' },
    })
    fireEvent.click(screen.getByRole('button', { name: /crear/i }))
    await waitFor(() => {
      expect(supabase.createList).toHaveBeenCalledWith('Mi lista')
      expect(mockNavigate).toHaveBeenCalledWith('/lista/xyz')
    })
  })

  test('deletes a list after confirmation', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    supabase.getAllLists.mockResolvedValue([
      { id: '1', name: 'Para borrar', share_id: 'del', created_at: '2024-01-01T00:00:00Z', archived: false },
    ])
    supabase.deleteList.mockResolvedValue()
    renderHome()
    await screen.findByText('Para borrar')

    // Open menu
    fireEvent.click(screen.getByRole('button', { name: /opciones/i }))
    fireEvent.click(screen.getByText(/eliminar/i))

    await waitFor(() => {
      expect(supabase.deleteList).toHaveBeenCalledWith('1')
    })
    expect(screen.queryByText('Para borrar')).not.toBeInTheDocument()
  })

  test('does not delete list when confirmation is cancelled', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    supabase.getAllLists.mockResolvedValue([
      { id: '1', name: 'No borrar', share_id: 'x', created_at: '2024-01-01T00:00:00Z', archived: false },
    ])
    renderHome()
    await screen.findByText('No borrar')
    fireEvent.click(screen.getByRole('button', { name: /opciones/i }))
    fireEvent.click(screen.getByText(/eliminar/i))
    expect(supabase.deleteList).not.toHaveBeenCalled()
    expect(screen.getByText('No borrar')).toBeInTheDocument()
  })

  test('renames a list inline', async () => {
    supabase.getAllLists.mockResolvedValue([
      { id: '1', name: 'Viejo nombre', share_id: 'r', created_at: '2024-01-01T00:00:00Z', archived: false },
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

  test('copies share URL and shows toast when sharing', async () => {
    const writeText = vi.fn().mockResolvedValue()
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      writable: true,
    })
    supabase.getAllLists.mockResolvedValue([
      { id: '1', name: 'Mi lista', share_id: 'share-abc', created_at: '2024-01-01T00:00:00Z', archived: false },
    ])
    renderHome()
    await screen.findByText('Mi lista')
    fireEvent.click(screen.getByRole('button', { name: /opciones/i }))
    fireEvent.click(screen.getByText(/compartir/i))

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith(expect.stringContaining('share-abc'))
    })
    expect(await screen.findByText(/enlace copiado/i)).toBeInTheDocument()
  })
})
