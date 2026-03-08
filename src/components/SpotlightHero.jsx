import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { articles } from '../data/articles'

const SITE_HERO_IMAGE = '/images/trivia-vault-hero.png'

export default function SpotlightHero({ activeId, onActiveChange }) {
  const navigate = useNavigate()
  const [visible, setVisible] = useState(false)
  const intervalRef = useRef(null)
  const hoverRef = useRef(false)

  const currentIndex = articles.findIndex(a => a.id === activeId)
  const current = articles[currentIndex] ?? articles[0]

  // Fade-in info panel on article change
  useEffect(() => {
    setVisible(false)
    const t = setTimeout(() => setVisible(true), 80)
    return () => clearTimeout(t)
  }, [activeId])

  // Auto-rotate every 5s, pause on hover
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      if (!hoverRef.current) {
        const next = (currentIndex + 1) % articles.length
        onActiveChange(articles[next].id)
      }
    }, 5000)
    return () => clearInterval(intervalRef.current)
  }, [currentIndex, onActiveChange])

  const handleMouseEnter = () => { hoverRef.current = true }
  const handleMouseLeave = () => { hoverRef.current = false }

  const padIndex = n => String(n + 1).padStart(2, '0')

  return (
    <section
      className="spotlight"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Site hero image — melts into dark background */}
      <div
        className="spotlight-hero-img"
        style={{ backgroundImage: `url(${SITE_HERO_IMAGE})` }}
      />
      {/* Dark gradient melt overlay */}
      <div className="spotlight-hero-melt" />

      {/* Subtle article-themed colour tint that shifts on change */}
      <div
        className="spotlight-bg"
        style={{ background: current.themeGradient }}
      />

      {/* Main content */}
      <div className="spotlight-content">
        {/* Left — article cover card */}
        <div className="spotlight-visual">
          <div className="spotlight-image-card">
            {current.image ? (
              <img
                src={current.image}
                alt={current.title}
                className="spotlight-article-img"
              />
            ) : (
              <div
                className="gradient-thumb"
                style={{ background: current.themeGradient }}
              />
            )}
            <span className="spotlight-num">{padIndex(currentIndex)}</span>
          </div>
        </div>

        {/* Right — article info */}
        <div className={`spotlight-info${visible ? ' visible' : ''}`}>
          <span className="spotlight-category">{current.category}</span>
          <h1 className="spotlight-title">{current.title}</h1>
          <p className="spotlight-subtitle">{current.subtitle}</p>
          <p className="spotlight-desc">{current.description}</p>
          <div className="spotlight-meta">
            <span className="spotlight-readtime">⏱ {current.readTime}</span>
            <button
              className="spotlight-cta"
              onClick={() => navigate(`/article/${current.id}`)}
            >
              Read Article →
            </button>
          </div>
        </div>
      </div>

    </section>
  )
}
