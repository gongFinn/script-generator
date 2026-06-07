"""认证模块 - JWT Token 管理 + 密码哈希"""
import os
import hashlib
import bcrypt
from datetime import datetime, timedelta, timezone
from typing import Optional
from jose import JWTError, jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from database import get_db
from models import User

# 密码哈希 — 直接使用 bcrypt，避免 passlib 兼容性问题

# JWT 配置
SECRET_KEY = os.getenv("JWT_SECRET_KEY", "script-generator-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = 72  # 3天过期

# Bearer token security scheme
security = HTTPBearer(auto_error=False)


def hash_password(password: str) -> str:
    """哈希密码"""
    # 先做 SHA256 确保密码长度不超过 bcrypt 的 72 字节限制
    digest = hashlib.sha256(password.encode()).hexdigest()
    return bcrypt.hashpw(digest.encode(), bcrypt.gensalt()).decode()


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """验证密码"""
    digest = hashlib.sha256(plain_password.encode()).hexdigest()
    return bcrypt.checkpw(digest.encode(), hashed_password.encode())


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """创建 JWT Token"""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def decode_access_token(token: str) -> Optional[dict]:
    """解码 JWT Token"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        return None


def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db),
) -> Optional[User]:
    """从请求中获取当前登录用户（可选认证）"""
    if credentials is None:
        return None
    payload = decode_access_token(credentials.credentials)
    if payload is None:
        return None
    user_id = payload.get("sub")
    if user_id is None:
        return None
    user = db.query(User).filter(User.id == int(user_id)).first()
    return user


def require_user(
    current_user: Optional[User] = Depends(get_current_user),
) -> User:
    """要求必须登录"""
    if current_user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="请先登录",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return current_user
