# Озвучка ассистента

## Qwen (Model Studio, русский)

```env
QWEN_TTS_API_KEY=sk-ws-...
QWEN_TTS_BASE_URL=https://ws-XXXX.eu-central-1.maas.aliyuncs.com/api/v1
QWEN_TTS_VOICE=qwen-male
QWEN_TTS_MODEL=qwen3-tts-flash,cosyvoice-v3-flash
```

Голоса: **Alek** (м), **Serena** (ж), `language_type=Russian`.

**Важно:** в [Model Studio](https://modelstudio.console.alibabacloud.com/) (регион Germany Frankfurt) откройте **Models** и включите модель **Speech synthesis** (`qwen3-tts-flash` или `cosyvoice-v3-flash`). Без этого API вернёт `Model not exist`.

## Microsoft Edge (fallback, без ключа)

`ru-RU-DmitryNeural` (м), `ru-RU-SvetlanaNeural` (ж).

Если Qwen недоступен — озвучка автоматически через Edge.
