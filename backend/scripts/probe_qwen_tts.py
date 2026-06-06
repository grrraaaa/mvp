"""Probe Qwen/CosyVoice TTS on Model Studio EU endpoint."""
import httpx
import json
import sys

KEY = sys.argv[1] if len(sys.argv) > 1 else ""
BASE = "https://ws-pxdco38pzkhilx2i.eu-central-1.maas.aliyuncs.com"
HEADERS = {"Authorization": f"Bearer {KEY}", "Content-Type": "application/json"}


def try_url(url: str, payload: dict) -> None:
    resp = httpx.post(url, headers=HEADERS, json=payload, timeout=90)
    try:
        data = resp.json()
    except Exception:
        data = {"raw": resp.text[:300]}
    print(url.split("/")[-1], payload.get("model"), resp.status_code, data.get("code"), (data.get("message") or "")[:100])
    if resp.status_code == 200:
        out = data.get("output") or data
        audio = out.get("audio") if isinstance(out, dict) else None
        if audio:
            print("  audio url", (audio.get("url") or "")[:100])
        if out.get("audio"):
            print("  nested", out["audio"])


def main() -> None:
    qwen_payload = {
        "model": "qwen3-tts-flash",
        "input": {
            "text": "Привет, это тест озвучки.",
            "voice": "Alek",
            "language_type": "Russian",
        },
    }
    cosy_payload = {
        "model": "cosyvoice-v3-flash",
        "input": {
            "text": "Привет, это тест озвучки.",
            "voice": "longanyang",
            "format": "mp3",
            "sample_rate": 24000,
        },
    }
    cosy35 = {
        "model": "cosyvoice-v3.5-flash",
        "input": {
            "text": "Привет, это тест.",
            "voice": "longanyang",
            "format": "mp3",
        },
    }
    urls = [
        f"{BASE}/api/v1/services/aigc/multimodal-generation/generation",
        f"{BASE}/api/v1/services/audio/tts/SpeechSynthesizer",
    ]
    for url in urls:
        for payload in (qwen_payload, cosy_payload, cosy35):
            try_url(url, payload)


if __name__ == "__main__":
    main()
