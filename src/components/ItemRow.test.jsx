import { render, screen, fireEvent } from '@testing-library/react'
import ItemRow from './ItemRow'

// @dnd-kit requires a real DOM drag environment; mock it for unit tests
vi.mock('@dnd-kit/core', () => ({
  useDraggable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: () => {},
    setActivatorNodeRef: () => {},
    isDragging: false,
  }),
}))

const baseItem = {
  id: 'item-1',
  name: 'Leche entera',
  quantity: '2 litros',
  note: 'Marca La Serenísima',
  checked: false,
  image_url: null,
  category_id: null,
}

describe('ItemRow', () => {
  // ── Rendering ────────────────────────────────────────────────────────────

  test('renders item name', () => {
    render(<ItemRow item={baseItem} onToggle={vi.fn()} onEdit={vi.fn()} onDelete={vi.fn()} />)
    expect(screen.getByText('Leche entera')).toBeInTheDocument()
  })

  test('renders quantity and note', () => {
    render(<ItemRow item={baseItem} onToggle={vi.fn()} onEdit={vi.fn()} onDelete={vi.fn()} />)
    expect(screen.getByText('2 litros')).toBeInTheDocument()
    expect(screen.getByText('Marca La Serenísima')).toBeInTheDocument()
  })

  test('does not render quantity when not provided', () => {
    render(<ItemRow item={{ ...baseItem, quantity: null }} onToggle={vi.fn()} onEdit={vi.fn()} onDelete={vi.fn()} />)
    expect(screen.queryByText('2 litros')).not.toBeInTheDocument()
  })

  test('does not render note when not provided', () => {
    render(<ItemRow item={{ ...baseItem, note: null }} onToggle={vi.fn()} onEdit={vi.fn()} onDelete={vi.fn()} />)
    expect(screen.queryByText('Marca La Serenísima')).not.toBeInTheDocument()
  })

  test('shows thumbnail when image_url is present', () => {
    const item = { ...baseItem, image_url: 'https://example.com/img.jpg' }
    render(<ItemRow item={item} onToggle={vi.fn()} onEdit={vi.fn()} onDelete={vi.fn()} />)
    expect(screen.getByRole('img', { name: 'Leche entera' })).toHaveAttribute('src', 'https://example.com/img.jpg')
  })

  test('does not render thumbnail when no image_url', () => {
    render(<ItemRow item={baseItem} onToggle={vi.fn()} onEdit={vi.fn()} onDelete={vi.fn()} />)
    expect(screen.queryByRole('img', { name: 'Leche entera' })).not.toBeInTheDocument()
  })

  // ── Checkbox / toggle ────────────────────────────────────────────────────

  test('calls onToggle when checkbox is clicked', () => {
    const onToggle = vi.fn()
    render(<ItemRow item={baseItem} onToggle={onToggle} onEdit={vi.fn()} onDelete={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /marcar/i }))
    expect(onToggle).toHaveBeenCalledTimes(1)
  })

  test('aria label is "Desmarcar" when item is checked', () => {
    render(<ItemRow item={{ ...baseItem, checked: true }} onToggle={vi.fn()} onEdit={vi.fn()} onDelete={vi.fn()} />)
    expect(screen.getByRole('button', { name: /desmarcar/i })).toBeInTheDocument()
  })

  test('aria label is "Marcar" when item is unchecked', () => {
    render(<ItemRow item={baseItem} onToggle={vi.fn()} onEdit={vi.fn()} onDelete={vi.fn()} />)
    expect(screen.getByRole('button', { name: /marcar/i })).toBeInTheDocument()
  })

  // ── Edit & Delete ─────────────────────────────────────────────────────────

  test('calls onEdit when item content area is clicked', () => {
    const onEdit = vi.fn()
    render(<ItemRow item={baseItem} onToggle={vi.fn()} onEdit={onEdit} onDelete={vi.fn()} />)
    fireEvent.click(screen.getByText('Leche entera'))
    expect(onEdit).toHaveBeenCalledTimes(1)
  })

  test('calls onDelete when delete button is clicked', () => {
    const onDelete = vi.fn()
    render(<ItemRow item={baseItem} onToggle={vi.fn()} onEdit={vi.fn()} onDelete={onDelete} />)
    fireEvent.click(screen.getByRole('button', { name: /borrar/i }))
    expect(onDelete).toHaveBeenCalledTimes(1)
  })

  // ── Drag handle ───────────────────────────────────────────────────────────

  test('drag handle button is present', () => {
    render(<ItemRow item={baseItem} onToggle={vi.fn()} onEdit={vi.fn()} onDelete={vi.fn()} />)
    expect(screen.getByRole('button', { name: /arrastrar/i })).toBeInTheDocument()
  })

  test('drag handle click does not trigger onEdit', () => {
    const onEdit = vi.fn()
    render(<ItemRow item={baseItem} onToggle={vi.fn()} onEdit={onEdit} onDelete={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /arrastrar/i }))
    expect(onEdit).not.toHaveBeenCalled()
  })

  // ── Swipe gesture ─────────────────────────────────────────────────────────

  test('right-to-left swipe (>60px) reveals swipe action buttons', () => {
    const { container } = render(<ItemRow item={baseItem} onToggle={vi.fn()} onEdit={vi.fn()} onDelete={vi.fn()} />)
    const row = container.querySelector('.row')
    fireEvent.touchStart(row, { touches: [{ clientX: 300 }] })
    fireEvent.touchEnd(row, { changedTouches: [{ clientX: 200 }] }) // dx = 100 > 60
    expect(container.querySelector('.swipeActions')).toBeInTheDocument()
  })

  test('small swipe (<60px) does not trigger swipe state', () => {
    const { container } = render(<ItemRow item={baseItem} onToggle={vi.fn()} onEdit={vi.fn()} onDelete={vi.fn()} />)
    const row = container.querySelector('.row')
    fireEvent.touchStart(row, { touches: [{ clientX: 300 }] })
    fireEvent.touchEnd(row, { changedTouches: [{ clientX: 260 }] }) // dx = 40 < 60
    expect(container.querySelector('.swipeActions')).not.toBeInTheDocument()
  })

  test('swipe edit button calls onEdit and hides swipe actions', () => {
    const onEdit = vi.fn()
    const { container } = render(<ItemRow item={baseItem} onToggle={vi.fn()} onEdit={onEdit} onDelete={vi.fn()} />)
    const row = container.querySelector('.row')
    fireEvent.touchStart(row, { touches: [{ clientX: 300 }] })
    fireEvent.touchEnd(row, { changedTouches: [{ clientX: 200 }] })
    fireEvent.click(container.querySelector('.editAction'))
    expect(onEdit).toHaveBeenCalledTimes(1)
    expect(container.querySelector('.swipeActions')).not.toBeInTheDocument()
  })

  test('swipe delete button calls onDelete and hides swipe actions', () => {
    const onDelete = vi.fn()
    const { container } = render(<ItemRow item={baseItem} onToggle={vi.fn()} onEdit={vi.fn()} onDelete={onDelete} />)
    const row = container.querySelector('.row')
    fireEvent.touchStart(row, { touches: [{ clientX: 300 }] })
    fireEvent.touchEnd(row, { changedTouches: [{ clientX: 200 }] })
    fireEvent.click(container.querySelector('.deleteAction'))
    expect(onDelete).toHaveBeenCalledTimes(1)
    expect(container.querySelector('.swipeActions')).not.toBeInTheDocument()
  })

  test('left-to-right swipe (>20px) resets swipe state', () => {
    const { container } = render(<ItemRow item={baseItem} onToggle={vi.fn()} onEdit={vi.fn()} onDelete={vi.fn()} />)
    const row = container.querySelector('.row')
    // Reveal swipe actions
    fireEvent.touchStart(row, { touches: [{ clientX: 300 }] })
    fireEvent.touchEnd(row, { changedTouches: [{ clientX: 200 }] })
    expect(container.querySelector('.swipeActions')).toBeInTheDocument()
    // Swipe back
    fireEvent.touchStart(row, { touches: [{ clientX: 100 }] })
    fireEvent.touchEnd(row, { changedTouches: [{ clientX: 130 }] }) // dx = -30 < -20
    expect(container.querySelector('.swipeActions')).not.toBeInTheDocument()
  })

  test('touchStart with no prior state is safe', () => {
    // startX is null; touchEnd before touchStart should not throw
    const { container } = render(<ItemRow item={baseItem} onToggle={vi.fn()} onEdit={vi.fn()} onDelete={vi.fn()} />)
    const row = container.querySelector('.row')
    // Touch end without touch start — startX is null, handler returns early
    expect(() => {
      fireEvent.touchEnd(row, { changedTouches: [{ clientX: 200 }] })
    }).not.toThrow()
  })
})
