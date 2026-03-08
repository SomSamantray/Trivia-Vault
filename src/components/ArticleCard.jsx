import { useNavigate } from 'react-router-dom'

export default function ArticleCard({ article, isSpotlightActive }) {
  const navigate = useNavigate()

  return (
    <div
      className={`article-card${isSpotlightActive ? ' spotlight-active' : ''}`}
      onClick={() => navigate(`/article/${article.id}`)}
    >
      {/* Image / gradient */}
      <div className="card-image">
        {article.image ? (
          <img src={article.image} alt={article.title} className="gradient-thumb" style={{ objectFit: 'cover', height: '100%', width: '100%' }} />
        ) : (
          <div
            className="gradient-thumb"
            style={{ background: article.themeGradient }}
          />
        )}
        <span className="card-category">{article.category}</span>
      </div>

      {/* Body */}
      <div className="card-body">
        <h3 className="card-title">{article.title}</h3>
        <p className="card-subtitle">{article.subtitle}</p>

        <div className="card-keywords">
          {article.keywords.map(kw => (
            <span key={kw} className="keyword">{kw}</span>
          ))}
        </div>

        <p className="card-desc">{article.description}</p>

        <div className="card-footer">
          <span className="card-readtime">⏱ {article.readTime}</span>
          <button className="card-read-btn">Read →</button>
        </div>
      </div>
    </div>
  )
}
