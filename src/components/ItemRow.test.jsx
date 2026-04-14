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
  test('renders item name', () => {
    render(<ItemRow item={baseItem} onToggle={vi.fn()} onEdit={vi.fn()} onDelete={vi.fn()} />)
    expect(screen.getByText('Leche entera')).toBeInTheDocument()
  })

  test('renders quantity and note', () => {
    render(<ItemRow item={baseItem} onToggle={vi.fn()} onEdit={vi.fn()} onDelete={vi.fn()} />)
    expect(screen.getByText('2 litros')).toBeInTheDocument()
    expect(screen.getByText('Marca La Serenísima')).toBeInTheDocument()
  })

  test('calls onToggle when checkbox is clicked', () => {
    const onToggle = vi.fn()
    render(<ItemRow item={baseItem} onToggle={onToggle} onEdit={vi.fn()} onDelete={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /marcar/i }))
    expect(onToggle).toHaveBeenCalledTimes(1)
  })

  test('calls onDelete when delete button is clicked', () => {
    const onDelete = vi.fn()
    render(<ItemRow item={baseItem} onToggle={vi.fn()} onEdit={vi.fn()} onDelete={onDelete} />)
    fireEvent.click(screen.getByRole('button', { name: /borrar/i }))
    expect(onDelete).toHaveBeenCalledTimes(1)
  })

  test('calls onEdit when item content is clicked', () => {
    const onEdit = vi.fn()
    render(<ItemRow item={baseItem} onToggle={vi.fn()} onEdit={onEdit} onDelete={vi.fn()} />)
    fireEvent.click(screen.getByText('Leche entera'))
    expect(onEdit).toHaveBeenCalledTimes(1)
  })

  test('shows checkmark and aria label changes when item is checked', () => {
    const checkedItem = { ...baseItem, checked: true }
    render(<ItemRow item={checkedItem} onToggle={vi.fn()} onEdit={vi.fn()} onDelete={vi.fn()} />)
    expect(screen.getByRole('button', { name: /desmarcar/i })).toBeInTheDocument()
  })

  test('shows thumbnail when image_url is present', () => {
    const itemWithImage = { ...baseItem, image_url: 'https://example.com/img.jpg' }
    render(<ItemRow item={itemWithImage} onToggle={vi.fn()} onEdit={vi.fn()} onDelete={vi.fn()} />)
    const img = screen.getByRole('img', { name: 'Leche entera' })
    expect(img).toHaveAttribute('src', 'https://example.com/img.jpg')
  })

  test('does not render thumbnail when no image_url', () => {
    render(<ItemRow item={baseItem} onToggle={vi.fn()} onEdit={vi.fn()} onDelete={vi.fn()} />)
    expect(screen.queryByRole('img', { name: 'Leche entera' })).not.toBeInTheDocument()
  })

  test('does not render quantity if not provided', () => {
    const noQty = { ...baseItem, quantity: null }
    render(<ItemRow item={noQty} onToggle={vi.fn()} onEdit={vi.fn()} onDelete={vi.fn()} />)
    expect(screen.queryByText('2 litros')).not.toBeInTheDocument()
  })

  test('drag handle button is present', () => {
    render(<ItemRow item={baseItem} onToggle={vi.fn()} onEdit={vi.fn()} onDelete={vi.fn()} />)
    expect(screen.getByRole('button', { name: /arrastrar/i })).toBeInTheDocument()
  })
})
