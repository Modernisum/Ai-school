/// Test data factories for creating valid payloads
use serde_json::{json, Value};

pub fn student_payload(school_id: &str, class: &str) -> Value {
    json!({
        "school_id": school_id,
        "name": "Test Student",
        "class_name": class,
        "phone": "+911234567890",
        "email": "student@test.com",
        "status": "active"
    })
}

pub fn employee_payload(school_id: &str, emp_type: &str) -> Value {
    json!({
        "school_id": school_id,
        "name": "Test Employee",
        "employee_type": emp_type,
        "phone": "+911234567891",
        "email": "employee@test.com",
        "subject": "Mathematics",
        "status": "active"
    })
}

pub fn leave_payload(user_id: &str, from_date: &str, to_date: &str) -> Value {
    json!({
        "user_id": user_id,
        "leave_type": "sick",
        "from_date": from_date,
        "to_date": to_date,
        "reason": "Test leave application"
    })
}

pub fn fee_payload(student_id: &str, amount: f64, due_date: &str) -> Value {
    json!({
        "student_id": student_id,
        "fee_type": "tuition",
        "amount": amount,
        "due_date": due_date,
        "status": "pending"
    })
}
