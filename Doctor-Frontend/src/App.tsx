import { Routes, Route, Navigate } from 'react-router-dom'
import LoginPage from './pages/LoginPage'
import QueuePage from './pages/QueuePage'
import SessionDetailPage from './pages/SessionDetailPage'
import SessionSummaryPage from './pages/SessionSummaryPage'
import ProtectedRoute from './components/ProtectedRoute'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/queue" element={<ProtectedRoute><QueuePage /></ProtectedRoute>} />
      <Route path="/session/:id" element={<ProtectedRoute><SessionDetailPage /></ProtectedRoute>} />
      <Route path="/session/:id/summary" element={<ProtectedRoute><SessionSummaryPage /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/queue" replace />} />
    </Routes>
  )
}
