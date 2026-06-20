import os
import httpx
from typing import Dict, Any, List, Optional

class GeminiProvider:
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.client = httpx.AsyncClient(timeout=60.0)

    async def generate_embedding(self, text: str) -> List[float]:
        """Call Gemini embedContent model to get float vector."""
        if self.api_key == "AIzaSyAcpd2loWLizjNP1TgenvHiA7WbaEguvbU":
            # Deterministic mock vector for testing if key is default placeholder
            vec = [0.0] * 768
            for i, c in enumerate(text):
                vec[i % 768] += ord(c) / 100.0
            sum_sq = sum(x * x for x in vec)
            if sum_sq > 0.0:
                norm = sum_sq ** 0.5
                vec = [x / norm for x in vec]
            return vec

        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-2:embedContent?key={self.api_key}"
        body = {
            "model": "models/gemini-embedding-2",
            "content": { "parts": [{"text": text}] }
        }
        response = await self.client.post(url, json=body)
        resp_json = response.json()
        if "embedding" in resp_json and "values" in resp_json["embedding"]:
            return [float(x) for x in resp_json["embedding"]["values"]]
        raise Exception(f"Failed to generate embedding: {resp_json}")

    async def generate_content(self, contents: List[Dict[str, Any]], system_instruction: str, tools: Optional[List[Dict[str, Any]]] = None) -> Dict[str, Any]:
        """Send content query to gemini-2.5-flash with system prompts and tools."""
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={self.api_key}"
        body: Dict[str, Any] = {
            "contents": contents,
            "system_instruction": { "parts": [{"text": system_instruction}] }
        }
        if tools:
            body["tools"] = tools
            
        response = await self.client.post(url, json=body)
        resp_json = response.json()
        return resp_json

class DeepSeekProvider:
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.environ.get("DEEPSEEK_API_KEY", "")
        self.client = httpx.AsyncClient(timeout=60.0)

    async def chat_completion(self, messages: List[Dict[str, Any]], json_format: bool = True) -> Dict[str, Any]:
        """Request completion from DeepSeek Chat endpoint."""
        url = "https://api.deepseek.com/chat/completions"
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        body = {
            "model": "deepseek-v4-flash",
            "messages": messages
        }
        if json_format:
            body["response_format"] = { "type": "json_object" }
            
        response = await self.client.post(url, headers=headers, json=body)
        return response.json()

class OllamaProvider:
    def __init__(self, base_url: Optional[str] = None):
        self.base_url = base_url or os.environ.get("OLLAMA_BASE_URL", "http://localhost:11434")
        self.client = httpx.AsyncClient(timeout=60.0)

    async def chat_with_messages(self, model: str, messages: List[Dict[str, Any]]) -> str:
        """Call local Ollama Chat completion in JSON format."""
        url = f"{self.base_url}/api/chat"
        body = {
            "model": model,
            "messages": messages,
            "stream": False,
            "format": "json"
        }
        response = await self.client.post(url, json=body)
        res = response.json()
        if "message" in res and "content" in res["message"]:
            return res["message"]["content"]
        raise Exception(f"Ollama error: {res}")
