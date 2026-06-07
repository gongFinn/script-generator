import React, { useState, useEffect, useContext } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { LanguageContext, AuthContext, API_BASE } from '../App'

export default function ScriptViewPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { t } = useContext(LanguageContext)
  const { apiFetch } = useContext(AuthContext)

  const [script, setScript] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState('view') // view | edit | characters
  const [editContent, setEditContent] = useState('')
  const [editTitle, setEditTitle] = useState('')
  const [toast, setToast] = useState(null)

  // 角色相关状态
  const [characters, setCharacters] = useState([])
  const [selectedCharacter, setSelectedCharacter] = useState(null)
  const [extractedContent, setExtractedContent] = useState('')
  const [extracting, setExtracting] = useState(false)

  // 重命名状态
  const [renameOldName, setRenameOldName] = useState('')
  const [renameNewName, setRenameNewName] = useState('')
  const [renaming, setRenaming] = useState(false)

  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  const fetchScript = async () => {
    setLoading(true)
    try {
      const res = await apiFetch(`${API_BASE}/scripts/${id}`)
      if (!res.ok) throw new Error('Not found')
      const data = await res.json()
      setScript(data)
      setEditContent(data.script_content || '')
      setEditTitle(data.title || '')

      // 解析角色列表
      if (data.characters_json) {
        try {
          const chars = JSON.parse(data.characters_json)
          setCharacters(Array.isArray(chars) ? chars : [])
        } catch { setCharacters([]) }
      }
    } catch (err) {
      showToast('剧本不存在', 'error')
      navigate('/scripts')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchScript() }, [id])

  // 保存编辑
  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await apiFetch(`${API_BASE}/scripts/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editTitle,
          script_content: editContent,
        }),
      })
      if (!res.ok) throw new Error('Save failed')
      const data = await res.json()
      setScript(data)
      setActiveTab('view')
      showToast(t.saveSuccess)
    } catch (err) {
      showToast(t.saveFailed, 'error')
    } finally {
      setSaving(false)
    }
  }

  // 提取角色戏份
  const handleExtractCharacter = async (charName) => {
    const name = charName || selectedCharacter
    if (!name) return
    setExtracting(true)
    setExtractedContent('')
    try {
      const res = await apiFetch(
        `${API_BASE}/scripts/${id}/characters/extract?character_name=${encodeURIComponent(name)}`,
        { method: 'POST' }
      )
      if (!res.ok) throw new Error('Extract failed')
      const data = await res.json()
      setExtractedContent(data.extracted_content)
    } catch (err) {
      showToast('提取失败', 'error')
    } finally {
      setExtracting(false)
    }
  }

  // 重命名角色
  const handleRename = async () => {
    if (!renameOldName || !renameNewName) return
    setRenaming(true)
    try {
      const res = await apiFetch(`${API_BASE}/scripts/${id}/rename-character`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          old_name: renameOldName,
          new_name: renameNewName,
        }),
      })
      if (!res.ok) throw new Error('Rename failed')
      const data = await res.json()
      setScript(data)
      setEditContent(data.script_content || '')
      setRenameOldName('')
      setRenameNewName('')

      // 更新角色列表
      if (data.characters_json) {
        try {
          const chars = JSON.parse(data.characters_json)
          setCharacters(Array.isArray(chars) ? chars : [])
        } catch { }
      }
      showToast(t.renameSuccess)
    } catch (err) {
      showToast(t.renameFailed, 'error')
    } finally {
      setRenaming(false)
    }
  }

  const handleDelete = async () => {
    try {
      await apiFetch(`${API_BASE}/scripts/${id}`, { method: 'DELETE' })
      showToast(t.deleteSuccess)
      navigate('/scripts')
    } catch (err) {
      showToast(t.saveFailed, 'error')
    }
  }

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner" />
        <span>{t.loading}</span>
      </div>
    )
  }

  if (!script) return null

  return (
    <div className="script-view-page">
      {toast && <div className={`toast toast-${toast.type}`}>{toast.message}</div>}

      <div className="page-header">
        <Link to="/scripts" className="btn btn-outline btn-sm">{t.back}</Link>
        <h2>{editTitle || script.title}</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-danger btn-sm" onClick={handleDelete}>{t.delete}</button>
        </div>
      </div>

      {/* 元数据 */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 20, fontSize: 13, color: 'var(--text-muted)' }}>
        <span>{t.createdAt}: {new Date(script.created_at).toLocaleString()}</span>
        <span>{t.updatedAt}: {new Date(script.updated_at).toLocaleString()}</span>
        <span className="tag">{script.language}</span>
      </div>

      {/* Tab导航 */}
      <div className="tabs">
        <button className={`tab ${activeTab === 'view' ? 'active' : ''}`} onClick={() => setActiveTab('view')}>
          📖 {t.preview}
        </button>
        <button className={`tab ${activeTab === 'edit' ? 'active' : ''}`} onClick={() => setActiveTab('edit')}>
          ✏️ {t.edit}
        </button>
        <button className={`tab ${activeTab === 'characters' ? 'active' : ''}`} onClick={() => setActiveTab('characters')}>
          👤 {t.characters}
        </button>
      </div>

      {/* 预览模式 */}
      {activeTab === 'view' && (
        <div className="card">
          <div className="script-display">
            {script.script_content || t.noScripts}
          </div>
        </div>
      )}

      {/* 编辑模式 */}
      {activeTab === 'edit' && (
        <div className="card">
          <div className="form-group" style={{ marginBottom: 12 }}>
            <label>{t.titlePlaceholder}</label>
            <input
              className="input"
              value={editTitle}
              onChange={e => setEditTitle(e.target.value)}
            />
          </div>
          <textarea
            className="script-editor"
            value={editContent}
            onChange={e => setEditContent(e.target.value)}
            rows={20}
          />
          <div style={{ marginTop: 16, display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
            <button className="btn btn-outline" onClick={() => {
              setEditContent(script.script_content || '')
              setEditTitle(script.title || '')
            }}>
              {t.cancel}
            </button>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
              {saving && <span className="spinner" />}
              {t.save}
            </button>
          </div>
        </div>
      )}

      {/* 角色模式 */}
      {activeTab === 'characters' && (
        <div>
          {/* 角色列表 */}
          <div className="card" style={{ marginBottom: 16 }}>
            <h3 style={{ marginBottom: 12 }}>{t.characters}</h3>
            {characters.length > 0 ? (
              <div className="character-list">
                {characters.map(char => (
                  <button
                    key={char}
                    className={`character-chip ${selectedCharacter === char ? 'selected' : ''}`}
                    onClick={() => {
                      setSelectedCharacter(char)
                      setRenameOldName(char)
                      setExtractedContent('')
                    }}
                  >
                    {char}
                  </button>
                ))}
              </div>
            ) : (
              <p style={{ color: 'var(--text-muted)' }}>暂无角色数据</p>
            )}
            {characters.length === 0 && (
              <button
                className="btn btn-outline btn-sm"
                onClick={async () => {
                  try {
                    const res = await apiFetch(`${API_BASE}/scripts/${id}/re-extract-characters`, { method: 'POST' })
                    if (res.ok) {
                      const data = await res.json()
                      setCharacters(data.characters || [])
                      showToast('角色提取完成')
                    }
                  } catch { showToast('提取失败', 'error') }
                }}
              >
                🔍 重新提取角色
              </button>
            )}
          </div>

          {/* 提取角色戏份 */}
          {selectedCharacter && (
            <div className="character-extract">
              <h3>🎭 {t.extractedLines.replace('{name}', selectedCharacter)}</h3>
              <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => handleExtractCharacter(selectedCharacter)}
                  disabled={extracting}
                >
                  {extracting && <span className="spinner" />}
                  {t.extractCharacter}
                </button>
              </div>
              {extractedContent && (
                <div className="extracted-content">{extractedContent}</div>
              )}
            </div>
          )}

          {/* 重命名角色 */}
          <div className="rename-section">
            <h3>✏️ {t.rename}</h3>
            <div className="rename-row">
              <div className="form-group">
                <label>{t.oldName}</label>
                <input
                  className="input"
                  value={renameOldName}
                  onChange={e => setRenameOldName(e.target.value)}
                  placeholder={t.oldName}
                />
              </div>
              <div className="form-group">
                <label>{t.newName}</label>
                <input
                  className="input"
                  value={renameNewName}
                  onChange={e => setRenameNewName(e.target.value)}
                  placeholder={t.newName}
                />
              </div>
              <button
                className="btn btn-primary"
                onClick={handleRename}
                disabled={renaming || !renameOldName || !renameNewName}
              >
                {renaming && <span className="spinner" />}
                {t.replaceAll}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
