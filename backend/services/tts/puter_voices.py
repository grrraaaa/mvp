"""Puter.js TTS languages — client-side only; catalog for /api/tts/voices."""

PUTER_LANGUAGES = [
    {"id": "en-US", "name": "English (US)", "locale": "en-US"},
    {"id": "fr-FR", "name": "French", "locale": "fr-FR"},
    {"id": "de-DE", "name": "German", "locale": "de-DE"},
    {"id": "es-ES", "name": "Spanish", "locale": "es-ES"},
    {"id": "it-IT", "name": "Italian", "locale": "it-IT"},
]

DEFAULT_LANGUAGE = "en-US"


def list_assistant_voices() -> dict:
    return {
        "default_voice": DEFAULT_LANGUAGE,
        "model": "puter-js",
        "language": "multi",
        "providers": ["puter"],
        "puter_available": True,
        "groups": [
            {
                "id": "puter",
                "label": "Язык озвучки",
                "voices": [
                    {
                        "id": lang["id"],
                        "name": lang["name"],
                        "locale": lang["locale"],
                        "tier": "puter",
                        "description": "Puter TTS (браузер)",
                    }
                    for lang in PUTER_LANGUAGES
                ],
            }
        ],
    }


def tts_status_payload() -> dict:
    return {
        "enabled": True,
        "model": "puter-js",
        "provider": "puter",
        "providers": ["puter"],
        "puter_available": True,
        "language": "multi",
        "voice": DEFAULT_LANGUAGE,
        "voice_selection": True,
    }
