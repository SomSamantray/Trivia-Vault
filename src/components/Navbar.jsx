import { useNavigate } from 'react-router-dom'
import { articles } from '../data/articles'

export default function Navbar({ onSearchClick }) {
  const navigate = useNavigate()

  return (
    <nav className="navbar">
      <button className="navbar-brand" onClick={() => navigate('/')}>
        <span className="brand-hash">#</span>
        <span className="brand-text">tr</span>
        <span className="brand-num">33</span>
        <span className="brand-text">via</span>
      </button>

      <div className="navbar-right">
        <span className="article-count">{articles.length} article{articles.length !== 1 ? 's' : ''}</span>
        <button className="search-btn" onClick={onSearchClick} title="Search articles">
          ⌕
        </button>
      </div>
    </nav>
  )
}
