import React, { useState, useEffect, useContext, useMemo } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { LanguageContext, AuthContext, API_BASE } from '../App'

// YAML 解析器 — 将YAML剧本转为可读的HTML
function renderScript(yamlContent) {
  if (!yamlContent) return null
  const lines = yamlContent.split('\n')
  const sections = []
  let currentSection = null
  let currentBeat = null
  let inCharacters = false
  let inScenes = false
  let sceneIndex = 0

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const indent = line.search(/\S/)
    const trimmed = line.trim()

    if (trimmed.startsWith('#') || trimmed === '') continue
    if (trimmed === 'script:' || trimmed === 'meta:' || trimmed === 'scenes:' || trimmed === 'beats:' || trimmed.startsWith('transition:')) continue

    // 角色段落
    if (trimmed === 'characters:') {
      inCharacters = true; inScenes = false
      sections.push({ type: 'characters_header' })
      continue
    }
    if (inCharacters && indent === 4 && trimmed.startsWith('- id:')) {
      currentSection = { type: 'character', name: '', role: '', desc: '', lines: [] }
      sections.push(currentSection)
    }
    if (inCharacters && currentSection && indent === 6) {
      if (trimmed.startsWith('name:')) currentSection.name = trimmed.split('"')[1] || trimmed.split(':')[1]?.trim() || ''
      if (trimmed.startsWith('role:')) currentSection.role = trimmed.split('"')[1] || trimmed.split(':')[1]?.trim() || ''
      if (trimmed.startsWith('description:')) currentSection.desc = trimmed.split('"')[1] || trimmed.split(':')[1]?.trim() || ''
    }

    // 场景
    if (trimmed.startsWith('- id:') && indent === 4 && inCharacters === false) {
      inScenes = true
      sceneIndex++
      currentSection = { type: 'scene', id: sceneIndex, chapter: '', location: '', time: '', desc: '', beats: [] }
      sections.push(currentSection)
    }
    if (inScenes && currentSection && indent >= 6 && currentSection.type === 'scene') {
      if (trimmed.startsWith('chapter:')) currentSection.chapter = trimmed.split('"')[1] || ''
      if (trimmed.startsWith('location:')) currentSection.location = trimmed.split('"')[1] || ''
      if (trimmed.startsWith('time:')) currentSection.time = trimmed.split('"')[1] || ''
      if (trimmed.startsWith('description:') && indent === 6) currentSection.desc = trimmed.split('|')[1]?.trim() || trimmed.split('"')[1] || ''
      if (trimmed === 'description:' && lines[i+1]?.trim().startsWith('|')) {
        // multiline description
      }
    }

    // Beat
    if (inScenes && currentSection && indent >= 8 && trimmed.startsWith('- id:')) {
      currentBeat = { type: '', character: '', text: '', emotion: '', delivery: '' }
      currentSection.beats.push(currentBeat)
    }
    if (currentBeat && indent >= 10) {
      if (trimmed.startsWith('type:')) currentBeat.type = trimmed.split('"')[1] || ''
      if (trimmed.startsWith('character:')) currentBeat.character = trimmed.split('"')[1] || ''
      if (trimmed.startsWith('line:')) currentBeat.text = trimmed.split('"')[1] || ''
      if (trimmed.startsWith('action:')) currentBeat.text = trimmed.split('"')[1] || ''
      if (trimmed.startsWith('emotion:')) currentBeat.emotion = trimmed.split('"')[1] || ''
      if (trimmed.startsWith('delivery:')) currentBeat.delivery = trimmed.split('"')[1] || ''
    }

    // 遇到下一个顶级键时重置
    if (indent === 2 && trimmed.endsWith(':') && !['characters:', 'scenes:', 'beats:'].includes(trimmed)) {
      inCharacters = false
    }
  }

  return (
    <div className="script-rendered">
      {sections.map((sec, i) => {
        if (sec.type === 'characters_header') {
          const chars = sections.filter(s => s.type === 'character')
          if (!chars.length) return null
          return (
            <div key={i} className="rendered-characters">
              <h3 className="rendered-section-title">🎭 角色列表</h3>
              <div className="rendered-chars-grid">
                {chars.map((c, j) => (
                  <div key={j} className="rendered-char-card">
                    <div className="char-name">{c.name} <span className="char-role">{c.role}</span></div>
                    {c.desc && <div className="char-desc">{c.desc}</div>}
                  </div>
                ))}
              </div>
            </div>
          )
        }
        if (sec.type === 'scene') {
          return (
            <div key={i} className="rendered-scene">
              <div className="scene-heading">
                <span className="scene-number">第{sec.id}场</span>
                {sec.chapter && <span className="scene-chapter">{sec.chapter}</span>}
                <span className="scene-location">{sec.location}</span>
                <span className="scene-time">{sec.time}</span>
              </div>
              {sec.desc && <div className="scene-desc">{sec.desc}</div>}
              <div className="scene-beats">
                {sec.beats.map((beat, k) => {
                  if (beat.type === 'dialogue') {
                    return (
                      <div key={k} className="beat-dialogue">
                        <span className="beat-character">{beat.character}</span>
                        {beat.emotion && <span className="beat-emotion">【{beat.emotion}】</span>}
                        {beat.delivery && <span className="beat-delivery">（{beat.delivery}）</span>}
                        <span className="beat-colon">：</span>
                        <span className="beat-line">{beat.text}</span>
                      </div>
                    )
                  }
                  if (beat.type === 'action') {
                    return (
                      <div key={k} className="beat-action">
                        {beat.emotion && <span className="beat-emotion-tag">【{beat.emotion}】</span>}
                        <span className="beat-character">{beat.character}</span>
                        <span>（{beat.text}）</span>
                      </div>
                    )
                  }
                  if (beat.type === 'note') {
                    return <div key={k} className="beat-note">📝 {beat.text || beat.emotion || '舞台备注'}</div>
                  }
                  return null
                })}
              </div>
            </div>
          )
        }
        return null
      })}
    </div>
  )
}

export default function ScriptViewPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { t } = useContext(LanguageContext)
  const { apiFetch } = useContext(AuthContext)

  // 核心状态
  const [script, setScript] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState('view')
  const [viewMode, setViewMode] = useState('formatted') // 'formatted' | 'yaml'
  const [editContent, setEditContent] = useState('')
  const [editTitle, setEditTitle] = useState('')
  const [toast, setToast] = useState(null)

  // 角色相关
  const [characters, setCharacters] = useState([])
  const [selectedCharacter, setSelectedCharacter] = useState(null)
  const [extractedContent, setExtractedContent] = useState('')
  const [extracting, setExtracting] = useState(false)

  // 重命名
  const [renameOldName, setRenameOldName] = useState('')
  const [renameNewName, setRenameNewName] = useState('')
  const [renaming, setRenaming] = useState(false)

  // 摘要
  const [summary, setSummary] = useState(null)
  const [summarizing, setSummarizing] = useState(false)

  // 自定义角色创建
  const [showCreator, setShowCreator] = useState(false)
  const [newChar, setNewChar] = useState({
    name: '', aliases: '', gender: '其他', age: '', role: '配角',
    description: '', personality: '', appearance: '',
    dialogue_lines: [], actions: [], scene_appearances: []
  })
  const [creating, setCreating] = useState(false)

  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  // 编辑辅助选项
  const insertAtCursor = (text) => {
    setEditContent(prev => {
      const insert = '\n' + text + '\n'
      return prev + insert
    })
  }

  const editHelpers = [
    { label: '➕ 角色对话', text: '- id: "X.X"\n  type: "dialogue"\n  character: "角色名"\n  line: "台词"\n  delivery: "语气"\n  emotion: "情绪"' },
    { label: '🎬 角色动作', text: '- id: "X.X"\n  type: "action"\n  character: "角色名"\n  action: "动作描述"\n  emotion: "情绪"' },
    { label: '🏠 场景描述', text: 'description: |\n  场景环境描述...' },
    { label: '⏰ 上场时机', text: 'entrance_timing:\n  - character: "角色名"\n    timing: "上场时机"' },
    { label: '🎯 转场', text: 'transition:\n  to: end\n  type: "fade"' },
    { label: '👤 角色定义', text: '- id: "char_N"\n  name: "角色名"\n  aliases: ["别名"]\n  gender: "性别"\n  age: "年龄"\n  role: "配角"\n  description: "角色描述"' },
  ]

  // 加载剧本
  const fetchScript = async () => {
    setLoading(true)
    try {
      const res = await apiFetch(`${API_BASE}/scripts/${id}`)
      if (!res.ok) throw new Error('Not found')
      const data = await res.json()
      setScript(data)
      setEditContent(data.script_content || '')
      setEditTitle(data.title || '')
      if (data.characters_json) {
        try { setCharacters(JSON.parse(data.characters_json)) } catch { setCharacters([]) }
      }
    } catch {
      showToast('剧本不存在', 'error')
      navigate('/scripts')
    } finally { setLoading(false) }
  }

  useEffect(() => { fetchScript() }, [id])

  // 保存编辑
  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await apiFetch(`${API_BASE}/scripts/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ title: editTitle, script_content: editContent }),
      })
      if (!res.ok) throw new Error('Save failed')
      const data = await res.json()
      setScript(data)
      setActiveTab('view')
      showToast(t.saveSuccess)
    } catch { showToast(t.saveFailed, 'error') } finally { setSaving(false) }
  }

  // 删除
  const handleDelete = async () => {
    try {
      await apiFetch(`${API_BASE}/scripts/${id}`, { method: 'DELETE' })
      showToast(t.deleteSuccess)
      navigate('/scripts')
    } catch { showToast(t.saveFailed, 'error') }
  }

  // 提取角色
  const handleExtractCharacter = async (charName) => {
    const name = charName || selectedCharacter
    if (!name) return
    setExtracting(true)
    setExtractedContent('')
    try {
      const res = await apiFetch(`${API_BASE}/scripts/${id}/characters/extract?character_name=${encodeURIComponent(name)}`, { method: 'POST' })
      if (!res.ok) throw new Error('Extract failed')
      const data = await res.json()
      setExtractedContent(data.extracted_content)
    } catch { showToast('提取失败', 'error') } finally { setExtracting(false) }
  }

  // 重命名
  const handleRename = async () => {
    if (!renameOldName || !renameNewName) return
    setRenaming(true)
    try {
      const res = await apiFetch(`${API_BASE}/scripts/${id}/rename-character`, {
        method: 'POST',
        body: JSON.stringify({ old_name: renameOldName, new_name: renameNewName }),
      })
      if (!res.ok) throw new Error('Rename failed')
      const data = await res.json()
      setScript(data)
      setEditContent(data.script_content || '')
      setRenameOldName('')
      setRenameNewName('')
      if (data.characters_json) {
        try { setCharacters(JSON.parse(data.characters_json)) } catch {}
      }
      showToast(t.renameSuccess)
    } catch { showToast(t.renameFailed, 'error') } finally { setRenaming(false) }
  }

  // AI摘要
  const handleSummarize = async () => {
    setSummarizing(true)
    try {
      const res = await apiFetch(`${API_BASE}/scripts/${id}/summarize`, { method: 'POST' })
      if (!res.ok) throw new Error('Summarize failed')
      const data = await res.json()
      setSummary(data.summary || data.summary_raw || '无法解析摘要')
    } catch { showToast('摘要生成失败', 'error') } finally { setSummarizing(false) }
  }

  // 创建自定义角色
  const handleCreateCharacter = async () => {
    if (!newChar.name) return
    setCreating(true)
    try {
      const aliasesList = newChar.aliases ? newChar.aliases.split(',').map(s => s.trim()).filter(Boolean) : []
      const res = await apiFetch(`${API_BASE}/scripts/${id}/custom-character`, {
        method: 'POST',
        body: JSON.stringify({ ...newChar, aliases: aliasesList }),
      })
      if (!res.ok) throw new Error('Create failed')
      const data = await res.json()
      setScript(data.script)
      setEditContent(data.script.script_content || '')
      setNewChar({ name: '', aliases: '', gender: '其他', age: '', role: '配角', description: '', personality: '', appearance: '', dialogue_lines: [], actions: [], scene_appearances: [] })
      setShowCreator(false)
      showToast(`角色 ${newChar.name} 已添加`)
    } catch { showToast('创建失败', 'error') } finally { setCreating(false) }
  }

  if (loading) {
    return <div className="loading-container"><div className="loading-spinner" /><span>{t.loading}</span></div>
  }

  if (!script) return null

  return (
    <div className="script-view-page">
      {toast && <div className={`toast toast-${toast.type}`}>{toast.message}</div>}

      <div className="page-header">
        <Link to="/scripts" className="btn btn-outline btn-sm">{t.back}</Link>
        <h2>{editTitle || script.title}</h2>
        <button className="btn btn-danger btn-sm" onClick={handleDelete}>{t.delete}</button>
      </div>

      <div style={{ display: 'flex', gap: 14, marginBottom: 18, fontSize: 12, color: 'var(--text-muted)' }}>
        <span>{t.createdAt}: {new Date(script.created_at).toLocaleString()}</span>
        <span>{t.updatedAt}: {new Date(script.updated_at).toLocaleString()}</span>
        <span className="tag">{script.language}</span>
      </div>

      {/* Tab导航 */}
      <div className="tabs">
        <button className={`tab ${activeTab === 'view' ? 'active' : ''}`} onClick={() => setActiveTab('view')}>📖 预览</button>
        <button className={`tab ${activeTab === 'edit' ? 'active' : ''}`} onClick={() => setActiveTab('edit')}>✏️ 编辑</button>
        <button className={`tab ${activeTab === 'summary' ? 'active' : ''}`} onClick={() => { setActiveTab('summary'); if (!summary) handleSummarize() }}>📊 摘要</button>
        <button className={`tab ${activeTab === 'characters' ? 'active' : ''}`} onClick={() => setActiveTab('characters')}>👤 角色</button>
        <button className={`tab ${activeTab === 'creator' ? 'active' : ''}`} onClick={() => setActiveTab('creator')}>🎭 自定义角色</button>
      </div>

      {/* 预览 */}
      {activeTab === 'view' && (
        <div className="card">
          <div style={{ display: 'flex', gap: 8, marginBottom: 14, justifyContent: 'flex-end' }}>
            <button className={`btn btn-sm ${viewMode === 'formatted' ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setViewMode('formatted')}>📖 阅读视图</button>
            <button className={`btn btn-sm ${viewMode === 'yaml' ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setViewMode('yaml')}>📝 YAML源码</button>
          </div>
          {viewMode === 'formatted' ? (
            <div className="script-rendered-wrapper">
              {renderScript(script.script_content) || <div className="script-display">{script.script_content}</div>}
            </div>
          ) : (
            <div className="script-display">{script.script_content || '暂无内容'}</div>
          )}
        </div>
      )}

      {/* 编辑（含辅助选项） */}
      {activeTab === 'edit' && (
        <div className="card">
          <div className="form-group" style={{ marginBottom: 10 }}>
            <label>{t.titlePlaceholder}</label>
            <input className="input" value={editTitle} onChange={e => setEditTitle(e.target.value)} />
          </div>
          <div className="edit-options-bar">
            {editHelpers.map((h, i) => (
              <button key={i} className="btn btn-outline btn-sm" onClick={() => insertAtCursor(h.text)} title={h.label}>
                {h.label}
              </button>
            ))}
          </div>
          <textarea className="script-editor" value={editContent}
            onChange={e => setEditContent(e.target.value)} rows={22} />
          <div style={{ marginTop: 14, display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button className="btn btn-outline" onClick={() => { setEditContent(script.script_content || ''); setEditTitle(script.title || '') }}>{t.cancel}</button>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
              {saving && <span className="spinner" />}{t.save}
            </button>
          </div>
        </div>
      )}

      {/* AI摘要 */}
      {activeTab === 'summary' && (
        <div>
          {summarizing && (
            <div className="loading-container" style={{ padding: 40 }}><div className="loading-spinner" /><span>AI 正在分析剧本...</span></div>
          )}
          {summary && (
            <div>
              {/* 概述 */}
              {summary.overview && <div className="summary-overview">📝 {summary.overview}</div>}

              <div className="summary-panel">
                {/* 章节摘要 */}
                {summary.chapters && (
                  <div className="summary-card">
                    <h4>📖 章节段落</h4>
                    {summary.chapters.map((ch, i) => (
                      <div key={i} className="item">
                        <div className="item-name">场景 {ch.scene_id}: {ch.chapter}</div>
                        <div className="item-desc">{ch.summary}</div>
                        {ch.key_dialogue && <div className="item-desc" style={{ color: 'var(--vermillion)', fontStyle: 'italic' }}>💬 {ch.key_dialogue}</div>}
                      </div>
                    ))}
                  </div>
                )}

                {/* 主要人物 */}
                {summary.main_characters && (
                  <div className="summary-card">
                    <h4>👤 主要人物</h4>
                    {summary.main_characters.map((c, i) => (
                      <div key={i} className="item">
                        <div className="item-name">{c.name} <span className="tag">{c.role}</span></div>
                        <div className="item-desc">性格：{c.personality}</div>
                        <div className="item-desc">行动：{c.main_actions}</div>
                        {c.arc && <div className="item-desc">弧线：{c.arc}</div>}
                      </div>
                    ))}
                  </div>
                )}

                {/* 主要场景 */}
                {summary.main_scenes && (
                  <div className="summary-card">
                    <h4>🏠 主要场景</h4>
                    {summary.main_scenes.map((s, i) => (
                      <div key={i} className="item">
                        <div className="item-name">{s.location} · {s.time}</div>
                        <div className="item-desc">{s.description}</div>
                        <div className="item-desc" style={{ color: 'var(--indigo)' }}>作用：{s.importance}</div>
                      </div>
                    ))}
                  </div>
                )}

                {/* 关键事件 */}
                {summary.key_events && (
                  <div className="summary-card">
                    <h4>⚡ 关键事件</h4>
                    {summary.key_events.map((e, i) => (
                      <div key={i} className="item">
                        <div className="item-name">{e.event} <span className="tag">场景{e.scene_id}</span></div>
                        <div className="item-desc">{e.description}</div>
                        <div className="item-desc">参与：{(e.involved_characters || []).join('、')}</div>
                        <div className="item-desc" style={{ color: 'var(--vermillion)' }}>意义：{e.plot_significance}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 情绪弧线 + 主题 */}
              <div className="summary-full-width">
                {summary.emotional_arc && (
                  <div className="emotional-arc">🎭 情绪走向：{summary.emotional_arc}</div>
                )}
                {summary.themes && (
                  <div className="themes-list">
                    <span style={{ fontSize: 12, color: 'var(--text-secondary)', marginRight: 4 }}>🏷️ 主题：</span>
                    {summary.themes.map((th, i) => <span key={i} className="theme-tag">{th}</span>)}
                  </div>
                )}
              </div>
            </div>
          )}
          {!summary && !summarizing && (
            <div className="empty-state card">
              <div className="empty-icon">📊</div>
              <h3>AI 智能分析</h3>
              <p style={{ color: 'var(--text-muted)' }}>点击下方按钮生成摘要</p>
              <button className="btn btn-primary" onClick={handleSummarize} style={{ marginTop: 12 }}>
                🤖 生成智能摘要
              </button>
            </div>
          )}
        </div>
      )}

      {/* 角色管理 */}
      {activeTab === 'characters' && (
        <div>
          <div className="card" style={{ marginBottom: 14 }}>
            <h3 style={{ marginBottom: 10 }}>{t.characters}</h3>
            {characters.length > 0 ? (
              <div className="character-list">
                {characters.map(char => (
                  <button key={char} className={`character-chip ${selectedCharacter === char ? 'selected' : ''}`}
                    onClick={() => { setSelectedCharacter(char); setRenameOldName(char); setExtractedContent('') }}>
                    {char}
                  </button>
                ))}
              </div>
            ) : <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>暂无角色数据</p>}
            {characters.length === 0 && (
              <button className="btn btn-outline btn-sm" onClick={async () => {
                try {
                  const res = await apiFetch(`${API_BASE}/scripts/${id}/re-extract-characters`, { method: 'POST' })
                  if (res.ok) { const data = await res.json(); setCharacters(data.characters || []); showToast('角色提取完成') }
                } catch { showToast('提取失败', 'error') }
              }}>🔍 重新提取角色</button>
            )}
          </div>

          {selectedCharacter && (
            <div className="character-extract">
              <h3>🎭 {selectedCharacter} 的戏份</h3>
              <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
                <button className="btn btn-primary btn-sm" onClick={() => handleExtractCharacter(selectedCharacter)} disabled={extracting}>
                  {extracting && <span className="spinner" />}{t.extractCharacter}
                </button>
              </div>
              {extractedContent && <div className="extracted-content">{extractedContent}</div>}
            </div>
          )}

          <div className="rename-section">
            <h3>✏️ {t.rename}</h3>
            <div className="rename-row">
              <div className="form-group"><label>{t.oldName}</label>
                <input className="input" value={renameOldName} onChange={e => setRenameOldName(e.target.value)} placeholder={t.oldName} /></div>
              <div className="form-group"><label>{t.newName}</label>
                <input className="input" value={renameNewName} onChange={e => setRenameNewName(e.target.value)} placeholder={t.newName} /></div>
              <button className="btn btn-primary" onClick={handleRename} disabled={renaming || !renameOldName || !renameNewName}>
                {renaming && <span className="spinner" />}{t.replaceAll}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 自定义角色创建 */}
      {activeTab === 'creator' && (
        <div className="character-creator">
          <h3>🎭 自定义角色创建器</h3>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
            在此模块中定义角色的台词、动作、神态、出场时间、场景和主要事件，将直接添加到剧本中。
          </p>

          <div className="creator-grid">
            <div className="form-group">
              <label>角色名 *</label>
              <input className="input" value={newChar.name} onChange={e => setNewChar({ ...newChar, name: e.target.value })} placeholder="必填" />
            </div>
            <div className="form-group">
              <label>别名（逗号分隔）</label>
              <input className="input" value={newChar.aliases} onChange={e => setNewChar({ ...newChar, aliases: e.target.value })} placeholder="如：张三, 张先生" />
            </div>
            <div className="form-group">
              <label>性别</label>
              <select className="select" value={newChar.gender} onChange={e => setNewChar({ ...newChar, gender: e.target.value })}>
                <option>男</option><option>女</option><option>其他</option>
              </select>
            </div>
            <div className="form-group">
              <label>年龄</label>
              <input className="input" value={newChar.age} onChange={e => setNewChar({ ...newChar, age: e.target.value })} placeholder="如：二十八岁" />
            </div>
            <div className="form-group">
              <label>角色类型</label>
              <select className="select" value={newChar.role} onChange={e => setNewChar({ ...newChar, role: e.target.value })}>
                <option>主角</option><option>配角</option><option>客串</option>
              </select>
            </div>
            <div className="form-group creator-full">
              <label>角色描述</label>
              <textarea className="textarea" value={newChar.description} onChange={e => setNewChar({ ...newChar, description: e.target.value })} rows={2} placeholder="简要描述角色背景和特点" />
            </div>
            <div className="form-group">
              <label>性格特征</label>
              <input className="input" value={newChar.personality} onChange={e => setNewChar({ ...newChar, personality: e.target.value })} placeholder="如：沉稳、果断、善良" />
            </div>
            <div className="form-group">
              <label>外貌特征</label>
              <input className="input" value={newChar.appearance} onChange={e => setNewChar({ ...newChar, appearance: e.target.value })} placeholder="如：身材高大，面目俊朗" />
            </div>
          </div>

          <div style={{ marginTop: 16, display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button className="btn btn-outline" onClick={() => setNewChar({ name: '', aliases: '', gender: '其他', age: '', role: '配角', description: '', personality: '', appearance: '', dialogue_lines: [], actions: [], scene_appearances: [] })}>
              重置
            </button>
            <button className="btn btn-gold" onClick={handleCreateCharacter} disabled={creating || !newChar.name}>
              {creating && <span className="spinner" />}➕ 添加到剧本
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
