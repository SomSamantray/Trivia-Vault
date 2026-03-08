import { useState, useRef, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import '../styles/admin.css'

// ── Markdown Helpers ────────────────────────────────────────────────────────

function slugify(str) {
  return str
    .toLowerCase()
    .replace(/['']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
}

/**
 * Process raw markdown from multiple document formats:
 *
 * Format A (Perplexity-style):
 *   [Prompt header block]
 *   ***
 *   # Article Title
 *   ...body...
 *   [^1]: Reference
 *
 * Format B (Clean/direct):
 *   ***
 *   # **Article Title** (bold-wrapped H1)
 *   *italic essence line*
 *   ## I. Roman numeral section
 *   ...body...
 *   ---
 *   ## References
 *   1. [link]
 */
function processMarkdown(raw) {
  let md = raw.trim()

  // ── Step 1: Strip decorative opening *** (always) ──
  // If document starts with *** (possibly whitespace around it), remove it
  if (/^\*\*\*\s*$/m.test(md.split('\n')[0])) {
    md = md.replace(/^\*\*\*[^\n]*\n/, '').trimStart()
  }

  // ── Step 2: Strip prompt header block (Format A) ──
  // If there's content before the first H1, check for a *** separator
  const firstH1 = md.search(/^#\s/m)
  if (firstH1 > 0) {
    const beforeH1 = md.slice(0, firstH1)
    // Look for *** separator in the preamble
    const sepIdx = beforeH1.lastIndexOf('\n***\n')
    if (sepIdx !== -1) {
      md = md.slice(sepIdx + 5).trimStart()
    }
    // Also handle --- separator appearing very early (within 300 chars)
    const dashSep = beforeH1.lastIndexOf('\n---\n')
    if (dashSep !== -1 && dashSep < 300) {
      md = md.slice(dashSep + 5).trimStart()
    }
  }

  // ── Step 3: Clean bold-wrapped H1: # **Title** → # Title ──
  md = md.replace(/^(#{1,6})\s+\*\*(.+?)\*\*\s*$/gm, '$1 $2')

  // ── Step 4: Strip inline footnote citations [^1] [^24] etc. ──
  md = md.replace(/\[\^\d+\](?:\[\^\d+\])*/g, '')

  // ── Step 5: Strip References section and everything after ──
  // Handles: \n---\n\n## References or \n## References
  md = md.replace(/\n---+\n+## References[\s\S]*$/m, '')
  md = md.replace(/\n## References\n[\s\S]*$/m, '')

  // ── Step 6: Strip footnote reference definitions [^1]: ... ──
  md = md.replace(/\n\[\^[^\]]+\]:[^\n]*/g, '')

  // ── Step 7: Remove hidden HTML spans and tags ──
  md = md.replace(/<[^>]+>/g, '')

  // ── Step 8: Remove closing ornament ──
  md = md.replace(/\n\s*⁂\s*\n?$/m, '')
  md = md.replace(/\n\s*\* \* \*\s*\n?$/m, '')

  return md.trim()
}

function parseArticle(md) {
  // Extract H1 title (already cleaned of **)
  const titleMatch = md.match(/^#{1}\s+(.+)$/m)
  const rawTitle = titleMatch ? titleMatch[1].trim() : 'Untitled'
  // Also strip any remaining ** in title (safety net)
  const title = rawTitle.replace(/\*\*/g, '').trim()

  // Extract subtitle: first italic line or first substantial paragraph after title
  const afterTitle = md.replace(/^#[^\n]*\n/, '').trimStart()

  // Try italic/emphasis first (common in Format B: *italic essence line*)
  const italicMatch = afterTitle.match(/^\*([^*\n]{10,})\*\s*$/m)
  // Then try first paragraph
  const parasMatch = afterTitle.match(/^([^#\n*][^\n]{10,})/m)
  const subtitle = italicMatch
    ? italicMatch[1].slice(0, 200).trim()
    : parasMatch
    ? parasMatch[1].slice(0, 200).trim()
    : ''

  // Word count (rough - count words in the cleaned body)
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
      const b64 = reader.result.split(',')[1]
      resolve(b64)
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

// ── GitHub API helpers ───────────────────────────────────────────────────────

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

async function fetchExistingArticles(config) {
  const { token, owner, repo } = config
  const cmsFilePath = `${owner}/${repo}/contents/src/data/articles-cms.json`
  try {
    const cmsData = await ghGet(cmsFilePath, token)
    const decoded = atob(cmsData.content.replace(/\s/g, ''))
    const articles = JSON.parse(decoded)
    return { articles, sha: cmsData.sha }
  } catch {
    return { articles: [], sha: undefined }
  }
}

// ── Constants ────────────────────────────────────────────────────────────────

const CATEGORIES = [
  'AI & Infrastructure',
  'Companies & Corporations',
  'Science & Technology',
]

const GRADIENTS = [
  'radial-gradient(ellipse at 25% 35%, #8B1A1A 0%, #D4760A 45%, #1A0A02 75%, #0C0A0A 100%)',
  'radial-gradient(ellipse at 25% 35%, #1B3A6B 0%, #2E7D9F 45%, #0C0A0A 80%)',
  'radial-gradient(ellipse at 70% 40%, #2D5016 0%, #4A7C59 45%, #0C0A0A 80%)',
  'radial-gradient(ellipse at 50% 30%, #4A1942 0%, #8B2FC9 50%, #0C0A0A 80%)',
  'radial-gradient(ellipse at 30% 60%, #1A3A5C 0%, #C17A2B 60%, #0C0A0A 85%)',
]

// ── Component ─────────────────────────────────────────────────────────────────

export default function AdminControl() {
  const navigate = useNavigate()

  // ── GitHub config ──
  const [config, setConfig] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('tr33via_admin_config') || 'null') || { token: '', owner: '', repo: '' }
    } catch { return { token: '', owner: '', repo: '' } }
  })
  const [configSaved, setConfigSaved] = useState(() => !!(localStorage.getItem('tr33via_admin_config')))
  const [configOpen, setConfigOpen] = useState(() => !(localStorage.getItem('tr33via_admin_config')))

  // ── New article form ──
  const [mdFile, setMdFile] = useState(null)
  const [imgFile, setImgFile] = useState(null)
  const [imgPreviewUrl, setImgPreviewUrl] = useState(null)
  const [tags, setTags] = useState('')
  const [category, setCategory] = useState(CATEGORIES[0])
  const [publishDate, setPublishDate] = useState(getCurrentMonthYear())
  const [parsed, setParsed] = useState(null)
  const [rawMd, setRawMd] = useState('')

  // ── Publish / status ──
  const [status, setStatus] = useState('idle') // idle | publishing | success | error
  const [statusMsg, setStatusMsg] = useState('')

  // ── Preview modal ──
  const [showPreview, setShowPreview] = useState(false)
  const [previewMd, setPreviewMd] = useState('')
  const [previewAccepted, setPreviewAccepted] = useState(false)

  // ── Edit existing ──
  const [editOpen, setEditOpen] = useState(false)
  const [loadingExisting, setLoadingExisting] = useState(false)
  const [existingArticles, setExistingArticles] = useState([])
  const [editMode, setEditMode] = useState(false)
  const [editArticleId, setEditArticleId] = useState(null)

  const mdInputRef = useRef()
  const imgInputRef = useRef()

  // Reset preview-accepted whenever the markdown content changes
  useEffect(() => {
    setPreviewAccepted(false)
  }, [rawMd])

  // ── Config handlers ──

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

  // ── File handlers ──

  function handleMdFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setMdFile(file)
    const reader = new FileReader()
    reader.onload = (ev) => {
      const cleaned = processMarkdown(ev.target.result)
      setRawMd(cleaned)
      setParsed(parseArticle(cleaned))
      setEditMode(false)
      setEditArticleId(null)
      setPreviewAccepted(false)
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
    if (file && file.name.endsWith('.md')) handleMdFile({ target: { files: [file] } })
  }, [])

  const handleImgDrop = useCallback((e) => {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (file && file.type.startsWith('image/')) handleImgFile({ target: { files: [file] } })
  }, [])

  // ── Preview modal handlers ──

  function openPreview() {
    if (!parsed || !rawMd) return
    setPreviewMd(rawMd)
    setShowPreview(true)
  }

  function acceptPreview() {
    // Sync any edits made in the preview back to rawMd
    setRawMd(previewMd)
    setParsed(parseArticle(previewMd))
    setPreviewAccepted(true)
    setShowPreview(false)
  }

  function cancelPreview() {
    setShowPreview(false)
  }

  // ── Edit existing handlers ──

  async function loadExistingArticles() {
    if (!configSaved) {
      alert('Please save your GitHub config first.')
      setConfigOpen(true)
      return
    }
    setLoadingExisting(true)
    try {
      const { articles } = await fetchExistingArticles(config)
      setExistingArticles(articles)
      setEditOpen(true)
    } catch (err) {
      alert(`Failed to load articles: ${err.message}`)
    } finally {
      setLoadingExisting(false)
    }
  }

  function startEdit(article) {
    setRawMd(article.content || '')
    setParsed({
      title: article.title,
      subtitle: article.subtitle,
      wordCount: article.wordCount || (article.content || '').split(/\s+/).filter(Boolean).length,
      readTime: article.readTime,
      id: article.id,
    })
    setTags((article.keywords || []).join(', '))
    setCategory(article.category || CATEGORIES[0])
    setPublishDate(article.publishDate || getCurrentMonthYear())
    setEditMode(true)
    setEditArticleId(article.id)
    setPreviewAccepted(false)
    setMdFile(null)
    setImgFile(null)
    setImgPreviewUrl(null)
    setStatus('idle')
    setStatusMsg('')
    // Scroll up to the upload section
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // ── Publish ──

  async function publish() {
    if (!parsed || !rawMd) { alert('Please upload a markdown file first.'); return }
    if (!previewAccepted) { alert('Please preview the article first and click Accept.'); openPreview(); return }
    if (!configSaved) {
      alert('GitHub config is missing.')
      setConfigOpen(true)
      return
    }

    setStatus('publishing')
    setStatusMsg('Connecting to GitHub…')

    try {
      const { token, owner, repo } = config
      const repoPath = `${owner}/${repo}`

      // ── Upload image ──
      let imagePath = null
      if (imgFile) {
        setStatusMsg('Uploading image…')
        const ext = imgFile.name.split('.').pop() || 'png'
        const imgFileName = `public/images/${parsed.id}.${ext}`
        imagePath = `/images/${parsed.id}.${ext}`
        const imgB64 = await fileToBase64(imgFile)

        let existingImgSha
        try {
          const existing = await ghGet(`${repoPath}/contents/${imgFileName}`, token)
          existingImgSha = existing.sha
        } catch {}

        await ghPut(`${repoPath}/contents/${imgFileName}`, token, {
          message: `admin: add image for "${parsed.title}"`,
          content: imgB64,
          ...(existingImgSha ? { sha: existingImgSha } : {}),
        })
      } else if (editMode) {
        // Keep existing image path from the article being edited
        const existing = existingArticles.find(a => a.id === editArticleId)
        imagePath = existing?.image || null
      }

      // ── Read current articles-cms.json ──
      setStatusMsg('Reading articles database…')
      const cmsFilePath = `${repoPath}/contents/src/data/articles-cms.json`
      let existingArr = []
      let cmsSha

      try {
        const cmsData = await ghGet(cmsFilePath, token)
        cmsSha = cmsData.sha
        existingArr = JSON.parse(atob(cmsData.content.replace(/\s/g, '')))
      } catch {}

      // ── Build article object ──
      const keywordsArr = tags.split(',').map(t => t.trim()).filter(Boolean)

      // Pick a gradient (cycle through options based on article count)
      const gradientIdx = existingArr.length % GRADIENTS.length
      const existingArticleForEdit = editMode ? existingArr.find(a => a.id === editArticleId) : null

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
        themeGradient: existingArticleForEdit?.themeGradient || GRADIENTS[gradientIdx],
        image: imagePath,
        content: rawMd,
      }

      // ── Merge into array ──
      let updated
      if (editMode) {
        // Replace the article with matching ID, preserve position
        updated = existingArr.map(a => a.id === editArticleId ? newArticle : a)
        // If not found (shouldn't happen), prepend
        if (!existingArr.find(a => a.id === editArticleId)) {
          updated = [newArticle, ...existingArr]
        }
      } else {
        // New article: prepend, deduplicate by ID
        updated = [newArticle, ...existingArr.filter(a => a.id !== newArticle.id)]
      }

      // ── Write articles-cms.json ──
      setStatusMsg(editMode ? 'Saving changes…' : 'Publishing article…')
      const newContent = btoa(unescape(encodeURIComponent(JSON.stringify(updated, null, 2))))

      await ghPut(cmsFilePath, token, {
        message: editMode
          ? `admin: update "${parsed.title}"`
          : `admin: publish "${parsed.title}"`,
        content: newContent,
        ...(cmsSha ? { sha: cmsSha } : {}),
      })

      setStatus('success')
      setStatusMsg(
        editMode
          ? `"${parsed.title}" updated! Vercel will deploy in ~60 seconds.`
          : `"${parsed.title}" published! Vercel will deploy in ~60 seconds.`
      )

      // Reset form
      setMdFile(null)
      setImgFile(null)
      setImgPreviewUrl(null)
      setParsed(null)
      setRawMd('')
      setTags('')
      setPublishDate(getCurrentMonthYear())
      setPreviewAccepted(false)
      setEditMode(false)
      setEditArticleId(null)
      setExistingArticles([])

    } catch (err) {
      setStatus('error')
      setStatusMsg(`Error: ${err.message}`)
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="admin-page">

      {/* ── Preview Modal ── */}
      {showPreview && (
        <div className="preview-modal-overlay" onClick={cancelPreview}>
          <div className="preview-modal" onClick={e => e.stopPropagation()}>
            <div className="preview-modal-header">
              <span className="preview-modal-title">Article Preview</span>
              <span className="preview-modal-hint">Edit on the left · Live preview on the right</span>
              <button className="preview-modal-close" onClick={cancelPreview}>✕</button>
            </div>
            <div className="preview-modal-body">
              {/* Left: editable markdown */}
              <div className="preview-panel preview-panel--editor">
                <div className="preview-panel-label">Markdown Source</div>
                <textarea
                  className="preview-editor"
                  value={previewMd}
                  onChange={e => setPreviewMd(e.target.value)}
                  spellCheck={false}
                />
              </div>
              {/* Right: live rendered preview */}
              <div className="preview-panel preview-panel--render">
                <div className="preview-panel-label">Live Render</div>
                <div className="preview-render-scroll">
                  <div className="article-body preview-article-body">
                    <ReactMarkdown>{previewMd}</ReactMarkdown>
                  </div>
                </div>
              </div>
            </div>
            <div className="preview-modal-footer">
              <button className="admin-btn-ghost" onClick={cancelPreview}>
                Cancel
              </button>
              <button className="admin-btn-primary preview-accept-btn" onClick={acceptPreview}>
                ✓ Accept & Enable Publish
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Header ── */}
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
          <div className="admin-section-head" onClick={() => setConfigOpen(o => !o)}>
            <span className="admin-section-label">
              {configSaved ? '✓ GitHub Connected' : '⚙ GitHub Config'}
            </span>
            <span className="admin-toggle-icon">{configOpen ? '▲' : '▼'}</span>
          </div>

          {configOpen && (
            <div className="admin-config-form">
              <p className="admin-hint">
                Create a GitHub{' '}
                <a href="https://github.com/settings/tokens/new?scopes=repo&description=tr33via-admin" target="_blank" rel="noreferrer">
                  Personal Access Token
                </a>{' '}
                with <code>repo</code> scope. Stored only in your browser's localStorage.
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
                    placeholder="Trivia-Vault"
                    value={config.repo}
                    onChange={e => setConfig(c => ({ ...c, repo: e.target.value }))}
                  />
                </div>
              </div>
              <div className="admin-config-actions">
                <button className="admin-btn-primary" onClick={saveConfig}>Save Config</button>
                {configSaved && <button className="admin-btn-ghost" onClick={clearConfig}>Clear</button>}
              </div>
            </div>
          )}
        </section>

        {/* ── Edit Existing Articles ── */}
        <section className="admin-section">
          <div
            className="admin-section-head"
            onClick={() => editOpen ? setEditOpen(false) : loadExistingArticles()}
          >
            <span className="admin-section-label">
              {loadingExisting ? '⟳ Loading…' : '✎ Edit Existing Articles'}
            </span>
            <span className="admin-toggle-icon">{editOpen ? '▲' : '▼'}</span>
          </div>

          {editOpen && (
            <div className="admin-edit-list">
              {existingArticles.length === 0 ? (
                <p className="admin-hint" style={{ padding: '20px 24px' }}>
                  No articles found in articles-cms.json.
                </p>
              ) : (
                existingArticles.map(article => (
                  <div key={article.id} className="admin-edit-row">
                    <div className="admin-edit-info">
                      <span className="admin-edit-title">{article.title}</span>
                      <span className="admin-edit-meta">
                        {article.category} · {article.publishDate} · {article.readTime}
                      </span>
                    </div>
                    <button
                      className="admin-btn-ghost admin-edit-btn"
                      onClick={() => startEdit(article)}
                    >
                      Edit →
                    </button>
                  </div>
                ))
              )}
              <div className="admin-edit-refresh">
                <button className="admin-btn-ghost" onClick={loadExistingArticles} disabled={loadingExisting}>
                  {loadingExisting ? 'Loading…' : '↺ Refresh List'}
                </button>
              </div>
            </div>
          )}
        </section>

        {/* ── Upload / New Article Form ── */}
        <section className="admin-section">
          <div className="admin-section-head static">
            <span className="admin-section-label">
              {editMode ? `✎ Editing: ${parsed?.title || editArticleId}` : 'New Article'}
            </span>
            {editMode && (
              <button
                className="admin-btn-ghost"
                style={{ fontSize: '10px', padding: '4px 10px' }}
                onClick={() => {
                  setEditMode(false); setEditArticleId(null)
                  setRawMd(''); setParsed(null); setMdFile(null)
                  setImgFile(null); setImgPreviewUrl(null)
                  setTags(''); setPublishDate(getCurrentMonthYear())
                  setPreviewAccepted(false)
                }}
              >
                Cancel Edit
              </button>
            )}
          </div>

          <div className="admin-upload-grid">
            {/* Markdown drop zone */}
            <div
              className={`admin-dropzone${mdFile || (editMode && rawMd) ? ' has-file' : ''}`}
              onDrop={handleMdDrop}
              onDragOver={e => e.preventDefault()}
              onClick={() => mdInputRef.current?.click()}
            >
              <input ref={mdInputRef} type="file" accept=".md" style={{ display: 'none' }} onChange={handleMdFile} />
              {mdFile ? (
                <div className="dropzone-filled">
                  <span className="dropzone-icon">📄</span>
                  <span className="dropzone-filename">{mdFile.name}</span>
                  {parsed && <span className="dropzone-meta">{parsed.wordCount.toLocaleString()} words · {parsed.readTime}</span>}
                </div>
              ) : editMode && rawMd ? (
                <div className="dropzone-filled">
                  <span className="dropzone-icon">📄</span>
                  <span className="dropzone-filename">Loaded from existing article</span>
                  <span className="dropzone-meta">{parsed?.wordCount?.toLocaleString()} words · Drop new .md to replace</span>
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
              <input ref={imgInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImgFile} />
              {imgPreviewUrl ? (
                <div className="dropzone-img-preview">
                  <img src={imgPreviewUrl} alt="Cover preview" />
                  <span className="dropzone-filename">{imgFile?.name}</span>
                </div>
              ) : editMode ? (
                <div className="dropzone-empty">
                  <span className="dropzone-icon">🖼</span>
                  <span className="dropzone-label">Drop new cover image</span>
                  <span className="dropzone-sub">Leave empty to keep existing image</span>
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

          {/* Parsed preview strip */}
          {parsed && (
            <div className="admin-preview">
              <div className="admin-preview-label">Parsed Preview</div>
              <div className="admin-preview-title">{parsed.title}</div>
              {parsed.subtitle && <div className="admin-preview-subtitle">{parsed.subtitle}</div>}
              <div className="admin-preview-meta">
                <span>ID: <code>{parsed.id}</code></span>
                <span>·</span>
                <span>{parsed.wordCount.toLocaleString()} words</span>
                <span>·</span>
                <span>{parsed.readTime}</span>
                {previewAccepted && <span>·</span>}
                {previewAccepted && <span style={{ color: 'var(--accent-gold)' }}>✓ Preview accepted</span>}
              </div>
            </div>
          )}

          {/* Metadata form */}
          <div className="admin-meta-form">
            <div className="admin-fields-row">
              <div className="admin-field">
                <label>Category</label>
                <select value={category} onChange={e => setCategory(e.target.value)}>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
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
                placeholder="e.g. Tesla, Autopilot, AI, Self-Driving"
              />
            </div>
          </div>
        </section>

        {/* ── Preview & Publish ── */}
        <section className="admin-publish-section">
          {status === 'success' && <div className="admin-status success">✓ {statusMsg}</div>}
          {status === 'error' && <div className="admin-status error">✕ {statusMsg}</div>}
          {status === 'publishing' && <div className="admin-status publishing">⟳ {statusMsg}</div>}

          <div className="admin-publish-actions">
            <button
              className="admin-btn-ghost admin-preview-btn"
              onClick={openPreview}
              disabled={!parsed}
            >
              Preview Article →
            </button>

            <button
              className={`admin-publish-btn${status === 'publishing' ? ' loading' : ''}${!previewAccepted ? ' locked' : ''}`}
              onClick={publish}
              disabled={status === 'publishing' || !parsed || !previewAccepted}
              title={!previewAccepted ? 'Preview the article first and click Accept' : ''}
            >
              {status === 'publishing'
                ? 'Publishing…'
                : editMode
                ? 'Save Changes →'
                : 'Publish to Vault →'}
            </button>
          </div>

          {!previewAccepted && parsed && (
            <p className="admin-warn-soft">
              Preview the article first. The publish button unlocks after you accept the preview.
            </p>
          )}
          {!parsed && status === 'idle' && (
            <p className="admin-warn-soft">Upload a markdown file to get started.</p>
          )}
          {!configSaved && (
            <p className="admin-warn">⚠ GitHub config not saved — article cannot be published.</p>
          )}
        </section>

        {/* ── How it works ── */}
        <section className="admin-section admin-info-section">
          <div className="admin-section-head static">
            <span className="admin-section-label">How it works</span>
          </div>
          <ol className="admin-how-list">
            <li>Upload your <code>.md</code> article and a cover image above.</li>
            <li>Set category, tags, and publish date. Click <strong>Preview Article</strong>.</li>
            <li>Review and edit the content in the split-view preview. Accept when ready.</li>
            <li>Click <strong>Publish to Vault</strong>. The app commits directly to your GitHub repo via API.</li>
            <li>Vercel/Netlify detects the commit and auto-deploys in ~60 seconds.</li>
            <li>The article is live — no terminal, no git push required.</li>
          </ol>
          <p className="admin-info-note">
            Supports multiple document formats: Perplexity-style (with prompt header above <code>***</code>),
            clean format (with decorative <code>***</code> opener, bold-wrapped title, inline citations <code>[^1]</code>,
            and <code>## References</code> section). All are automatically stripped.
            Your GitHub token is stored only in this browser's localStorage.
          </p>
        </section>

      </div>
    </div>
  )
}
