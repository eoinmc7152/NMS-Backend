FROM python:3.11-slim

WORKDIR /app

# Install deps first (better caching)
COPY backend/requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt

# Copy backend code into container
COPY backend/ /app/

ENV PORT=8080
EXPOSE 8080

CMD ["python", "app.py"]
