"""
Custom Exception Classes for B2B Vendor & Retailer Management Platform.
"""

class AppException(Exception):
    """Base exception class for application errors."""
    def __init__(self, status_code: int, detail: str, error_code: str = "BAD_REQUEST"):
        super().__init__(detail)
        self.status_code = status_code
        self.detail = detail
        self.error_code = error_code
