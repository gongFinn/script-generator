import React, { useState, createContext, useContext } from 'react'
import { Routes, Route, Link, useLocation } from 'react-router-dom'
import HomePage from './pages/HomePage'
import ScriptViewPage from './pages/ScriptViewPage'
import ScriptListPage from './pages/ScriptListPage'

// 语言上下文
export const LanguageContext = createContext()

export const LANGUAGES = [
  { code: 'zh-CN', label: '简体中文', flag: '🇨🇳' },
  { code: 'zh-TW', label: '繁體中文', flag: '🇹🇼' },
  { code: 'en', label: 'English', flag: '🇺🇸' },
]

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
  },
}

function App() {
  const [uiLanguage, setUiLanguage] = useState(() => {
    return localStorage.getItem('uiLanguage') || 'zh-CN'
  })

  const changeLanguage = (code) => {
    setUiLanguage(code)
    localStorage.setItem('uiLanguage', code)
  }

  const t = UI_TEXTS[uiLanguage]

  return (
    <LanguageContext.Provider value={{ language: uiLanguage, setLanguage: changeLanguage, t }}>
      <div className="app">
        <header className="app-header">
          <div className="header-left">
            <h1 className="app-logo">🎬 {t.appTitle}</h1>
            <nav className="app-nav">
              <NavLink to="/" label={t.home} />
              <NavLink to="/scripts" label={t.scripts} />
            </nav>
          </div>
          <div className="header-right">
            <LanguageSwitcher
              current={uiLanguage}
              onChange={changeLanguage}
            />
          </div>
        </header>
        <main className="app-main">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/scripts" element={<ScriptListPage />} />
            <Route path="/scripts/:id" element={<ScriptViewPage />} />
          </Routes>
        </main>
      </div>
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
