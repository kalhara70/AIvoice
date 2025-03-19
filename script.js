document.addEventListener('DOMContentLoaded', () => {
  // DOM elements
  const textInput = document.getElementById('text-to-speak');
  const voiceSelect = document.getElementById('voice-select');
  const rateInput = document.getElementById('rate');
  const rateValue = document.getElementById('rate-value');
  const pitchInput = document.getElementById('pitch');
  const pitchValue = document.getElementById('pitch-value');
  const volumeInput = document.getElementById('volume');
  const volumeValue = document.getElementById('volume-value');
  const speakBtn = document.getElementById('speak-btn');
  const pauseBtn = document.getElementById('pause-btn');
  const resumeBtn = document.getElementById('resume-btn');
  const stopBtn = document.getElementById('stop-btn');
  const downloadBtn = document.getElementById('download-btn');
  const statusMessage = document.getElementById('status-message');

  // Initialize speech synthesis
  const synth = window.speechSynthesis;
  let voices = [];
  let currentUtterance = null;
  let audioBlob = null;

  // Check if browser supports speech synthesis
  if (!synth) {
    statusMessage.textContent = 'Your browser does not support the Web Speech API. Please try a different browser.';
    disableControls();
    return;
  }

  // Function to populate voice options
  function populateVoices() {
    voices = synth.getVoices();
    
    // Clear existing options
    voiceSelect.innerHTML = '';
    
    // Add voices to select element
    voices.forEach(voice => {
      const option = document.createElement('option');
      option.textContent = `${voice.name} (${voice.lang})`;
      option.setAttribute('data-lang', voice.lang);
      option.setAttribute('data-name', voice.name);
      voiceSelect.appendChild(option);
    });
  }

  // Initialize voices
  populateVoices();
  
  // Chrome loads voices asynchronously
  if (speechSynthesis.onvoiceschanged !== undefined) {
    speechSynthesis.onvoiceschanged = populateVoices;
  }

  // Update display values for sliders
  rateInput.addEventListener('input', () => {
    rateValue.textContent = rateInput.value;
  });

  pitchInput.addEventListener('input', () => {
    pitchValue.textContent = pitchInput.value;
  });

  volumeInput.addEventListener('input', () => {
    volumeValue.textContent = volumeInput.value;
  });

  // Function to generate audio from text
  function generateAudio(text, voice, rate, pitch, volume) {
    return new Promise((resolve, reject) => {
      // Create an audio context
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const mediaStreamDestination = audioContext.createMediaStreamDestination();
      const mediaRecorder = new MediaRecorder(mediaStreamDestination.stream);
      const audioChunks = [];
      
      // Set up the media recorder
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.push(event.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
        resolve(audioBlob);
      };
      
      mediaRecorder.onerror = (event) => {
        reject(event.error);
      };
      
      // Start recording
      mediaRecorder.start();
      
      // Create a speech synthesis utterance
      const utterance = new SpeechSynthesisUtterance(text);
      
      // Set voice and parameters
      if (voice) {
        utterance.voice = voice;
      }
      utterance.rate = rate;
      utterance.pitch = pitch;
      utterance.volume = volume;
      
      // When speech ends, stop recording
      utterance.onend = () => {
        mediaRecorder.stop();
        audioContext.close();
      };
      
      // Speak the text
      synth.speak(utterance);
    });
  }

  // Speak function
  function speak() {
    // Cancel any ongoing speech
    if (synth.speaking) {
      synth.cancel();
    }

    const text = textInput.value.trim();
    
    if (!text) {
      statusMessage.textContent = 'Please enter some text to speak.';
      return;
    }

    // Create speech utterance
    const utterance = new SpeechSynthesisUtterance(text);
    
    // Set selected voice
    const selectedVoice = voiceSelect.selectedOptions[0].getAttribute('data-name');
    const voice = voices.find(v => v.name === selectedVoice);
    if (voice) {
      utterance.voice = voice;
    }
    
    // Set speech parameters
    utterance.rate = parseFloat(rateInput.value);
    utterance.pitch = parseFloat(pitchInput.value);
    utterance.volume = parseFloat(volumeInput.value);
    
    // Event handlers
    utterance.onstart = () => {
      statusMessage.textContent = 'Speaking...';
      speakBtn.disabled = true;
      downloadBtn.disabled = true;
    };
    
    utterance.onend = () => {
      statusMessage.textContent = 'Finished speaking.';
      speakBtn.disabled = false;
      
      // Generate audio for download
      generateAudio(
        text,
        voice,
        parseFloat(rateInput.value),
        parseFloat(pitchInput.value),
        parseFloat(volumeInput.value)
      )
      .then(blob => {
        audioBlob = blob;
        downloadBtn.disabled = false;
        statusMessage.textContent = 'Audio ready for download.';
      })
      .catch(error => {
        console.error('Error generating audio:', error);
        statusMessage.textContent = 'Error generating audio for download.';
      });
      
      currentUtterance = null;
    };
    
    utterance.onerror = (event) => {
      statusMessage.textContent = `Error occurred: ${event.error}`;
      speakBtn.disabled = false;
      currentUtterance = null;
    };
    
    // Store current utterance for pause/resume functionality
    currentUtterance = utterance;
    
    // Speak
    synth.speak(utterance);
  }

  // Pause speech
  function pauseSpeech() {
    if (synth.speaking) {
      synth.pause();
      statusMessage.textContent = 'Paused.';
    }
  }

  // Resume speech
  function resumeSpeech() {
    if (synth.paused) {
      synth.resume();
      statusMessage.textContent = 'Resuming...';
    }
  }

  // Stop speech
  function stopSpeech() {
    synth.cancel();
    statusMessage.textContent = 'Stopped.';
    speakBtn.disabled = false;
    currentUtterance = null;
  }

  // Download audio
  function downloadAudio() {
    if (!audioBlob) {
      statusMessage.textContent = 'No audio available for download.';
      return;
    }
    
    // Create a download link
    const url = URL.createObjectURL(audioBlob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = 'speech.wav';
    document.body.appendChild(a);
    a.click();
    
    // Clean up
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
    
    statusMessage.textContent = 'Audio downloaded.';
  }

  // Disable all controls if speech synthesis is not supported
  function disableControls() {
    textInput.disabled = true;
    voiceSelect.disabled = true;
    rateInput.disabled = true;
    pitchInput.disabled = true;
    volumeInput.disabled = true;
    speakBtn.disabled = true;
    pauseBtn.disabled = true;
    resumeBtn.disabled = true;
    stopBtn.disabled = true;
    downloadBtn.disabled = true;
  }

  // Event listeners
  speakBtn.addEventListener('click', speak);
  pauseBtn.addEventListener('click', pauseSpeech);
  resumeBtn.addEventListener('click', resumeSpeech);
  stopBtn.addEventListener('click', stopSpeech);
  downloadBtn.addEventListener('click', downloadAudio);

  // Initial status message
  statusMessage.textContent = 'Ready to speak.';
});