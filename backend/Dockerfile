FROM python:3.12-slim

WORKDIR /app

# Install system dependencies for psycopg and compilation
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application source code
COPY . .

EXPOSE 8000

CMD ["python", "-m", "uvicorn", "app.main:socket_app", "--host", "0.0.0.0", "--port", "8000"]
