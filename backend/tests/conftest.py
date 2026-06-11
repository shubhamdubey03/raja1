"""
Test fixtures and async test configuration.
"""

import asyncio
import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient

from app.main import app
from app.database import engine


@pytest.fixture(scope="session")
def event_loop():
    """Override event loop for session-scoped async tests."""
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest_asyncio.fixture
async def client():
    """Async HTTP test client for FastAPI app."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


@pytest_asyncio.fixture(autouse=True)
async def cleanup_db_connections_per_test():
    """Dispose engine after each test function to avoid closed event loop errors in connection pools."""
    yield
    await engine.dispose()
