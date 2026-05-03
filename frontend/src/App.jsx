import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import CreateInterview from './pages/CreateInterview'
import InterviewPage from './pages/InterviewPage'
import InterviewDetail from './pages/InterviewDetail'
import Stats from './pages/Stats'
import Agents from './pages/Agents'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/create" element={<CreateInterview />} />
        <Route path="/interview/:token" element={<InterviewPage />} />
        <Route path="/detail/:candidateId" element={<InterviewDetail />} />
        <Route path="/stats" element={<Stats />} />
        <Route path="/agents" element={<Agents />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
