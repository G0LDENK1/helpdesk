FROM python:3.12-slim

WORKDIR /app

# Install dependencies first for layer caching
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

EXPOSE 8000

# Use shell form so $PORT env var is expanded by Railway
CMD uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000} --workers 2
