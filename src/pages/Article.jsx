import { useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import { articles } from '../data/articles'
import ReadingProgress from '../components/ReadingProgress'
import ArticleNav from '../components/ArticleNav'
import Footer from '../components/Footer'

export default function Article() {
  const { id } = useParams()
  const navigate = useNavigate()

  const article = articles.find(a => a.id === id)

  // Scroll to top on mount / article change
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [id])

  if (!article) {
    return (
      <div style={{ padding: '120px 40px', textAlign: 'center' }}>
        <p style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
          Article not found.{' '}
          <button onClick={() => navigate('/')} style={{ color: 'var(--accent-gold)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
            ← Back to Vault
          </button>
        </p>
      </div>
    )
  }

  // Strip the H1 from content since we show it in the hero
  const bodyContent = article.content.replace(/^#[^\n]*\n/, '')

  return (
    <div className="article-page">
      <ReadingProgress />

      {/* Back button */}
      <button className="back-btn" onClick={() => navigate('/')}>
        ← Back to Vault
      </button>

      {/* Hero */}
      <header className="article-hero">
        {article.image ? (
          <div
            className="article-hero-bg article-hero-bg--image"
            style={{ backgroundImage: `url(${article.image})` }}
          />
        ) : (
          <div
            className="article-hero-bg"
            style={{ background: article.themeGradient }}
          />
        )}
        <div className="article-hero-overlay" />
        <div className="article-hero-content">
          <span className="article-hero-category">{article.category}</span>
          <h1 className="article-hero-title">{article.title}</h1>
          <p className="article-hero-subtitle">{article.subtitle}</p>
        </div>
      </header>

      {/* Meta strip */}
      <div className="article-meta-strip">
        <span>📖 {article.wordCount.toLocaleString()} words</span>
        <span className="meta-dot">·</span>
        <span>{article.readTime}</span>
        <span className="meta-dot">·</span>
        <span>{article.publishDate}</span>
        <span className="meta-dot">·</span>
        <span>{article.category}</span>
      </div>

      {/* Article body */}
      <article className="article-body">
        <ReactMarkdown>{bodyContent}</ReactMarkdown>
      </article>

      {/* Prev / Next navigation */}
      <ArticleNav currentId={id} />

      {/* Footer */}
      <footer className="article-footer">
        <span className="article-footer-brand">
          <span className="brand-hash">#</span>
          <span className="brand-text">tr</span>
          <span className="brand-num">33</span>
          <span className="brand-text">via</span>
        </span>
        <p className="article-footer-tagline">The vault of mind-blowing facts.</p>
      </footer>
    </div>
  )
}
