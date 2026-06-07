# script-generator

AI 驱动的智能剧本生成系统，将小说和文章转化为结构化 YAML 格式的专业剧本。

## 功能特性

- **AI 剧本生成**：调用 DeepSeek 大模型，将小说/文章转化为包含角色动作、台词、神态、场景说明、上场时机的专业剧本
- **结构化输出**：YAML 格式输出，支持程序化解析，每个 Beat（动作/台词）独立结构化
- **用户账号系统**：注册/登录，JWT 认证，每个用户的数据完全隔离
- **三语支持**：简体中文、繁體中文、English 界面和输出
- **四大文学分类**：亚洲文学、欧洲文学、美洲文学、其他文学，每类有独立区域主题配色
- **文件上传**：支持 .txt / .docx 文件直接上传解析
- **智能摘要**：AI 自动总结剧本的章节段落、主要人物、主要场景、关键事件、情绪走向
- **角色管理**：提取角色戏份、全局重命名、自定义角色创建
- **可读视图**：YAML 源码自动渲染为格式化可读剧本

## 技术栈

| 层级 | 技术 |
|------|------|
| 后端 | Python FastAPI + SQLAlchemy + SQLite |
| 前端 | React 18 + Vite |
| AI | DeepSeek Chat API |
| 认证 | JWT + bcrypt |
| 部署 | Docker + Render / Fly.io |

## 快速开始

### 本地运行

```bash
# 1. 安装后端依赖
cd backend
pip install -r requirements.txt

# 2. 设置环境变量
set DEEPSEEK_API_KEY=your_api_key

# 3. 启动后端
python main.py

# 4. 安装前端依赖
cd ../frontend
npm install

# 5. 构建前端
npm run build

# 6. 访问 http://localhost:8000
```

### Docker 部署

```bash
docker build -t script-generator .
docker run -p 8000:8000 -e DEEPSEEK_API_KEY=your_key script-generator
```

### Render 一键部署

项目根目录包含 `render.yaml`，可直接在 [Render](https://render.com) 上一键部署。

## 项目结构

```
script-generator/
├── backend/
│   ├── main.py              # FastAPI 主应用
│   ├── models.py            # 数据库模型
│   ├── database.py          # SQLite 数据库配置
│   ├── auth.py              # JWT 认证
│   ├── deepseek_client.py   # DeepSeek API 客户端
│   └── requirements.txt     # Python 依赖
├── frontend/
│   ├── src/
│   │   ├── App.jsx          # 主应用 + 路由 + 主题
│   │   ├── App.css          # 古风主题样式
│   │   └── pages/
│   │       ├── HomePage.jsx       # 首页：输入+上传+转换
│   │       ├── AuthPage.jsx       # 注册/登录
│   │       ├── ScriptListPage.jsx # 剧本列表
│   │       └── ScriptViewPage.jsx # 阅读/编辑/摘要/角色
│   ├── package.json
│   └── vite.config.js
├── YAML_SCHEMA.md           # 剧本 YAML Schema 文档
├── Dockerfile               # Docker 构建
├── render.yaml              # Render 部署配置
└── fly.toml                 # Fly.io 部署配置
```

## YAML 剧本格式

```yaml
script:
  meta:
    title: "剧本标题"
    source: "原著来源"
    language: "zh-CN"
    total_scenes: 3
  characters:
    - id: "char_1"
      name: "角色名"
      aliases: ["别名"]
      role: "主角"
      description: "角色描述"
  scenes:
    - id: 1
      chapter: "章节名"
      heading:
        location: "地点"
        time: "夜"
      description: "场景描述"
      entrance_timing:
        - character: "角色名"
          timing: "上场时机"
      beats:
        - id: "1.1"
          type: "dialogue"
          character: "角色名"
          line: "台词"
          emotion: "情绪"
          delivery: "语气"
        - id: "1.2"
          type: "action"
          character: "角色名"
          action: "动作描述"
          emotion: "情绪"
      transition:
        to: 2
        type: "fade"
```

完整 Schema 详见 [YAML_SCHEMA.md](YAML_SCHEMA.md)。

## API 端点

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/auth/register` | 用户注册 |
| POST | `/api/auth/login` | 用户登录 |
| GET | `/api/auth/me` | 获取当前用户 |
| POST | `/api/convert` | 文本转剧本 |
| POST | `/api/upload-text` | 上传并解析文件 |
| POST | `/api/upload-and-convert` | 上传文件并直接转剧本 |
| GET | `/api/scripts` | 获取剧本列表 |
| GET | `/api/scripts/{id}` | 获取剧本详情 |
| PUT | `/api/scripts/{id}` | 更新剧本 |
| DELETE | `/api/scripts/{id}` | 删除剧本 |
| POST | `/api/scripts/{id}/summarize` | AI 智能摘要 |
| POST | `/api/scripts/{id}/characters/extract` | 提取角色戏份 |
| POST | `/api/scripts/{id}/rename-character` | 全局重命名角色 |
| POST | `/api/scripts/{id}/custom-character` | 添加自定义角色 |

## License

MIT
