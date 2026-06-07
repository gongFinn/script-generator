import React, { useState, createContext, useContext, useEffect, useCallback } from 'react'
import { Routes, Route, Link, useLocation, Navigate } from 'react-router-dom'
import HomePage from './pages/HomePage'
import ScriptViewPage from './pages/ScriptViewPage'
import ScriptListPage from './pages/ScriptListPage'
import AuthPage from './pages/AuthPage'

// 语言上下文
export const LanguageContext = createContext()

// 认证上下文
export const AuthContext = createContext()

export const API_BASE = '/api'

export const LANGUAGES = [
  { code: 'zh-CN', label: '简体中文', flag: '🇨🇳' },
  { code: 'zh-TW', label: '繁體中文', flag: '🇹🇼' },
  { code: 'en', label: 'English', flag: '🇺🇸' },
]

export const CATEGORIES = [
  { code: 'asian', label: '亚洲文学', flag: '🏮', icon: '⛩️', en_label: 'Asian Literature' },
  { code: 'european', label: '欧洲文学', flag: '🏰', icon: '🎭', en_label: 'European Literature' },
  { code: 'american', label: '美洲文学', flag: '🗽', icon: '🌵', en_label: 'American Literature' },
  { code: 'other', label: '其他文学', flag: '🌍', icon: '📚', en_label: 'Other Literature' },
]

// 区域主题CSS变量映射（覆盖:root中的CSS变量）
export const CATEGORY_THEMES = {
  asian: {
    '--paper': '#f5f0e8',
    '--paper-dark': '#e8e0d0',
    '--paper-light': '#faf7f0',
    '--vermillion': '#c41e3a',
    '--vermillion-hover': '#a0182e',
    '--gold': '#b8860b',
    '--gold-light': '#d4a745',
    '--indigo': '#1a3a5c',
    '--indigo-light': '#2a5a8c',
    '--jade': '#5b8c5a',
    '--jade-light': '#e8f0e8',
    '--border': '#d4c8b8',
    '--border-light': '#e8ddd0',
    '--text': '#2c2c2c',
    '--text-secondary': '#6b5e4e',
    '--theme-bg': '#ebe5d9',
    '--theme-font': "'Noto Serif SC', 'SimSun', serif",
    '--theme-ornament': '🏮',
  },
  european: {
    '--paper': '#f4f0eb',
    '--paper-dark': '#e5dfd5',
    '--paper-light': '#f9f6f2',
    '--vermillion': '#3a1a6c',
    '--vermillion-hover': '#241044',
    '--gold': '#8b6914',
    '--gold-light': '#c4a44a',
    '--indigo': '#2a406a',
    '--indigo-light': '#4a609a',
    '--jade': '#2d5a3d',
    '--jade-light': '#e5ede5',
    '--border': '#c8bfb0',
    '--border-light': '#dfd8cc',
    '--text': '#2a2218',
    '--text-secondary': '#6b5e4e',
    '--theme-bg': '#e8e4df',
    '--theme-font': "'Georgia', 'Times New Roman', serif",
    '--theme-ornament': '🏰',
  },
  american: {
    '--paper': '#f5f0e6',
    '--paper-dark': '#e5dcc8',
    '--paper-light': '#faf6ef',
    '--vermillion': '#8b3a1a',
    '--vermillion-hover': '#6b2a10',
    '--gold': '#b8780a',
    '--gold-light': '#d4982a',
    '--indigo': '#2a4a3c',
    '--indigo-light': '#4a7a5c',
    '--jade': '#4a7c3a',
    '--jade-light': '#eaf0e5',
    '--border': '#d0c8b8',
    '--border-light': '#e5ddd0',
    '--text': '#3a2a18',
    '--text-secondary': '#7a6a4a',
    '--theme-bg': '#eae3d8',
    '--theme-font': "'Palatino', 'Georgia', serif",
    '--theme-ornament': '🗽',
  },
  other: {
    '--paper': '#f2f4f6',
    '--paper-dark': '#e2e4e8',
    '--paper-light': '#f8f9fa',
    '--vermillion': '#2c5c6a',
    '--vermillion-hover': '#1a3c48',
    '--gold': '#5a8a8a',
    '--gold-light': '#8aaa9a',
    '--indigo': '#3a4a5a',
    '--indigo-light': '#5a6a7a',
    '--jade': '#3a6a4a',
    '--jade-light': '#e8eeec',
    '--border': '#c8ccd0',
    '--border-light': '#dfe2e6',
    '--text': '#2a3036',
    '--text-secondary': '#5a6066',
    '--theme-bg': '#e4e8ea',
    '--theme-font': "'Georgia', 'Noto Serif', serif",
    '--theme-ornament': '🌍',
  },
}

export const UI_TEXTS = {
  'zh-CN': {
    appTitle: '改编你爱的小说',
    home: '首页',
    subtitle: '将你喜欢的小说改成专业剧本',
    scripts: '剧本列表',
    newScript: '新建剧本',
    convert: '开始转换',
    converting: '转换中...',
    inputPlaceholder: '请粘贴您要转换为剧本的小说或文章内容（至少50个字符）...',
    titlePlaceholder: '可选：输入剧本标题',
    textRequired: '请输入至少50个字符的内容',
    convertSuccess: '剧本生成成功！',
    convertFailed: '生成失败，请稍后重试',
    deleteConfirm: '确定要删除该剧本吗？',
    deleteSuccess: '剧本已删除',
    save: '保存修改',
    saveSuccess: '保存成功',
    saveFailed: '保存失败',
    back: '返回',
    edit: '编辑',
    delete: '删除',
    characters: '角色列表',
    extractCharacter: '提取角色戏份',
    characterName: '角色名称',
    rename: '重命名角色',
    oldName: '原名',
    newName: '新名',
    renameSuccess: '角色名替换成功',
    renameFailed: '角色名替换失败',
    totalScripts: '共 {count} 个剧本',
    noScripts: '暂无剧本，快去创建一个吧！',
    loading: '加载中...',
    language: '界面语言',
    outputLanguage: '输出语言',
    viewDetails: '查看详情',
    createdAt: '创建时间',
    updatedAt: '更新时间',
    originalText: '原文内容',
    scriptContent: '剧本内容',
    characterLines: '角色戏份',
    extractedLines: '{name} 的戏份汇总',
    confirmDelete: '确认删除',
    cancel: '取消',
    replaceAll: '全部替换',
    preview: '预览',
    uploadFile: '上传文件',
    uploadDrag: '拖拽文件到此处，或点击选择',
    uploadHint: '支持 .txt / .docx 格式',
    uploadSuccess: '文件解析成功！已加载 {count} 个字符',
    uploadFailed: '文件上传失败',
    uploading: '解析中...',
    fileTooShort: '文件内容不足50个字符，无法生成剧本',
    login: '登录',
    register: '注册',
    username: '用户名',
    password: '密码',
    email: '邮箱（选填）',
    noAccount: '没有账号？去注册',
    hasAccount: '已有账号？去登录',
    loginSuccess: '登录成功',
    registerSuccess: '注册成功，已自动登录',
    logout: '退出登录',
    welcome: '你好',
    pleaseLogin: '请先登录后再使用',
  },
  'zh-TW': {
    appTitle: '改編你愛的小說',
    home: '首頁',
    subtitle: '將你喜歡的小說改成專業劇本',
    scripts: '劇本列表',
    newScript: '新建劇本',
    convert: '開始轉換',
    converting: '轉換中...',
    inputPlaceholder: '請粘貼您要轉換為劇本的小說或文章內容（至少50個字符）...',
    titlePlaceholder: '可選：輸入劇本標題',
    textRequired: '請輸入至少50個字符的內容',
    convertSuccess: '劇本生成成功！',
    convertFailed: '生成失敗，請稍後重試',
    deleteConfirm: '確定要刪除該劇本嗎？',
    deleteSuccess: '劇本已刪除',
    save: '保存修改',
    saveSuccess: '保存成功',
    saveFailed: '保存失敗',
    back: '返回',
    edit: '編輯',
    delete: '刪除',
    characters: '角色列表',
    extractCharacter: '提取角色戲份',
    characterName: '角色名稱',
    rename: '重命名角色',
    oldName: '原名',
    newName: '新名',
    renameSuccess: '角色名替換成功',
    renameFailed: '角色名替換失敗',
    totalScripts: '共 {count} 個劇本',
    noScripts: '暫無劇本，快去創建一個吧！',
    loading: '加載中...',
    language: '界面語言',
    outputLanguage: '輸出語言',
    viewDetails: '查看詳情',
    createdAt: '創建時間',
    updatedAt: '更新時間',
    originalText: '原文內容',
    scriptContent: '劇本內容',
    characterLines: '角色戲份',
    extractedLines: '{name} 的戲份匯總',
    confirmDelete: '確認刪除',
    cancel: '取消',
    replaceAll: '全部替換',
    preview: '預覽',
    uploadFile: '上傳檔案',
    uploadDrag: '拖拽檔案到此處，或點擊選擇',
    uploadHint: '支援 .txt / .docx 格式',
    uploadSuccess: '檔案解析成功！已載入 {count} 個字符',
    uploadFailed: '檔案上傳失敗',
    uploading: '解析中...',
    fileTooShort: '檔案內容不足50個字符，無法生成劇本',
    login: '登入',
    register: '註冊',
    username: '使用者名稱',
    password: '密碼',
    email: '電子郵件（選填）',
    noAccount: '沒有帳號？去註冊',
    hasAccount: '已有帳號？去登入',
    loginSuccess: '登入成功',
    registerSuccess: '註冊成功，已自動登入',
    logout: '登出',
    welcome: '你好',
    pleaseLogin: '請先登入後再使用',
  },
  'en': {
    appTitle: 'Adapt Your Favorite Novel',
    home: 'Home',
    subtitle: 'Turn your beloved novel into a professional script',
    scripts: 'Scripts',
    newScript: 'New Script',
    convert: 'Convert',
    converting: 'Converting...',
    inputPlaceholder: 'Paste the novel or article content you want to convert (min 50 characters)...',
    titlePlaceholder: 'Optional: Enter script title',
    textRequired: 'Please enter at least 50 characters',
    convertSuccess: 'Script generated successfully!',
    convertFailed: 'Generation failed, please try again later',
    deleteConfirm: 'Are you sure you want to delete this script?',
    deleteSuccess: 'Script deleted',
    save: 'Save Changes',
    saveSuccess: 'Saved successfully',
    saveFailed: 'Save failed',
    back: 'Back',
    edit: 'Edit',
    delete: 'Delete',
    characters: 'Characters',
    extractCharacter: 'Extract Character Lines',
    characterName: 'Character Name',
    rename: 'Rename Character',
    oldName: 'Old Name',
    newName: 'New Name',
    renameSuccess: 'Character name replaced successfully',
    renameFailed: 'Character name replacement failed',
    totalScripts: '{count} scripts in total',
    noScripts: 'No scripts yet, create one now!',
    loading: 'Loading...',
    language: 'UI Language',
    outputLanguage: 'Output Language',
    viewDetails: 'View Details',
    createdAt: 'Created',
    updatedAt: 'Updated',
    originalText: 'Original Text',
    scriptContent: 'Script Content',
    characterLines: 'Character Lines',
    extractedLines: "{name}'s Lines Summary",
    confirmDelete: 'Confirm Delete',
    cancel: 'Cancel',
    replaceAll: 'Replace All',
    preview: 'Preview',
    uploadFile: 'Upload File',
    uploadDrag: 'Drag & drop file here, or click to select',
    uploadHint: 'Supports .txt / .docx formats',
    uploadSuccess: 'File parsed! {count} characters loaded',
    uploadFailed: 'File upload failed',
    uploading: 'Parsing...',
    fileTooShort: 'File content is less than 50 characters, cannot generate script',
    login: 'Login',
    register: 'Register',
    username: 'Username',
    password: 'Password',
    email: 'Email (optional)',
    noAccount: "Don't have an account? Register",
    hasAccount: 'Already have an account? Login',
    loginSuccess: 'Login successful',
    registerSuccess: 'Registration successful, auto-logged in',
    logout: 'Logout',
    welcome: 'Hello',
    pleaseLogin: 'Please login first',
  },
}

function App() {
  const [uiLanguage, setUiLanguage] = useState(() => {
    return localStorage.getItem('uiLanguage') || 'zh-CN'
  })

  // 文学分类状态
  const [category, setCategory] = useState(() => {
    return localStorage.getItem('category') || 'asian'
  })

  // 认证状态
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('user')
    return saved ? JSON.parse(saved) : null
  })
  const [token, setToken] = useState(() => {
    return localStorage.getItem('token') || null
  })

  const isLoggedIn = !!token && !!user

  const changeLanguage = (code) => {
    setUiLanguage(code)
    localStorage.setItem('uiLanguage', code)
  }

  const changeCategory = (code) => {
    setCategory(code)
    localStorage.setItem('category', code)
  }

  // 应用区域主题
  useEffect(() => {
    const theme = CATEGORY_THEMES[category] || CATEGORY_THEMES.asian
    const root = document.documentElement
    Object.entries(theme).forEach(([key, value]) => {
      root.style.setProperty(key, value)
    })
  }, [category])

  // 带认证的 API 请求封装
  const apiFetch = useCallback(async (url, options = {}) => {
    const headers = {
      ...(options.headers || {}),
    }
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }
    // 如果 body 不是 FormData，添加 Content-Type
    if (options.body && !(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json'
    }
    const res = await fetch(url, { ...options, headers })
    if (res.status === 401) {
      // Token 过期，清除登录状态
      setUser(null)
      setToken(null)
      localStorage.removeItem('token')
      localStorage.removeItem('user')
    }
    return res
  }, [token])

  const login = (userData, authToken) => {
    setUser(userData)
    setToken(authToken)
    localStorage.setItem('token', authToken)
    localStorage.setItem('user', JSON.stringify(userData))
  }

  const logout = () => {
    setUser(null)
    setToken(null)
    localStorage.removeItem('token')
    localStorage.removeItem('user')
  }

  const t = UI_TEXTS[uiLanguage]

  const authContextValue = {
    user,
    token,
    isLoggedIn,
    login,
    logout,
    apiFetch,
  }

  return (
    <LanguageContext.Provider value={{ language: uiLanguage, setLanguage: changeLanguage, t, category, setCategory: changeCategory }}>
    <AuthContext.Provider value={authContextValue}>
      <div className="app">
        <header className="app-header">
          <div className="header-left">
            <h1 className="app-logo">🎬 {t.appTitle}</h1>
            <nav className="app-nav">
              <NavLink to="/" label={t.home} />
              {isLoggedIn && <NavLink to="/scripts" label={t.scripts} />}
            </nav>
          </div>
          <div className="header-right">
            <CategorySwitcher current={category} onChange={changeCategory} />
            <LanguageSwitcher current={uiLanguage} onChange={changeLanguage} />
            {isLoggedIn ? (
              <div className="user-menu">
                <span className="user-greeting">{t.welcome}, {user.username}</span>
                <button className="btn btn-outline btn-sm" onClick={logout}>{t.logout}</button>
              </div>
            ) : (
              <Link to="/auth" className="btn btn-primary btn-sm">{t.login}</Link>
            )}
          </div>
        </header>
        <main className="app-main">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/auth" element={isLoggedIn ? <Navigate to="/" /> : <AuthPage />} />
            <Route path="/scripts" element={isLoggedIn ? <ScriptListPage /> : <Navigate to="/auth" />} />
            <Route path="/scripts/:id" element={isLoggedIn ? <ScriptViewPage /> : <Navigate to="/auth" />} />
          </Routes>
        </main>
      </div>
    </AuthContext.Provider>
    </LanguageContext.Provider>
  )
}

function NavLink({ to, label }) {
  const location = useLocation()
  const isActive = location.pathname === to
  return (
    <Link to={to} className={`nav-link ${isActive ? 'active' : ''}`}>
      {label}
    </Link>
  )
}

function CategorySwitcher({ current, onChange }) {
  const [open, setOpen] = useState(false)
  const currentCat = CATEGORIES.find(c => c.code === current) || CATEGORIES[0]

  return (
    <div className="language-switcher">
      <button className="lang-btn" onClick={() => setOpen(!open)} title="选择文学分类">
        {currentCat.flag} {currentCat.label}
      </button>
      {open && (
        <div className="lang-dropdown">
          {CATEGORIES.map(cat => (
            <button
              key={cat.code}
              className={`lang-option ${cat.code === current ? 'selected' : ''}`}
              onClick={() => { onChange(cat.code); setOpen(false) }}
            >
              {cat.flag} {cat.label} <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{cat.en_label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function LanguageSwitcher({ current, onChange }) {
  const [open, setOpen] = useState(false)
  const currentLang = LANGUAGES.find(l => l.code === current) || LANGUAGES[0]

  return (
    <div className="language-switcher">
      <button className="lang-btn" onClick={() => setOpen(!open)}>
        {currentLang.flag} {currentLang.label}
      </button>
      {open && (
        <div className="lang-dropdown">
          {LANGUAGES.map(lang => (
            <button
              key={lang.code}
              className={`lang-option ${lang.code === current ? 'selected' : ''}`}
              onClick={() => { onChange(lang.code); setOpen(false) }}
            >
              {lang.flag} {lang.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default App
