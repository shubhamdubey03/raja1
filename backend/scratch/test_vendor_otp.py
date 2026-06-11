import urllib.request
import urllib.error
import json
import time

def make_request(url, data):
    req = urllib.request.Request(
        url,
        data=json.dumps(data).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST"
    )
    try:
        with urllib.request.urlopen(req) as response:
            return response.status, json.loads(response.read().decode())
    except urllib.error.HTTPError as e:
        try:
            return e.code, json.loads(e.read().decode())
        except Exception:
            return e.code, e.read().decode()

def test_vendor_flow():
    # 1. Vendor requests OTP
    print("--- Sending OTP to Vendor (+919876543210) ---")
    status, res = make_request("http://localhost:8000/api/v1/vendor/auth/login", {
        "mobile": "+919876543210"
    })
    print(f"Status: {status}, Response: {res}")
    
    if status == 429:
        print("Wait 60s and try again, or let's inspect the database directly.")
        return

    # 2. Verify with wrong OTP
    print("\n--- Verifying Vendor OTP with wrong code (999999) ---")
    status, res = make_request("http://localhost:8000/api/v1/vendor/auth/otp/verify", {
        "mobile": "+919876543210",
        "otp": "999999"
    })
    print(f"Status: {status}, Response: {res}")

    # 3. Verify with bypass OTP (123456)
    print("\n--- Verifying Vendor OTP with bypass code (123456) ---")
    status, res = make_request("http://localhost:8000/api/v1/vendor/auth/otp/verify", {
        "mobile": "+919876543210",
        "otp": "123456"
    })
    print(f"Status: {status}, Response: {res}")

if __name__ == "__main__":
    test_vendor_flow()
