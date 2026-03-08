import { useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import '../styles/admin.css'

// ── Helpers ────────────────────────────────────────────────────────────────

function slugify(str) {
  return str
    .toLowerCase()
    .replace(/['']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
}

function stripPromptHeader(md) {
  // Discard everything above and including the *** separator (Perplexity prompt block)
  const sepIdx = md.indexOf('\n***\n')
  if (sepIdx !== -1) return md.slice(sepIdx + 5).trimStart()
  const sepIdx2 = md.indexOf('\n---\n')
  if (sepIdx2 !== -1 && sepIdx2 < 300) return md.slice(sepIdx2 + 5).trimStart()
  return md
}

function stripFootnotes(md) {
  // Remove footnote reference lines at the bottom: [^1]: ...
  return md.replace(/\n\[\^[^\]]+\]:[^\n]*/g, '').trimEnd()
}

function processMarkdown(raw) {
  let md = stripPromptHeader(raw)
  md = stripFootnotes(md)
  // Remove inline footnote citations like [^1] [^2] etc.
  md = md.replace(/\[\^[^\]]+\]/g, '')
  // Remove HTML spans (hidden references)
  md = md.replace(/<[^>]+>/g, '')
  // Remove closing ornament
  md = md.replace(/\n\s*⁂\s*\n?$/m, '')
  return md.trim()
}

function parseArticle(md) {
  // Extract H1 title
  const titleMatch = md.match(/^#\s+(.+)$/m)
  const title = titleMatch ? titleMatch[1].replace(/^#+\s*/, '').trim() : 'Untitled'

  // Extract subtitle: first H2 or first non-empty paragraph after title
  const afterTitle = md.replace(/^#[^\n]*\n/, '').trimStart()
  const firstParaMatch = afterTitle.match(/^([^#\n][^\n]{10,})/m)
  const subtitle = firstParaMatch ? firstParaMatch[1].slice(0, 160).trim() : ''

  // Word count
  const wordCount = md.split(/\s+/).filter(Boolean).length

  // Read time (~200 wpm)
  const minutes = Math.max(1, Math.round(wordCount / 200))
  const readTime = `${minutes} min read`

  // Slug from title
  const id = slugify(title)

  return { title, subtitle, wordCount, readTime, id }
}

function getCurrentMonthYear() {
  const now = new Date()
  return now.toLocaleString('en-US', { month: 'long', year: 'numeric' })
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      // strip the data URL prefix: "data:...;base64,"
      const b64 = reader.result.split(',')[1]
      resolve(b64)
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

// ── GitHub API helpers ──────────────────────────────────────────────────────

async function ghGet(path, token) {
  const res = await fetch(`https://api.github.com/repos/${path}`, {
    headers: {
      Authorization: `token ${token}`,
      Accept: 'application/vnd.github+json',
    },
  })
  if (!res.ok) throw new Error(`GitHub GET failed: ${res.status} ${await res.text()}`)
  return res.json()
}

async function ghPut(path, token, body) {
  const res = await fetch(`https://api.github.com/repos/${path}`, {
    method: 'PUT',
    headers: {
      Authorization: `token ${token}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`GitHub PUT failed: ${res.status} ${await res.text()}`)
  return res.json()
}

// ── Component ───────────────────────────────────────────────────────────────

const CATEGORIES = [
  'AI & Infrastructure',
  'Companies & Corporations',
  'Science & Technology',
]

const DEFAULT_GRADIENT = 'radial-gradient(ellipse at 30% 40%, #8B1A1A 0%, #D4760A 40%, #0C0A0A 75%)'

export default function AdminControl() {
  const navigate = useNavigate()

  // ── GitHub config state ──
  const [config, setConfig] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('tr33via_admin_config') || 'null') || {
        token: '', owner: '', repo: '',
      }
    } catch { return { token: '', owner: '', repo: '' } }
  })
  const [configSaved, setConfigSaved] = useState(
    () => !!(localStorage.getItem('tr33via_admin_config'))
  )
  const [configOpen, setConfigOpen] = useState(
    () => !(localStorage.getItem('tr33via_admin_config'))
  )

  // ── Form state ──
  const [mdFile, setMdFile] = useState(null)
  const [imgFile, setImgFile] = useState(null)
  const [imgPreviewUrl, setImgPreviewUrl] = useState(null)
  const [tags, setTags] = useState('')
  const [category, setCategory] = useState(CATEGORIES[0])
  const [publishDate, setPublishDate] = useState(getCurrentMonthYear())

  // ── Parsed preview ──
  const [parsed, setParsed] = useState(null)
  const [rawMd, setRawMd] = useState('')

  // ── Publish state ──
  const [status, setStatus] = useState('idle') // idle | publishing | success | error
  const [statusMsg, setStatusMsg] = useState('')

  const mdInputRef = useRef()
  const imgInputRef = useRef()

  // ── Handlers ──

  function saveConfig() {
    if (!config.token || !config.owner || !config.repo) {
      alert('Please fill in all three GitHub fields.')
      return
    }
    localStorage.setItem('tr33via_admin_config', JSON.stringify(config))
    setConfigSaved(true)
    setConfigOpen(false)
  }

  function clearConfig() {
    localStorage.removeItem('tr33via_admin_config')
    setConfigSaved(false)
    setConfigOpen(true)
    setConfig({ token: '', owner: '', repo: '' })
  }

  function handleMdFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setMdFile(file)
    const reader = new FileReader()
    reader.onload = (ev) => {
      const raw = ev.target.result
      const cleaned = processMarkdown(raw)
      setRawMd(cleaned)
      setParsed(parseArticle(cleaned))
    }
    reader.readAsText(file)
  }

  function handleImgFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setImgFile(file)
    setImgPreviewUrl(URL.createObjectURL(file))
  }

  const handleMdDrop = useCallback((e) => {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (file && file.name.endsWith('.md')) {
      handleMdFile({ target: { files: [file] } })
    }
  }, [])

  const handleImgDrop = useCallback((e) => {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (file && file.type.startsWith('image/')) {
      handleImgFile({ target: { files: [file] } })
    }
  }, [])

  async function publish() {
    if (!parsed || !rawMd) { alert('Please upload a markdown file first.'); return }
    if (!config.token || !config.owner || !config.repo) {
      alert('GitHub config is missing. Please save your config first.')
      setConfigOpen(true)
      return
    }

    setStatus('publishing')
    setStatusMsg('Connecting to GitHub…')

    try {
      const { token, owner, repo } = config
      const repoPath = `${owner}/${repo}`

      // ── Step 1: Upload image (if provided) ──
      let imagePath = null
      if (imgFile) {
        setStatusMsg('Uploading image…')
        const ext = imgFile.name.split('.').pop() || 'png'
        const imgFileName = `public/images/${parsed.id}.${ext}`
        imagePath = `/images/${parsed.id}.${ext}`
        const imgB64 = await fileToBase64(imgFile)

        // Check if image already exists (get SHA)
        let existingSha = undefined
        try {
          const existing = await ghGet(`${repoPath}/contents/${imgFileName}`, token)
          existingSha = existing.sha
        } catch {}

        await ghPut(`${repoPath}/contents/${imgFileName}`, token, {
          message: `admin: add image for "${parsed.title}"`,
          content: imgB64,
          ...(existingSha ? { sha: existingSha } : {}),
        })
      }

      // ── Step 2: Read current articles-cms.json ──
      setStatusMsg('Reading articles database…')
      const cmsFilePath = `${repoPath}/contents/src/data/articles-cms.json`
      let existingArticles = []
      let cmsSha = undefined

      try {
        const cmsData = await ghGet(cmsFilePath, token)
        cmsSha = cmsData.sha
        const decoded = atob(cmsData.content.replace(/\s/g, ''))
        existingArticles = JSON.parse(decoded)
      } catch (err) {
        // File may not exist yet or be empty — start fresh
        existingArticles = []
      }

      // ── Step 3: Build new article object ──
      const keywordsArr = tags
        .split(',')
        .map(t => t.trim())
        .filter(Boolean)

      const newArticle = {
        id: parsed.id,
        title: parsed.title,
        subtitle: parsed.subtitle,
        category,
        keywords: keywordsArr,
        description: parsed.subtitle,
        readTime: parsed.readTime,
        wordCount: parsed.wordCount,
        publishDate,
        themeGradient: DEFAULT_GRADIENT,
        image: imagePath,
        content: rawMd,
      }

      // Prepend new article (newest first), avoid duplicate IDs
      const updated = [
        newArticle,
        ...existingArticles.filter(a => a.id !== newArticle.id),
      ]

      // ── Step 4: Write updated articles-cms.json ──
      setStatusMsg('Publishing article…')
      const newContent = btoa(unescape(encodeURIComponent(JSON.stringify(updated, null, 2))))

      await ghPut(cmsFilePath, token, {
        message: `admin: publish "${parsed.title}"`,
        content: newContent,
        ...(cmsSha ? { sha: cmsSha } : {}),
      })

      setStatus('success')
      setStatusMsg(`"${parsed.title}" published! Vercel will deploy in ~60 seconds.`)

      // Reset form
      setMdFile(null)
      setImgFile(null)
      setImgPreviewUrl(null)
      setParsed(null)
      setRawMd('')
      setTags('')
      setPublishDate(getCurrentMonthYear())

    } catch (err) {
      setStatus('error')
      setStatusMsg(`Error: ${err.message}`)
    }
  }

  // ── Render ──

  return (
    <div className="admin-page">
      {/* Header */}
      <header className="admin-header">
        <div className="admin-header-inner">
          <button className="admin-back" onClick={() => navigate('/')}>← Vault</button>
          <span className="admin-brand">
            <span className="brand-hash">#</span>
            <span className="brand-text">tr</span>
            <span className="brand-num">33</span>
            <span className="brand-text">via</span>
            <span className="admin-brand-label"> / Admin</span>
          </span>
          <span className="admin-badge">Control Panel</span>
        </div>
      </header>

      <div className="admin-body">

        {/* ── GitHub Config ── */}
        <section className="admin-section">
          <div
            className="admin-section-head"
            onClick={() => setConfigOpen(o => !o)}
          >
            <span className="admin-section-label">
              {configSaved ? '✓ GitHub Connected' : '⚙ GitHub Config'}
            </span>
            <span className="admin-toggle-icon">{configOpen ? '▲' : '▼'}</span>
          </div>

          {configOpen && (
            <div className="admin-config-form">
              <p className="admin-hint">
                Create a GitHub{' '}
                <a
                  href="https://github.com/settings/tokens/new?scopes=repo&description=tr33via-admin"
                  target="_blank"
                  rel="noreferrer"
                >
                  Personal Access Token
                </a>
                {' '}with <code>repo</code> scope. It's stored only in your browser.
              </p>

              <div className="admin-field">
                <label>Personal Access Token (PAT)</label>
                <input
                  type="password"
                  placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                  value={config.token}
                  onChange={e => setConfig(c => ({ ...c, token: e.target.value }))}
                />
              </div>
              <div className="admin-fields-row">
                <div className="admin-field">
                  <label>GitHub Username</label>
                  <input
                    type="text"
                    placeholder="your-username"
                    value={config.owner}
                    onChange={e => setConfig(c => ({ ...c, owner: e.target.value }))}
                  />
                </div>
                <div className="admin-field">
                  <label>Repository Name</label>
                  <input
                    type="text"
                    placeholder="tr33via"
                    value={config.repo}
                    onChange={e => setConfig(c => ({ ...c, repo: e.target.value }))}
                  />
                </div>
              </div>
              <div className="admin-config-actions">
                <button className="admin-btn-primary" onClick={saveConfig}>
                  Save Config
                </button>
                {configSaved && (
                  <button className="admin-btn-ghost" onClick={clearConfig}>
                    Clear
                  </button>
                )}
              </div>
            </div>
          )}
        </section>

        {/* ── Upload Form ── */}
        <section className="admin-section">
          <div className="admin-section-head static">
            <span className="admin-section-label">New Article</span>
          </div>

          <div className="admin-upload-grid">
            {/* Markdown drop zone */}
            <div
              className={`admin-dropzone${mdFile ? ' has-file' : ''}`}
              onDrop={handleMdDrop}
              onDragOver={e => e.preventDefault()}
              onClick={() => mdInputRef.current?.click()}
            >
              <input
                ref={mdInputRef}
                type="file"
                accept=".md"
                style={{ display: 'none' }}
                onChange={handleMdFile}
              />
              {mdFile ? (
                <div className="dropzone-filled">
                  <span className="dropzone-icon">📄</span>
                  <span className="dropzone-filename">{mdFile.name}</span>
                  {parsed && (
                    <span className="dropzone-meta">
                      {parsed.wordCount.toLocaleString()} words · {parsed.readTime}
                    </span>
                  )}
                </div>
              ) : (
                <div className="dropzone-empty">
                  <span className="dropzone-icon">📝</span>
                  <span className="dropzone-label">Drop .md file here</span>
                  <span className="dropzone-sub">or click to browse</span>
                </div>
              )}
            </div>

            {/* Image drop zone */}
            <div
              className={`admin-dropzone${imgFile ? ' has-file' : ''}`}
              onDrop={handleImgDrop}
              onDragOver={e => e.preventDefault()}
              onClick={() => imgInputRef.current?.click()}
            >
              <input
                ref={imgInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleImgFile}
              />
              {imgPreviewUrl ? (
                <div className="dropzone-img-preview">
                  <img src={imgPreviewUrl} alt="Cover preview" />
                  <span className="dropzone-filename">{imgFile?.name}</span>
                </div>
              ) : (
                <div className="dropzone-empty">
                  <span className="dropzone-icon">🖼</span>
                  <span className="dropzone-label">Drop cover image here</span>
                  <span className="dropzone-sub">PNG · JPG · WEBP</span>
                </div>
              )}
            </div>
          </div>

          {/* Parsed preview */}
          {parsed && (
            <div className="admin-preview">
              <div className="admin-preview-label">Parsed Preview</div>
              <div className="admin-preview-title">{parsed.title}</div>
              {parsed.subtitle && (
                <div className="admin-preview-subtitle">{parsed.subtitle}</div>
              )}
              <div className="admin-preview-meta">
                <span>ID: <code>{parsed.id}</code></span>
                <span>·</span>
                <span>{parsed.wordCount.toLocaleString()} words</span>
                <span>·</span>
                <span>{parsed.readTime}</span>
              </div>
            </div>
          )}

          {/* Article metadata */}
          <div className="admin-meta-form">
            <div className="admin-fields-row">
              <div className="admin-field">
                <label>Category</label>
                <select
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                >
                  {CATEGORIES.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div className="admin-field">
                <label>Publish Date</label>
                <input
                  type="text"
                  value={publishDate}
                  onChange={e => setPublishDate(e.target.value)}
                  placeholder="March 2026"
                />
              </div>
            </div>

            <div className="admin-field">
              <label>Tags <span className="admin-hint-inline">(comma-separated)</span></label>
              <input
                type="text"
                value={tags}
                onChange={e => setTags(e.target.value)}
                placeholder="e.g. OpenAI, GPT-5, AGI, Artificial Intelligence"
              />
            </div>
          </div>
        </section>

        {/* ── Publish Button & Status ── */}
        <section className="admin-publish-section">
          {status === 'success' && (
            <div className="admin-status success">
              ✓ {statusMsg}
            </div>
          )}
          {status === 'error' && (
            <div className="admin-status error">
              ✕ {statusMsg}
            </div>
          )}
          {status === 'publishing' && (
            <div className="admin-status publishing">
              ⟳ {statusMsg}
            </div>
          )}

          <button
            className={`admin-publish-btn${status === 'publishing' ? ' loading' : ''}`}
            onClick={publish}
            disabled={status === 'publishing' || !parsed}
          >
            {status === 'publishing' ? 'Publishing…' : 'Publish to Vault →'}
          </button>

          {!configSaved && (
            <p className="admin-warn">
              ⚠ GitHub config not saved. Article will not be published until config is set.
            </p>
          )}
          {!parsed && status === 'idle' && (
            <p className="admin-warn-soft">Upload a markdown file to enable publishing.</p>
          )}
        </section>

        {/* ── How it works ── */}
        <section className="admin-section admin-info-section">
          <div className="admin-section-head static">
            <span className="admin-section-label">How it works</span>
          </div>
          <ol className="admin-how-list">
            <li>Upload your <code>.md</code> article and cover image above.</li>
            <li>Set the category, tags, and publish date.</li>
            <li>Click <strong>Publish to Vault</strong>.</li>
            <li>The app commits the article and image directly to your GitHub repo via API.</li>
            <li>Vercel/Netlify detects the commit and auto-deploys in ~60 seconds.</li>
            <li>The article is live for all visitors — no terminal, no git push required.</li>
          </ol>
          <p className="admin-info-note">
            Your GitHub token is stored only in this browser's localStorage and never sent
            anywhere except GitHub's API. The admin page has no backend.
          </p>
        </section>

      </div>
    </div>
  )
}
