import '@testing-library/jest-dom'
import React from 'react'

// Vitest 3 uses OXC which defaults to the classic JSX runtime
// (React.createElement). Make React available globally so test files
// don't need to import it individually.
globalThis.React = React

// Suppress noisy React Router v6 future-flag warnings in test output
const originalWarn = console.warn.bind(console)
console.warn = (...args) => {
  if (typeof args[0] === 'string' && args[0].includes('React Router Future Flag Warning')) return
  originalWarn(...args)
}
