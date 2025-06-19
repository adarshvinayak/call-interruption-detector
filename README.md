# Call Interruption Detector

A web application that analyzes stereo audio files to detect interruptions between speakers in call recordings. The application separates audio channels and identifies timestamps where both channels have overlapping audio activity, indicating an interruption.

## Features

- Upload and process stereo audio files
- Visualize audio waveforms with separate channels
- Detect interruptions between speakers
- Display timestamps and durations of interruptions
- Navigate to specific interruption points in the audio
- Play and pause audio playback

## How It Works

1. The application loads a stereo audio file where each channel represents a different speaker
2. It analyzes both channels to detect moments when both speakers are talking simultaneously
3. When the amplitude of both channels exceeds a threshold for a minimum duration, it's identified as an interruption
4. The application displays a list of interruptions with their timestamps and durations
5. Users can jump to specific interruption points to listen to them

## Usage

1. Open `index.html` in a modern web browser
2. Click "Choose File" to select a stereo audio file (e.g., WAV, MP3)
3. Click "Analyze Audio" to process the file
4. View the detected interruptions in the table below the waveform
5. Use the "Jump to" buttons to navigate to specific interruptions
6. Use the Play/Pause buttons to control audio playback

## Technical Details

The application uses the following technologies:

- **Web Audio API**: For audio processing and channel separation
- **WaveSurfer.js**: For audio visualization and playback
- **HTML5/CSS3/JavaScript**: For the user interface and application logic

## Requirements

- A modern web browser with Web Audio API support (Chrome, Firefox, Edge, Safari)
- Stereo audio files (2-channel audio)

## Limitations

- The application works best with clear audio recordings where each speaker is on a separate channel
- Very large audio files may take longer to process
- The detection threshold is set to a default value and may need adjustment for different audio sources

## Future Improvements

- Adjustable detection parameters (threshold, minimum duration)
- Export interruption data as CSV or JSON
- Batch processing of multiple files
- More detailed audio analysis and statistics