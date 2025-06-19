document.addEventListener('DOMContentLoaded', function() {
    // DOM elements
    const fileInput = document.getElementById('audioFile');
    const analyzeBtn = document.getElementById('analyzeBtn');
    const loadingIndicator = document.getElementById('loadingIndicator');
    const resultsSection = document.getElementById('results'); // Correct ID from HTML
    const waveformContainer = document.getElementById('waveform');
    const interruptionsList = document.getElementById('interruptionsList');
    const audioControls = document.getElementById('audioControls');
    const playPauseBtn = document.getElementById('playPauseBtn');
    const errorMessage = document.getElementById('errorMessage');
    
    // Settings panel elements
    const thresholdSlider = document.getElementById('thresholdSlider');
    const thresholdValue = document.getElementById('thresholdValue');
    const minDurationSlider = document.getElementById('minDurationSlider');
    const minDurationValue = document.getElementById('minDurationValue');
    const adaptiveThresholdToggle = document.getElementById('adaptiveThresholdToggle');
    const toggleDebugBtn = document.getElementById('toggleDebugBtn');
    const debugPanel = document.getElementById('debugPanel');
    const detectionLog = document.getElementById('detectionLog');
    const audioInfoContent = document.getElementById('audioInfoContent');
    
    // VAPI Call Recordings Section Logic
    const vapiSection = document.getElementById('vapiSection');
    const vapiCollapseIcon = document.getElementById('vapiCollapseIcon');
    const fetchVapiCallsBtn = document.getElementById('fetchVapiCallsBtn');
    const exportVapiCsvBtn = document.getElementById('exportVapiCsvBtn');
    const vapiCallsTable = document.getElementById('vapiCallsTable');
    const vapiLoading = document.getElementById('vapiLoading');
    const vapiError = document.getElementById('vapiError');
    
    let vapiCallsCache = [];
    
    // WaveSurfer instance for audio visualization
    let wavesurfer = null;
    // Audio context and buffer for processing
    let audioContext = null;
    let audioBuffer = null;
    // Store detected interruptions
    let interruptions = [];
    // Current audio file
    let currentFile = null;
    // Detection settings
    let detectionSettings = {
        threshold: 0.01,
        minDurationMs: 50,
        useAdaptiveThreshold: true
    };
    
    // Override console.log to capture logs for the debug panel
    const originalConsoleLog = console.log;
    console.log = function() {
        // Call the original console.log
        originalConsoleLog.apply(console, arguments);
        
        // Add to our debug panel if it exists
        if (detectionLog) {
            const logMessage = Array.from(arguments).join(' ');
            detectionLog.innerHTML += logMessage + '\n';
            // Auto-scroll to bottom
            detectionLog.scrollTop = detectionLog.scrollHeight;
        }
    };
    
    // Initialize the application
    function init() {
        // Main controls
        analyzeBtn.addEventListener('click', handleAnalyzeClick);
        if (playPauseBtn) {
            playPauseBtn.addEventListener('click', togglePlayPause);
        } else {
            // Fallback for separate play/pause buttons
            const playBtn = document.getElementById('playBtn');
            const pauseBtn = document.getElementById('pauseBtn');
            if (playBtn) playBtn.addEventListener('click', handlePlayClick);
            if (pauseBtn) pauseBtn.addEventListener('click', handlePauseClick);
        }
        fileInput.addEventListener('change', handleFileSelect);
        
        // Settings controls
        if (thresholdSlider) thresholdSlider.addEventListener('input', updateThresholdValue);
        if (minDurationSlider) minDurationSlider.addEventListener('input', updateMinDurationValue);
        
        // Adaptive threshold toggle
        const adaptiveThreshold = document.getElementById('adaptiveThreshold');
        if (adaptiveThreshold) {
            adaptiveThreshold.checked = detectionSettings.useAdaptiveThreshold;
            adaptiveThreshold.addEventListener('change', function() {
                detectionSettings.useAdaptiveThreshold = this.checked;
                console.log(`Adaptive threshold ${this.checked ? 'enabled' : 'disabled'}`);
            });
        } else {
            console.warn('Adaptive threshold toggle element not found');
        }
        
        // Debug panel
        if (toggleDebugBtn) {
            toggleDebugBtn.addEventListener('click', toggleDebugPanel);
        }
        
        // Create audio context
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    
    // Update threshold value display
    function updateThresholdValue() {
        detectionSettings.threshold = parseFloat(thresholdSlider.value);
        thresholdValue.textContent = thresholdSlider.value;
    }
    
    // Update minimum duration value display
    function updateMinDurationValue() {
        detectionSettings.minDurationMs = parseInt(minDurationSlider.value);
        minDurationValue.textContent = minDurationSlider.value;
    }
    
    // Toggle debug panel visibility
    function toggleDebugPanel() {
        const debugInfo = document.getElementById('debugInfo');
        if (debugInfo) {
            debugInfo.classList.toggle('hidden');
            
            // Update button text
            if (toggleDebugBtn) {
                toggleDebugBtn.textContent = debugInfo.classList.contains('hidden') ? 
                    'Show Debug Info' : 'Hide Debug Info';
            }
        }
    }
    
    // Toggle play/pause for combined button
    function togglePlayPause() {
        if (!wavesurfer) return;
        
        if (wavesurfer.isPlaying()) {
            wavesurfer.pause();
            playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
        } else {
            wavesurfer.play();
            playPauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
        }
    }
    
    // Handle file selection
    function handleFileSelect(event) {
        const file = event.target.files[0];
        if (file) {
            currentFile = file;
            analyzeBtn.disabled = false;
            console.log(`File selected: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`);
        } else {
            analyzeBtn.disabled = true;
        }
    }
    
    // Handle analyze button click
    async function handleAnalyzeClick() {
        // Get UI elements
        const loadingIndicator = document.getElementById('loadingIndicator');
        const resultsSection = document.getElementById('results');
        const errorMessage = document.getElementById('errorMessage');
        
        // Check if a file is selected
        if (!currentFile) {
            console.log('No file selected');
            if (errorMessage) {
                errorMessage.textContent = 'Please select a file first';
                errorMessage.classList.remove('hidden');
            }
            return;
        }
        
        console.log('Starting analysis of file:', currentFile.name);
        
        // Reset UI
        resetUI();
        
        // Ensure error message is hidden
        if (errorMessage) {
            errorMessage.classList.add('hidden');
        }
        
        // Force any existing loading indicator to be hidden first
        if (loadingIndicator) {
            // Force a reflow to ensure the browser recognizes the change
            loadingIndicator.classList.add('hidden');
            void loadingIndicator.offsetWidth; // This triggers a reflow
        }
        
        // Show loading indicator
        setTimeout(() => {
            if (loadingIndicator) {
                loadingIndicator.classList.remove('hidden');
                console.log('Loading indicator shown');
            } else {
                console.warn('Loading indicator element not found');
            }
        }, 10); // Small delay to ensure proper rendering
        
        try {
            // Process the audio file
            await processAudioFile(currentFile);
            
            // Hide loading indicator and show results
            if (loadingIndicator) {
                loadingIndicator.classList.add('hidden');
                console.log('Loading indicator hidden after successful analysis');
            }
            
            if (resultsSection) {
                resultsSection.classList.remove('hidden');
                console.log('Analysis complete, showing results');
            } else {
                console.warn('Results section element not found');
            }
        } catch (error) {
            console.error('Error processing audio file:', error);
            
            // Hide loading indicator
            if (loadingIndicator) {
                loadingIndicator.classList.add('hidden');
                console.log('Loading indicator hidden after error');
            }
            
            // Show error message
            if (errorMessage) {
                errorMessage.textContent = `Error: ${error.message}`;
                errorMessage.classList.remove('hidden');
            }
        }
    }
    
    // Process the audio file
    async function processAudioFile(file) {
        try {
            // Read the file
            const arrayBuffer = await readFileAsArrayBuffer(file);
            
            // Decode the audio data
            audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
            
            // Check if the audio is stereo
            if (audioBuffer.numberOfChannels !== 2) {
                throw new Error('The audio file must be stereo (2 channels)');
            }
            
            // Initialize WaveSurfer
            initWaveSurfer(file);
            
            // Detect interruptions
            interruptions = detectInterruptions(audioBuffer);
            
            // Display interruptions
            displayInterruptions(interruptions);
            
            return true; // Indicate successful processing
        } catch (error) {
            console.error('Error in processAudioFile:', error);
            throw error; // Re-throw to be caught by the caller
        }
    }
    
    // Read file as ArrayBuffer
    function readFileAsArrayBuffer(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = event => resolve(event.target.result);
            reader.onerror = error => reject(error);
            reader.readAsArrayBuffer(file);
        });
    }
    
    // Initialize WaveSurfer for audio visualization
    function initWaveSurfer(file) {
        // Destroy previous instance if exists
        if (wavesurfer) {
            wavesurfer.destroy();
        }
        
        // Create new instance
        wavesurfer = WaveSurfer.create({
            container: '#waveform',
            waveColor: '#3498db',
            progressColor: '#2980b9',
            cursorColor: '#2c3e50',
            height: 100,
            normalize: true,
            splitChannels: true,
            plugins: [
                // Add markers plugin if available
            ]
        });
        
        // Load audio file
        wavesurfer.loadBlob(file);
        
        // Add markers for interruptions when ready
        wavesurfer.on('ready', () => {
            addInterruptionMarkers();
        });
    }
    
    // Detect interruptions between channels
    function detectInterruptions(buffer) {
        // Clear previous debug logs
        if (detectionLog) {
            detectionLog.innerHTML = '';
        }
        
        const sampleRate = buffer.sampleRate;
        const channel1 = buffer.getChannelData(0);
        const channel2 = buffer.getChannelData(1);
        const length = channel1.length;
        
        // Get detection parameters from UI settings
        const threshold = detectionSettings.threshold;
        const minDurationMs = detectionSettings.minDurationMs;
        const useAdaptiveThreshold = detectionSettings.useAdaptiveThreshold;
        const minSamples = Math.floor(sampleRate * (minDurationMs / 1000)); 
        const detectedInterruptions = [];
        
        // Add debug information to console
        const durationSec = length/sampleRate;
        const audioInfo = {
            sampleRate: `${sampleRate}Hz`,
            duration: `${durationSec.toFixed(2)}s (${formatTime(durationSec)})`,
            channels: buffer.numberOfChannels,
            totalSamples: length
        };
        
        console.log(`Audio analysis: Sample rate: ${sampleRate}Hz, Duration: ${durationSec.toFixed(2)}s, Channels: ${buffer.numberOfChannels}`);
        
        // Update audio info in debug panel
        if (audioInfoContent) {
            audioInfoContent.innerHTML = Object.entries(audioInfo)
                .map(([key, value]) => `<strong>${key}:</strong> ${value}`)
                .join('<br>');
        }
        
        // Calculate average amplitude to help with threshold calibration
        let avgAmp1 = 0;
        let avgAmp2 = 0;
        let maxAmp1 = 0;
        let maxAmp2 = 0;
        
        // Sample every 1000th value to calculate average (for performance)
        for (let i = 0; i < length; i += 1000) {
            const a1 = Math.abs(channel1[i]);
            const a2 = Math.abs(channel2[i]);
            avgAmp1 += a1;
            avgAmp2 += a2;
            maxAmp1 = Math.max(maxAmp1, a1);
            maxAmp2 = Math.max(maxAmp2, a2);
        }
        
        avgAmp1 = avgAmp1 / (length / 1000);
        avgAmp2 = avgAmp2 / (length / 1000);
        
        // Add channel info to audio info panel
        if (audioInfoContent) {
            const channelInfo = {
                'Channel 1 Avg': avgAmp1.toFixed(4),
                'Channel 1 Max': maxAmp1.toFixed(4),
                'Channel 2 Avg': avgAmp2.toFixed(4),
                'Channel 2 Max': maxAmp2.toFixed(4),
                'Detection Threshold': threshold,
                'Min Duration': `${minDurationMs}ms (${(minSamples/sampleRate).toFixed(3)}s)`,
                'Adaptive Threshold': useAdaptiveThreshold ? 'Enabled' : 'Disabled'
            };
            
            audioInfoContent.innerHTML += '<br><br>' + Object.entries(channelInfo)
                .map(([key, value]) => `<strong>${key}:</strong> ${value}`)
                .join('<br>');
        }
        
        console.log(`Channel 1: Avg amplitude: ${avgAmp1.toFixed(4)}, Max: ${maxAmp1.toFixed(4)}`);
        console.log(`Channel 2: Avg amplitude: ${avgAmp2.toFixed(4)}, Max: ${maxAmp2.toFixed(4)}`);
        console.log(`Detection threshold: ${threshold}, Min duration: ${minDurationMs}ms (${(minSamples/sampleRate).toFixed(3)}s)`);
        
        // Determine threshold to use
        let activeThreshold = threshold;
        
        // Apply adaptive threshold if enabled
        if (useAdaptiveThreshold) {
            // If the audio is very quiet, lower the threshold
            // If it's loud, use the user-defined threshold
            activeThreshold = Math.min(threshold, Math.max(avgAmp1, avgAmp2) * 3);
            console.log(`Using adaptive threshold: ${activeThreshold.toFixed(4)}`);
        }
        
        let isOverlapping = false;
        let overlapStartSample = 0;
        let overlapEndSample = 0;
        let overlapCount = 0;
        
        // Process audio samples with a sliding window approach
        // This helps smooth out momentary spikes
        const windowSize = Math.floor(sampleRate * 0.01); // 10ms window
        
        for (let i = 0; i < length; i += windowSize) {
            // Check if both channels are active in this window
            let ch1Active = false;
            let ch2Active = false;
            
            // Check each sample in the window
            for (let j = 0; j < windowSize && i + j < length; j++) {
                if (Math.abs(channel1[i + j]) > activeThreshold) ch1Active = true;
                if (Math.abs(channel2[i + j]) > activeThreshold) ch2Active = true;
                if (ch1Active && ch2Active) break; // Found activity in both channels
            }
            
            const bothActive = ch1Active && ch2Active;
            
            // Start of overlap
            if (bothActive && !isOverlapping) {
                isOverlapping = true;
                overlapStartSample = i;
                console.log(`Potential overlap detected at ${i/sampleRate}s (${formatTime(i/sampleRate)})`);
            }
            // End of overlap
            else if (!bothActive && isOverlapping) {
                isOverlapping = false;
                overlapEndSample = i;
                
                // Check if overlap is long enough
                if (overlapEndSample - overlapStartSample >= minSamples) {
                    const interruption = {
                        startTime: overlapStartSample / sampleRate,
                        endTime: overlapEndSample / sampleRate,
                        duration: (overlapEndSample - overlapStartSample) / sampleRate
                    };
                    
                    detectedInterruptions.push(interruption);
                    overlapCount++;
                    console.log(`Interruption ${overlapCount} detected: ${formatTime(interruption.startTime)} - ${formatTime(interruption.endTime)} (${interruption.duration.toFixed(2)}s)`);
                } else {
                    console.log(`Overlap too short: ${((overlapEndSample - overlapStartSample) / sampleRate).toFixed(3)}s`);
                }
            }
        }
        
        // Check if we ended with an active overlap
        if (isOverlapping) {
            const interruption = {
                startTime: overlapStartSample / sampleRate,
                endTime: length / sampleRate,
                duration: (length - overlapStartSample) / sampleRate
            };
            
            detectedInterruptions.push(interruption);
            console.log(`Final interruption detected: ${formatTime(interruption.startTime)} - ${formatTime(interruption.endTime)} (${interruption.duration.toFixed(2)}s)`);
        }
        
        console.log(`Total interruptions detected: ${detectedInterruptions.length}`);
        
        // Show debug panel if interruptions were found or not
        if (detectedInterruptions.length === 0) {
            console.log('No interruptions detected. Try adjusting the sensitivity or minimum duration settings.');
        }
        
        return detectedInterruptions;
    }
    
    // Display interruptions in the table
    function displayInterruptions(interruptions) {
        // Get the table body element
        const interruptionsTable = document.getElementById('interruptionsTable');
        if (!interruptionsTable) {
            console.error('Could not find interruptionsTable element');
            return;
        }
        
        // Clear previous results
        interruptionsTable.innerHTML = '';
        
        // Add total count above the table
        const interruptionsList = document.getElementById('interruptionsList');
        if (interruptionsList) {
            // Remove any existing count element
            const existingCount = interruptionsList.querySelector('.interruption-count');
            if (existingCount) {
                existingCount.remove();
            }
            
            // Create and add the count element
            const countElement = document.createElement('div');
            countElement.className = 'interruption-count';
            countElement.innerHTML = `<strong>Total Interruptions: ${interruptions.length}</strong>`;
            countElement.style.marginBottom = '10px';
            countElement.style.fontSize = '16px';
            
            // In the shadcn version, the table is inside a div with border
            // Insert at the beginning of interruptionsList, before the div containing the table
            const tableContainer = interruptionsList.querySelector('div');
            if (tableContainer) {
                interruptionsList.insertBefore(countElement, tableContainer);
            } else {
                // Fallback to just appending to the interruptionsList
                interruptionsList.appendChild(countElement);
            }
        }
        
        if (interruptions.length === 0) {
            const row = document.createElement('tr');
            row.innerHTML = '<td colspan="2">No interruptions detected</td>';
            interruptionsTable.appendChild(row);
            return;
        }
        
        // Add each interruption to the table
        interruptions.forEach((interruption, index) => {
            const row = document.createElement('tr');
            
            // Format time as MM:SS.ms
            const startTimeFormatted = formatTime(interruption.startTime);
            
            row.innerHTML = `
                <td>${startTimeFormatted}</td>
                <td>
                    <button class="jump-btn" data-time="${interruption.startTime}">Jump to</button>
                </td>
            `;
            
            interruptionsTable.appendChild(row);
        });
        
        // Add event listeners to jump buttons
        document.querySelectorAll('.jump-btn').forEach(button => {
            button.addEventListener('click', () => {
                const time = parseFloat(button.getAttribute('data-time'));
                if (wavesurfer) {
                    wavesurfer.seekTo(time / wavesurfer.getDuration());
                    wavesurfer.play();
                }
            });
        });
    }
    
    // Add markers for interruptions on the waveform
    function addInterruptionMarkers() {
        if (!wavesurfer) {
            console.log('WaveSurfer not initialized, cannot add markers');
            return;
        }
        
        // First, remove any existing markers
        const existingMarkers = document.querySelectorAll('.marker');
        existingMarkers.forEach(marker => marker.remove());
        
        // If no interruptions, don't add markers
        if (!interruptions || interruptions.length === 0) {
            console.log('No interruptions to mark');
            return;
        }
        
        console.log(`Adding ${interruptions.length} markers to waveform`);
        
        // Try to use the markers plugin if available
        if (wavesurfer.markers) {
            // Clear existing markers first
            wavesurfer.markers.clear();
            
            // Add new markers
            interruptions.forEach((interruption, index) => {
                wavesurfer.markers.add({
                    time: interruption.startTime,
                    label: `Interruption ${index + 1}`,
                    color: '#ff0000'
                });
            });
            console.log('Added markers using WaveSurfer markers plugin');
        } else {
            // Fallback: add custom markers
            const waveformContainer = document.getElementById('waveform');
            if (!waveformContainer) {
                console.error('Waveform container not found');
                return;
            }
            
            // Make sure the container has position relative for absolute positioning of markers
            waveformContainer.style.position = 'relative';
            
            const duration = wavesurfer.getDuration();
            if (!duration) {
                console.error('Cannot determine audio duration');
                return;
            }
            
            interruptions.forEach((interruption, index) => {
                const marker = document.createElement('div');
                marker.className = 'marker';
                marker.style.position = 'absolute';
                marker.style.left = (interruption.startTime / duration * 100) + '%';
                marker.style.top = '0';
                marker.style.height = '100%';
                marker.style.width = '2px';
                marker.style.backgroundColor = 'red';
                marker.style.zIndex = '10';
                marker.title = `Interruption at ${formatTime(interruption.startTime)}`;
                
                waveformContainer.appendChild(marker);
            });
            console.log('Added custom markers to waveform container');
        }
    }
    
    // Format time as MM:SS.ms
    function formatTime(timeInSeconds) {
        const minutes = Math.floor(timeInSeconds / 60);
        const seconds = Math.floor(timeInSeconds % 60);
        const milliseconds = Math.floor((timeInSeconds % 1) * 100);
        
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(2, '0')}`;
    }
    
    // Handle play button click
    function handlePlayClick() {
        if (wavesurfer) {
            wavesurfer.play();
        }
    }
    
    // Handle pause button click
    function handlePauseClick() {
        if (wavesurfer) {
            wavesurfer.pause();
        }
    }
    
    // Reset UI
    function resetUI() {
        // Hide results and error sections
        if (resultsSection) resultsSection.classList.add('hidden');
        if (errorMessage) errorMessage.classList.add('hidden');
        
        // Clear interruptions table
        const interruptionsTable = document.getElementById('interruptionsTable');
        if (interruptionsTable) interruptionsTable.innerHTML = '';
        
        // Clear debug info
        if (detectionLog) detectionLog.innerHTML = '';
        if (audioInfoContent) audioInfoContent.innerHTML = '';
        
        // Remove any existing markers
        const existingMarkers = document.querySelectorAll('.marker');
        existingMarkers.forEach(marker => marker.remove());
        
        // Destroy wavesurfer instance if exists
        if (wavesurfer) {
            wavesurfer.destroy();
            wavesurfer = null;
        }
        
        console.log('UI reset complete');
    }
    
    // Initialize the application
    init();

    // VAPI Call Recordings Section Logic
    function toggleVapiSection() {
        if (!vapiSection) return;
        vapiSection.classList.toggle('hidden');
        if (vapiCollapseIcon) {
            vapiCollapseIcon.innerHTML = vapiSection.classList.contains('hidden') ? '&#9654;' : '&#9660;';
        }
    }

    if (fetchVapiCallsBtn) {
        fetchVapiCallsBtn.addEventListener('click', fetchVapiCalls);
    }
    if (exportVapiCsvBtn) {
        exportVapiCsvBtn.addEventListener('click', exportVapiCallsToCsv);
    }

    // Add function to get API key from input
    function getVapiApiKey() {
        const input = document.getElementById('vapiApiKeyInput');
        return input ? input.value.trim() : '';
    }

    // Update fetchVapiCalls and all VAPI requests to use getVapiApiKey()
    async function fetchVapiCalls() {
        if (vapiLoading) vapiLoading.classList.remove('hidden');
        if (vapiError) vapiError.classList.add('hidden');
        vapiCallsTable.innerHTML = '';
        vapiCallsCache = [];
        const apiKey = getVapiApiKey();
        if (!apiKey) {
            if (vapiLoading) vapiLoading.classList.add('hidden');
            if (vapiError) {
                vapiError.textContent = 'Please enter your VAPI API key.';
                vapiError.classList.remove('hidden');
            }
            return;
        }
        try {
            const url = `https://api.vapi.ai/call`;
            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                },
            });
            if (!response.ok) throw new Error('Failed to fetch call list');
            const callList = await response.json();
            let detailedCalls = [];
            for (let call of callList) {
                let callId = call.id || call;
                try {
                    const detailResp = await fetch(`https://api.vapi.ai/call/${callId}`, {
                        headers: {
                            'Authorization': `Bearer ${apiKey}`,
                            'Content-Type': 'application/json'
                        }
                    });
                    if (detailResp.ok) {
                        let detail = await detailResp.json();
                        detailedCalls.push(detail);
                    }
                } catch (e) {
                    // skip failed call
                }
            }
            vapiCallsCache = detailedCalls;
            renderVapiCallsTable(vapiCallsCache);
        } catch (err) {
            if (vapiError) {
                vapiError.textContent = err.message || 'Error fetching calls.';
                vapiError.classList.remove('hidden');
            }
        } finally {
            if (vapiLoading) vapiLoading.classList.add('hidden');
        }
    }

    function renderVapiCallsTable(calls) {
        vapiCallsTable.innerHTML = '';
        if (!calls.length) {
            vapiCallsTable.innerHTML = '<tr><td colspan="7" style="text-align:center; color: hsl(var(--muted-foreground));">No calls found.</td></tr>';
            return;
        }
        for (const call of calls) {
            // Try to get recording URLs from artifact.recording, artifact.recordingUrl, artifact.stereoRecordingUrl, etc.
            let stereoUrl = '';
            let monoUrl = '';
            if (call.artifact && call.artifact.recording) {
                stereoUrl = call.artifact.recording.stereoUrl || '';
                if (call.artifact.recording.mono && call.artifact.recording.mono.combinedUrl) {
                    monoUrl = call.artifact.recording.mono.combinedUrl;
                }
            }
            // Fallbacks
            if (!stereoUrl && call.artifact && call.artifact.stereoRecordingUrl) stereoUrl = call.artifact.stereoRecordingUrl;
            if (!monoUrl && call.artifact && call.artifact.recordingUrl) monoUrl = call.artifact.recordingUrl;
            vapiCallsTable.innerHTML += `
                <tr>
                    <td style="padding: 0.5rem;">${call.id}</td>
                    <td style="padding: 0.5rem;">${call.createdAt ? new Date(call.createdAt).toLocaleString() : ''}</td>
                    <td style="padding: 0.5rem;">${call.status || ''}</td>
                    <td style="padding: 0.5rem;">${stereoUrl ? `<a href="${stereoUrl}" download target="_blank">Download</a>` : ''}</td>
                    <td style="padding: 0.5rem;">${monoUrl ? `<a href="${monoUrl}" download target="_blank">Download</a>` : ''}</td>
                    <td style="padding: 0.5rem;">${call.duration || ''}</td>
                    <td style="padding: 0.5rem;">${call.customer?.number || ''}</td>
                </tr>
            `;
        }
    }

    function exportVapiCallsToCsv() {
        if (!vapiCallsCache.length) return;
        const headers = ['call_id', 'date', 'status', 'stereo_recording_url', 'mono_recording_url', 'duration', 'customer_number'];
        const rows = vapiCallsCache.map(call => {
            // Use the same logic as renderVapiCallsTable
            let stereoUrl = '';
            let monoUrl = '';
            if (call.artifact && call.artifact.recording) {
                stereoUrl = call.artifact.recording.stereoUrl || '';
                if (call.artifact.recording.mono && call.artifact.recording.mono.combinedUrl) {
                    monoUrl = call.artifact.recording.mono.combinedUrl;
                }
            }
            if (!stereoUrl && call.artifact && call.artifact.stereoRecordingUrl) stereoUrl = call.artifact.stereoRecordingUrl;
            if (!monoUrl && call.artifact && call.artifact.recordingUrl) monoUrl = call.artifact.recordingUrl;
            return [
                call.id,
                call.createdAt,
                call.status,
                stereoUrl,
                monoUrl,
                call.duration || '',
                call.customer?.number || ''
            ];
        });
        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => '"' + String(cell).replace(/"/g, '""') + '"').join(','))
        ].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'call_recordings.csv';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
});