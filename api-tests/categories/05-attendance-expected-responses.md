# Attendance Management APIs - Expected Responses

This document outlines the expected responses, status codes, and data structures for the Attendance module.

## 1. Mark Attendance
`POST /api/operations/attendance/:schoolId/:role/:userId/present`

**Expected Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Attendance marked successfully",
  "data": {
    "attendance_id": "att_12345",
    "status": "present",
    "timestamp": "2024-04-19T09:00:00Z"
  }
}
```

## 2. Mark Holiday
`POST /api/operations/attendance/:schoolId/:role/:userId/holiday`

**Expected Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Holiday marked for user",
  "data": {
    "date": "2024-04-19",
    "status": "holiday"
  }
}
```

## 3. List Attendance Records
`GET /api/operations/attendance/:schoolId/:role/:userId`

**Expected Success Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "date": "2024-04-18",
      "status": "present",
      "in_time": "09:00:00",
      "out_time": "15:00:00"
    },
    {
      "date": "2024-04-17",
      "status": "absent",
      "remarks": "Medical leave"
    }
  ]
}
```

## 4. Advanced School Attendance Stats (Dashboard)
`GET /api/operations/attendance/:schoolId/`

यह प्रमुख आधार एंडपॉइंट है जिसका उपयोग डैशबोर्ड ग्राफ और एडवांस फ़िल्टरिंग के लिए किया जाता है।

### A. बिना किसी फ़िल्टर के (Basic Summary)
जब कोई पैरामीटर नहीं दिया जाता, तो यह 'आज' (Current Date) की भूमिका-वार (role-wise) गिनती देता है।

**Response:**
```json
{
  "success": true,
  "data": {
    "date": "2024-04-19",
    "summary": {
      "student": { "present": 450, "absent": 50 },
      "employee": { "present": 20, "absent": 2 }
    }
  }
}
```

### B. एडवांस फ़िल्टरिंग (Timed & Period Filters)
आप समय और अवधि के अनुसार डेटा निकाल सकते हैं।

| Parameter | Type | Description |
| :--- | :--- | :--- |
| `period` | String | समय सीमा: `day`, `week`, `month`, `year` |
| `incoming_after` | String | लेट एंट्री फिल्टर (e.g., "09:00"). |
| `outgoing_before` | String | अर्ली एग्जिट फिल्टर (e.g., "14:00"). |
| `user_type` | String | `student` या `employee` |
| `class_name` | String | कक्षा (Class) के आधार पर फिल्टर। |
| `user_ids` | String | कॉमा से अलग की गई यूज़र आईडी (e.g., "ID1,ID2"). |
| `fields` | String | केवल आवश्यक डेटा पाने के लिए (e.g., `user_id,name,image_url`). |

**Example Query (Custom Fields):** `?period=day&user_type=student&fields=user_id,name,image_url,status`
(यह क्वेरी आज के छात्रों की केवल आईडी, नाम, फोटो और हाज़िरी स्टेटस देगी)

**Response:**
```json
{
  "success": true,
  "data": {
    "period": { "start": "2024-04-19", "end": "2024-04-19" },
    "count": 1,
    "records": [
      {
        "user_id": "std_101",
        "name": "Amit Sharma",
        "image_url": "https://cdn.school.com/profiles/std_101.jpg",
        "status": "present"
      }
    ]
  }
}
```

**Full Detailed Response Example:**
`?period=month&incoming_after=09:15&user_type=student&class_name=10th`

```json
{
  "success": true,
  "data": {
    "period": { "start": "2024-04-01", "end": "2024-04-30" },
    "count": 1,
    "records": [
      {
        "user_id": "std_101",
        "user_type": "student",
        "name": "Amit Sharma",
        "image_url": "https://cdn.school.com/profiles/std_101.jpg",
        "class_name": "10th",
        "date": "2024-04-05",
        "status": "present",
        "in_time": "09:20:00",
        "out_time": "15:00:00",
        "remarks": "Late arrival"
      }
    ]
  }
}
```

## 5. Bulk Attendance
`POST /api/operations/attendance/:schoolId/bulk-attendance`

**Expected Success Response (200 OK):**
```json
{
  "success": true,
  "processed_count": 45,
  "failed_records": []
}
```
