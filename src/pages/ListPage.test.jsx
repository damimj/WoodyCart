import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import ListPage from './ListPage'
import * as supabaseLib from '../lib/supabase'

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => ({ shareId: 'test-share-id' }),
  }
})

vi.mock('../lib/supabase', () => {
  const fakeChannel = {
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn().mockReturnThis(),
  }
  return {
    supabase: {
      channel: vi.fn(() => fakeChannel),
      removeChannel: vi.fn(),
    },
    getList: vi.fn(),
    getItems: vi.fn(),
    getCategories: vi.fn(),
    addItem: vi.fn(),
    updateItem: vi.fn(),
    deleteItem: vi.fn(),
    addCategory: vi.fn(),
    deleteCategory: vi.fn(),
    uploadImage: vi.fn(),
    updateList: vi.fn(),
  }
})

vi.mock('@dnd-kit/core', () => ({
  DndContext: ({ children }) => <>{children}</>,
  DragOverlay: () => null,
  PointerSensor: class {},
  TouchSensor: class {},
  useSensor: vi.fn(() => null),
  useSensors: vi.fn(() => []),
  useDroppable: vi.fn(() => ({ setNodeRef: vi.fn(), isOver: false })),
  useDraggable: vi.fn(() => ({
    attributes: {},
    listeners: {},
    setNodeRef: vi.fn(),
    setActivatorNodeRef: vi.fn(),
    isDragging: false,
  })),
}))

// ── Helpers ───────────────────────────────────────────────────────────────────

const LIST = { id: 'list-1', name: 'Mi lista', share_id: 'test-share-id' }

const ITEMS = [
  { id: 'i1', name: 'Leche', checked: true,  category_id: null, position: 0, quantity: null, note: null, image_url: null },
  { id: 'i2', name: 'Pan',   checked: false, category_id: null, position: 1, quantity: null, note: null, image_url: null },
]

function setup({ list = LIST, items = [], categories = [] } = {}) {
  supabaseLib.getList.mockResolvedValue(list)
  supabaseLib.getItems.mockResolvedValue(items)
  supabaseLib.getCategories.mockResolvedValue(categories)
  supabaseLib.updateItem.mockResolvedValue()
  return render(<MemoryRouter><ListPage /></MemoryRouter>)
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('ListPage', () => {
  beforeEach(() => vi.clearAllMocks())

  // ── Loading & error states ────────────────────────────────────────────────

  test('shows spinner while loading', () => {
    supabaseLib.getList.mockReturnValue(new Promise(() => {}))
    supabaseLib.getItems.mockResolvedValue([])
    supabaseLib.getCategories.mockResolvedValue([])
    render(<MemoryRouter><ListPage /></MemoryRouter>)
    expect(document.querySelector('[class*="spinner"]')).toBeInTheDocument()
  })

  test('shows not-found message when list does not exist', async () => {
    supabaseLib.getList.mockResolvedValue(null)
    render(<MemoryRouter><ListPage /></MemoryRouter>)
    expect(await screen.findByText(/lista no encontrada/i)).toBeInTheDocument()
  })

  test('shows not-found message when getList throws', async () => {
    supabaseLib.getList.mockRejectedValue(new Error('network'))
    render(<MemoryRouter><ListPage /></MemoryRouter>)
    expect(await screen.findByText(/lista no encontrada/i)).toBeInTheDocument()
  })

  test('"Ir al inicio" button in not-found navigates home', async () => {
    supabaseLib.getList.mockResolvedValue(null)
    render(<MemoryRouter><ListPage /></MemoryRouter>)
    await screen.findByText(/lista no encontrada/i)
    fireEvent.click(screen.getByRole('button', { name: /ir al inicio/i }))
    expect(mockNavigate).toHaveBeenCalledWith('/')
  })

  // ── Header ────────────────────────────────────────────────────────────────

  test('renders list name in header after loading', async () => {
    setup()
    expect(await screen.findByText('Mi lista')).toBeInTheDocument()
  })

  test('logo button navigates home', async () => {
    setup()
    await screen.findByText('Mi lista')
    fireEvent.click(screen.getByRole('button', { name: /ir al inicio/i }))
    expect(mockNavigate).toHaveBeenCalledWith('/')
  })

  // ── Progress bar ──────────────────────────────────────────────────────────

  test('shows progress counter when items exist', async () => {
    setup({ items: ITEMS }) // 1 checked out of 2
    await screen.findByText('Mi lista')
    expect(screen.getByText('1/2')).toBeInTheDocument()
  })

  test('does not show progress bar when no items', async () => {
    setup({ items: [] })
    await screen.findByText('Mi lista')
    expect(screen.queryByText(/\d+\/\d+/)).not.toBeInTheDocument()
  })

  // ── Items ─────────────────────────────────────────────────────────────────

  test('renders item names after loading', async () => {
    setup({ items: ITEMS })
    expect(await screen.findByText('Leche')).toBeInTheDocument()
    expect(await screen.findByText('Pan')).toBeInTheDocument()
  })

  test('calls updateItem when item toggle is clicked', async () => {
    setup({ items: ITEMS })
    await screen.findByText('Pan')
    // Pan is unchecked → clicking marks it
    fireEvent.click(screen.getAllByRole('button', { name: /marcar/i })[0])
    await waitFor(() => {
      expect(supabaseLib.updateItem).toHaveBeenCalledWith('i2', { checked: true })
    })
  })

  test('calls deleteItem when item delete button is clicked', async () => {
    supabaseLib.deleteItem.mockResolvedValue()
    setup({ items: [ITEMS[0]] })
    await screen.findByText('Leche')
    fireEvent.click(screen.getByRole('button', { name: /borrar/i }))
    await waitFor(() => {
      expect(supabaseLib.deleteItem).toHaveBeenCalledWith('i1')
    })
  })

  // ── Confirm clear dialog ──────────────────────────────────────────────────

  test('confirm dialog is not visible initially', async () => {
    setup()
    await screen.findByText('Mi lista')
    expect(screen.queryByText(/desseleccionar/i)).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /limpiar/i })).not.toBeInTheDocument()
  })

  test('opens confirm dialog when broom button is clicked', async () => {
    setup()
    await screen.findByText('Mi lista')
    fireEvent.click(screen.getByTitle('Limpiar lista'))
    expect(screen.getByText(/desleccionar todos los ítems/i)).toBeInTheDocument()
  })

  test('Cancelar button closes the confirm dialog', async () => {
    setup()
    await screen.findByText('Mi lista')
    fireEvent.click(screen.getByTitle('Limpiar lista'))
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(screen.queryByText(/desleccionar todos los ítems/i)).not.toBeInTheDocument()
  })

  test('clicking the overlay backdrop closes the confirm dialog', async () => {
    setup()
    await screen.findByText('Mi lista')
    fireEvent.click(screen.getByTitle('Limpiar lista'))
    expect(screen.getByText(/desleccionar todos los ítems/i)).toBeInTheDocument()
    fireEvent.click(document.querySelector('[class*="confirmOverlay"]'))
    expect(screen.queryByText(/desleccionar todos los ítems/i)).not.toBeInTheDocument()
  })

  test('Limpiar calls updateItem for each checked item', async () => {
    setup({ items: ITEMS }) // i1 is checked, i2 is not
    await screen.findByText('Mi lista')
    fireEvent.click(screen.getByTitle('Limpiar lista'))
    fireEvent.click(screen.getByRole('button', { name: 'Limpiar' }))
    await waitFor(() => {
      expect(supabaseLib.updateItem).toHaveBeenCalledWith('i1', { checked: false })
    })
    expect(supabaseLib.updateItem).not.toHaveBeenCalledWith('i2', expect.anything())
  })

  test('Limpiar does not call updateItem when no items are checked', async () => {
    const uncheckedItems = ITEMS.map(i => ({ ...i, checked: false }))
    setup({ items: uncheckedItems })
    await screen.findByText('Mi lista')
    fireEvent.click(screen.getByTitle('Limpiar lista'))
    fireEvent.click(screen.getByRole('button', { name: 'Limpiar' }))
    await waitFor(() => {
      expect(supabaseLib.updateItem).not.toHaveBeenCalled()
    })
  })

  test('Limpiar closes the dialog after action', async () => {
    setup({ items: ITEMS })
    await screen.findByText('Mi lista')
    fireEvent.click(screen.getByTitle('Limpiar lista'))
    fireEvent.click(screen.getByRole('button', { name: 'Limpiar' }))
    expect(screen.queryByText(/desleccionar todos los ítems/i)).not.toBeInTheDocument()
  })

  // ── Category pills ────────────────────────────────────────────────────────

  test('shows default category suggestions when no categories exist', async () => {
    setup()
    await screen.findByText('Mi lista')
    expect(screen.getByText(/\+ Verdulería/i)).toBeInTheDocument()
  })

  test('+ button in pill bar shows inline input for new category', async () => {
    setup()
    await screen.findByText('Mi lista')
    fireEvent.click(screen.getByRole('button', { name: /nueva categoría/i }))
    expect(screen.getByPlaceholderText(/nombre/i)).toBeInTheDocument()
  })

  test('Escape key dismisses inline category input', async () => {
    setup()
    await screen.findByText('Mi lista')
    fireEvent.click(screen.getByRole('button', { name: /nueva categoría/i }))
    fireEvent.keyDown(screen.getByPlaceholderText(/nombre/i), { key: 'Escape' })
    expect(screen.queryByPlaceholderText(/nombre/i)).not.toBeInTheDocument()
  })

  // ── Share ─────────────────────────────────────────────────────────────────

  test('share button copies URL when navigator.share is unavailable', async () => {
    const writeText = vi.fn().mockResolvedValue()
    Object.defineProperty(navigator, 'share', { value: undefined, writable: true })
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, writable: true })
    setup()
    await screen.findByText('Mi lista')
    fireEvent.click(screen.getByTitle('Compartir'))
    await waitFor(() => expect(writeText).toHaveBeenCalled())
    expect(await screen.findByText(/enlace copiado/i)).toBeInTheDocument()
  })

  test('share button calls navigator.share when available', async () => {
    const share = vi.fn().mockResolvedValue()
    Object.defineProperty(navigator, 'share', { value: share, writable: true })
    setup()
    await screen.findByText('Mi lista')
    fireEvent.click(screen.getByTitle('Compartir'))
    await waitFor(() => expect(share).toHaveBeenCalled())
  })
})
