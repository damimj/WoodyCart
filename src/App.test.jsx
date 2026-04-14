import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import App from './App'

// Mock pages so App routing tests don't need the full component trees
vi.mock('./pages/Home', () => ({ default: () => <div>home page</div> }))
vi.mock('./pages/ListPage', () => ({ default: () => <div>list page</div> }))

describe('App routing', () => {
  test('renders Home at /', () => {
    render(<MemoryRouter initialEntries={['/']}><App /></MemoryRouter>)
    expect(screen.getByText('home page')).toBeInTheDocument()
  })

  test('renders ListPage at /lista/:shareId', () => {
    render(<MemoryRouter initialEntries={['/lista/abc-123']}><App /></MemoryRouter>)
    expect(screen.getByText('list page')).toBeInTheDocument()
  })

  test('does not render ListPage on /', () => {
    render(<MemoryRouter initialEntries={['/']}><App /></MemoryRouter>)
    expect(screen.queryByText('list page')).not.toBeInTheDocument()
  })
})
