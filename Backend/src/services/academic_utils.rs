#![allow(dead_code)]
use serde_json::{json, Value};
use std::collections::HashMap;

pub struct ClassBase {
    pub name: String,
    pub subjects: Vec<String>,
    pub streams: Option<HashMap<String, Vec<String>>>,
}

fn s(v: &str) -> String { v.to_string() }
fn ss(v: &[&str]) -> Vec<String> { v.iter().map(|&x| x.to_string()).collect() }

pub fn get_indian_school_structure() -> Vec<ClassBase> {
    let mut structure = Vec::new();

    structure.push(ClassBase {
        name: s("Pre-Nursery"),
        subjects: ss(&["Basic Communication", "Motor Skills", "Sensory Activities", "Rhymes & Storytelling"]),
        streams: None,
    });
    structure.push(ClassBase {
        name: s("Nursery"),
        subjects: ss(&["English", "Mathematics", "General Awareness", "Art & Craft"]),
        streams: None,
    });
    structure.push(ClassBase {
        name: s("LKG"),
        subjects: ss(&["English", "Mathematics", "General Awareness", "Hindi / Regional Language", "Art & Craft"]),
        streams: None,
    });
    structure.push(ClassBase {
        name: s("UKG"),
        subjects: ss(&["English", "Mathematics", "General Awareness", "Hindi / Regional Language", "Art & Craft"]),
        streams: None,
    });

    for i in 1..=5 {
        structure.push(ClassBase {
            name: format!("Class {}", i),
            subjects: ss(&["English", "Hindi", "Mathematics", "Environmental Studies (EVS)", "Computer", "General Knowledge", "Art & Craft"]),
            streams: None,
        });
    }

    for i in 6..=8 {
        structure.push(ClassBase {
            name: format!("Class {}", i),
            subjects: ss(&["English", "Hindi", "Third Language", "Mathematics", "Science", "Social Science", "Computer Science", "General Knowledge"]),
            streams: None,
        });
    }

    for i in 9..=10 {
        structure.push(ClassBase {
            name: format!("Class {}", i),
            subjects: ss(&["English", "Hindi / Second Language", "Mathematics", "Science", "Social Science", "Information Technology (IT)"]),
            streams: None,
        });
    }

    let mut stream_11_12: HashMap<String, Vec<String>> = HashMap::new();
    stream_11_12.insert(s("Science (PCM)"), ss(&["English", "Physics", "Chemistry", "Mathematics", "Computer Science / Physical Education"]));
    stream_11_12.insert(s("Science (PCB)"), ss(&["English", "Physics", "Chemistry", "Biology", "Psychology / Physical Education"]));
    stream_11_12.insert(s("Commerce"), ss(&["English", "Accountancy", "Business Studies", "Economics", "Mathematics / Informatics Practices"]));
    stream_11_12.insert(s("Arts / Humanities"), ss(&["English", "History", "Political Science", "Geography", "Economics / Sociology"]));

    structure.push(ClassBase {
        name: s("Class 11"),
        subjects: vec![],
        streams: Some(stream_11_12.clone()),
    });
    structure.push(ClassBase {
        name: s("Class 12"),
        subjects: vec![],
        streams: Some(stream_11_12),
    });

    structure
}

pub fn generate_classes(start_index: i32, end_index: i32) -> Vec<String> {
    let structure = get_indian_school_structure();
    let mut classes = Vec::new();
    
    let start = std::cmp::max(0, start_index) as usize;
    let end = std::cmp::min(structure.len() - 1, end_index as usize);

    for i in start..=end {
        let cls = &structure[i];
        if let Some(ref streams) = cls.streams {
            for stream_name in streams.keys() {
                classes.push(format!("{} {}", cls.name, stream_name));
            }
        } else {
            classes.push(cls.name.clone());
        }
    }
    classes
}

pub fn calculate_fee(class_name: &str) -> i32 {
    if class_name.contains("Pre-Nursery") || class_name.contains("Nursery") || class_name.contains("UKG") || class_name.contains("LKG") {
        500
    } else if class_name.contains("Class 11") || class_name.contains("Class 12") {
        2000
    } else {
        1000
    }
}

#[allow(dead_code)]
pub fn get_subjects_map() -> HashMap<String, Vec<String>> {
    let structure = get_indian_school_structure();
    let mut s = HashMap::new();
    
    for cls in structure {
        if let Some(ref streams) = cls.streams {
            for (stream_name, subjects) in streams {
                let name = format!("{} {}", cls.name, stream_name);
                s.insert(name, subjects.clone());
            }
        } else {
            s.insert(cls.name.clone(), cls.subjects.clone());
        }
    }
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
        json!({"materialName": "Ceiling Fan", "quantity": 4, "unitPrice": 2500, "unit": "pcs", "description": "High-speed ceiling fan"}),
        json!({"materialName": "Whiteboard", "quantity": 1, "unitPrice": 3000, "unit": "pcs", "description": "Large magnetic whiteboard"}),
        json!({"materialName": "Teacher's Table", "quantity": 1, "unitPrice": 5000, "unit": "pcs", "description": "Wooden table with drawers"}),
        json!({"materialName": "Student Desk", "quantity": 20, "unitPrice": 1500, "unit": "set", "description": "Individual student desk and chair set"}),
        json!({"materialName": "Whiteboard Marker", "quantity": 3, "unitPrice": 50, "unit": "pcs", "description": "Non-toxic dry erase marker"}),
        json!({"materialName": "Wall Photograph", "quantity": 2, "unitPrice": 200, "unit": "pcs", "description": "Educational wall frames"}),
    ]);
    m.insert("laboratory", vec![
        json!({"materialName": "Lab Table", "quantity": 10, "unitPrice": 8000, "unit": "pcs", "description": "Acid-resistant lab workstation"}),
        json!({"materialName": "Stool", "quantity": 20, "unitPrice": 1200, "unit": "pcs", "description": "High-seated lab stool"}),
        json!({"materialName": "Microscope", "quantity": 5, "unitPrice": 15000, "unit": "pcs", "description": "Compound light microscope"}),
        json!({"materialName": "First Aid Kit", "quantity": 1, "unitPrice": 2500, "unit": "pcs", "description": "Emergency medical supplies"}),
        json!({"materialName": "Fire Extinguisher", "quantity": 1, "unitPrice": 3500, "unit": "pcs", "description": "CO2 fire extinguisher"}),
    ]);
    m.insert("library", vec![
        json!({"materialName": "Bookshelf", "quantity": 10, "unitPrice": 12000, "unit": "pcs", "description": "Large wooden bookshelf"}),
        json!({"materialName": "Reading Table", "quantity": 5, "unitPrice": 6000, "unit": "pcs", "description": "Large 6-seater reading table"}),
        json!({"materialName": "Chair", "quantity": 30, "unitPrice": 1500, "unit": "pcs", "description": "Comfortable library chair"}),
        json!({"materialName": "Computer System", "quantity": 2, "unitPrice": 45000, "unit": "set", "description": "Library management terminal"}),
    ]);
    m.insert("kitchen", vec![
        json!({"materialName": "gas stove", "quantity": 1, "unitPrice": 3000, "unit": "pcs"}),
        json!({"materialName": "sugar", "quantity": 5, "unitPrice": 50, "unit": "kg"}),
        json!({"materialName": "milk", "quantity": 5, "unitPrice": 60, "unit": "litre"}),
        json!({"materialName": "tea", "quantity": 1, "unitPrice": 500, "unit": "kg"}),
        json!({"materialName": "water tank", "quantity": 1, "unitPrice": 800, "unit": "pcs"}),
    ]);
    m.insert("ground", vec![
        json!({"materialName": "gamla", "quantity": 10, "unitPrice": 400, "unit": "pcs"}),
        json!({"materialName": "big plant", "quantity": 10, "unitPrice": 2000, "unit": "pcs"}),
    ]);
    m.insert("storeroom", vec![
        json!({"materialName": "chair", "quantity": 5, "unitPrice": 200, "unit": "pcs"}),
        json!({"materialName": "generator", "quantity": 1, "unitPrice": 20000, "unit": "pcs"}),
    ]);
    m.insert("office", vec![
        json!({"materialName": "big wheel chair", "quantity": 1, "unitPrice": 5000, "unit": "pcs"}),
        json!({"materialName": "big table", "quantity": 1, "unitPrice": 10000, "unit": "pcs"}),
        json!({"materialName": "fan", "quantity": 4, "unitPrice": 200, "unit": "pcs"}),
        json!({"materialName": "guest chair", "quantity": 6, "unitPrice": 2000, "unit": "pcs"}),
    ]);
    m.insert("parking", vec![
        json!({"materialName": "bus", "quantity": 1, "unitPrice": 2000000, "unit": "pcs"}),
        json!({"materialName": "car", "quantity": 1, "unitPrice": 1000000, "unit": "pcs"}),
    ]);
    m
}

