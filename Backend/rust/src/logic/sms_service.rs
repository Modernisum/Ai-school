use std::env;

/// SMS service for sending attendance notifications via SMS gateways.
/// Configure via environment variables:
///   SMS_PROVIDER=twilio|textlocal|mock (default: mock)
///   TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER
///   TEXTLOCAL_API_KEY, TEXTLOCAL_SENDER
pub struct SmsService {
    provider: SmsProvider,
    enabled: bool,
}

#[derive(Debug, Clone)]
enum SmsProvider {
    Twilio {
        account_sid: String,
        auth_token: String,
        from_number: String,
    },
    TextLocal {
        api_key: String,
        sender: String,
    },
    Mock,
}

impl SmsService {
    /// Create a new SMS service from environment variables.
    pub fn new() -> Self {
        let provider_str = env::var("SMS_PROVIDER").unwrap_or_else(|_| "mock".to_string());

        let (provider, enabled) = match provider_str.to_lowercase().as_str() {
            "twilio" => {
                let account_sid = env::var("TWILIO_ACCOUNT_SID").unwrap_or_default();
                let auth_token = env::var("TWILIO_AUTH_TOKEN").unwrap_or_default();
                let from_number = env::var("TWILIO_FROM_NUMBER").unwrap_or_default();
                let enabled = !account_sid.is_empty() && !auth_token.is_empty() && !from_number.is_empty();
                (SmsProvider::Twilio { account_sid, auth_token, from_number }, enabled)
            }
            "textlocal" => {
                let api_key = env::var("TEXTLOCAL_API_KEY").unwrap_or_default();
                let sender = env::var("TEXTLOCAL_SENDER").unwrap_or_else(|_| "SCHOOL".to_string());
                let enabled = !api_key.is_empty();
                (SmsProvider::TextLocal { api_key, sender }, enabled)
            }
            _ => (SmsProvider::Mock, false),
        };

        Self { provider, enabled }
    }

    /// Check if SMS service is configured and enabled.
    pub fn is_enabled(&self) -> bool {
        self.enabled
    }

    /// Send an SMS message to a single recipient.
    pub async fn send_sms(
        &self,
        to: &str,
        message: &str,
    ) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        match &self.provider {
            SmsProvider::Mock => {
                println!("[SMS Service] MOCK - Would send to {}: {}", to, &message[..message.len().min(80)]);
                Ok(())
            }
            SmsProvider::Twilio { account_sid, auth_token, from_number } => {
                self.send_twilio(account_sid, auth_token, from_number, to, message).await
            }
            SmsProvider::TextLocal { api_key, sender } => {
                self.send_textlocal(api_key, sender, to, message).await
            }
        }
    }

    /// Send batch SMS to multiple recipients.
    pub async fn send_bulk_sms(
        &self,
        recipients: &[String],
        message: &str,
    ) -> Result<(usize, usize), Box<dyn std::error::Error + Send + Sync>> {
        let mut success = 0usize;
        let mut failures = 0usize;

        for to in recipients {
            match self.send_sms(to, message).await {
                Ok(_) => success += 1,
                Err(e) => {
                    eprintln!("[SMS Service] Failed to send to {}: {}", to, e);
                    failures += 1;
                }
            }
        }

        println!("[SMS Service] Bulk send complete: {} success, {} failed", success, failures);
        Ok((success, failures))
    }

    /// Send attendance absence notification to a parent.
    pub async fn send_absence_notification(
        &self,
        parent_phone: &str,
        student_name: &str,
        school_name: &str,
        date: &str,
    ) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        let message = format!(
            "Dear Parent, {} was marked absent today ({}) at {}. Please contact the school if this is incorrect. - {}",
            student_name, date, school_name, school_name
        );
        self.send_sms(parent_phone, &message).await
    }

    /// Send daily attendance summary to admin.
    pub async fn send_daily_summary(
        &self,
        admin_phone: &str,
        school_name: &str,
        date: &str,
        present: i64,
        absent: i64,
        total: i64,
        percentage: f64,
    ) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        let message = format!(
            "{} Attendance Summary ({}): {}/{} present ({:.0}%). Absent: {}.",
            school_name, date, present, total, percentage, absent
        );
        self.send_sms(admin_phone, &message).await
    }

    // ── Private Implementations ────────────────────────────────────────────────

    async fn send_twilio(
        &self,
        account_sid: &str,
        auth_token: &str,
        from_number: &str,
        to: &str,
        message: &str,
    ) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        let url = format!(
            "https://api.twilio.com/2010-04-01/Accounts/{}/Messages.json",
            account_sid
        );

        let client = reqwest::Client::new();
        let params = [
            ("From", from_number),
            ("To", to),
            ("Body", message),
        ];

        let response = client
            .post(&url)
            .basic_auth(account_sid, Some(auth_token))
            .form(&params)
            .send()
            .await?;

        if response.status().is_success() {
            println!("[SMS Service] Twilio: Message sent to {}", to);
            Ok(())
        } else {
            let error_body = response.text().await.unwrap_or_else(|_| "Unknown error".to_string());
            Err(format!("[SMS Service] Twilio error: {}", error_body).into())
        }
    }

    async fn send_textlocal(
        &self,
        api_key: &str,
        sender: &str,
        to: &str,
        message: &str,
    ) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        let client = reqwest::Client::new();
        let params = [
            ("apikey", api_key.to_string()),
            ("numbers", to.to_string()),
            ("message", message.to_string()),
            ("sender", sender.to_string()),
        ];

        let response = client
            .post("https://api.textlocal.in/send/")
            .form(&params)
            .send()
            .await?;

        if response.status().is_success() {
            println!("[SMS Service] TextLocal: Message sent to {}", to);
            Ok(())
        } else {
            let error_body = response.text().await.unwrap_or_else(|_| "Unknown error".to_string());
            Err(format!("[SMS Service] TextLocal error: {}", error_body).into())
        }
    }
}

impl Default for SmsService {
    fn default() -> Self {
        Self::new()
    }
}
