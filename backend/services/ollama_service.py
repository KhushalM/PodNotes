import whisper

def transcribe_audio(audio_file_path):
    """
    Transcribe audio using the Whisper model directly.
    
    Args:
        audio_file_path (str): Path to the audio file to transcribe
        
    Returns:
        str: Transcribed text
    """
    try:
        # Load the Whisper model (you can change the model size as needed)
        model = whisper.load_model("base")
        
        # Transcribe the audio
        result = model.transcribe(audio_file_path)
        
        # Return the transcribed text
        return result["text"]
    except Exception as e:
        raise Exception(f"Error transcribing audio with Whisper: {str(e)}")