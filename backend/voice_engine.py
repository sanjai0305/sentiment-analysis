"""
voice_engine.py
---------------
Voice-to-Sentiment pipeline using OpenAI Whisper for STT.
Processes audio bytes → transcript → sentiment analysis.
"""
from __future__ import annotations
import io
import tempfile
import os
import threading

_whisper_model = None
_lock = threading.Lock()


def _load_whisper():
    global _whisper_model
    if _whisper_model is None:
        with _lock:
            if _whisper_model is None:
                try:
                    import whisper
                    # Use 'tiny' for speed; can upgrade to 'base' or 'small'
                    _whisper_model = whisper.load_model("tiny")
                    print("Whisper 'tiny' model loaded.")
                except Exception as e:
                    print(f"Whisper load failed: {e}")
                    _whisper_model = "unavailable"
    return _whisper_model


def transcribe_audio(audio_bytes: bytes, file_format: str = "webm") -> dict:
    """
    Transcribe audio bytes to text using Whisper.
    Returns: {"transcript": str, "language": str, "error": str | None}
    """
    model = _load_whisper()
    if model == "unavailable" or model is None:
        return {"transcript": "", "language": "unknown", "error": "Whisper model not available"}

    try:
        # Save to a temp file (Whisper needs a file path)
        suffix = f".{file_format}"
        with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
            tmp.write(audio_bytes)
            tmp_path = tmp.name

        result = model.transcribe(tmp_path, fp16=False)
        os.unlink(tmp_path)

        return {
            "transcript": result.get("text", "").strip(),
            "language": result.get("language", "en"),
            "error": None,
        }
    except Exception as e:
        return {"transcript": "", "language": "unknown", "error": str(e)}


def analyze_voice_sentiment(audio_bytes: bytes, predict_fn, file_format: str = "webm") -> dict:
    """
    Full pipeline: audio → transcript → sentiment.
    predict_fn: callable(text: str) -> str (sentiment label)
    """
    transcription = transcribe_audio(audio_bytes, file_format)

    if transcription["error"] or not transcription["transcript"]:
        return {
            "transcript": "",
            "sentiment": "Unknown",
            "language": "unknown",
            "error": transcription.get("error", "No speech detected"),
        }

    transcript = transcription["transcript"]
    sentiment = predict_fn(transcript)

    return {
        "transcript": transcript,
        "sentiment":  sentiment,
        "language":   transcription["language"],
        "error":      None,
    }
