"""
Pagination utilities
"""
from flask import current_app


def paginate(query, page, per_page=None):
    """
    Paginate a SQLAlchemy query
    
    Args:
        query: SQLAlchemy query object
        page: Page number (1-indexed)
        per_page: Items per page
    
    Returns:
        Pagination object
    """
    if per_page is None:
        per_page = current_app.config.get('DEFAULT_PAGE_SIZE', 20)
    
    # Limit per_page to maximum
    max_per_page = current_app.config.get('MAX_PAGE_SIZE', 100)
    per_page = min(per_page, max_per_page)
    
    # Ensure page is at least 1
    page = max(page, 1)
    
    return query.paginate(
        page=page,
        per_page=per_page,
        error_out=False
    )