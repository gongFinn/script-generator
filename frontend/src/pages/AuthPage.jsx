import React, { useState, useContext } from 'react'
import { LanguageContext, AuthContext, API_BASE } from '../App'

export default function AuthPage() {
  const { t } = useContext(LanguageContext)
  const { login } = useContext(AuthContext)

  const [mode, setMode] = useState('login') // 'login' | 'register'
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (username.length < 2) {
      setError('用户名至少2个字符')
      return
    }
    if (password.length < 6) {
      setError('密码至少6个字符')
      return
    }

    setLoading(true)
    try {
      const endpoint = mode === 'login' ? '/auth/login' : '/auth/register'
      const body = { username, password }
      if (mode === 'register' && email) body.email = email

      const res = await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.detail || '操作失败')
      }

      login(data.user, data.token)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card card">
        <h2>{mode === 'login' ? '🔑 ' + t.login : '📝 ' + t.register}</h2>
        <p className="auth-subtitle">
          {mode === 'login'
            ? '登录后使用AI剧本生成功能'
            : '创建账号以保存你的剧本'}
        </p>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label>{t.username}</label>
            <input
              className="input"
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder={t.username}
              autoFocus
            />
          </div>

          {mode === 'register' && (
            <div className="form-group">
              <label>{t.email}</label>
              <input
                className="input"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder={t.email}
              />
            </div>
          )}

          <div className="form-group">
            <label>{t.password}</label>
            <input
              className="input"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder={t.password}
            />
          </div>

          <button className="btn btn-primary btn-lg auth-submit" type="submit" disabled={loading}>
            {loading && <span className="spinner" />}
            {mode === 'login' ? t.login : t.register}
          </button>
        </form>

        <div className="auth-switch">
          {mode === 'login' ? (
            <button className="btn-link" onClick={() => setMode('register')}>{t.noAccount}</button>
          ) : (
            <button className="btn-link" onClick={() => setMode('login')}>{t.hasAccount}</button>
          )}
        </div>
      </div>
    </div>
  )
}
