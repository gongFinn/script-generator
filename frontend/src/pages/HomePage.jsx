import React, { useState, useContext, useRef, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { LanguageContext, LANGUAGES, AuthContext, API_BASE } from '../App'

export default function HomePage() {
  const { t, language: uiLang } = useContext(LanguageContext)
  const { isLoggedIn, apiFetch } = useContext(AuthContext)
  const navigate = useNavigate()

  const [text, setText] = useState('')
  const [title, setTitle] = useState('')
  const [outputLanguage, setOutputLanguage] = useState('zh-CN')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [toast, setToast] = useState(null)
  const [publicUrl, setPublicUrl] = useState(null)

  // 文件上传相关状态
  const [isDragOver, setIsDragOver] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadedFile, setUploadedFile] = useState(null)
  const fileInputRef = useRef(null)

  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  // 获取公网URL
  useEffect(() => {
    fetch(`${API_BASE}/public-url`)
      .then(res => res.json())
      .then(data => {
        if (data.primary) setPublicUrl(data.primary)
      })
      .catch(() => {})
  }, [])

  // 处理文件上传
  const processFile = async (file) => {
    // 检查文件类型
    const ext = '.' + file.name.split('.').pop().toLowerCase()
    if (!['.txt', '.docx'].includes(ext)) {
      showToast(t.uploadFailed + ': ' + t.uploadHint, 'error')
      return
    }

    setUploading(true)
    setUploadedFile(null)
    setError('')

    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await apiFetch(`${API_BASE}/upload-text?language=${encodeURIComponent(uiLang)}`, {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.detail || t.uploadFailed)
      }

      const data = await res.json()
      setText(data.text)
      setUploadedFile({ name: data.filename, type: data.file_type, size: data.char_count })
      showToast(t.uploadSuccess.replace('{count}', data.char_count))
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setUploading(false)
      setIsDragOver(false)
    }
  }

  // 拖拽事件处理
  const handleDragEnter = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    // 只在离开drop区域时取消高亮
    if (e.currentTarget === e.target || !e.currentTarget.contains(e.relatedTarget)) {
      setIsDragOver(false)
    }
  }, [])

  const handleDragOver = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)

    const files = e.dataTransfer.files
    if (files.length > 0) {
      processFile(files[0])
    }
  }, [uiLang])

  // 点击选择文件
  const handleFileSelect = (e) => {
    const files = e.target.files
    if (files.length > 0) {
      processFile(files[0])
    }
    // 重置input，允许重复选择同一文件
    e.target.value = ''
  }

  // 一步到位：上传文件并直接转换
  const handleUploadAndConvert = async () => {
    if (!uploadedFile) return
    if (text.trim().length < 50) {
      setError(t.fileTooShort)
      return
    }

    setError('')
    setLoading(true)
    setResult(null)

    try {
      const res = await fetch(`${API_BASE}/convert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: text.trim(),
          title: title.trim() || undefined,
          language: outputLanguage,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.detail || t.convertFailed)
      }

      const data = await res.json()
      setResult(data)
      showToast(t.convertSuccess)
    } catch (err) {
      setError(err.message)
      showToast(err.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleConvert = async () => {
    if (text.trim().length < 50) {
      setError(t.textRequired)
      return
    }
    setError('')
    setLoading(true)
    setResult(null)

    try {
      const res = await apiFetch(`${API_BASE}/convert`, {
        method: 'POST',
        body: JSON.stringify({
          text: text.trim(),
          title: title.trim() || undefined,
          language: outputLanguage,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.detail || t.convertFailed)
      }

      const data = await res.json()
      setResult(data)
      showToast(t.convertSuccess)
    } catch (err) {
      setError(err.message)
      showToast(err.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  // 未登录时显示登录提示
  if (!isLoggedIn) {
    return (
      <div className="home-page">
        <div className="hero">
          <h2>🎬 {t.appTitle}</h2>
          <p>{t.subtitle}</p>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: 48 }}>
          <p style={{ fontSize: 18, marginBottom: 16, color: 'var(--text-secondary)' }}>🔒 {t.pleaseLogin}</p>
          <button className="btn btn-primary btn-lg" onClick={() => navigate('/auth')}>
            {t.login} / {t.register}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="home-page">
      {toast && (
        <div className={`toast toast-${toast.type}`}>{toast.message}</div>
      )}

      <div className="hero">
        <h2>🎬 {t.appTitle}</h2>
        <p>{t.subtitle}</p>
        {publicUrl && (
          <div className="public-url-bar">
            <span className="public-url-label">🌐 公网地址：</span>
            <a href={publicUrl} target="_blank" rel="noopener noreferrer" className="public-url-link">
              {publicUrl}
            </a>
            <button
              className="btn btn-sm btn-outline"
              onClick={() => {
                navigator.clipboard.writeText(publicUrl)
                showToast('已复制到剪贴板')
              }}
              style={{ marginLeft: 8, fontSize: 12 }}
            >
              📋 复制
            </button>
          </div>
        )}
      </div>

      <div className="card">
        {/* 文件上传区域 */}
        <div
          className={`file-upload-zone ${isDragOver ? 'drag-over' : ''} ${uploading ? 'uploading' : ''}`}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={() => !uploading && fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,.docx"
            style={{ display: 'none' }}
            onChange={handleFileSelect}
          />

          {uploading ? (
            <div className="upload-status">
              <div className="loading-spinner" />
              <span>{t.uploading}</span>
            </div>
          ) : uploadedFile ? (
            <div className="upload-success-status">
              <span className="upload-icon">📄</span>
              <div className="upload-file-info">
                <span className="upload-filename">{uploadedFile.name}</span>
                <span className="upload-meta">
                  {uploadedFile.type.toUpperCase()} · {uploadedFile.size.toLocaleString()} 字符
                </span>
              </div>
              <button
                className="btn btn-outline btn-sm"
                onClick={(e) => {
                  e.stopPropagation()
                  setUploadedFile(null)
                  setText('')
                  if (fileInputRef.current) fileInputRef.current.value = ''
                }}
              >
                ✕
              </button>
            </div>
          ) : (
            <div className="upload-prompt">
              <span className="upload-icon">📁</span>
              <span className="upload-text">{t.uploadDrag}</span>
              <span className="upload-hint">{t.uploadHint}</span>
            </div>
          )}
        </div>

        <div className="convert-form" style={{ marginTop: 16 }}>
          <div className="form-row">
            <div className="form-group">
              <label>{t.titlePlaceholder}</label>
              <input
                className="input"
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder={t.titlePlaceholder}
              />
            </div>
            <div className="form-group">
              <label>{t.outputLanguage}</label>
              <select
                className="select"
                value={outputLanguage}
                onChange={e => setOutputLanguage(e.target.value)}
              >
                {LANGUAGES.map(lang => (
                  <option key={lang.code} value={lang.code}>
                    {lang.flag} {lang.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>{t.inputPlaceholder}</label>
            <textarea
              className="textarea"
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder={t.inputPlaceholder}
              rows={14}
            />
            <div className="char-count">
              {text.length} / 50 {uiLang === 'en' ? 'min' : '最少'}
              {error && <span style={{ color: 'var(--danger)', marginLeft: 12 }}>{error}</span>}
            </div>
          </div>

          <div className="form-actions">
            <button
              className="btn btn-primary btn-lg"
              onClick={handleConvert}
              disabled={loading}
            >
              {loading && <span className="spinner" />}
              {loading ? t.converting : t.convert}
            </button>
          </div>
        </div>
      </div>

      {result && (
        <div className="convert-result card">
          <div className="result-header">
            <h3>✅ {t.convertSuccess}</h3>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                className="btn btn-outline btn-sm"
                onClick={() => navigate(`/scripts/${result.id}`)}
              >
                {t.edit}
              </button>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => navigate('/scripts')}
              >
                {t.scripts}
              </button>
            </div>
          </div>
          <div className="script-preview">
            {result.script_content}
          </div>
        </div>
      )}
    </div>
  )
}
