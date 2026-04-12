import requests
import time

API_URL = "http://localhost:8000"

def test_dataset(file_path):
    print(f"\n--- Testing Dataset: {file_path} ---")
    
    with open(file_path, 'rb') as f:
        files = {'file': (file_path.split("\\")[-1], f, 'text/csv')}
        response = requests.post(f"{API_URL}/analyze", files=files)
        
    if response.status_code != 200:
        print(f"Failed to upload: {response.text}")
        return
        
    task_id = response.json()["task_id"]
    print(f"Task ID: {task_id}")
    
    while True:
        res = requests.get(f"{API_URL}/status/{task_id}")
        data = res.json()
        
        status = data["status"]
        if status == "pending" or status == "processing":
            print(f"Processing... {data['progress']*100:.1f}%")
            time.sleep(1)
            continue
            
        if status == "completed":
            print(f"Success! Processed {data['processed_emails']} emails.")
            print(f"Summary: {data['summary']}")
            break
            
        if status == "error":
            print(f"Error: {data['error']}")
            break

test_dataset("c:\\Users\\ruife\\phish-detect-cmpe279\\data\\Enron.csv")
test_dataset("c:\\Users\\ruife\\phish-detect-cmpe279\\data\\Ling.csv")
test_dataset("c:\\Users\\ruife\\phish-detect-cmpe279\\data\\email_dataset_100k.csv")
