import { HashRouter, Routes, Route } from 'react-router-dom'
import Landing from './pages/Landing'
import Article from './pages/Article'
import AdminControl from './pages/AdminControl'

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/article/:id" element={<Article />} />
        <Route path="/admin-control" element={<AdminControl />} />
      </Routes>
    </HashRouter>
  )
}
