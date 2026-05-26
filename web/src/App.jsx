import { Navigate, Route, Routes } from 'react-router-dom'
import Footer from './components/Footer'
import './App.css'
import AboutPage from './pages/AboutPage'
import HomePage from './pages/HomePage'

export default function App() {
  return (
    <div className="min-h-screen pb-20">
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Footer />
    </div>
  )
}
