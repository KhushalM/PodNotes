import whisper
import os
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def transcribe_audio(audio_file_path):
    """
    Transcribe audio using the Whisper model directly with timestamps.
    Args:
        audio_file_path (str): Path to the audio file to transcribe
    Returns:
        dict: Transcription result with text and segments containing timestamps
    """
    try:
        # Load the Whisper model (you can change the model size as needed)
        model = whisper.load_model("base")
        
        # Transcribe the audio
        result = model.transcribe(audio_file_path)
        
        # Format the transcription with timestamps
        transcription_with_timestamps = ""
        for segment in result["segments"]:
            start_time = format_timestamp(segment["start"])
            end_time = format_timestamp(segment["end"])
            text = segment["text"]
            transcription_with_timestamps += f"[{start_time} --> {end_time}] {text}\n"
        
        # Return both the full text and the timestamped version
        return {
            "text": result["text"],
            "segments": result["segments"],
            "timestamped_text": transcription_with_timestamps
        }
    except Exception as e:
        raise Exception(f"Error transcribing audio with Whisper: {str(e)}")

def format_timestamp(seconds):
    """Convert seconds to HH:MM:SS format"""
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    seconds = int(seconds % 60)
    milliseconds = int((seconds % 1) * 1000)
    return f"{hours:02d}:{minutes:02d}:{seconds:02d}"