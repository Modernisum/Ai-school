use crate::error::AppError;
use anyhow::{anyhow, Result};
use lettre::{
    message::{header, MultiPart, SinglePart},
    transport::smtp::authentication::Credentials,
    AsyncSmtpTransport, AsyncTransport, Message, Tokio1Executor,
};
use serde_json::Value;
use std::env;

/// Email service for sending notifications and reports
pub struct EmailService {
    smtp_host: String,
    smtp_port: u16,
    smtp_username: String,
    smtp_password: String,
    from_email: String,
    enabled: bool,
}

impl EmailService {
    /// Create a new email service from environment variables
    pub fn new() -> Self {
        let smtp_host = env::var("SMTP_HOST").unwrap_or_else(|_| "smtp.gmail.com".to_string());
        let smtp_port = env::var("SMTP_PORT")
            .unwrap_or_else(|_| "587".to_string())
            .parse()
            .unwrap_or(587);
        let smtp_username = env::var("SMTP_USERNAME").unwrap_or_else(|_| "".to_string());
        let smtp_password = env::var("SMTP_PASSWORD").unwrap_or_else(|_| "".to_string());
        let from_email = env::var("SMTP_FROM_EMAIL")
            .unwrap_or_else(|_| "noreply@vidhyam.com".to_string());

        let enabled = !smtp_username.is_empty() && !smtp_password.is_empty();

        Self {
            smtp_host,
            smtp_port,
            smtp_username,
            smtp_password,
            from_email,
            enabled,
        }
    }

    /// Check if email service is enabled
    pub fn is_enabled(&self) -> bool {
        self.enabled
    }

    /// Send a simple text email
    pub async fn send_email(
        &self,
        to: &str,
        subject: &str,
        body: &str,
    ) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        if !self.enabled {
            println!("[Email Service] Email service is disabled. Would send to {}: {}", to, subject);
            return Ok(());
        }

        let email = Message::builder()
            .from(self.from_email.parse()?)
            .to(to.parse()?)
            .subject(subject)
            .body(body.to_string())?;

        let creds = Credentials::new(self.smtp_username.clone(), self.smtp_password.clone());

        let mailer: AsyncSmtpTransport<Tokio1Executor> =
            AsyncSmtpTransport::<Tokio1Executor>::starttls_relay(&self.smtp_host)?
                .port(self.smtp_port)
                .credentials(creds)
                .build();

        match mailer.send(email).await {
            Ok(_) => {
                println!("[Email Service] Email sent successfully to {}", to);
                Ok(())
            }
            Err(e) => {
                eprintln!("[Email Service] Failed to send email: {}", e);
                Err(anyhow!("Failed to send email: {}", e).into())
            }
        }
    }

    /// Send an email with HTML content
    pub async fn send_html_email(
        &self,
        to: &str,
        subject: &str,
        html_body: &str,
        text_body: Option<&str>,
    ) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        if !self.enabled {
            println!("[Email Service] Email service is disabled. Would send HTML email to {}: {}", to, subject);
            return Ok(());
        }

        let text_body = text_body.unwrap_or("Please view this email in an HTML-enabled client.");

        let email = Message::builder()
            .from(self.from_email.parse()?)
            .to(to.parse()?)
            .subject(subject)
            .multipart(
                MultiPart::alternative()
                    .singlepart(SinglePart::plain(text_body.to_string()))
                    .singlepart(SinglePart::html(html_body.to_string())),
            )?;

        let creds = Credentials::new(self.smtp_username.clone(), self.smtp_password.clone());

        let mailer: AsyncSmtpTransport<Tokio1Executor> =
            AsyncSmtpTransport::<Tokio1Executor>::starttls_relay(&self.smtp_host)?
                .port(self.smtp_port)
                .credentials(creds)
                .build();

        match mailer.send(email).await {
            Ok(_) => {
                println!("[Email Service] HTML email sent successfully to {}", to);
                Ok(())
            }
            Err(e) => {
                eprintln!("[Email Service] Failed to send HTML email: {}", e);
                Err(anyhow!("Failed to send HTML email: {}", e).into())
            }
        }
    }

    /// Send an email with PDF attachment
    pub async fn send_email_with_pdf(
        &self,
        to: &str,
        subject: &str,
        body: &str,
        pdf_data: &[u8],
        filename: &str,
    ) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        if !self.enabled {
            println!("[Email Service] Email service is disabled. Would send PDF email to {}: {} ({} bytes)", 
                     to, subject, pdf_data.len());
            return Ok(());
        }

        let email = Message::builder()
            .from(self.from_email.parse()?)
            .to(to.parse()?)
            .subject(subject)
            .multipart(
                MultiPart::mixed()
                    .singlepart(SinglePart::plain(body.to_string()))
                    .singlepart(
                        SinglePart::builder()
                            .header(header::ContentType::parse("application/pdf").unwrap())
                            .header(header::ContentDisposition {
                                disposition: lettre::message::header::ContentDispositionType::Attachment,
                                parameters: vec![lettre::message::header::ContentDispositionParam::Filename(
                                    filename.to_string(),
                                )],
                            })
                            .body(pdf_data.to_vec()),
                    ),
            )?;

        let creds = Credentials::new(self.smtp_username.clone(), self.smtp_password.clone());

        let mailer: AsyncSmtpTransport<Tokio1Executor> =
            AsyncSmtpTransport::<Tokio1Executor>::starttls_relay(&self.smtp_host)?
                .port(self.smtp_port)
                .credentials(creds)
                .build();

        match mailer.send(email).await {
            Ok(_) => {
                println!("[Email Service] Email with PDF attachment sent successfully to {}", to);
                Ok(())
            }
            Err(e) => {
                eprintln!("[Email Service] Failed to send email with PDF: {}", e);
                Err(anyhow!("Failed to send email with PDF: {}", e).into())
            }
        }
    }

    /// Send responsibility report via email
    pub async fn send_responsibility_report(
        &self,
        to: &str,
        school_name: &str,
        report_type: &str,
        period: &str,
        pdf_data: Option<&[u8]>,
    ) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        let subject = format!("{} Responsibility Report - {}", school_name, report_type);
        
        let html_body = format!(
            r#"<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>{}</title>
    <style>
        body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
        .header {{ background-color: #4CAF50; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }}
        .content {{ background-color: #f9f9f9; padding: 20px; border-radius: 0 0 5px 5px; }}
        .footer {{ margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #777; }}
        .button {{ display: inline-block; background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>{} Responsibility Report</h1>
            <p>Period: {}</p>
        </div>
        <div class="content">
            <p>Hello,</p>
            <p>Your {} responsibility report for {} is ready.</p>
            <p>The report includes:</p>
            <ul>
                <li>Employee workload metrics</li>
                <li>Space utilization analysis</li>
                <li>Revenue generation from responsibilities</li>
                <li>Responsibility distribution across employees</li>
            </ul>
            <p>You can also view this report in your Vidhyam dashboard.</p>
            <p>Best regards,<br>The Vidhyam Team</p>
        </div>
        <div class="footer">
            <p>This is an automated email. Please do not reply to this message.</p>
            <p>© {} Vidhyam School Management System</p>
        </div>
    </div>
</body>
</html>"#,
            subject, school_name, period, report_type, school_name,
            chrono::Utc::now().year()
        );

        if let Some(pdf_data) = pdf_data {
            let filename = format!("{}_{}_{}.pdf", school_name.replace(" ", "_"), report_type.replace(" ", "_"), period.replace(" ", "_"));
            self.send_email_with_pdf(
                to,
                &subject,
                &format!("Please find attached your {} responsibility report for {}.", report_type, school_name),
                pdf_data,
                &filename,
            )
            .await
        } else {
            self.send_html_email(to, &subject, &html_body, None).await
        }
    }
}

impl Default for EmailService {
    fn default() -> Self {
        Self::new()
    }
}