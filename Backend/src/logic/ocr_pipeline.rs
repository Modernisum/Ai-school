use anyhow::{Context, Result as AnyResult};

#[cfg(feature = "ocr")]
use candle_core::{DType, Device, IndexOp, Tensor};
#[cfg(feature = "ocr")]
use candle_nn::VarBuilder;
#[cfg(feature = "ocr")]
use candle_transformers::generation::LogitsProcessor;
#[cfg(feature = "ocr")]
use candle_transformers::models::phi3::Config as Phi3Config;
#[cfg(feature = "ocr")]
use candle_transformers::models::quantized_phi3::ModelWeights as Phi3Model;
#[cfg(feature = "ocr")]
use candle_transformers::models::trocr::{TrOCRConfig, TrOCRModel as TrOCRModelType};
#[cfg(feature = "ocr")]
use candle_transformers::models::vit::Config as VitConfig;
#[cfg(feature = "ocr")]
use tokenizers::Tokenizer;

// We use a custom wrapper since TrOCR is complex
#[cfg(feature = "ocr")]
pub struct TrOCRModel {
    pub model: tokio::sync::Mutex<TrOCRModelType>,
    pub tokenizer: Tokenizer,
    pub decoder_start_token_id: u32,
    pub eos_token_id: u32,
}

pub struct OcrPipeline {
    #[cfg(feature = "ocr")]
    device: Device,
    #[cfg(feature = "ocr")]
    trocr: Option<TrOCRModel>,
    #[cfg(feature = "ocr")]
    phi3_model: Option<tokio::sync::Mutex<Phi3Model>>,
    #[cfg(feature = "ocr")]
    phi3_tokenizer: Option<Tokenizer>,
}

impl OcrPipeline {
    pub fn new() -> anyhow::Result<Self> {
        #[cfg(feature = "ocr")]
        {
            let device = if candle_core::utils::cuda_is_available() {
                Device::new_cuda(0)?
            } else {
                Device::Cpu
            };

            Ok(Self {
                device,
                trocr: None,
                phi3_model: None,
                phi3_tokenizer: None,
            })
        }
        #[cfg(not(feature = "ocr"))]
        {
            Ok(Self {})
        }
    }

    pub fn is_ready(&self) -> bool {
        #[cfg(feature = "ocr")]
        {
            self.trocr.is_some() && self.phi3_model.is_some()
        }
        #[cfg(not(feature = "ocr"))]
        {
            false
        }
    }

    pub async fn init_models(&mut self) -> anyhow::Result<()> {
        #[cfg(feature = "ocr")]
        {
            tracing::info!("Initializing TrOCR...");
            if let Err(e) = self.load_trocr() {
                tracing::warn!("Failed to load TrOCR: {}", e);
            }

            tracing::info!("Initializing Phi-3...");
            if let Err(e) = self.load_phi3() {
                tracing::warn!("Failed to load Phi-3: {}", e);
            }
        }
        #[cfg(not(feature = "ocr"))]
        {
            tracing::info!("OCR Models initialization skipped (Feature 'ocr' disabled).");
        }

        Ok(())
    }

    #[cfg(feature = "ocr")]
    fn load_trocr(&mut self) -> anyhow::Result<()> {
        let model_dir = std::path::Path::new("/app/models/trocr");

        let (config_path, model_path, tokenizer_path) = if model_dir.join("config.json").exists() {
            tracing::info!("Loading TrOCR from local volume: {}", model_dir.display());
            (
                model_dir.join("config.json"),
                model_dir.join("model.safetensors"),
                model_dir.join("tokenizer.json"),
            )
        } else {
            tracing::info!("TrOCR not found locally, attempting HuggingFace Hub fallback...");
            let api = hf_hub::api::sync::Api::new()
                .map_err(|e| anyhow::anyhow!("HF Hub init failed: {}", e))?;

            let repo = api.repo(hf_hub::Repo::new(
                "microsoft/trocr-base-handwritten".to_string(),
                hf_hub::RepoType::Model,
            ));

            (
                repo.get("config.json")?,
                repo.get("model.safetensors")?,
                repo.get("tokenizer.json")?,
            )
        };

        let full_cfg: serde_json::Value =
            serde_json::from_reader(std::fs::File::open(&config_path)?)?;

        let encoder_cfg: VitConfig = serde_json::from_value(full_cfg["encoder"].clone())?;
        let decoder_cfg: TrOCRConfig = serde_json::from_value(full_cfg["decoder"].clone())?;

        let decoder_start_token_id = full_cfg["decoder"]["decoder_start_token_id"]
            .as_u64()
            .unwrap_or(2) as u32;
        let eos_token_id = full_cfg["decoder"]["eos_token_id"].as_u64().unwrap_or(2) as u32;

        let tokenizer = Tokenizer::from_file(&tokenizer_path).map_err(anyhow::Error::msg)?;

        let vb = unsafe {
            VarBuilder::from_mmaped_safetensors(&[&model_path], DType::F32, &self.device)?
        };
        let model = TrOCRModelType::new(&encoder_cfg, &decoder_cfg, vb)?;

        self.trocr = Some(TrOCRModel {
            model: tokio::sync::Mutex::new(model),
            tokenizer,
            decoder_start_token_id,
            eos_token_id,
        });

        tracing::info!("TrOCR loaded successfully.");
        Ok(())
    }

    #[cfg(feature = "ocr")]
    fn load_phi3(&mut self) -> anyhow::Result<()> {
        let model_dir = std::path::Path::new("/app/models/phi3");
        let model_path = model_dir.join("model.gguf");
        let tokenizer_path = model_dir.join("tokenizer.json");

        if !model_path.exists() {
            anyhow::bail!("Phi-3 GGUF model not found at {}", model_path.display());
        }

        tracing::info!("Loading Quantized Phi-3 from: {}", model_path.display());

        let mut file = std::fs::File::open(&model_path)?;
        let gguf = candle_core::quantized::gguf_file::Content::read(&mut file)
            .map_err(|e| anyhow::anyhow!("Failed to read GGUF: {}", e))?;

        let model = Phi3Model::from_gguf(false, gguf, &mut file, &self.device)
            .map_err(|e| anyhow::anyhow!("Failed into load Quantized Phi-3: {}", e))?;

        let tokenizer = if tokenizer_path.exists() {
            Tokenizer::from_file(&tokenizer_path).map_err(anyhow::Error::msg)?
        } else {
            anyhow::bail!("Phi-3 tokenizer.json not found");
        };

        self.phi3_model = Some(tokio::sync::Mutex::new(model));
        self.phi3_tokenizer = Some(tokenizer);

        tracing::info!("Quantized Phi-3 loaded successfully.");
        Ok(())
    }

    pub async fn process_image(&self, image_path: &str) -> anyhow::Result<serde_json::Value> {
        #[cfg(not(feature = "ocr"))]
        {
            tracing::info!("OCR is disabled at compile-time. Returning mock response.");
            return Ok(serde_json::json!({
                "status": "success",
                "message": "OCR Feature is disabled in this build to save resources.",
                "raw_text": "MOCK TEXT (Feature Disabled)",
                "cleaned_text": "MOCK CLEANED TEXT (Feature Disabled)",
                "engine": "Stub (Development Mode)"
            }));
        }

        #[cfg(feature = "ocr")]
        {
            if self.trocr.is_none() {
                tracing::info!("OCR Models not initialized. Returning mock response.");
                return Ok(serde_json::json!({
                    "status": "success",
                    "raw_text": "MOCK OCR TEXT (Fast Development Mode Active)",
                    "cleaned_text": "MOCK CLEANED TEXT: This is a simulated response because SKIP_OCR_INIT is enabled.",
                    "accuracy_level": "Mock Data",
                    "engine": "Bypassed (Development)"
                }));
            }

            let raw_text = self.extract_text(image_path).await?;

            let cleaned_text = if let (Some(phi3_mutex), Some(tokenizer)) =
                (&self.phi3_model, &self.phi3_tokenizer)
            {
                tracing::info!("Stage 1 (TrOCR) completed. Starting Stage 2 (Phi-3 cleanup)...");
                let mut phi3 = phi3_mutex.lock().await;
                match self
                    .clean_text_with_llm(&raw_text, &mut *phi3, tokenizer)
                    .await
                {
                    Ok(txt) => {
                        tracing::info!("Stage 2 (Phi-3) completed successfully.");
                        txt
                    }
                    Err(e) => {
                        tracing::warn!("Phi-3 cleanup failed: {}", e);
                        raw_text.clone()
                    }
                }
            } else {
                raw_text.clone()
            };

            Ok(serde_json::json!({
                "status": "success",
                "raw_text": raw_text,
                "cleaned_text": cleaned_text,
                "accuracy_level": if self.phi3_model.is_some() { "LLM-Optimized" } else { "Raw Extraction" },
                "engine": "Candle Pure Rust (Two-Stage Pipeline)"
            }))
        }
    }

    #[cfg(feature = "ocr")]
    async fn extract_text(&self, image_path: &str) -> anyhow::Result<String> {
        let trocr = self.trocr.as_ref().context("TrOCR not loaded")?;
        let img = image::open(image_path)?;
        let img = self.preprocess(&img)?;

        let mut model = trocr.model.lock().await;
        tracing::info!("TrOCR: Running encoder...");
        let encoder_xs = model.encoder().forward(&img)?;
        tracing::info!("TrOCR: Encoder finished. Starting decoder loop...");
        let mut logits_processor = LogitsProcessor::new(1337, None, None);
        let mut tokens = vec![trocr.decoder_start_token_id];
        let mut result_text = String::new();

        model.reset_kv_cache();

        for i in 0..128 {
            let last_token = tokens.last().context("No tokens")?;
            let input_ids = Tensor::new(&[*last_token], &self.device)?.unsqueeze(0)?;
            let attn_mask = Tensor::ones((1, 1), DType::F32, &self.device)?;
            let logits = model
                .decoder()
                .forward(&input_ids, Some(&encoder_xs), i, &attn_mask)?;
            let logits = logits.i((0, 0))?;
            let next_token = logits_processor.sample(&logits)?;

            if next_token == trocr.eos_token_id {
                tracing::info!("TrOCR: EOS token reached at step {}", i);
                break;
            }

            tokens.push(next_token);
            if let Ok(t) = trocr.tokenizer.decode(&[next_token], true) {
                tracing::debug!("TrOCR Token {}: '{}' (id: {})", i, t, next_token);
                result_text.push_str(&t);
            }
        }

        tracing::info!("TrOCR: Extraction finished. Raw text: '{}'", result_text);
        Ok(result_text)
    }

    #[cfg(feature = "ocr")]
    fn preprocess(&self, img: &image::DynamicImage) -> anyhow::Result<Tensor> {
        tracing::info!("Preprocessing image (384x384)...");
        let img = img.resize_exact(384, 384, image::imageops::FilterType::Triangle);
        let img = img.to_rgb8();
        let data = img.into_raw();
        let data = Tensor::from_vec(data, (384, 384, 3), &self.device)
            .map_err(anyhow::Error::msg)?
            .permute((2, 0, 1))
            .map_err(anyhow::Error::msg)?
            .to_dtype(DType::F32)
            .map_err(anyhow::Error::msg)?
            .to_device(&self.device)
            .map_err(anyhow::Error::msg)?
            / 255.0;

        let mean = Tensor::new(&[0.5f32, 0.5, 0.5], &self.device)
            .map_err(anyhow::Error::msg)?
            .reshape((3, 1, 1))
            .map_err(anyhow::Error::msg)?
            .broadcast_as((3, 384, 384))
            .map_err(anyhow::Error::msg)?;
        let std = Tensor::new(&[0.5f32, 0.5, 0.5], &self.device)
            .map_err(anyhow::Error::msg)?
            .reshape((3, 1, 1))
            .map_err(anyhow::Error::msg)?
            .broadcast_as((3, 384, 384))
            .map_err(anyhow::Error::msg)?;
        let img = ((data - mean).map_err(anyhow::Error::msg)? / std).map_err(anyhow::Error::msg)?;
        Ok(img.unsqueeze(0).map_err(anyhow::Error::msg)?)
    }

    #[cfg(feature = "ocr")]
    async fn clean_text_with_llm(
        &self,
        raw_text: &str,
        model: &mut Phi3Model,
        tokenizer: &Tokenizer,
    ) -> anyhow::Result<String> {
        let prompt = format!(
            "<|user|>\nClean this text and fix OCR errors: {}\n<|assistant|>",
            raw_text
        );
        tracing::info!("Phi-3 cleanup: Prompting with: '{}'", prompt);

        let tokens = tokenizer.encode(prompt, true).map_err(anyhow::Error::msg)?;
        let mut input_ids = tokens.get_ids().to_vec();
        let prompt_tokens = input_ids.len();

        let mut logits_processor = LogitsProcessor::new(1337, None, None);
        let mut result_text = String::new();

        for i in 0..256 {
            let last_token = input_ids[input_ids.len() - 1];
            let input_tensor = Tensor::new(&[last_token], &self.device)?.unsqueeze(0)?;

            let logits = model.forward(&input_tensor, prompt_tokens + i)?;
            let logits = logits.squeeze(0)?.squeeze(0)?.to_dtype(DType::F32)?;
            let next_token = logits_processor.sample(&logits)?;

            input_ids.push(next_token);
            if let Ok(token_text) = tokenizer.decode(&[next_token], true) {
                tracing::debug!("Phi-3 Token {}: '{}' (id: {})", i, token_text, next_token);
                result_text.push_str(&token_text);

                if token_text.contains("<|end|>") || token_text.contains("<|endoftext|>") {
                    tracing::info!("Phi-3: Termination token reached at step {}", i);
                    break;
                }
            }
        }

        tracing::info!("Phi-3: Cleanup finished. Result: '{}'", result_text);
        Ok(result_text)
    }
}
