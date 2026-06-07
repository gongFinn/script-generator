import React, { useState, useEffect, useContext } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { LanguageContext } from '../App'

const API_BASE = '/api'

export default function ScriptListPage() {
  const { t } = useContext(LanguageContext)
  const navigate = useNavigate()

  const [scripts, setScripts] = useState([])
  const [loading, setLoading] = useState(true)
  const [deleteId, setDeleteId] = useState(null)
  const [toast, setToast] = useState(null)

  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  const fetchScripts = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/scripts?page_size=100`)
      if (res.ok) {
        const data = await res.json()
        setScripts(data)
      }
    } catch (err) {
      console.error('Fetch scripts error:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchScripts() }, [])

  const handleDelete = async () => {
    if (!deleteId) return
    try {
      const res = await fetch(`${API_BASE}/scripts/${deleteId}`, { method: 'DELETE' })
      if (res.ok) {
        setScripts(prev => prev.filter(s => s.id !== deleteId))
        showToast(t.deleteSuccess)
      }
    } catch (err) {
      showToast(t.saveFailed, 'error')
    }
    setDeleteId(null)
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return ''
    const d = new Date(dateStr)
    return d.toLocaleString()
  }

  const stripScript = (content) => {
    if (!content) return ''
    return content.replace(/\([^)]*\)/g, '').replace(/【[^】]*】/g, '').replace(/\[[^\]]*\]/g, '').substring(0, 150)
  }

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner" />
        <span>{t.loading}</span>
      </div>
    )
  }

  return (
    <div className="script-list-page">
      {toast && <div className={`toast toast-${toast.type}`}>{toast.message}</div>}

      <div className="page-header">
        <h2>📋 {t.scripts} <span className="tag">{t.totalScripts.replace('{count}', scripts.length)}</span></h2>
        <Link to="/" className="btn btn-primary">{t.newScript}</Link>
      </div>

      {scripts.length === 0 ? (
        <div className="empty-state card">
          <div className="empty-icon">📝</div>
          <h3>{t.noScripts}</h3>
          <p><Link to="/" style={{ color: 'var(--primary)' }}>{t.newScript}</Link></p>
        </div>
      ) : (
        <div className="script-grid">
          {scripts.map(script => (
            <div key={script.id} className="card script-card">
              <div onClick={() => navigate(`/scripts/${script.id}`)}>
                <div className="card-header">
                  <span className="card-title">{script.title}</span>
                </div>
                <div className="card-meta">
                  <span>{t.updatedAt}: {formatDate(script.updated_at)}</span>
                  <span className="tag">{script.language}</span>
                </div>
                <div className="card-preview">
                  {stripScript(script.script_content) || script.original_text?.substring(0, 150)}
                </div>
              </div>
              <div className="card-actions">
                <button
                  className="btn btn-outline btn-sm"
                  onClick={() => navigate(`/scripts/${script.id}`)}
                >
                  {t.viewDetails}
                </button>
                <button
                  className="btn btn-danger btn-sm"
                  onClick={(e) => { e.stopPropagation(); setDeleteId(script.id) }}
                >
                  {t.delete}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 删除确认弹窗 */}
      {deleteId && (
        <div className="modal-overlay" onClick={() => setDeleteId(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>{t.confirmDelete}</h3>
            <p>{t.deleteConfirm}</p>
            <div className="modal-actions">
              <button className="btn btn-outline" onClick={() => setDeleteId(null)}>
                {t.cancel}
              </button>
              <button className="btn btn-danger" onClick={handleDelete}>
                {t.delete}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
