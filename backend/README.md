# AMB-DMP-2026 — B2B Platform Backend

**Stack:** Python 3.11+ · FastAPI · PostgreSQL 15 · SQLAlchemy (async) · Alembic

## Quick Start

```bash
# 1. Create virtual environment
python -m venv venv
source venv/bin/activate  # or venv\Scripts\activate on Windows

# 2. Install dependencies
pip install -r requirements.txt

# 3. Configure environment
cp .env.example .env
# Edit .env with your PostgreSQL credentials

# 4. Run database migrations
alembic upgrade head

# 5. Seed initial data
python -m scripts.seed

# 6. Start development server
uvicorn app.main:app --reload --port 8000
```

## API Documentation

- **Swagger UI:** http://localhost:8000/docs
- **ReDoc:** http://localhost:8000/redoc
- **Health Check:** http://localhost:8000/health

## Docker (Local Development)

```bash
# From project root
docker-compose up -d
# API available at http://localhost:8000
```

## Testing

```bash
pytest tests/ -v
pytest tests/ -v --cov=app/services --cov-report=term-missing
```

## Concurrency Configuration

| Setting | Value |
|---------|-------|
| Uvicorn Workers | 4 (Gunicorn in production) |
| DB Pool Size | 20 connections |
| DB Max Overflow | 10 connections |
| Auth Rate Limit | 10 req/min |
| OTP Rate Limit | 3 req/min |
