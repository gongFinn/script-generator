import React, { useState, useEffect, useContext, useMemo } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { LanguageContext, AuthContext, API_BASE } from '../App'

// ==================== YAML 解析器 ====================
function parseYamlScript(yamlText) {
  if (!yamlText) return { meta: {}, characters: [], scenes: [] }
  const lines = yamlText.split('\n')
  const result = { meta: {}, characters: [], scenes: [] }
  let inChars = false, inScenes = false, currentChar = null, currentScene = null, currentBeat = null

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const indent = line.search(/\S/)
    const trimmed = line.trim()
    if (trimmed === '' || trimmed.startsWith('#')) continue

    // 元数据
    if (indent === 4 && trimmed.startsWith('title:')) result.meta.title = strVal(trimmed)
    if (indent === 4 && trimmed.startsWith('source:')) result.meta.source = strVal(trimmed)
    if (indent === 4 && trimmed.startsWith('total_scenes:')) result.meta.total_scenes = intVal(trimmed)

    // 角色列表
    if (indent === 2 && trimmed === 'characters:') { inChars = true; inScenes = false; continue }
    // 结束角色段的条件：遇到其他顶级key（但不是scenes因为它会被专门处理）
    if (inChars && indent === 2 && trimmed.endsWith(':') && trimmed !== 'characters:' && trimmed !== 'scenes:') {
      inChars = false; continue
    }
    if (inChars && indent === 4 && trimmed.startsWith('- id:')) {
      currentChar = { id: strVal(trimmed), name: '', role: '', gender: '', age: '', description: '', aliases: [] }
      result.characters.push(currentChar)
    }
    if (inChars && currentChar && indent === 6) {
      if (trimmed.startsWith('name:')) currentChar.name = strVal(trimmed)
      if (trimmed.startsWith('role:')) currentChar.role = strVal(trimmed)
      if (trimmed.startsWith('gender:')) currentChar.gender = strVal(trimmed)
      if (trimmed.startsWith('age:')) currentChar.age = strVal(trimmed)
      if (trimmed.startsWith('description:')) currentChar.description = strVal(trimmed)
      if (trimmed.startsWith('aliases:')) {
        const m = trimmed.match(/\[(.*)\]/)
        if (m) currentChar.aliases = m[1].split(',').map(s => s.trim().replace(/"/g, ''))
      }
    }

    // 场景
    if (indent === 2 && trimmed === 'scenes:') { inScenes = true; inChars = false; continue }
    if (inScenes && indent === 2 && trimmed !== 'scenes:' && trimmed.endsWith(':')) { inScenes = false; continue }
    if (inScenes && indent === 4 && trimmed.startsWith('- id:')) {
      currentScene = { id: parseInt(strVal(trimmed)), chapter: '', heading: { location: '', time: '', season: '' }, description: '', entrance_timing: [], beats: [], transition: { to: 'end', type: 'cut' } }
      result.scenes.push(currentScene)
      currentBeat = null
    }
    if (inScenes && currentScene && indent === 6) {
      if (trimmed.startsWith('chapter:')) currentScene.chapter = strVal(trimmed)
      if (trimmed.startsWith('location:')) currentScene.heading.location = strVal(trimmed)
      if (trimmed.startsWith('time:')) currentScene.heading.time = strVal(trimmed)
      if (trimmed.startsWith('season:')) currentScene.heading.season = strVal(trimmed)
      if (trimmed.startsWith('description:')) {
        if (trimmed.includes('|')) {
          // 多行描述
          const descLines = []
          for (let j = i + 1; j < lines.length; j++) {
            if (lines[j].search(/\S/) <= 6) break
            descLines.push(lines[j].trim())
          }
          currentScene.description = descLines.join('\n')
        } else {
          currentScene.description = strVal(trimmed)
        }
      }
      if (trimmed.startsWith('characters_present:')) {
        const m = trimmed.match(/\[(.*)\]/)
        if (m) currentScene.characters_present = m[1].split(',').map(s => s.trim().replace(/"/g, ''))
      }
      if (trimmed.startsWith('to:')) currentScene.transition.to = strVal(trimmed)
      if (trimmed.startsWith('type:') && indent === 8) currentScene.transition.type = strVal(trimmed)
    }
    // 上场时机
    if (inScenes && currentScene && indent === 8 && trimmed.startsWith('- character:')) {
      currentScene.entrance_timing.push({ character: strVal(trimmed), timing: '' })
    }
    if (inScenes && currentScene && indent === 10 && trimmed.startsWith('timing:') && currentScene.entrance_timing.length) {
      currentScene.entrance_timing[currentScene.entrance_timing.length - 1].timing = strVal(trimmed)
    }

    // Beat
    if (inScenes && currentScene && indent === 8 && trimmed.startsWith('- id:')) {
      currentBeat = { id: strVal(trimmed), type: '', character: '', line: '', action: '', emotion: '', delivery: '', notes: '' }
      currentScene.beats.push(currentBeat)
    }
    if (currentBeat && indent === 10) {
      if (trimmed.startsWith('type:')) currentBeat.type = strVal(trimmed)
      if (trimmed.startsWith('character:')) currentBeat.character = strVal(trimmed)
      if (trimmed.startsWith('line:')) currentBeat.line = strVal(trimmed)
      if (trimmed.startsWith('action:')) currentBeat.action = strVal(trimmed)
      if (trimmed.startsWith('emotion:')) currentBeat.emotion = strVal(trimmed)
      if (trimmed.startsWith('delivery:')) currentBeat.delivery = strVal(trimmed)
      if (trimmed.startsWith('notes:')) currentBeat.notes = strVal(trimmed)
    }

    if (inScenes && currentScene && indent === 8 && !trimmed.startsWith('-') && trimmed.startsWith('to:')) {
      currentScene.transition.to = strVal(trimmed)
    }
  }
  return result
}

function strVal(line) {
  const m = line.match(/"([^"]*)"/)
  if (m) return m[1]
  const parts = line.split(':')
  return parts.length > 1 ? parts.slice(1).join(':').trim().replace(/^"/, '').replace(/"$/, '') : ''
}

function intVal(line) {
  const parts = line.split(':')
  return parseInt(parts[1]) || 0
}

// ==================== YAML 生成器 ====================
function generateYaml(data, original) {
  if (!original) return ''
  let yaml = original
  // 简单策略：用原始YAML做基础，把修改merge进去
  // 这里采用简易方法 - 修改特定beat时重新生成整个YAML
  return yaml
}

function updateBeatInYaml(yamlText, sceneId, beatId, updatedBeat) {
  const lines = yamlText.split('\n')
  let inTargetScene = false, inTargetBeat = false
  let beatStartLine = -1, beatEndLine = -1
  let currentSceneId = -1
  let indent = 0

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmed = line.trim()
    const lineIndent = line.search(/\S/)

    // 追踪场景
    if (trimmed.startsWith('- id:') && (lineIndent === 4)) {
      const sid = parseInt(strVal(trimmed))
      if (!isNaN(sid)) { currentSceneId = sid; inTargetScene = (sid === sceneId) }
      inTargetBeat = false
    }

    if (inTargetScene && trimmed.startsWith('- id:') && lineIndent >= 8) {
      const bid = strVal(trimmed)
      if (bid === beatId) {
        inTargetBeat = true
        beatStartLine = i
        indent = lineIndent
        continue
      } else if (inTargetBeat) {
        beatEndLine = i
        break
      }
    }

    if (inTargetBeat && lineIndent <= indent && trimmed !== '' && !trimmed.startsWith('-')) {
      // same indent or less - end of beat
    }
    if (inTargetBeat && i === lines.length - 1) beatEndLine = i + 1
  }

  if (beatStartLine === -1) return yamlText

  // 找到beat结束位置
  for (let i = beatStartLine + 1; i < lines.length; i++) {
    const lineIndent = lines[i].search(/\S/)
    if (lineIndent <= indent && lines[i].trim() !== '') {
      beatEndLine = i
      break
    }
    if (i === lines.length - 1) beatEndLine = i + 1
  }

  // 生成新beat
  const newLines = []
  newLines.push(' '.repeat(indent) + `- id: "${beatId}"`)
  newLines.push(' '.repeat(indent + 2) + `type: "${updatedBeat.type}"`)
  if (updatedBeat.character) newLines.push(' '.repeat(indent + 2) + `character: "${updatedBeat.character}"`)
  if (updatedBeat.type === 'dialogue' && updatedBeat.line) newLines.push(' '.repeat(indent + 2) + `line: "${updatedBeat.line}"`)
  if (updatedBeat.type === 'action' && updatedBeat.action) newLines.push(' '.repeat(indent + 2) + `action: "${updatedBeat.action}"`)
  if (updatedBeat.emotion) newLines.push(' '.repeat(indent + 2) + `emotion: "${updatedBeat.emotion}"`)
  if (updatedBeat.delivery) newLines.push(' '.repeat(indent + 2) + `delivery: "${updatedBeat.delivery}"`)
  if (updatedBeat.notes) newLines.push(' '.repeat(indent + 2) + `notes: "${updatedBeat.notes}"`)

  const result = [...lines.slice(0, beatStartLine), ...newLines, ...lines.slice(beatEndLine)]
  return result.join('\n')
}

// ==================== 可读剧本渲染器 ====================
function renderScript(yamlContent) {
  const data = parseYamlScript(yamlContent)
  if (!data.scenes.length) return null

  return (
    <div className="script-rendered">
      {/* 角色列表 */}
      {data.characters.length > 0 && (
        <div className="rendered-characters">
          <h3 className="rendered-section-title">🎭 角色列表</h3>
          <div className="rendered-chars-grid">
            {data.characters.map((c, j) => (
              <div key={j} className="rendered-char-card">
                <div className="char-name">{c.name} <span className="char-role">{c.role}</span></div>
                {c.description && <div className="char-desc">{c.description}</div>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 场景 */}
      {data.scenes.map((scene, i) => (
        <div key={i} className="rendered-scene">
          <div className="scene-heading">
            <span className="scene-number">第{scene.id}场</span>
            {scene.chapter && <span className="scene-chapter">{scene.chapter}</span>}
            <span className="scene-location">{scene.heading.location}</span>
            <span className="scene-time">{scene.heading.time}</span>
          </div>
          {scene.description && <div className="scene-desc">{scene.description}</div>}

          {/* 上场时机 */}
          {scene.entrance_timing.length > 0 && (
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>
              {scene.entrance_timing.map((et, k) => (
                <span key={k} style={{ marginRight: 12 }}>🎬 {et.character}：{et.timing}</span>
              ))}
            </div>
          )}

          <div className="scene-beats">
            {scene.beats.map((beat, k) => {
              if (beat.type === 'dialogue') {
                return (
                  <div key={k} className="beat-dialogue">
                    <span className="beat-character">{beat.character}</span>
                    {beat.emotion && <span className="beat-emotion">【{beat.emotion}】</span>}
                    {beat.delivery && <span className="beat-delivery">（{beat.delivery}）</span>}
                    <span className="beat-colon">：</span>
                    <span className="beat-line">{beat.line}</span>
                  </div>
                )
              }
              if (beat.type === 'action') {
                return (
                  <div key={k} className="beat-action">
                    {beat.emotion && <span className="beat-emotion-tag">【{beat.emotion}】</span>}
                    <span className="beat-character">{beat.character}</span>
                    <span>（{beat.action}）</span>
                  </div>
                )
              }
              if (beat.type === 'note') {
                return <div key={k} className="beat-note">📝 {beat.notes || beat.line || beat.action || '舞台备注'}</div>
              }
              return null
            })}
          </div>

          {/* 转场 */}
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 10, textAlign: 'right' }}>
            🔄 {scene.transition.type} → {scene.transition.to === 'end' ? '剧终' : `第${scene.transition.to}场`}
          </div>
        </div>
      ))}
    </div>
  )
}

// ==================== 兜底渲染：将YAML源码转为可读文本 ====================
function fallbackRender(text) {
  if (!text) return <div className="script-display">暂无内容</div>
  // 清理YAML标记，转为可读文本
  const lines = text.split('\n')
  const output = []
  let currentSection = null

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#') || trimmed === 'script:') continue

    // 元数据和标题
    if (trimmed.startsWith('title:')) output.push(<h3 key={output.length} style={{ color: 'var(--vermillion)', fontSize: 18, marginBottom: 4 }}>{extractVal(trimmed)}</h3>)
    else if (trimmed.startsWith('source:')) output.push(<div key={output.length} style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>原著：{extractVal(trimmed)}</div>)

    // 角色段落
    else if (trimmed === 'characters:') output.push(<h4 key={output.length} className="rendered-section-title">🎭 角色列表</h4>)
    else if (trimmed.startsWith('name:') && line.search(/\S/) === 6) output.push(
      <div key={output.length} className="rendered-char-card" style={{ marginBottom: 8, display: 'inline-block', marginRight: 8 }}>
        <span className="char-name">{extractVal(trimmed)}</span>
      </div>
    )
    else if (trimmed.startsWith('role:')) {/* skip - shown with name */}

    // 场景
    else if (trimmed.startsWith('chapter:')) {
      currentSection = 'scene'
      output.push(<div key={output.length} className="scene-heading" style={{ marginTop: 16 }}>
        <span className="scene-number">📖</span>
        <span className="scene-chapter">{extractVal(trimmed)}</span>
      </div>)
    }
    else if (trimmed.startsWith('location:')) output.push(<span key={output.length} className="scene-location">{extractVal(trimmed)}</span>)
    else if (trimmed.startsWith('time:')) output.push(<span key={output.length} className="scene-time"> · {extractVal(trimmed)}</span>)
    else if (trimmed.startsWith('description:') && !trimmed.includes('characters_present')) {
      output.push(<div key={output.length} className="scene-desc">{extractVal(trimmed)}</div>)
    }

    // 对话
    else if (trimmed.startsWith('type:') && extractVal(trimmed) === 'dialogue') currentSection = 'dialogue'
    else if (trimmed.startsWith('type:') && extractVal(trimmed) === 'action') currentSection = 'action'
    else if (trimmed.startsWith('character:') && currentSection === 'dialogue') output.push(
      <div key={output.length} className="beat-dialogue"><span className="beat-character">{extractVal(trimmed)}</span>
    )
    else if (trimmed.startsWith('line:')) output.push(
      <span key={output.length}><span className="beat-colon">：</span><span className="beat-line">{extractVal(trimmed)}</span></div>
    )
    else if (trimmed.startsWith('emotion:') && currentSection === 'dialogue') output.push(
      <span key={output.length} className="beat-emotion">【{extractVal(trimmed)}】</span>
    )
    else if (trimmed.startsWith('delivery:')) output.push(
      <span key={output.length} className="beat-delivery">（{extractVal(trimmed)}）</span>
    )

    // 动作
    else if (trimmed.startsWith('character:') && currentSection === 'action') output.push(
      <div key={output.length} className="beat-action"><span className="beat-character">{extractVal(trimmed)}</span>
    )
    else if (trimmed.startsWith('action:')) output.push(
      <span key={output.length}>（{extractVal(trimmed)}）</span></div>
    )
    else if (trimmed.startsWith('emotion:') && currentSection === 'action') output.push(
      <span key={output.length} className="beat-emotion-tag">【{extractVal(trimmed)}】</span>
    )

    // 转场
    else if (trimmed.startsWith('to:') && line.search(/\S/) === 8) output.push(
      <div key={output.length} style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'right', marginTop: 8 }}>
        🔄 → {extractVal(trimmed) === 'end' ? '剧终' : extractVal(trimmed)}
      </div>
    )

    // 描述文本（顶格缩进的一般描述）
    else if (line.search(/\S/) >= 8 && trimmed && !trimmed.startsWith('-') && !trimmed.includes(':')) {
      // 可能是多行描述的一部分，跳过
    }
  }

  if (output.length === 0) {
    // 完全无法解析，显示纯文本
    return <div style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', fontSize: 14, lineHeight: 2, padding: 20 }}>{text}</div>
  }

  return <div style={{ padding: 16 }}>{output}</div>
}

function extractVal(line) {
  const m = line.match(/"([^"]*)"/)
  if (m) return m[1]
  const idx = line.indexOf(':')
  return idx >= 0 ? line.substring(idx + 1).trim().replace(/^"/, '').replace(/"$/, '') : line
}

// ==================== 主组件 ====================
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
  const [showYaml, setShowYaml] = useState(false)
  const [editContent, setEditContent] = useState('')
  const [editTitle, setEditTitle] = useState('')
  const [toast, setToast] = useState(null)

  // 智能编辑模块
  const [editModule, setEditModule] = useState(null) // 'dialogue'|'action'|'scene'|'entrance'|'transition'|'character'|null
  const [editingItems, setEditingItems] = useState([]) // 当前模块的编辑项

  // 角色相关
  const [characters, setCharacters] = useState([])
  const [selectedCharacter, setSelectedCharacter] = useState(null)
  const [extractedContent, setExtractedContent] = useState('')
  const [extracting, setExtracting] = useState(false)
  const [renameOldName, setRenameOldName] = useState('')
  const [renameNewName, setRenameNewName] = useState('')
  const [renaming, setRenaming] = useState(false)

  // 摘要
  const [summary, setSummary] = useState(null)
  const [summarizing, setSummarizing] = useState(false)
  const [showCreator, setShowCreator] = useState(false)
  const [newChar, setNewChar] = useState({
    name: '', aliases: '', gender: '其他', age: '', role: '配角',
    description: '', personality: '', appearance: '',
    dialogue_lines: [], actions: [], scene_appearances: []
  })
  const [creating, setCreating] = useState(false)

  const showToast = (msg, type = 'success') => { setToast({ message: msg, type }); setTimeout(() => setToast(null), 3000) }

  // ==================== 智能编辑模块 ====================
  const openEditModule = (module) => {
    const data = parseYamlScript(editContent)
    let items = []

    switch (module) {
      case 'dialogue':
        data.scenes.forEach(scene => {
          scene.beats.filter(b => b.type === 'dialogue').forEach(b => {
            items.push({ sceneId: scene.id, sceneChapter: scene.chapter, beatId: b.id, type: 'dialogue', character: b.character, line: b.line, emotion: b.emotion, delivery: b.delivery })
          })
        })
        break
      case 'action':
        data.scenes.forEach(scene => {
          scene.beats.filter(b => b.type === 'action').forEach(b => {
            items.push({ sceneId: scene.id, sceneChapter: scene.chapter, beatId: b.id, type: 'action', character: b.character, action: b.action, emotion: b.emotion, notes: b.notes })
          })
        })
        break
      case 'scene':
        data.scenes.forEach(scene => {
          items.push({ sceneId: scene.id, chapter: scene.chapter, location: scene.heading.location, time: scene.heading.time, description: scene.description })
        })
        break
      case 'entrance':
        data.scenes.forEach(scene => {
          scene.entrance_timing.forEach(et => {
            items.push({ sceneId: scene.id, character: et.character, timing: et.timing })
          })
        })
        break
      case 'transition':
        data.scenes.forEach(scene => {
          items.push({ sceneId: scene.id, to: scene.transition.to, type: scene.transition.type })
        })
        break
      case 'character':
        data.characters.forEach(c => {
          items.push({ id: c.id, name: c.name, role: c.role, gender: c.gender, age: c.age, description: c.description })
        })
        break
    }

    setEditModule(module)
    setEditingItems(items)
  }

  const updateEditItem = (index, field, value) => {
    const newItems = [...editingItems]
    newItems[index] = { ...newItems[index], [field]: value }
    setEditingItems(newItems)
  }

  const saveEditModule = () => {
    let newYaml = editContent
    editingItems.forEach(item => {
      if (item.beatId) {
        const updated = { type: item.type, character: item.character || '', emotion: item.emotion || '', delivery: item.delivery || '', notes: item.notes || '' }
        if (item.type === 'dialogue') updated.line = item.line || ''
        if (item.type === 'action') updated.action = item.action || ''
        newYaml = updateBeatInYaml(newYaml, item.sceneId, item.beatId, updated)
      }
    })
    setEditContent(newYaml)
    setEditModule(null)
    setEditingItems([])
    showToast('修改已应用')
  }

  const editModules = [
    { key: 'dialogue', label: '💬 角色对话', desc: '提取并编辑所有台词' },
    { key: 'action', label: '🎬 角色动作', desc: '提取并编辑所有动作' },
    { key: 'scene', label: '🏠 场景描述', desc: '编辑场景地点、时间、描述' },
    { key: 'entrance', label: '⏰ 上场时机', desc: '编辑角色上场时机' },
    { key: 'transition', label: '🔄 转场设置', desc: '编辑场景转场方式' },
    { key: 'character', label: '👤 角色定义', desc: '编辑角色信息' },
  ]

  // ==================== 数据加载 ====================
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
    } catch { showToast('剧本不存在', 'error'); navigate('/scripts') }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchScript() }, [id])

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await apiFetch(`${API_BASE}/scripts/${id}`, {
        method: 'PUT', body: JSON.stringify({ title: editTitle, script_content: editContent }),
      })
      if (!res.ok) throw new Error('Save failed')
      const data = await res.json()
      setScript(data)
      showToast(t.saveSuccess)
    } catch { showToast(t.saveFailed, 'error') }
    finally { setSaving(false) }
  }

  const handleDelete = async () => {
    try { await apiFetch(`${API_BASE}/scripts/${id}`, { method: 'DELETE' }); showToast(t.deleteSuccess); navigate('/scripts') }
    catch { showToast(t.saveFailed, 'error') }
  }

  const handleExtractCharacter = async (charName) => {
    const name = charName || selectedCharacter
    if (!name) return
    setExtracting(true); setExtractedContent('')
    try {
      const res = await apiFetch(`${API_BASE}/scripts/${id}/characters/extract?character_name=${encodeURIComponent(name)}`, { method: 'POST' })
      if (!res.ok) throw new Error('')
      setExtractedContent((await res.json()).extracted_content)
    } catch { showToast('提取失败', 'error') }
    finally { setExtracting(false) }
  }

  const handleRename = async () => {
    if (!renameOldName || !renameNewName) return
    setRenaming(true)
    try {
      const res = await apiFetch(`${API_BASE}/scripts/${id}/rename-character`, {
        method: 'POST', body: JSON.stringify({ old_name: renameOldName, new_name: renameNewName }),
      })
      if (!res.ok) throw new Error('')
      const data = await res.json()
      setScript(data); setEditContent(data.script_content || ''); setRenameOldName(''); setRenameNewName('')
      if (data.characters_json) { try { setCharacters(JSON.parse(data.characters_json)) } catch {} }
      showToast(t.renameSuccess)
    } catch { showToast(t.renameFailed, 'error') }
    finally { setRenaming(false) }
  }

  const handleSummarize = async () => {
    setSummarizing(true)
    try {
      const res = await apiFetch(`${API_BASE}/scripts/${id}/summarize`, { method: 'POST' })
      if (!res.ok) throw new Error('')
      const data = await res.json()
      setSummary(data.summary || data.summary_raw || '')
    } catch { showToast('摘要生成失败', 'error') }
    finally { setSummarizing(false) }
  }

  const handleCreateCharacter = async () => {
    if (!newChar.name) return
    setCreating(true)
    try {
      const aliasesList = newChar.aliases ? newChar.aliases.split(',').map(s => s.trim()).filter(Boolean) : []
      const res = await apiFetch(`${API_BASE}/scripts/${id}/custom-character`, {
        method: 'POST', body: JSON.stringify({ ...newChar, aliases: aliasesList }),
      })
      if (!res.ok) throw new Error('')
      const data = await res.json()
      setScript(data.script); setEditContent(data.script.script_content || '')
      setNewChar({ name: '', aliases: '', gender: '其他', age: '', role: '配角', description: '', personality: '', appearance: '', dialogue_lines: [], actions: [], scene_appearances: [] })
      setShowCreator(false); showToast(`角色 ${newChar.name} 已添加`)
    } catch { showToast('创建失败', 'error') }
    finally { setCreating(false) }
  }

  if (loading) return <div className="loading-container"><div className="loading-spinner" /><span>{t.loading}</span></div>
  if (!script) return null

  const moduleLabels = {
    dialogue: '角色对话编辑', action: '角色动作编辑', scene: '场景描述编辑',
    entrance: '上场时机编辑', transition: '转场设置编辑', character: '角色定义编辑'
  }

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
        <span className="tag">{script.category}</span>
      </div>

      <div className="tabs">
        <button className={`tab ${activeTab === 'view' ? 'active' : ''}`} onClick={() => setActiveTab('view')}>📖 阅读剧本</button>
        <button className={`tab ${activeTab === 'edit' ? 'active' : ''}`} onClick={() => setActiveTab('edit')}>✏️ 编辑剧本</button>
        <button className={`tab ${activeTab === 'summary' ? 'active' : ''}`} onClick={() => { setActiveTab('summary'); if (!summary) handleSummarize() }}>📊 智能摘要</button>
        <button className={`tab ${activeTab === 'characters' ? 'active' : ''}`} onClick={() => setActiveTab('characters')}>👤 角色管理</button>
        <button className={`tab ${activeTab === 'creator' ? 'active' : ''}`} onClick={() => setActiveTab('creator')}>🎭 自定义角色</button>
      </div>

      {/* ============ 阅读视图 ============ */}
      {activeTab === 'view' && (
        <div className="card">
          <div className="script-rendered-wrapper">
            {renderScript(script.script_content) || fallbackRender(script.script_content)}
          </div>
          <div style={{ marginTop: 14, textAlign: 'right' }}>
            <button className="btn btn-outline btn-sm" onClick={() => setShowYaml(true)}>📝 查看YAML源码</button>
          </div>
          {showYaml && (
            <div className="modal-overlay" onClick={() => setShowYaml(false)}>
              <div className="modal" style={{ maxWidth: 800, maxHeight: '80vh', overflow: 'auto' }} onClick={e => e.stopPropagation()}>
                <h3>📝 YAML 源码</h3>
                <pre className="script-display" style={{ fontSize: 12, maxHeight: 500 }}>{script.script_content}</pre>
                <div className="modal-actions"><button className="btn btn-outline" onClick={() => setShowYaml(false)}>关闭</button></div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============ 编辑视图 ============ */}
      {activeTab === 'edit' && (
        <div className="card">
          <div className="form-group" style={{ marginBottom: 10 }}>
            <label>{t.titlePlaceholder}</label>
            <input className="input" value={editTitle} onChange={e => setEditTitle(e.target.value)} />
          </div>

          {/* 智能编辑模块按钮 */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8, display: 'block', letterSpacing: 1 }}>
              🧩 智能编辑模块 — 点击提取并编辑特定内容
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              {editModules.map(mod => (
                <button key={mod.key} className={`btn btn-sm ${editModule === mod.key ? 'btn-primary' : 'btn-outline'}`}
                  onClick={() => editModule === mod.key ? (setEditModule(null), setEditingItems([])) : openEditModule(mod.key)}
                  title={mod.desc}>
                  {mod.label}
                </button>
              ))}
            </div>
          </div>

          {/* 智能编辑面板 */}
          {editModule && editingItems.length > 0 && (
            <div style={{ background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 16, marginBottom: 14 }}>
              <h4 style={{ fontSize: 14, color: 'var(--vermillion)', marginBottom: 12, letterSpacing: 1 }}>
                📝 {moduleLabels[editModule]} ({editingItems.length}项)
              </h4>
              <div style={{ maxHeight: 400, overflow: 'auto' }}>
                {editingItems.map((item, idx) => (
                  <div key={idx} style={{ marginBottom: 12, padding: 10, background: 'var(--paper-light)', borderRadius: 6, border: '1px solid var(--border-light)' }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>
                      场景{item.sceneId} {item.sceneChapter && `· ${item.sceneChapter}`}
                    </div>
                    {editModule === 'dialogue' && (
                      <>
                        <div style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
                          <input className="input" style={{ width: 120 }} value={item.character} onChange={e => updateEditItem(idx, 'character', e.target.value)} placeholder="角色" />
                          <input className="input" style={{ width: 100 }} value={item.emotion} onChange={e => updateEditItem(idx, 'emotion', e.target.value)} placeholder="情绪" />
                          <input className="input" style={{ width: 100 }} value={item.delivery} onChange={e => updateEditItem(idx, 'delivery', e.target.value)} placeholder="语气" />
                        </div>
                        <textarea className="textarea" rows={2} value={item.line} onChange={e => updateEditItem(idx, 'line', e.target.value)} placeholder="台词内容" />
                      </>
                    )}
                    {editModule === 'action' && (
                      <>
                        <div style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
                          <input className="input" style={{ width: 120 }} value={item.character} onChange={e => updateEditItem(idx, 'character', e.target.value)} placeholder="角色" />
                          <input className="input" style={{ flex: 1 }} value={item.emotion} onChange={e => updateEditItem(idx, 'emotion', e.target.value)} placeholder="情绪" />
                        </div>
                        <textarea className="textarea" rows={2} value={item.action} onChange={e => updateEditItem(idx, 'action', e.target.value)} placeholder="动作描述" />
                      </>
                    )}
                    {editModule === 'scene' && (
                      <>
                        <div style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
                          <input className="input" style={{ width: 140 }} value={item.chapter} onChange={e => updateEditItem(idx, 'chapter', e.target.value)} placeholder="章节" />
                          <input className="input" style={{ width: 120 }} value={item.location} onChange={e => updateEditItem(idx, 'location', e.target.value)} placeholder="地点" />
                          <input className="input" style={{ width: 80 }} value={item.time} onChange={e => updateEditItem(idx, 'time', e.target.value)} placeholder="时间" />
                        </div>
                        <textarea className="textarea" rows={2} value={item.description} onChange={e => updateEditItem(idx, 'description', e.target.value)} placeholder="场景描述" />
                      </>
                    )}
                    {editModule === 'entrance' && (
                      <div style={{ display: 'flex', gap: 8 }}>
                        <input className="input" style={{ width: 140 }} value={item.character} onChange={e => updateEditItem(idx, 'character', e.target.value)} placeholder="角色" />
                        <input className="input" style={{ flex: 1 }} value={item.timing} onChange={e => updateEditItem(idx, 'timing', e.target.value)} placeholder="上场时机" />
                      </div>
                    )}
                    {editModule === 'transition' && (
                      <div style={{ display: 'flex', gap: 8 }}>
                        <input className="input" style={{ width: 100 }} value={item.to} onChange={e => updateEditItem(idx, 'to', e.target.value)} placeholder="转场到" />
                        <input className="input" style={{ width: 100 }} value={item.type} onChange={e => updateEditItem(idx, 'type', e.target.value)} placeholder="方式" />
                      </div>
                    )}
                    {editModule === 'character' && (
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <input className="input" style={{ width: 120 }} value={item.name} onChange={e => updateEditItem(idx, 'name', e.target.value)} placeholder="角色名" />
                        <input className="input" style={{ width: 80 }} value={item.role} onChange={e => updateEditItem(idx, 'role', e.target.value)} placeholder="角色类型" />
                        <input className="input" style={{ width: 80 }} value={item.gender} onChange={e => updateEditItem(idx, 'gender', e.target.value)} placeholder="性别" />
                        <input className="input" style={{ flex: 1 }} value={item.description} onChange={e => updateEditItem(idx, 'description', e.target.value)} placeholder="角色描述" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 12, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button className="btn btn-outline btn-sm" onClick={() => { setEditModule(null); setEditingItems([]) }}>取消</button>
                <button className="btn btn-primary btn-sm" onClick={saveEditModule}>✅ 应用修改</button>
              </div>
            </div>
          )}

          {/* 格式化预览 */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4, letterSpacing: 1 }}>
              📖 剧本实时预览
            </div>
            <div style={{ background: 'var(--paper)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius)', padding: 16, maxHeight: 400, overflow: 'auto' }}>
              {renderScript(editContent) || <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>无法解析当前内容，请检查格式</div>}
            </div>
          </div>

          {/* YAML 编辑（折叠） */}
          <details>
            <summary style={{ cursor: 'pointer', fontSize: 12, color: 'var(--text-muted)', letterSpacing: 1 }}>
              📝 高级：直接编辑YAML源码
            </summary>
            <textarea className="script-editor" value={editContent}
              onChange={e => setEditContent(e.target.value)} rows={16} style={{ marginTop: 8 }} />
          </details>

          <div style={{ marginTop: 14, display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button className="btn btn-outline" onClick={() => { setEditContent(script.script_content || ''); setEditTitle(script.title || '') }}>{t.cancel}</button>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
              {saving && <span className="spinner" />}{t.save}
            </button>
          </div>
        </div>
      )}

      {/* ============ 智能摘要 ============ */}
      {activeTab === 'summary' && (
        <div>
          {summarizing && <div className="loading-container" style={{ padding: 40 }}><div className="loading-spinner" /><span>AI 正在分析剧本...</span></div>}
          {summary && (
            <div>
              {summary.overview && <div className="summary-overview">📝 {summary.overview}</div>}
              <div className="summary-panel">
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
                {summary.main_characters && (
                  <div className="summary-card">
                    <h4>👤 主要人物</h4>
                    {summary.main_characters.map((c, i) => (
                      <div key={i} className="item">
                        <div className="item-name">{c.name} <span className="tag">{c.role}</span></div>
                        <div className="item-desc">性格：{c.personality}</div>
                        <div className="item-desc">行动：{c.main_actions}</div>
                      </div>
                    ))}
                  </div>
                )}
                {summary.main_scenes && (
                  <div className="summary-card">
                    <h4>🏠 主要场景</h4>
                    {summary.main_scenes.map((s, i) => (
                      <div key={i} className="item"><div className="item-name">{s.location} · {s.time}</div><div className="item-desc">{s.description}</div></div>
                    ))}
                  </div>
                )}
                {summary.key_events && (
                  <div className="summary-card">
                    <h4>⚡ 关键事件</h4>
                    {summary.key_events.map((e, i) => (
                      <div key={i} className="item">
                        <div className="item-name">{e.event} <span className="tag">场景{e.scene_id}</span></div>
                        <div className="item-desc">{e.description}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {summary.emotional_arc && <div className="emotional-arc">🎭 情绪走向：{summary.emotional_arc}</div>}
              {summary.themes && (
                <div className="themes-list">
                  <span style={{ fontSize: 12, color: 'var(--text-secondary)', marginRight: 4 }}>🏷️ 主题：</span>
                  {summary.themes.map((th, i) => <span key={i} className="theme-tag">{th}</span>)}
                </div>
              )}
            </div>
          )}
          {!summary && !summarizing && (
            <div className="empty-state card"><div className="empty-icon">📊</div><h3>AI 智能分析</h3><button className="btn btn-primary" onClick={handleSummarize} style={{ marginTop: 12 }}>🤖 生成智能摘要</button></div>
          )}
        </div>
      )}

      {/* ============ 角色管理 ============ */}
      {activeTab === 'characters' && (
        <div>
          <div className="card" style={{ marginBottom: 14 }}>
            <h3 style={{ marginBottom: 10 }}>{t.characters}</h3>
            {characters.length > 0 ? (
              <div className="character-list">
                {characters.map(char => (
                  <button key={char} className={`character-chip ${selectedCharacter === char ? 'selected' : ''}`}
                    onClick={() => { setSelectedCharacter(char); setRenameOldName(char); setExtractedContent('') }}>{char}</button>
                ))}
              </div>
            ) : <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>暂无角色数据</p>}
          </div>
          {selectedCharacter && (
            <div className="character-extract">
              <h3>🎭 {selectedCharacter} 的戏份</h3>
              <button className="btn btn-primary btn-sm" onClick={() => handleExtractCharacter(selectedCharacter)} disabled={extracting}
                style={{ marginBottom: 10 }}>{extracting && <span className="spinner" />}{t.extractCharacter}</button>
              {extractedContent && <div className="extracted-content">{extractedContent}</div>}
            </div>
          )}
          <div className="rename-section">
            <h3>✏️ {t.rename}</h3>
            <div className="rename-row">
              <div className="form-group"><label>{t.oldName}</label><input className="input" value={renameOldName} onChange={e => setRenameOldName(e.target.value)} /></div>
              <div className="form-group"><label>{t.newName}</label><input className="input" value={renameNewName} onChange={e => setRenameNewName(e.target.value)} /></div>
              <button className="btn btn-primary" onClick={handleRename} disabled={renaming || !renameOldName || !renameNewName}>{renaming && <span className="spinner" />}{t.replaceAll}</button>
            </div>
          </div>
        </div>
      )}

      {/* ============ 自定义角色 ============ */}
      {activeTab === 'creator' && (
        <div className="character-creator">
          <h3>🎭 自定义角色创建器</h3>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>定义角色的台词、动作、神态、出场时间、场景和主要事件。</p>
          <div className="creator-grid">
            <div className="form-group"><label>角色名 *</label><input className="input" value={newChar.name} onChange={e => setNewChar({ ...newChar, name: e.target.value })} placeholder="必填" /></div>
            <div className="form-group"><label>别名</label><input className="input" value={newChar.aliases} onChange={e => setNewChar({ ...newChar, aliases: e.target.value })} placeholder="逗号分隔" /></div>
            <div className="form-group"><label>性别</label><select className="select" value={newChar.gender} onChange={e => setNewChar({ ...newChar, gender: e.target.value })}><option>男</option><option>女</option><option>其他</option></select></div>
            <div className="form-group"><label>年龄</label><input className="input" value={newChar.age} onChange={e => setNewChar({ ...newChar, age: e.target.value })} /></div>
            <div className="form-group"><label>角色类型</label><select className="select" value={newChar.role} onChange={e => setNewChar({ ...newChar, role: e.target.value })}><option>主角</option><option>配角</option><option>客串</option></select></div>
            <div className="form-group creator-full"><label>角色描述</label><textarea className="textarea" value={newChar.description} onChange={e => setNewChar({ ...newChar, description: e.target.value })} rows={2} /></div>
            <div className="form-group"><label>性格</label><input className="input" value={newChar.personality} onChange={e => setNewChar({ ...newChar, personality: e.target.value })} /></div>
            <div className="form-group"><label>外貌</label><input className="input" value={newChar.appearance} onChange={e => setNewChar({ ...newChar, appearance: e.target.value })} /></div>
          </div>
          <div style={{ marginTop: 16, display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button className="btn btn-outline" onClick={() => setNewChar({ name: '', aliases: '', gender: '其他', age: '', role: '配角', description: '', personality: '', appearance: '', dialogue_lines: [], actions: [], scene_appearances: [] })}>重置</button>
            <button className="btn btn-gold" onClick={handleCreateCharacter} disabled={creating || !newChar.name}>{creating && <span className="spinner" />}➕ 添加到剧本</button>
          </div>
        </div>
      )}
    </div>
  )
}
