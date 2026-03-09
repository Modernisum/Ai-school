use printpdf::*;
use serde_json::Value;
use std::io::BufWriter;
use anyhow::{Result, anyhow};

pub struct PdfGenerator;

impl PdfGenerator {
    pub fn generate_report(title: &str, data: &Value) -> Result<Vec<u8>> {
        let (doc, page1, layer1) = PdfDocument::new(title, Mm(210.0), Mm(297.0), "Layer 1");
        let current_layer = doc.get_page(page1).get_layer(layer1);

        let font = doc.add_builtin_font(BuiltinFont::Helvetica).unwrap();
        let font_bold = doc.add_builtin_font(BuiltinFont::HelveticaBold).unwrap();

        // Title
        current_layer.use_text(title.to_uppercase(), 20.0, Mm(20.0), Mm(270.0), &font_bold);

        let mut y_pos = 255.0;

        if let Some(arr) = data.as_array() {
            if !arr.is_empty() {
                // Get headers from first object
                let headers: Vec<String> = if let Some(first) = arr.get(0) {
                    if let Some(obj) = first.as_object() {
                        obj.keys().cloned().collect()
                    } else {
                        vec!["Item".to_string()]
                    }
                } else {
                    vec![]
                };

                // Headers
                let mut x_pos = 20.0;
                let col_width = 170.0 / headers.len() as f32;
                
                for head in &headers {
                    current_layer.use_text(head, 12.0, Mm(x_pos), Mm(y_pos), &font_bold);
                    x_pos += col_width;
                }
                
                y_pos -= 10.0;

                // Rows
                for item in arr {
                    if y_pos < 20.0 {
                        // In a real implementation, we'd add a new page here.
                        // For now, we'll keep it simple.
                        break;
                    }

                    x_pos = 20.0;
                    for head in &headers {
                        let val = item.get(head).map(|v| v.to_string()).unwrap_or_default();
                        // Truncate if too long
                        let display_val = if val.len() > 20 { format!("{}...", &val[..17]) } else { val };
                        current_layer.use_text(display_val.replace('"', ""), 10.0, Mm(x_pos), Mm(y_pos), &font);
                        x_pos += col_width;
                    }
                    y_pos -= 8.0;
                }
            } else {
                current_layer.use_text("No data available for this report.", 12.0, Mm(20.0), Mm(y_pos), &font);
            }
        } else {
            // Handle non-array data (summary etc)
            current_layer.use_text(format!("Summary Data:"), 14.0, Mm(20.0), Mm(y_pos), &font_bold);
            y_pos -= 10.0;
            if let Some(obj) = data.as_object() {
                for (k, v) in obj {
                    current_layer.use_text(format!("{}: {}", k, v), 12.0, Mm(20.0), Mm(y_pos), &font);
                    y_pos -= 8.0;
                }
            }
        }

        let mut writer = BufWriter::new(Vec::new());
        doc.save(&mut writer)?;
        Ok(writer.into_inner().map_err(|_| anyhow!("Failed to get PDF buffer"))?)
    }
}
