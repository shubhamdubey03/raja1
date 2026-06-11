import urllib.request
import urllib.error
import json
import random

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

def test_fresh_flow():
    # Use a random new number to avoid 429 cooldowns
    phone = f"+919876{random.randint(100000, 999999)}"
    print(f"Testing with mobile: {phone}")
    
    # 1. Retailer Register
    print("\n--- Registering Retailer ---")
    status, res = make_request("http://localhost:8000/api/v1/retailer/auth/register", {
        "mobile": phone,
        "owner_name": "Test Owner",
        "business_name": "Test Business",
        "city": "Mumbai",
        "state": "MH"
    })
    print(f"Status: {status}, Response: {res}")

    # 2. Verify with wrong OTP
    print("\n--- Verifying with wrong OTP (999999) ---")
    status, res = make_request("http://localhost:8000/api/v1/retailer/auth/otp/verify", {
        "mobile": phone,
        "otp": "999999",
        "purpose": "register"
    })
    print(f"Status: {status}, Response: {res}")

    # 3. Verify with bypass OTP (123456)
    print("\n--- Verifying with bypass OTP (123456) ---")
    status, res = make_request("http://localhost:8000/api/v1/retailer/auth/otp/verify", {
        "mobile": phone,
        "otp": "123456",
        "purpose": "register"
    })
    print(f"Status: {status}, Response: {res}")

if __name__ == "__main__":
    test_fresh_flow()
