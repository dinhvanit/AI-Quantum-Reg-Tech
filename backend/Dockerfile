FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

COPY backend/requirements.txt /app/backend/requirements.txt
RUN pip install --no-cache-dir -r /app/backend/requirements.txt \
    && useradd --create-home --uid 10001 appuser

# Build context is the repository root (see /.dockerignore). Run `npm run data` (→ data/generated/*.json) before docker build:
#   docker build -f backend/Dockerfile -t quantumregtech-api .
#   docker run --env-file backend/.env -p 8000:8000 quantumregtech-api
# Secrets come from the host's env/secret manager at runtime (variables: backend/.env.example) – never COPY a .env file.
COPY backend/app /app/backend/app
COPY data/generated /app/data/generated
RUN mkdir -p /app/backend \
    && chown -R appuser:appuser /app/backend /app/data

USER appuser
EXPOSE 8000

CMD ["sh", "-c", "uvicorn app.main:app --app-dir backend --host 0.0.0.0 --port ${PORT:-8000}"]
