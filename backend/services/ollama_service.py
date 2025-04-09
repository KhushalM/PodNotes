import whisper
import os
import logging
import pvfalcon

# Check if DIARIZATION is set in environment
raw_diarization = os.environ.get('DIARIZATION', 'false')
logger = logging.getLogger(__name__)
logger.info(f"Raw DIARIZATION environment variable: '{raw_diarization}'")
DIARIZATION = raw_diarization.lower() == 'true'

logging.basicConfig(level=logging.INFO)
logger.info(f"DIARIZATION: {DIARIZATION}")

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
        result = model.transcribe(audio_file_path)  
        
        if DIARIZATION:
            logger.info("Performing diarization...")
            
            # Get multiple diarization outputs using different systems
            diarization_outputs = []
            
            # 1. PvFalcon diarization (always attempt this as backup)
            try:
                logger.info("Performing PvFalcon diarization...")
                falcon = pvfalcon.create(access_key=PVFALCON_TOKEN)
                falcon_segments = falcon.process_file(audio_file_path)
                
                # Convert falcon output to our format
                falcon_formatted = []
                for segment in falcon_segments:
                    falcon_formatted.append({
                        "start": segment.start_sec,
                        "end": segment.end_sec,
                        "speaker": segment.speaker_tag
                    })
                diarization_outputs.append(falcon_formatted)
                logger.info("PvFalcon diarization completed")
            except Exception as e:
                logger.error(f"Error with PvFalcon diarization: {str(e)}")
            
            # If no diarization systems worked, proceed without speaker info
            if not diarization_outputs:
                logger.warning("All diarization systems failed. Proceeding without speaker information.")
                # Format the transcription with timestamps (no speaker info)
                transcription_with_timestamps = ""
                for segment in result["segments"]:
                    start_time = format_timestamp(segment["start"])
                    end_time = format_timestamp(segment["end"])
                    text = segment["text"]
                    transcription_with_timestamps += f"[{start_time} --> {end_time}] {text}\n"
                
                return {
                    "text": result["text"],
                    "segments": result["segments"],
                    "timestamped_text": transcription_with_timestamps
                }
            # Map diarization results to Whisper segments
            for segment in result["segments"]:
                best_overlap = 0
                best_speaker = None
                
                for diar_segment in diarization_outputs[0]:
                    # Calculate overlap between whisper segment and diarization segment
                    overlap_start = max(segment["start"], diar_segment["start"])
                    overlap_end = min(segment["end"], diar_segment["end"])
                    overlap = max(0, overlap_end - overlap_start)
                    
                    if overlap > best_overlap:
                        best_overlap = overlap
                        best_speaker = diar_segment["speaker"]
                
                # Assign the best matching speaker to this segment
                segment["speaker"] = best_speaker if best_speaker else f"Speaker_Unknown"
            
            # Store speaker information in result
            result["speakers"] = diarization_outputs[0]
            
            # Format the transcription with timestamps and speakers
            transcription_with_timestamps = []
            for segment in result["segments"]:
                start_time = format_timestamp(segment["start"])
                end_time = format_timestamp(segment["end"])
                speaker = segment["speaker"]
                text = segment["text"]
                transcription_with_timestamps.append({
                    "start": start_time,
                    "end": end_time,
                    "speaker": speaker,
                    "text": text,
                })
            
            # Return both the full text and the timestamped version
            return transcription_with_timestamps
        else:
            # Format the transcription with timestamps (no speaker info)
            transcription_with_timestamps = []
            speaker = "Unidentified Speaker"
            for segment in result["segments"]:
                start_time = format_timestamp(segment["start"])
                end_time = format_timestamp(segment["end"])
                segment["speaker"] = speaker
                text = segment["text"]
                transcription_with_timestamps.append({
                    "start": start_time,
                    "end": end_time,
                    "speaker": speaker,
                    "text": text
                })
        
            logger.info("Transcription with timestamps completed")
            # Return both the full text and the timestamped version
            return transcription_with_timestamps
    except Exception as e:
        logger.error(f"Error in transcribe_audio: {str(e)}")
        raise Exception(f"Error transcribing audio with Whisper: {str(e)}")

def format_timestamp(seconds):
    """Convert seconds to HH:MM:SS format"""
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    seconds = int(seconds % 60)
    return f"{hours:02d}:{minutes:02d}:{seconds:02d}"