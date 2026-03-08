import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { articles } from '../data/articles'

export default function ArticleNav({ currentId }) {
  const navigate = useNavigate()
  const [visible, setVisible] = useState(false)
  const ref = useRef(null)

  const currentIndex = articles.findIndex(a => a.id === currentId)
  const prev = currentIndex > 0 ? articles[currentIndex - 1] : null
  const next = currentIndex < articles.length - 1 ? articles[currentIndex + 1] : null

  useEffect(() => {
    const onScroll = () => {
      const scrolled = window.scrollY + window.innerHeight
      const total = document.documentElement.scrollHeight
      if (scrolled / total >= 0.88) setVisible(true)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  if (!prev && !next) return null

  return (
    <div ref={ref} className={`article-nav${visible ? ' visible' : ''}`}>
      <p className="article-nav-label">Continue Reading</p>
      <div className="article-nav-grid">
        {prev && (
          <div
            className="article-nav-card nav-prev"
            onClick={() => { window.scrollTo(0, 0); navigate(`/article/${prev.id}`) }}
          >
            <div className="nav-card-thumb">
              <div className="gradient-thumb" style={{ background: prev.themeGradient }} />
            </div>
            <div className="nav-card-info">
              <p className="nav-card-dir">← Previous</p>
              <p className="nav-card-title">{prev.title}</p>
            </div>
          </div>
        )}
        {next && (
          <div
            className="article-nav-card nav-next"
            onClick={() => { window.scrollTo(0, 0); navigate(`/article/${next.id}`) }}
          >
            <div className="nav-card-thumb">
              <div className="gradient-thumb" style={{ background: next.themeGradient }} />
            </div>
            <div className="nav-card-info">
              <p className="nav-card-dir">Next →</p>
              <p className="nav-card-title">{next.title}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
