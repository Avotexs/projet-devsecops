import requests
import json
import time

def test_scan():
    url = "http://localhost:8001/scan"
    payload = {
        "logs": [
            {
                "source": "github-actions",
                "action_version": "v2",
                "log_content": "Using action@v2"
            },
            {
                "source": "app-log",
                "log_content": "DB_PASSWORD = secret123"
            },
            {
                "source": "safe-log",
                "log_content": "Just a normal log message"
            }
        ]
    }
    
    print(f"Sending request to {url}...")
    try:
        response = requests.post(url, json=payload)
        print(f"Status Code: {response.status_code}")
        if response.status_code == 200:
            print("Response JSON:")
            print(json.dumps(response.json(), indent=2))
        else:
            print("Error:", response.text)
    except Exception as e:
        print(f"Failed to connect: {e}")

if __name__ == "__main__":
    # Wait a bit for service to be fully ready
    time.sleep(5)
    test_scan()
