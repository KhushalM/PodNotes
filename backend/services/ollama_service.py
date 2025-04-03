import whisper
import os
import logging
import pvfalcon
import numpy as np
from scipy.io import wavfile
import torch
from dover_lap import dover_lap

# Try to import pyannote.audio, but don't fail if it's not available
try:
    from pyannote.audio import Pipeline
    PYANNOTE_AVAILABLE = True
except ImportError:
    PYANNOTE_AVAILABLE = False
    logger = logging.getLogger(__name__)
    logger.warning("pyannote.audio not available. Will use only PvFalcon for diarization.")

# Check if DIARIZATION is set in environment
DIARIZATION = os.environ.get('DIARIZATION', 'false').lower() == 'true'
HUGGINGFACE_TOKEN = os.environ.get('HUGGINGFACE_TOKEN', '')
PVFALCON_TOKEN = os.environ.get('PVFALCON_TOKEN', '')

logging.basicConfig(level=logging.INFO)

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
        
        if DIARIZATION:
            logger = logging.getLogger(__name__)
            logger.info("Performing diarization...")
            
            # Get multiple diarization outputs using different systems
            diarization_outputs = []
            
            # 1. Pyannote.audio diarization (if available)
            if PYANNOTE_AVAILABLE and HUGGINGFACE_TOKEN:
                try:
                    logger.info("Attempting pyannote.audio diarization...")
                    # Initialize pyannote pipeline with HuggingFace token
                    # You need to accept the user agreement at https://huggingface.co/pyannote/speaker-diarization
                    pyannote_pipeline = Pipeline.from_pretrained(
                        "pyannote/speaker-diarization", 
                        use_auth_token=HUGGINGFACE_TOKEN
                    )
                    
                    # Apply the pipeline to an audio file
                    pyannote_diarization = pyannote_pipeline(audio_file_path)
                    
                    # Convert pyannote output to RTTM-like format for DOVER-Lap
                    pyannote_segments = []
                    for turn, _, speaker in pyannote_diarization.itertracks(yield_label=True):
                        pyannote_segments.append({
                            "start": turn.start,
                            "end": turn.end,
                            "speaker": speaker
                        })
                    diarization_outputs.append(pyannote_segments)
                    logger.info("Pyannote diarization completed")
                except Exception as e:
                    logger.error(f"Error with pyannote diarization: {str(e)}")
                    logger.info("Continuing with PvFalcon diarization only")
            
            # 2. PvFalcon diarization (always attempt this as backup)
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
            
            # Apply DOVER-Lap if we have multiple diarization outputs
            if len(diarization_outputs) > 1:
                try:
                    # Convert our format to DOVER-Lap expected format
                    dover_inputs = []
                    for system_output in diarization_outputs:
                        dover_format = []
                        for segment in system_output:
                            dover_format.append((
                                segment["start"], 
                                segment["end"], 
                                segment["speaker"]
                            ))
                        dover_inputs.append(dover_format)
                    
                    # Apply DOVER-Lap fusion
                    fused_diarization = dover_lap(dover_inputs)
                    
                    # Convert back to our format
                    final_diarization = []
                    for start, end, speaker in fused_diarization:
                        final_diarization.append({
                            "start": start,
                            "end": end,
                            "speaker": speaker
                        })
                    logger.info("DOVER-Lap fusion completed successfully")
                except Exception as e:
                    logger.error(f"Error with DOVER-Lap fusion: {str(e)}")
                    # Fall back to first available diarization
                    final_diarization = diarization_outputs[0]
            else:
                # If only one diarization system worked, use that
                final_diarization = diarization_outputs[0]
            
            # Map diarization results to Whisper segments
            for segment in result["segments"]:
                best_overlap = 0
                best_speaker = None
                
                for diar_segment in final_diarization:
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
            result["speakers"] = final_diarization
            
            # Format the transcription with timestamps and speakers
            transcription_with_timestamps = ""
            for segment in result["segments"]:
                start_time = format_timestamp(segment["start"])
                end_time = format_timestamp(segment["end"])
                speaker = segment.get("speaker", "Unknown")
                text = segment["text"]
                transcription_with_timestamps += f"[{start_time} --> {end_time}] {speaker}: {text}\n"
        else:
            # Format the transcription with timestamps (no speaker info)
            transcription_with_timestamps = ""
            for segment in result["segments"]:
                start_time = format_timestamp(segment["start"])
                end_time = format_timestamp(segment["end"])
                text = segment["text"]
                transcription_with_timestamps += f"[{start_time} --> {end_time}] {text}\n"
        
        logger.info("Transcription with timestamps completed")
        # Return both the full text and the timestamped version
        return {
            "text": result["text"],
            "segments": result["segments"],
            "timestamped_text": transcription_with_timestamps
        }
    except Exception as e:
        logger = logging.getLogger(__name__)
        logger.error(f"Error in transcribe_audio: {str(e)}")
        raise Exception(f"Error transcribing audio with Whisper: {str(e)}")

def format_timestamp(seconds):
    """Convert seconds to HH:MM:SS format"""
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    seconds = int(seconds % 60)
    return f"{hours:02d}:{minutes:02d}:{seconds:02d}"