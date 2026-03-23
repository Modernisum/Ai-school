import requests
import json
import random
import string

BASE_URL = "http://localhost:8080/api"

def get_random_string(length):
    return ''.join(random.choice(string.ascii_letters) for i in range(length))

def test_setup():
    school_name = f"Test School {get_random_string(5)}"
    payload = {
        "schoolName": school_name,
        "schoolAddress": "123 Test St",
        "classLevelStart": -2,
        "classLevel": 5,
        "password": "password123",
        "defaultStudents": 30
    }

    print(f"--- Setting up {school_name} ---")
    response = requests.post(f"{BASE_URL}/setup/school", json=payload)
    if response.status_code != 200:
        print(f"Setup failed: {response.text}")
        return

    res_data = response.json()
    school_id = res_data.get("schoolId")
    token = res_data.get("accessToken")
    print(f"School created: {school_id}")

    headers = {"Authorization": f"Bearer {token}"}

    # 1. Verify Classes
    print(f"--- Verifying Classes for {school_id} ---")
    classes_res = requests.get(f"{BASE_URL}/class/{school_id}/classes", headers=headers)
    if classes_res.status_code == 200:
        classes = classes_res.json().get("data", [])
        print(f"Found {len(classes)} classes.")
        for c in classes:
            print(f"  - {c.get('className')}")
    else:
        print(f"Failed to fetch classes: {classes_res.text}")

    # 2. Verify Subjects
    print(f"--- Verifying Subjects for {school_id} ---")
    subjects_res = requests.get(f"{BASE_URL}/subjects/{school_id}", headers=headers)
    if subjects_res.status_code == 200:
        subjects = subjects_res.json().get("data", [])
        print(f"Found {len(subjects)} subjects.")
    else:
        print(f"Failed to fetch subjects: {subjects_res.text}")

    # 3. Verify Spaces
    print(f"--- Verifying Spaces for {school_id} ---")
    spaces_res = requests.get(f"{BASE_URL}/spaces/{school_id}/spaces", headers=headers)
    if spaces_res.status_code == 200:
        spaces = spaces_res.json().get("data", [])
        print(f"Found {len(spaces)} spaces.")
        for s in spaces:
            print(f"  - {s.get('name')}")
    else:
        print(f"Failed to fetch spaces: {spaces_res.text}")

    # 4. Verify Materials
    print(f"--- Verifying Materials for {school_id} ---")
    materials_res = requests.get(f"{BASE_URL}/materials/{school_id}", headers=headers)
    if materials_res.status_code == 200:
        # The list_materials might return a different structure, let's just check success
        print("Materials fetched successfully.")
    else:
        print(f"Failed to fetch materials: {materials_res.text}")

if __name__ == "__main__":
    test_setup()
