# 多阶段构建：前端 + 后端
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

FROM python:3.12-slim
WORKDIR /app

# 安装后端依赖
COPY backend/requirements.txt ./backend/
RUN pip install --no-cache-dir -r backend/requirements.txt

# 复制后端代码
COPY backend/ ./backend/

# 复制前端构建产物
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist/

# 设置环境变量
ENV ENV=production
ENV PORT=8000
ENV DEEPSEEK_API_KEY=sk-f11acd266cc64e72961fe7caef4b9bd8

EXPOSE 8000
WORKDIR /app/backend
CMD ["python", "main.py"]
