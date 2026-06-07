"""数据库配置和会话管理"""
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
import os
from pathlib import Path

# 数据库路径：优先使用环境变量，否则使用相对路径（兼容本地和云端）
_DEFAULT_DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "scripts.db")
DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{_DEFAULT_DB_PATH}")

# 从URL中提取文件路径并确保目录存在
if DATABASE_URL.startswith("sqlite:///"):
    db_file_path = DATABASE_URL.replace("sqlite:///", "")
    # 处理绝对路径（sqlite:////var/data/db → /var/data/db）
    if not db_file_path.startswith("./") and not db_file_path.startswith(".\\"):
        db_dir = os.path.dirname(db_file_path)
        if db_dir and not os.path.exists(db_dir):
            Path(db_dir).mkdir(parents=True, exist_ok=True)

# SQLite需要check_same_thread=False用于多线程
connect_args = {"check_same_thread": False} if "sqlite" in DATABASE_URL else {}
engine = create_engine(DATABASE_URL, connect_args=connect_args, echo=False)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    """获取数据库会话的依赖注入"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """初始化数据库，创建所有表"""
    Base.metadata.create_all(bind=engine)
