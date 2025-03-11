// Create piano keyboard
const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const keyboard = document.getElementById('keyboard');

// Create a simple one-octave keyboard
for (let i = 0; i < 12; i++) {
    const isBlack = [1, 3, 6, 8, 10].includes(i);
    const key = document.createElement('div');
    key.className = `key ${isBlack ? 'black-key' : 'white-key'}`;
    key.dataset.note = i;
    key.title = noteNames[i];
    keyboard.appendChild(key);
}

// Initialize Tone.js effects
// Create a reverb effect
const reverb = new Tone.Reverb({
    decay: 3.0,
    wet: 0.6
}).toDestination();

// Create a filter effect
const filter = new Tone.Filter({
    frequency: 641,
    type: "lowpass",
    rolloff: -12
}).connect(reverb);

// When reverb is loaded, connect the synth
reverb.generate().then(() => {
    console.log("Reverb generated and ready");
});

// Create the synth with improved envelope for better sustain
const synth = new Tone.PolySynth(Tone.Synth, {
    oscillator: {
        type: "sawtooth"
    },
    envelope: {
        attack: 0.05,
        decay: 0.2,
        sustain: 0.8,
        release: 1.5
    }
}).connect(filter);

// Add debugging to check if Tone.js is working
console.log("Tone.js initialized:", Tone.context.state);

// Function to ensure audio context is started (needed due to browser autoplay policies)
async function startAudio() {
    if (Tone.context.state !== "running") {
        await Tone.start();
        console.log("Audio context started:", Tone.context.state);
    }
}

// Progression state variables
let isPlaying = false;
let hasStarted = false;
let chordHistory = [];
let currentChordIndex = -1;
let currentChord = null;
let progressionTimer = null;
let CHORD_DURATION = 3000; // 3 seconds per chord initially (60 BPM)
let currentNotes = []; // Store currently playing notes
let lastChordString = ""; // Store string representation of last chord for comparison
let progressionHistory = ""; // Store the entire progression history
let temperature = 1.0; // Default temperature value

// Setup control panel toggle
const controlsToggle = document.getElementById('sidebarToggle');
const controlsPanel = document.getElementById('sidebar');

// Sidebar toggle
const sidebar = document.getElementById('sidebar');
const closeSidebar = document.getElementById('closeSidebar');
const mainContent = document.getElementById('mainContent');

controlsToggle.addEventListener('click', () => {
    sidebar.classList.toggle('open');
    mainContent.classList.toggle('sidebar-open');
});

closeSidebar.addEventListener('click', () => {
    sidebar.classList.remove('open');
    mainContent.classList.remove('sidebar-open');
});

// Setup tempo control
const tempoSlider = document.getElementById('tempoSlider');
const tempoValue = document.getElementById('tempoValue');

tempoSlider.addEventListener('input', () => {
    const bpm = parseInt(tempoSlider.value);
    tempoValue.textContent = bpm;
    // Convert BPM to milliseconds (one beat = one chord)
    CHORD_DURATION = Math.round(60000 / bpm);
    
    // If progression is playing, restart the timer with new duration
    if (isPlaying && progressionTimer) {
        clearInterval(progressionTimer);
        progressionTimer = setInterval(() => {
            if (currentChord) {
                generateNextChord(progressionHistory);
            }
        }, CHORD_DURATION);
    }
});

// Setup waveform selector
const waveformSelect = document.getElementById('waveformSelect');

waveformSelect.addEventListener('change', () => {
    const waveform = waveformSelect.value;
    // Update the synth's oscillator type
    synth.set({
        oscillator: {
            type: waveform
        }
    });
});

// Setup reverb control
const reverbSlider = document.getElementById('reverbSlider');
const reverbValue = document.getElementById('reverbValue');

reverbSlider.addEventListener('input', () => {
    const wetness = parseInt(reverbSlider.value) / 100;
    reverbValue.textContent = reverbSlider.value;
    reverb.wet.value = wetness;
});

// Setup filter control
const filterSlider = document.getElementById('filterSlider');
const filterValue = document.getElementById('filterValue');

filterSlider.addEventListener('input', () => {
    const frequency = parseInt(filterSlider.value);
    filterValue.textContent = frequency;
    filter.frequency.value = frequency;
});

// Setup temperature control
const temperatureSlider = document.getElementById('temperatureSlider');
const temperatureValue = document.getElementById('temperatureValue');

temperatureSlider.addEventListener('input', () => {
    temperature = parseFloat(temperatureSlider.value);
    temperatureValue.textContent = temperature.toFixed(1);
});

// Function to play a chord based on degrees
function playChord(degrees) {
    // Convert degrees string to array if needed
    let degreesArray;
    if (typeof degrees === 'string') {
        try {
            degreesArray = JSON.parse(degrees);
        } catch (e) {
            console.error('Error parsing degrees:', e);
            return;
        }
    } else {
        degreesArray = degrees;
    }
    
    // Reset active keys
    document.querySelectorAll('.key').forEach(key => {
        key.classList.remove('active');
    });
    
    // Map degrees to note names
    const notes = [];
    
    degreesArray.forEach((degree, index) => {
        if (degree === 1) {
            // Convert index to note name with octave (C4 is middle C)
            const noteName = noteNames[index] + '4';
            notes.push(noteName);
            
            // Highlight the active keys
            const keyElement = document.querySelector(`.key[data-note="${index}"]`);
            if (keyElement) {
                keyElement.classList.add('active');
            }
        }
    });

    // Calculate normalized gain based on number of notes
    // Base volume for a single note
    const baseVolume = -12; // in dB
    // Calculate gain reduction based on number of notes (logarithmic scaling)
    const gainReduction = Math.log2(notes.length) * 3; // 3 dB reduction per doubling of notes
    const normalizedVolume = baseVolume - gainReduction;

    // Set the synth volume
    synth.volume.value = normalizedVolume;
    
    // Convert current notes to string for comparison
    const notesString = notes.sort().join(',');
    const isSameChord = notesString === lastChordString;
    
    console.log("Playing notes:", notes, isSameChord ? "(same as previous)" : "(new chord)");
    
    // Only trigger a new chord if it's different
    if (!isSameChord) {
        // Release any currently playing notes
        synth.releaseAll();
        
        // Play the new chord
        synth.triggerAttack(notes);
        
        // Update current notes
        currentNotes = notes;
        lastChordString = notesString;
    }
}

// Function to get a new chord from the API
async function getNewChord() {
    // Show the spinner
    document.getElementById('loadingSpinner').style.display = 'block';
    document.getElementById('chordName').style.display = 'none';
    
    try {
        // Update status to show loading
        document.getElementById('chordName').textContent = 'Loading...';

        const response = await fetch('https://chordgen-uxfa.onrender.com/start_new/', {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Origin': 'http://localhost:8000'
            },
            mode: 'cors'
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Start a new progression history with this chord
        progressionHistory = data.chord;
        
        displayAndPlayChord(data);
        return data;
    } catch (error) {
        console.error('Error fetching chord:', error);
        document.getElementById('chordName').textContent = 'Error: Could not fetch chord';
        stopProgression();
    } finally {
        // Hide the spinner and show the chord name again
        document.getElementById('loadingSpinner').style.display = 'none';
        document.getElementById('chordName').style.display = 'block';
    }
}

// Function to display and play a chord
function displayAndPlayChord(data) {
    currentChord = data;
    
    // Display the chord information
    document.getElementById('chordName').textContent = data.chord;
    
    // Play the chord
    playChord(data.degrees);
}

// Function to start the progression
async function startProgression() {
    if (isPlaying) return;
    
    // Ensure audio context is started
    await startAudio();
    
    isPlaying = true;
    const toggleBtn = document.getElementById('toggleBtn');
    toggleBtn.textContent = 'Stop';
    toggleBtn.classList.add('stop');
    
    // Reset progression history
    progressionHistory = "";
    
    // Start with a new chord
    getNewChord().then(initialChord => {
        // Schedule the progression loop
        progressionTimer = setInterval(() => {
            if (currentChord) {
                generateNextChord(progressionHistory);
            }
        }, CHORD_DURATION);
    });
}

// Function to stop the progression
function stopProgression() {
    if (!isPlaying) return;
    
    isPlaying = false;
    const toggleBtn = document.getElementById('toggleBtn');
    toggleBtn.textContent = 'Continue';
    toggleBtn.classList.remove('stop');
    
    // Clear all timers
    if (progressionTimer) {
        clearInterval(progressionTimer);
        progressionTimer = null;
    }
    
    // Stop all sounds with a gentle release
    synth.releaseAll();
    currentNotes = [];
    lastChordString = "";
}

// Function to generate next chord in progression
async function generateNextChord(seedProgression) {
    try {
        const response = await fetch('https://chordgen-uxfa.onrender.com/generate_progression_with_seed/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Origin': 'https://chordgen-uxfa.onrender.com'
            },
            mode: 'cors',
            body: JSON.stringify({
                seed_progression: seedProgression,
                num_chords: 1,
                temperature: temperature,
                glue_chords: false
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log("Received next chord:", data);
        
        // We're expecting an array of chords, but we only requested one
        const chordData = {
            chord: data.generated_progression[0],
            degrees: data.degrees[0]
        };
        
        // Add the new chord to the progression history
        progressionHistory = progressionHistory.length > 0 
            ? progressionHistory + " " + chordData.chord 
            : chordData.chord;
        
        console.log("Current progression history:", progressionHistory);
        
        // Display and play the new chord
        displayAndPlayChord(chordData);
        return chordData;
    } catch (error) {
        console.error('Error generating next chord:', error);
        document.getElementById('chordName').textContent = 'Error: Could not generate next chord';
        stopProgression();
    }
}

// Add event listener to the button
document.getElementById('toggleBtn').addEventListener('click', function() {
    if (!hasStarted) {
        // First time starting
        startProgression();
        toggleBtn.textContent = 'Stop';
        hasStarted = true;
        isPlaying = true;
    } else if (isPlaying) {
        // Currently playing, so stop
        stopProgression();
        toggleBtn.textContent = 'Continue';
        isPlaying = false;
    } else {
        // Currently stopped, so continue
        continueProgression();
        toggleBtn.textContent = 'Stop';
        isPlaying = true;
    }
});

// Function to continue the progression from where it left off
function continueProgression() {
    if (isPlaying) return;
    
    // Ensure audio context is started
    startAudio();
    
    isPlaying = true;
    const toggleBtn = document.getElementById('toggleBtn');
    toggleBtn.textContent = 'Stop';
    toggleBtn.classList.add('stop');
    
    // If we have a current chord, play it
    if (currentChord) {
        playChord(currentChord.degrees);
        
        // Restart the progression timer
        progressionTimer = setInterval(() => {
            if (currentChord) {
                generateNextChord(progressionHistory);
            }
        }, CHORD_DURATION);
    } else if (progressionHistory) {
        // If we have history but no current chord, generate a new one based on history
        generateNextChord(progressionHistory);
        
        // Then start the timer
        progressionTimer = setInterval(() => {
            generateNextChord(progressionHistory);
        }, CHORD_DURATION);
    } else {
        // If we have neither, start fresh
        startProgression();
    }
}

// Modify your chord generation/display function to store history
function displayNewChord(chord) {
    // Add to history
    chordHistory.push(chord);
    currentChordIndex = chordHistory.length - 1;
    
    // Your existing code to display the chord
    document.getElementById('chordName').textContent = chord;
    // Other display code...
}