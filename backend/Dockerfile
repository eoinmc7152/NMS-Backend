# backend/Dockerfile
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# Install Python deps first (leverages Docker layer caching)
COPY src/services/requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt

# Copy app code
COPY src /app/src

# Cloud Run provides $PORT
ENV PORT=8080
ENV FLASK_ENV=production

# Start with Gunicorn (2 workers, threads for concurrency)
CMD exec gunicorn -w 2 -k gthread -b 0.0.0.0:$PORT "src.services.app:app"
