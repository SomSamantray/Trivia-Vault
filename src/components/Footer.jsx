import { useNavigate } from 'react-router-dom'

export default function Footer() {
  const navigate = useNavigate()

  return (
    <footer className="footer">
      <div className="footer-inner">
        <div>
          <div className="footer-brand-name">
            <span className="brand-hash">#</span>
            <span className="brand-text">tr</span>
            <span className="brand-num">33</span>
            <span className="brand-text">via</span>
          </div>
          <p className="footer-tagline">
            A vault of deeply researched, investigative long-form articles on the world's most extraordinary companies, technologies, and ideas. Told like stories. Designed to stay with you.
          </p>
        </div>

        <div className="footer-col">
          <h4>Navigate</h4>
          <ul>
            <li onClick={() => navigate('/')}>Home</li>
            <li onClick={() => navigate('/')}>Browse Articles</li>
            <li onClick={() => navigate('/')}>AI & Infrastructure</li>
            <li onClick={() => navigate('/')}>Companies & Corps</li>
          </ul>
        </div>

        <div className="footer-col">
          <h4>The Vault</h4>
          <ul>
            <li>More articles dropping soon</li>
            <li>Long-form · Investigative</li>
            <li>Curated · Mind-blowing</li>
          </ul>
        </div>
      </div>

      <div className="footer-bottom">
        <span className="footer-copy">© {new Date().getFullYear()} #tr33via — All rights reserved</span>
        <span className="footer-made">Built with <span>▲</span> obsession</span>
      </div>
    </footer>
  )
}
