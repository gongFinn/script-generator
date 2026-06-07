"""FastAPI 主应用 - 小说转剧本系统"""
import os
import json
import re
from dotenv import load_dotenv
load_dotenv()  # 加载 .env 文件中的环境变量
from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends, HTTPException, Query, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, timezone
import io

from database import get_db, init_db
from models import Script, User
from auth import hash_password, verify_password, create_access_token, get_current_user, require_user
from deepseek_client import (
    generate_script,
    extract_character_lines,
    rename_character_in_script,
    extract_characters_from_script,
)

# 前端构建目录 - 多种方式探测以确保正确找到
def _find_frontend_dist():
    """探测前端构建目录"""
    # 方式1: 通过 __file__ 推算
    backend_dir = os.path.dirname(os.path.abspath(__file__))
    project_dir = os.path.dirname(backend_dir)
    candidate = os.path.join(project_dir, "frontend", "dist")
    if os.path.exists(candidate):
        return candidate
    # 方式2: 从当前工作目录推算
    cwd = os.getcwd()
    candidate = os.path.join(cwd, "frontend", "dist")
    if os.path.exists(candidate):
        return candidate
    candidate = os.path.join(os.path.dirname(cwd), "frontend", "dist")
    if os.path.exists(candidate):
        return candidate
    # 方式3: 硬编码已知路径
    known_paths = [
        r"C:\Users\g1363\script-generator\frontend\dist",
        os.path.join(project_dir, "frontend", "dist"),
    ]
    for p in known_paths:
        if os.path.exists(p):
            return p
    return candidate  # 返回第一个候选，即使不存在

FRONTEND_DIST = _find_frontend_dist()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """应用生命周期：初始化数据库"""
    init_db()
    yield


app = FastAPI(
    title="小说转剧本系统",
    description="利用AI将小说或文章转化为专业剧本格式",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS配置
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ==================== Pydantic 模型 ====================

class ConvertRequest(BaseModel):
    text: str = Field(..., min_length=50, description="要转换的原文内容")
    title: Optional[str] = Field(None, description="剧本标题")
    language: str = Field("zh-CN", description="输出语言代码：zh-CN, en, zh-TW")


class ScriptUpdateRequest(BaseModel):
    title: Optional[str] = None
    script_content: Optional[str] = None
    original_text: Optional[str] = None


class RenameCharacterRequest(BaseModel):
    old_name: str = Field(..., min_length=1, description="原角色名")
    new_name: str = Field(..., min_length=1, description="新角色名")


class ScriptResponse(BaseModel):
    id: int
    user_id: Optional[int] = None
    title: str
    original_text: str
    script_content: Optional[str]
    language: str
    characters_json: Optional[str]
    created_at: Optional[str]
    updated_at: Optional[str]


class RegisterRequest(BaseModel):
    username: str = Field(..., min_length=2, max_length=50, description="用户名")
    password: str = Field(..., min_length=6, max_length=100, description="密码")
    email: Optional[str] = Field(None, description="邮箱（可选）")


class LoginRequest(BaseModel):
    username: str = Field(..., description="用户名")
    password: str = Field(..., description="密码")


class AuthResponse(BaseModel):
    token: str
    user: dict


# ==================== 认证 API ====================

@app.post("/api/auth/register", response_model=AuthResponse)
def register(request: RegisterRequest, db: Session = Depends(get_db)):
    """用户注册"""
    # 检查用户名是否已存在
    existing = db.query(User).filter(User.username == request.username).first()
    if existing:
        raise HTTPException(status_code=400, detail="用户名已被注册")

    # 检查邮箱
    if request.email:
        existing_email = db.query(User).filter(User.email == request.email).first()
        if existing_email:
            raise HTTPException(status_code=400, detail="邮箱已被注册")

    # 创建用户
    user = User(
        username=request.username,
        email=request.email,
        hashed_password=hash_password(request.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # 生成 Token
    token = create_access_token(data={"sub": str(user.id), "username": user.username})
    return {"token": token, "user": user.to_dict()}


@app.post("/api/auth/login", response_model=AuthResponse)
def login(request: LoginRequest, db: Session = Depends(get_db)):
    """用户登录"""
    user = db.query(User).filter(User.username == request.username).first()
    if not user or not verify_password(request.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="用户名或密码错误")

    token = create_access_token(data={"sub": str(user.id), "username": user.username})
    return {"token": token, "user": user.to_dict()}


@app.get("/api/auth/me")
def get_me(current_user: User = Depends(require_user)):
    """获取当前登录用户信息"""
    return {"user": current_user.to_dict()}


# ==================== API 端点 ====================

@app.get("/api/health")
def health_check():
    """健康检查"""
    return {
        "status": "ok",
        "message": "小说转剧本系统运行正常",
        "frontend_dist": FRONTEND_DIST,
        "frontend_exists": os.path.exists(FRONTEND_DIST),
    }


@app.get("/api/public-url")
def get_public_url():
    """获取当前公网访问地址"""
    url_file = os.path.join(os.path.dirname(os.path.abspath(__file__)), "public_url.json")
    if os.path.exists(url_file):
        try:
            with open(url_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
            return data
        except Exception:
            pass
    return {"primary": None, "message": "公网隧道未就绪，请运行 tunnel_watchdog.py"}


# ==================== 文件上传与解析 ====================

ALLOWED_EXTENSIONS = {".txt", ".docx"}

# 各语言的文件上传提示
UPLOAD_MESSAGES = {
    "zh-CN": {
        "invalid_extension": "不支持的文件格式：{ext}。仅支持 .txt 和 .docx 文件。",
        "empty_file": "文件内容为空，请检查文件。",
        "parse_error": "文件解析失败：{error}",
        "upload_success": "文件解析成功",
    },
    "zh-TW": {
        "invalid_extension": "不支援的檔案格式：{ext}。僅支援 .txt 和 .docx 檔案。",
        "empty_file": "檔案內容為空，請檢查檔案。",
        "parse_error": "檔案解析失敗：{error}",
        "upload_success": "檔案解析成功",
    },
    "en": {
        "invalid_extension": "Unsupported file format: {ext}. Only .txt and .docx files are supported.",
        "empty_file": "File content is empty. Please check the file.",
        "parse_error": "File parsing failed: {error}",
        "upload_success": "File parsed successfully",
    },
}


def extract_text_from_txt(content: bytes) -> str:
    """从 .txt 文件中提取文本，自动检测编码"""
    # 尝试多种编码
    for encoding in ['utf-8', 'gbk', 'gb2312', 'gb18030', 'latin-1']:
        try:
            return content.decode(encoding).strip()
        except (UnicodeDecodeError, UnicodeError):
            continue
    # 最后的兜底方案
    return content.decode('utf-8', errors='replace').strip()


def extract_text_from_docx(content: bytes) -> str:
    """从 .docx 文件中提取文本"""
    from docx import Document
    doc = Document(io.BytesIO(content))
    paragraphs = []
    for para in doc.paragraphs:
        if para.text.strip():
            paragraphs.append(para.text.strip())
    return '\n\n'.join(paragraphs)


def parse_uploaded_file(filename: str, content: bytes, language: str = "zh-CN") -> dict:
    """解析上传的文件，返回提取的文本"""
    messages = UPLOAD_MESSAGES.get(language, UPLOAD_MESSAGES["zh-CN"])

    # 检查文件扩展名
    ext = os.path.splitext(filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=messages["invalid_extension"].format(ext=ext),
        )

    try:
        if ext == ".txt":
            text = extract_text_from_txt(content)
        elif ext == ".docx":
            text = extract_text_from_docx(content)
        else:
            raise HTTPException(status_code=400, detail=messages["invalid_extension"].format(ext=ext))

        if not text:
            raise HTTPException(status_code=400, detail=messages["empty_file"])

        return {
            "filename": filename,
            "file_type": ext,
            "text": text,
            "char_count": len(text),
            "message": messages["upload_success"],
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=messages["parse_error"].format(error=str(e)),
        )


@app.post("/api/upload-text")
async def upload_text_file(
    file: UploadFile = File(..., description="要上传的文本文件 (.txt 或 .docx)"),
    language: str = Query("zh-CN", description="界面语言代码"),
):
    """上传并解析文本文件，支持 .txt 和 .docx 格式"""
    content = await file.read()
    result = parse_uploaded_file(file.filename, content, language)
    return result


@app.post("/api/upload-and-convert", response_model=ScriptResponse)
async def upload_and_convert(
    file: UploadFile = File(..., description="要上传的文本文件 (.txt 或 .docx)"),
    title: Optional[str] = Query(None, description="剧本标题"),
    language: str = Query("zh-CN", description="输出语言代码：zh-CN, en, zh-TW"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_user),
):
    """上传文件、解析文本并直接转化为剧本（一步完成）"""
    content = await file.read()
    parse_result = parse_uploaded_file(file.filename, content, language)
    text = parse_result["text"]

    if len(text) < 50:
        raise HTTPException(status_code=400, detail="文件内容不足50个字符，无法生成剧本")

    # 调用DeepSeek生成剧本
    script_content = await generate_script(text, language)
    if not script_content:
        raise HTTPException(status_code=500, detail="AI生成剧本失败，请稍后重试")

    # 提取角色列表
    characters_json = await extract_characters_from_script(script_content, language)

    # 自动生成标题
    script_title = title
    if not script_title:
        clean_text = re.sub(r'\s+', ' ', text).strip()
        script_title = clean_text[:30] + ("..." if len(clean_text) > 30 else "")

    # 保存到数据库
    script = Script(
        user_id=current_user.id,
        title=script_title,
        original_text=text,
        script_content=script_content,
        language=language,
        characters_json=characters_json,
    )
    db.add(script)
    db.commit()
    db.refresh(script)

    return script.to_dict()


@app.post("/api/convert", response_model=ScriptResponse)
async def convert_to_script(request: ConvertRequest, db: Session = Depends(get_db),
                            current_user: User = Depends(require_user)):
    """将文本转化为剧本（需登录）"""
    script_content = await generate_script(request.text, request.language)
    if not script_content:
        raise HTTPException(status_code=500, detail="AI生成剧本失败，请稍后重试")

    characters_json = await extract_characters_from_script(script_content, request.language)

    title = request.title
    if not title:
        clean_text = re.sub(r'\s+', ' ', request.text).strip()
        title = clean_text[:30] + ("..." if len(clean_text) > 30 else "")

    script = Script(
        user_id=current_user.id,
        title=title,
        original_text=request.text,
        script_content=script_content,
        language=request.language,
        characters_json=characters_json,
    )
    db.add(script)
    db.commit()
    db.refresh(script)
    return script.to_dict()


@app.get("/api/scripts", response_model=List[ScriptResponse])
def list_scripts(
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(20, ge=1, le=100, description="每页数量"),
    language: Optional[str] = Query(None, description="按语言筛选"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_user),
):
    """列出当前用户的剧本"""
    query = db.query(Script).filter(Script.user_id == current_user.id).order_by(Script.updated_at.desc())

    if language:
        query = query.filter(Script.language == language)

    scripts = query.offset((page - 1) * page_size).limit(page_size).all()
    return [s.to_dict() for s in scripts]


@app.get("/api/scripts/{script_id}", response_model=ScriptResponse)
def get_script(script_id: int, db: Session = Depends(get_db),
               current_user: User = Depends(require_user)):
    """获取单个剧本详情"""
    script = db.query(Script).filter(Script.id == script_id, Script.user_id == current_user.id).first()
    if not script:
        raise HTTPException(status_code=404, detail="剧本不存在")
    return script.to_dict()


@app.put("/api/scripts/{script_id}", response_model=ScriptResponse)
def update_script(script_id: int, request: ScriptUpdateRequest, db: Session = Depends(get_db),
                  current_user: User = Depends(require_user)):
    """更新剧本内容"""
    script = db.query(Script).filter(Script.id == script_id, Script.user_id == current_user.id).first()
    if not script:
        raise HTTPException(status_code=404, detail="剧本不存在")

    if request.title is not None:
        script.title = request.title
    if request.script_content is not None:
        script.script_content = request.script_content
    if request.original_text is not None:
        script.original_text = request.original_text

    script.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(script)
    return script.to_dict()


@app.delete("/api/scripts/{script_id}")
def delete_script(script_id: int, db: Session = Depends(get_db),
                  current_user: User = Depends(require_user)):
    """删除剧本"""
    script = db.query(Script).filter(Script.id == script_id, Script.user_id == current_user.id).first()
    if not script:
        raise HTTPException(status_code=404, detail="剧本不存在")
    db.delete(script)
    db.commit()
    return {"message": "剧本已删除", "id": script_id}


@app.get("/api/scripts/{script_id}/characters")
def get_characters(script_id: int, db: Session = Depends(get_db),
                   current_user: User = Depends(require_user)):
    """获取剧本中的所有角色"""
    script = db.query(Script).filter(Script.id == script_id, Script.user_id == current_user.id).first()
    if not script:
        raise HTTPException(status_code=404, detail="剧本不存在")

    characters = []
    if script.characters_json:
        try:
            characters = json.loads(script.characters_json)
        except json.JSONDecodeError:
            characters = []

    return {"script_id": script_id, "characters": characters}


@app.post("/api/scripts/{script_id}/characters/extract")
async def extract_character(
    script_id: int,
    character_name: str = Query(..., description="要提取的角色名"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_user),
):
    """提取剧本中某角色的所有戏份"""
    script = db.query(Script).filter(Script.id == script_id, Script.user_id == current_user.id).first()
    if not script:
        raise HTTPException(status_code=404, detail="剧本不存在")
    if not script.script_content:
        raise HTTPException(status_code=400, detail="剧本内容为空")

    result = await extract_character_lines(
        script.script_content,
        character_name,
        script.language,
    )

    if not result:
        raise HTTPException(status_code=500, detail="角色提取失败，请稍后重试")

    return {
        "script_id": script_id,
        "character_name": character_name,
        "extracted_content": result,
    }


@app.post("/api/scripts/{script_id}/rename-character", response_model=ScriptResponse)
async def rename_character(
    script_id: int,
    request: RenameCharacterRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_user),
):
    """全局替换剧本中的角色名"""
    script = db.query(Script).filter(Script.id == script_id, Script.user_id == current_user.id).first()
    if not script:
        raise HTTPException(status_code=404, detail="剧本不存在")
    if not script.script_content:
        raise HTTPException(status_code=400, detail="剧本内容为空")

    # 使用AI进行智能替换
    new_content = await rename_character_in_script(
        script.script_content,
        request.old_name,
        request.new_name,
        script.language,
    )

    if not new_content:
        raise HTTPException(status_code=500, detail="角色名替换失败，请稍后重试")

    # 更新剧本内容
    script.script_content = new_content
    script.updated_at = datetime.now(timezone.utc)

    # 更新角色列表
    if script.characters_json:
        try:
            characters = json.loads(script.characters_json)
            characters = [
                request.new_name if c == request.old_name else c
                for c in characters
            ]
            script.characters_json = json.dumps(characters, ensure_ascii=False)
        except json.JSONDecodeError:
            pass

    db.commit()
    db.refresh(script)

    return script.to_dict()


@app.post("/api/scripts/{script_id}/re-extract-characters")
async def re_extract_characters(script_id: int, db: Session = Depends(get_db),
                                current_user: User = Depends(require_user)):
    """重新提取剧本中的角色列表"""
    script = db.query(Script).filter(Script.id == script_id, Script.user_id == current_user.id).first()
    if not script:
        raise HTTPException(status_code=404, detail="剧本不存在")
    if not script.script_content:
        raise HTTPException(status_code=400, detail="剧本内容为空")

    characters_json = await extract_characters_from_script(
        script.script_content, script.language
    )
    script.characters_json = characters_json
    script.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(script)

    characters = []
    if characters_json:
        try:
            characters = json.loads(characters_json)
        except json.JSONDecodeError:
            pass

    return {"script_id": script_id, "characters": characters}


# ==================== 静态文件服务 ====================

# 如果前端已构建，则提供静态文件服务
if os.path.exists(FRONTEND_DIST):
    app.mount("/assets", StaticFiles(directory=os.path.join(FRONTEND_DIST, "assets")), name="assets")

    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str):
        """服务前端SPA"""
        file_path = os.path.join(FRONTEND_DIST, full_path)
        if os.path.exists(file_path) and os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(os.path.join(FRONTEND_DIST, "index.html"))
else:
    @app.get("/")
    async def root():
        return {
            "message": "小说转剧本系统API",
            "docs": "/docs",
            "note": "前端尚未构建，请进入frontend目录运行 npm run build",
        }


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    reload = os.getenv("ENV", "dev").lower() == "dev"
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=reload)
