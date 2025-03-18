import subprocess

def  transcribe_audio(audio_file_path):
    command = f"ollama run whisper-1 --input {audio_file_path}"
    result = subprocess.run(command, shell=True, check=True, stdout=subprocess.PIPE, text=True)
    return result.stdout