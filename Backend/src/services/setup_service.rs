use crate::repository::traits::*;
use crate::repository::Repositories;
use crate::services::traits::*;
use async_trait::async_trait;
use serde_json::{json, Value};
use std::collections::HashMap;
use std::error::Error;
use std::sync::Arc;
use std::sync::OnceLock;

pub struct PostgresSetupService {
    pub repos: Arc<Repositories>,
}

// --- Logic Parity Constants ---

static DEFAULT_MATERIALS: OnceLock<HashMap<&'static str, Vec<Value>>> = OnceLock::new();
static SUBJECTS: OnceLock<HashMap<&'static str, Vec<&'static str>>> = OnceLock::new();

fn get_default_materials() -> &'static HashMap<&'static str, Vec<Value>> {
    DEFAULT_MATERIALS.get_or_init(|| {
        let mut m = HashMap::new();
        m.insert(
            "classroom",
            vec![
                json!({"materialName": "table", "quantity": 1, "unitPrice": 2000}),
                json!({"materialName": "chair", "quantity": 1, "unitPrice": 750}),
                json!({"materialName": "board", "quantity": 1, "unitPrice": 2000}),
                json!({"materialName": "marker", "quantity": 2, "unitPrice": 50}),
                json!({"materialName": "board cleaner", "quantity": 1, "unitPrice": 150}),
                json!({"materialName": "fan", "quantity": 4, "unitPrice": 1500}),
                json!({"materialName": "bulb", "quantity": 4, "unitPrice": 100}),
                json!({"materialName": "painting", "quantity": 2, "unitPrice": 500}),
            ],
        );
        m.insert(
            "kitchen",
            vec![
                json!({"materialName": "gas stove", "quantity": 1, "unitPrice": 3000}),
                json!({"materialName": "sugar", "quantity": 5, "unitPrice": 50}),
                json!({"materialName": "milk", "quantity": 5, "unitPrice": 60}),
                json!({"materialName": "tea", "quantity": 1, "unitPrice": 500}),
                json!({"materialName": "water tank", "quantity": 1, "unitPrice": 800}),
            ],
        );
        m.insert(
            "office",
            vec![
                json!({"materialName": "big wheel chair", "quantity": 1, "unitPrice": 5000}),
                json!({"materialName": "big table", "quantity": 1, "unitPrice": 10000}),
                json!({"materialName": "fan", "quantity": 4, "unitPrice": 200}),
                json!({"materialName": "guest chair", "quantity": 6, "unitPrice": 2000}),
            ],
        );
        m
    })
}

fn get_subjects() -> &'static HashMap<&'static str, Vec<&'static str>> {
    SUBJECTS.get_or_init(|| {
        let mut s = HashMap::new();
        s.insert(
            "Pre-Nursery",
            vec!["English", "Hindi", "Mathematics", "Art and Craft"],
        );
        s.insert(
            "Nursery",
            vec!["English", "Hindi", "Mathematics", "Environmental Studies"],
        );
        s.insert(
            "Kindergarten",
            vec!["English", "Hindi", "Mathematics", "Environmental Studies"],
        );
        s.insert(
            "Class 1",
            vec![
                "English",
                "Hindi",
                "Mathematics",
                "EVS",
                "General Knowledge",
            ],
        );
        s.insert(
            "Class 2",
            vec![
                "English",
                "Hindi",
                "Mathematics",
                "EVS",
                "General Knowledge",
            ],
        );
        s.insert(
            "Class 3",
            vec![
                "English",
                "Hindi",
                "Mathematics",
                "EVS",
                "General Knowledge",
            ],
        );
        s.insert(
            "Class 4",
            vec![
                "English",
                "Hindi",
                "Mathematics",
                "Science",
                "Social Studies",
            ],
        );
        s.insert(
            "Class 5",
            vec![
                "English",
                "Hindi",
                "Mathematics",
                "Science",
                "Social Studies",
            ],
        );
        s.insert(
            "Class 6",
            vec![
                "English",
                "Hindi",
                "Maths",
                "Science",
                "History",
                "Geography",
            ],
        );
        s.insert(
            "Class 7",
            vec![
                "English",
                "Hindi",
                "Maths",
                "Science",
                "History",
                "Geography",
            ],
        );
        s.insert(
            "Class 8",
            vec![
                "English",
                "Hindi",
                "Maths",
                "Science",
                "History",
                "Geography",
            ],
        );
        s.insert(
            "Class 9",
            vec![
                "English",
                "Hindi",
                "Maths",
                "Physics",
                "Chemistry",
                "Biology",
            ],
        );
        s.insert(
            "Class 10",
            vec![
                "English",
                "Hindi",
                "Maths",
                "Physics",
                "Chemistry",
                "Biology",
            ],
        );
        s.insert(
            "Class 11 Science",
            vec!["Physics", "Chemistry", "Maths", "Biology", "English"],
        );
        s.insert(
            "Class 11 Commerce",
            vec!["Accountancy", "Business Studies", "Economics", "English"],
        );
        s.insert(
            "Class 11 Humanities",
            vec!["History", "Political Science", "Geography", "English"],
        );
        s.insert(
            "Class 12 Science",
            vec!["Physics", "Chemistry", "Maths", "Biology", "English"],
        );
        s.insert(
            "Class 12 Commerce",
            vec!["Accountancy", "Business Studies", "Economics", "English"],
        );
        s.insert(
            "Class 12 Humanities",
            vec!["History", "Political Science", "Geography", "English"],
        );
        s
    })
}

#[async_trait]
impl SetupService for PostgresSetupService {
    async fn setup_school(&self, data: Value) -> Result<Value, Box<dyn Error + Send + Sync>> {
        let school_name = data["schoolName"].as_str().ok_or("Missing schoolName")?;
        let school_address = data["schoolAddress"]
            .as_str()
            .ok_or("Missing schoolAddress")?;
        let class_level = data["classLevel"].as_i64().unwrap_or(0);
        let password = data["password"].as_str().ok_or("Missing password")?;
        let affiliated_board = data["affiliatedBoard"].as_str().unwrap_or("");
        let default_students = data["defaultStudents"].as_i64().unwrap_or(0);

        // 1. Generate School Attributes
        let school_id = format!("{:06}", rand::random::<u32>() % 900000 + 100000);
        let school_code = self.repos.auth.generate_school_code().await?;
        let hashed_password = bcrypt::hash(password, 10)?;

        // 2. Create School document
        self.repos
            .auth
            .create_school(json!({
                "id": school_id,
                "schoolCode": school_code,
                "schoolName": school_name,
                "schoolAddress": school_address,
                "classLevel": class_level,
                "affiliatedBoard": affiliated_board,
            }))
            .await?;

        // 3. Create Auth record
        self.repos
            .auth
            .update_auth(
                &school_id,
                json!({
                    "password": hashed_password,
                    "role": "school-admin"
                }),
            )
            .await?;

        // 4. Initialize Infrastructure (Spaces & Items)
        let spaces = vec![
            ("classroom", self.generate_classes(class_level as i32)),
            ("kitchen", vec!["Kitchen 1".to_string()]),
            ("storeroom", vec!["Storeroom 1".to_string()]),
            (
                "office",
                vec!["Principal Office".to_string(), "Staff Office".to_string()],
            ),
            ("ground", vec!["Playground".to_string()]),
            ("parking", vec!["Parking 1".to_string()]),
        ];

        let default_mats = get_default_materials();
        for (space_type, items) in spaces {
            self.repos
                .resource
                .add_space(&school_id, json!({"id": space_type, "name": space_type}))
                .await?;

            for item in items {
                let item_id = item.to_lowercase().replace(' ', "-");
                self.repos.resource.add_item(&school_id, space_type, json!({
                    "id": item_id,
                    "itemName": item,
                    "roomNumber": if space_type == "classroom" { item.clone() } else { "".to_string() },
                    "classId": if space_type == "classroom" { Some(item_id.clone()) } else { None::<String> }
                })).await?;

                if let Some(mats) = default_mats.get(space_type) {
                    for mat in mats {
                        let material_name = mat["materialName"].as_str().unwrap();
                        let material_id = material_name.to_lowercase();
                        self.repos
                            .resource
                            .add_material(&school_id, mat.clone())
                            .await?;
                        self.repos
                            .resource
                            .add_material_location(
                                &school_id,
                                &material_id,
                                space_type,
                                &item_id,
                                mat["quantity"].as_i64().unwrap() as i32,
                            )
                            .await?;
                    }
                }
            }
        }

        // 5. Initialize Academic Structure
        let class_names = self.generate_classes(class_level as i32);
        let subjects_map = get_subjects();
        for class_name in class_names {
            let class_id = class_name.to_lowercase().replace(' ', "-");
            let fee = self.calculate_fee(&class_name) as f64;
            let sections = self.generate_sections(default_students as i32);

            let mut streams = Vec::new();
            if class_name.starts_with("Class 11") || class_name.starts_with("Class 12") {
                let parts: Vec<&str> = class_name.split_whitespace().collect();
                if parts.len() >= 3 {
                    streams.push(parts[2].to_string());
                }
            }

            self.repos
                .academic
                .add_class(
                    &school_id,
                    json!({
                        "id": class_id,
                        "className": class_name,
                        "classFees": fee,
                        "totalClassStudents": default_students,
                        "sections": sections,
                        "streams": streams,
                        "totalClassTeachers": 0,
                        "totalPeriods": 0
                    }),
                )
                .await?;

            if let Some(subjs) = subjects_map.get(class_name.as_str()) {
                for subj_name in subjs {
                    let prefix = &subj_name.replace(' ', "");
                    let prefix = &prefix[..std::cmp::min(4, prefix.len())].to_uppercase();
                    let subj_id = format!("{}{:03}", prefix, rand::random::<u32>() % 1000);
                    self.repos
                        .academic
                        .add_subject(
                            &school_id,
                            json!({
                                "subjectId": subj_id,
                                "subjectName": subj_name,
                                "classId": class_id,
                                "className": class_name,
                                "subjectFees": fee
                            }),
                        )
                        .await?;
                }
            }
        }

        Ok(json!({
            "success": true,
            "schoolId": school_id,
            "schoolCode": school_code,
            "message": "School setup completed with full logic parity"
        }))
    }

    async fn get_setup(&self, school_id: &str) -> Result<Value, Box<dyn Error + Send + Sync>> {
        match self.repos.school.get_school(school_id).await? {
            Some(v) => Ok(v),
            None => Err("School not found".into()),
        }
    }
}

impl PostgresSetupService {
    fn generate_classes(&self, level: i32) -> Vec<String> {
        let mut classes = vec![
            "Pre-Nursery".to_string(),
            "Nursery".to_string(),
            "Kindergarten".to_string(),
        ];
        for i in 1..=level {
            classes.push(format!("Class {}", i));
        }
        if level >= 10 {
            classes.push("Class 11 Science".to_string());
            classes.push("Class 11 Commerce".to_string());
            classes.push("Class 11 Humanities".to_string());
            classes.push("Class 12 Science".to_string());
            classes.push("Class 12 Commerce".to_string());
            classes.push("Class 12 Humanities".to_string());
        }
        classes
    }

    fn calculate_fee(&self, name: &str) -> i32 {
        if name.contains("Nursery") || name == "Kindergarten" {
            return 100;
        }
        if name.starts_with("Class ") {
            let part = name.split_whitespace().nth(1).unwrap_or("0");
            let num: i32 = part.parse().unwrap_or(0);
            if num > 0 {
                if num <= 5 {
                    return 150;
                }
                if num <= 8 {
                    return 200;
                }
                if num <= 10 {
                    return 250;
                }
                return 300;
            }
        }
        100
    }

    fn generate_sections(&self, total_students: i32) -> Vec<String> {
        let mut sections = Vec::new();
        if total_students <= 0 {
            return sections;
        }
        let count = (total_students as f32 / 60.0).ceil() as usize;
        let alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
        for i in 0..count {
            if let Some(c) = alphabet.chars().nth(i) {
                sections.push(c.to_string());
            }
        }
        sections
    }

    async fn get_next_sequence_val(
        &self,
        seq_name: &str,
    ) -> Result<i64, Box<dyn Error + Send + Sync>> {
        use sqlx::Row;
        let query = format!("SELECT nextval('{}')", seq_name);
        let row: sqlx::postgres::PgRow = sqlx::query(&query)
            .fetch_one(&self.repos.db_client.pool)
            .await?;
        Ok(row.get(0))
    }
}
