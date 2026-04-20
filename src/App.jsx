import { Routes, Route } from 'react-router-dom'
import { SpeedInsights } from '@vercel/speed-insights/react'
import Home from './pages/Home'
import ListPage from './pages/ListPage'

export default function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/lista/:shareId" element={<ListPage />} />
      </Routes>
      <SpeedInsights />
    </>
  )
}
