"""Slug generation utility."""

import re
import uuid


def generate_slug(text: str) -> str:
    """Generate a URL-safe slug from text."""
    slug = text.lower().strip()
    slug = re.sub(r"[^\w\s-]", "", slug)
    slug = re.sub(r"[\s_]+", "-", slug)
    slug = re.sub(r"-+", "-", slug)
    slug = slug.strip("-")
    return slug


def generate_unique_slug(text: str) -> str:
    """Generate slug with UUID suffix for guaranteed uniqueness."""
    base = generate_slug(text)
    short_id = uuid.uuid4().hex[:8]
    return f"{base}-{short_id}"
