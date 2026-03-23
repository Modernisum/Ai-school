use serde_json::{json, Value};
use std::collections::HashMap;

pub fn generate_classes(start_level: i32, end_level: i32) -> Vec<String> {
    let mut classes = Vec::new();
    for level in start_level..=end_level {
        match level {
            -2 => classes.push("Pre-Nursery".to_string()),
            -1 => classes.push("Nursery".to_string()),
            0 => classes.push("Kindergarten".to_string()),
            1..=10 => classes.push(format!("Class {}", level)),
            11 => {
                classes.push("Class 11 Science".to_string());
                classes.push("Class 11 Commerce".to_string());
                classes.push("Class 11 Humanities".to_string());
            }
            12 => {
                classes.push("Class 12 Science".to_string());
                classes.push("Class 12 Commerce".to_string());
                classes.push("Class 12 Humanities".to_string());
            }
            _ => {}
        }
    }
    classes
}

pub fn calculate_fee(class_name: &str) -> i32 {
    if class_name.contains("Pre-Nursery") || class_name.contains("Nursery") || class_name.contains("Kindergarten") {
        500
    } else if class_name.contains("Class 11") || class_name.contains("Class 12") {
        2000
    } else {
        1000
    }
}

pub fn get_subjects_map() -> HashMap<&'static str, Vec<&'static str>> {
    let mut s = HashMap::new();
    s.insert("Pre-Nursery", vec!["English", "Hindi", "Mathematics", "Art and Craft"]);
    s.insert("Nursery", vec!["English", "Hindi", "Mathematics", "Environmental Studies"]);
    s.insert("Kindergarten", vec!["English", "Hindi", "Mathematics", "Environmental Studies"]);
    
    for i in 1..=3 {
        s.insert(Box::leak(format!("Class {}", i).into_boxed_str()), vec!["English", "Hindi", "Mathematics", "EVS", "General Knowledge"]);
    }
    for i in 4..=5 {
        s.insert(Box::leak(format!("Class {}", i).into_boxed_str()), vec!["English", "Hindi", "Mathematics", "Science", "Social Studies"]);
    }
    for i in 6..=8 {
        s.insert(Box::leak(format!("Class {}", i).into_boxed_str()), vec!["English", "Hindi", "Maths", "Science", "History", "Geography"]);
    }
    for i in 9..=10 {
        s.insert(Box::leak(format!("Class {}", i).into_boxed_str()), vec!["English", "Hindi", "Maths", "Physics", "Chemistry", "Biology"]);
    }
    
    s.insert("Class 11 Science", vec!["Physics", "Chemistry", "Maths", "Biology", "English"]);
    s.insert("Class 11 Commerce", vec!["Accountancy", "Business Studies", "Economics", "English"]);
    s.insert("Class 11 Humanities", vec!["History", "Political Science", "Geography", "English"]);
    
    s.insert("Class 12 Science", vec!["Physics", "Chemistry", "Maths", "Biology", "English"]);
    s.insert("Class 12 Commerce", vec!["Accountancy", "Business Studies", "Economics", "English"]);
    s.insert("Class 12 Humanities", vec!["History", "Political Science", "Geography", "English"]);
    
    s
}

pub fn generate_sections(student_count: i32) -> Vec<Value> {
    let mut sections = Vec::new();
    let mut section_count = (student_count as f32 / 30.0).ceil() as i32;
    section_count = std::cmp::max(1, section_count);
    for i in 0..section_count {
        let name = format!("{}", (b'A' + i as u8) as char);
        sections.push(json!({
            "name": name,
            "roomNumber": format!("Room {}", 100 + i),
            "totalStudents": 0,
            "capacity": 30
        }));
    }
    sections
}

pub fn get_default_spaces() -> Vec<&'static str> {
    vec!["classroom", "kitchen", "storeroom", "office", "ground", "parking", "canteen", "park"]
}

pub fn get_default_materials() -> HashMap<&'static str, Vec<Value>> {
    let mut m = HashMap::new();
    m.insert("classroom", vec![
        json!({"materialName": "table", "quantity": 1, "unitPrice": 2000}),
        json!({"materialName": "chair", "quantity": 1, "unitPrice": 750}),
        json!({"materialName": "board", "quantity": 1, "unitPrice": 2000}),
        json!({"materialName": "marker", "quantity": 2, "unitPrice": 50}),
        json!({"materialName": "board cleaner", "quantity": 1, "unitPrice": 150}),
        json!({"materialName": "fan", "quantity": 4, "unitPrice": 1500}),
        json!({"materialName": "bulb", "quantity": 4, "unitPrice": 100}),
        json!({"materialName": "painting", "quantity": 2, "unitPrice": 500}),
    ]);
    m.insert("kitchen", vec![
        json!({"materialName": "gas stove", "quantity": 1, "unitPrice": 3000}),
        json!({"materialName": "sugar", "quantity": 5, "unitPrice": 50}),
        json!({"materialName": "milk", "quantity": 5, "unitPrice": 60}),
        json!({"materialName": "tea", "quantity": 1, "unitPrice": 500}),
        json!({"materialName": "water tank", "quantity": 1, "unitPrice": 800}),
    ]);
    m.insert("ground", vec![
        json!({"materialName": "gamla", "quantity": 10, "unitPrice": 400}),
        json!({"materialName": "big plant", "quantity": 10, "unitPrice": 2000}),
    ]);
    m.insert("storeroom", vec![
        json!({"materialName": "chair", "quantity": 5, "unitPrice": 200}),
        json!({"materialName": "generator", "quantity": 1, "unitPrice": 20000}),
    ]);
    m.insert("office", vec![
        json!({"materialName": "big wheel chair", "quantity": 1, "unitPrice": 5000}),
        json!({"materialName": "big table", "quantity": 1, "unitPrice": 10000}),
        json!({"materialName": "fan", "quantity": 4, "unitPrice": 200}),
        json!({"materialName": "guest chair", "quantity": 6, "unitPrice": 2000}),
    ]);
    m.insert("parking", vec![
        json!({"materialName": "bus", "quantity": 1, "unitPrice": 2000000}),
        json!({"materialName": "car", "quantity": 1, "unitPrice": 1000000}),
    ]);
    m
}
