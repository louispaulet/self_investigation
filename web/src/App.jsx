import { Navigate, Route, Routes } from 'react-router-dom'
import Footer from './components/Footer'
import Navbar from './components/Navbar'
import './App.css'
import ActivityMatrixPage from './pages/ActivityMatrixPage'
import AboutPage from './pages/AboutPage'
import DeploymentsPage from './pages/DeploymentsPage'
import HomePage from './pages/HomePage'

export default function App() {
  return (
    <div className="min-h-screen pb-20">
      <Navbar />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/activity" element={<ActivityMatrixPage />} />
        <Route path="/deployments" element={<DeploymentsPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Footer />
    </div>
  )
}
