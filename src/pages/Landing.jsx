import { useState, useCallback } from 'react'
import { articles } from '../data/articles'
import Navbar from '../components/Navbar'
import SpotlightHero from '../components/SpotlightHero'
import ArticleCard from '../components/ArticleCard'
import Footer from '../components/Footer'

const ALL_CATEGORIES = ['All', 'AI & Infrastructure', 'Companies & Corporations', 'Science & Technology']

export default function Landing() {
  const [activeId, setActiveId] = useState(articles[0]?.id ?? '')
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState('All')

  const handleActiveChange = useCallback((id) => setActiveId(id), [])

  const filtered = articles.filter(a => {
    const q = search.toLowerCase()
    const matchSearch = !q ||
      a.title.toLowerCase().includes(q) ||
      a.subtitle.toLowerCase().includes(q) ||
      a.keywords.some(k => k.toLowerCase().includes(q)) ||
      a.description.toLowerCase().includes(q)
    const matchCat = activeCategory === 'All' || a.category === activeCategory
    return matchSearch && matchCat
  })

  const scrollToVault = () => {
    document.getElementById('vault')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div>
      <Navbar onSearchClick={scrollToVault} />

      <SpotlightHero
        activeId={activeId}
        onActiveChange={handleActiveChange}
      />

      {/* ── Vault Section ── */}
      <section className="vault-section" id="vault">
        <div className="vault-header">
          <span className="vault-label">— The Vault —</span>

          {/* Search */}
          <div className="search-wrap">
            <span className="search-icon-inner">⌕</span>
            <input
              className="search-input"
              type="text"
              placeholder="Search articles, topics, keywords…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          {/* Category filters */}
          <div className="filter-pills">
            {ALL_CATEGORIES.map(cat => (
              <button
                key={cat}
                className={`pill${activeCategory === cat ? ' active' : ''}`}
                onClick={() => setActiveCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Card grid */}
        <div className="card-grid">
          {filtered.length > 0 ? (
            filtered.map(article => (
              <ArticleCard
                key={article.id}
                article={article}
                isSpotlightActive={article.id === activeId}
              />
            ))
          ) : (
            <div className="empty-state">
              <p>No articles found for "{search}"</p>
            </div>
          )}
        </div>
      </section>

      <Footer />
    </div>
  )
}
