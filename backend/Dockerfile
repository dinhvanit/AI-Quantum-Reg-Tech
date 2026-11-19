FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

COPY backend/requirements.txt /app/backend/requirements.txt
RUN pip install --no-cache-dir -r /app/backend/requirements.txt \
    && useradd --create-home --uid 10001 appuser

# Build context is the repository root. Generate src/data/*.json before docker build.
COPY backend/app /app/backend/app
COPY src/data /app/src/data
RUN mkdir -p /app/backend \
    && chown -R appuser:appuser /app/backend /app/src

USER appuser
EXPOSE 8000

CMD ["sh", "-c", "uvicorn app.main:app --app-dir backend --host 0.0.0.0 --port ${PORT:-8000}"]
