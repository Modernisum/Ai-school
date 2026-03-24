$body = @{
    schoolName = 'API Test School'
    principalName = 'API Principal'
    password = 'password123'
    email = 'api@test.com'
    phone = '+91 9988776655'
    schoolAddress = '123 API Road, Delhi, Delhi, India - 123321'
    affiliatedBoard = 'CBSE'
    medium = 'English'
    classLevelStart = 1
    classLevel = 12
    schoolType = 'Co-Ed'
    defaultStudents = 30
} | ConvertTo-Json

Invoke-RestMethod -Uri 'http://localhost:8080/api/setup/school' -Method Post -Body $body -ContentType 'application/json'
