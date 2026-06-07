"""数据库模型定义"""
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from database import Base


class Script(Base):
    """剧本表"""
    __tablename__ = "scripts"

    id = Column(Integer, primary_key=True, autoincrement=True)
    title = Column(String(500), nullable=False, default="未命名剧本")
    original_text = Column(Text, nullable=False)  # 用户输入的原始文本
    script_content = Column(Text, nullable=True)  # AI生成的剧本内容
    language = Column(String(20), nullable=False, default="zh-CN")  # 语言代码
    characters_json = Column(Text, nullable=True)  # JSON格式的角色列表
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc),
                        onupdate=lambda: datetime.now(timezone.utc))

    def to_dict(self):
        return {
            "id": self.id,
            "title": self.title,
            "original_text": self.original_text,
            "script_content": self.script_content,
            "language": self.language,
            "characters_json": self.characters_json,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
