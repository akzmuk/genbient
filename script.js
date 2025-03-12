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

// Initialize Tone.js effects for oscillator 1
const reverb1 = new Tone.Reverb({
    decay: 3.0,
    wet: 0.6
}).toDestination();

const filter1 = new Tone.Filter({
    frequency: 641,
    type: "lowpass",
    rolloff: -12
}).connect(reverb1);

// Initialize Tone.js effects for oscillator 2
const reverb2 = new Tone.Reverb({
    decay: 3.0,
    wet: 0.6
}).toDestination();

const filter2 = new Tone.Filter({
    frequency: 641,
    type: "lowpass",
    rolloff: -12
}).connect(reverb2);

// Generate reverbs asynchronously
Promise.all([reverb1.generate(), reverb2.generate()]).then(() => {
    console.log("Reverbs generated and ready");
});

// Create two separate synths for the oscillators
const synth1 = new Tone.PolySynth(Tone.Synth, {
    oscillator: {
        type: "sawtooth"
    },
    envelope: {
        attack: 0.1,
        decay: 0.3,
        sustain: 0.7,
        release: 2.0
    }
}).connect(filter1);

const synth2 = new Tone.PolySynth(Tone.Synth, {
    oscillator: {
        type: "sine" // Default to sine for more ambient sound
    },
    envelope: {
        attack: 0.2,
        decay: 0.4,
        sustain: 0.8,
        release: 3.0
    }
}).connect(filter2);

// Setup waveform controls
const waveformSelect = document.getElementById('waveformSelect');
waveformSelect.addEventListener('change', () => {
    const waveform = waveformSelect.value;
    synth1.set({
        oscillator: {
            type: waveform
        }
    });
});

const waveformSelect2 = document.getElementById('waveformSelect2');
waveformSelect2.addEventListener('change', () => {
    const waveform2 = waveformSelect2.value;
    synth2.set({
        oscillator: {
            type: waveform2
        }
    });
});

// Setup octave controls
const octaveSlider = document.getElementById('octaveSlider');
const octaveValue = document.getElementById('octaveValue');
let octaveShift = 0;

octaveSlider.addEventListener('input', () => {
    octaveShift = parseInt(octaveSlider.value);
    octaveValue.textContent = octaveShift;
    
    if (currentChord && isPlaying) {
        playChord(currentChord.degrees);
    }
});

const octaveSlider2 = document.getElementById('octaveSlider2');
const octaveValue2 = document.getElementById('octaveValue2');
let octaveShift2 = -1; // Default octave shift for the second oscillator is -1

octaveSlider2.addEventListener('input', () => {
    octaveShift2 = parseInt(octaveSlider2.value);
    octaveValue2.textContent = octaveShift2;
    
    if (currentChord && isPlaying) {
        playChord(currentChord.degrees);
    }
});

// Setup filter controls
const filterSlider1 = document.getElementById('filterSlider1');
const filterValue1 = document.getElementById('filterValue1');

filterSlider1.addEventListener('input', () => {
    const frequency = parseInt(filterSlider1.value);
    filterValue1.textContent = frequency;
    filter1.frequency.value = frequency;
});

const filterSlider2 = document.getElementById('filterSlider2');
const filterValue2 = document.getElementById('filterValue2');

filterSlider2.addEventListener('input', () => {
    const frequency = parseInt(filterSlider2.value);
    filterValue2.textContent = frequency;
    filter2.frequency.value = frequency;
});

// Setup reverb controls
const reverbSlider1 = document.getElementById('reverbSlider1');
const reverbValue1 = document.getElementById('reverbValue1');

reverbSlider1.addEventListener('input', () => {
    const wetness = parseInt(reverbSlider1.value) / 100;
    reverbValue1.textContent = reverbSlider1.value;
    reverb1.wet.value = wetness;
});

const reverbSlider2 = document.getElementById('reverbSlider2');
const reverbValue2 = document.getElementById('reverbValue2');

reverbSlider2.addEventListener('input', () => {
    const wetness = parseInt(reverbSlider2.value) / 100;
    reverbValue2.textContent = reverbSlider2.value;
    reverb2.wet.value = wetness;
});

// Setup expander toggles
document.querySelectorAll('.expander-toggle').forEach(button => {
    const targetId = button.dataset.target;
    const targetElement = document.getElementById(targetId);
    
    // Initialize all sections as expanded
    button.addEventListener('click', () => {
        targetElement.classList.toggle('collapsed');
        // Update toggle button text
        if (targetElement.classList.contains('collapsed')) {
            button.textContent = button.textContent.replace('▾', '▸');
        } else {
            button.textContent = button.textContent.replace('▸', '▾');
        }
    });
});

// Update playChord function to use both synths
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
    
    // Map degrees to note names for each synth
    const notes1 = [];
    const notes2 = [];
    
    degreesArray.forEach((degree, index) => {
        if (degree === 1) {
            // Convert index to note name with octave (C4 is middle C)
            const baseOctave = 4;
            const adjustedOctave1 = baseOctave + octaveShift;
            const adjustedOctave2 = baseOctave + octaveShift2;
            const noteName1 = noteNames[index] + adjustedOctave1;
            const noteName2 = noteNames[index] + adjustedOctave2;
            notes1.push(noteName1);
            notes2.push(noteName2);
            
            // Highlight the active keys
            const keyElement = document.querySelector(`.key[data-note="${index}"]`);
            if (keyElement) {
                keyElement.classList.add('active');
            }
        }
    });

    // Set volumes for each synth
    const baseVolume = -18; // Lower base volume since we have two synths
    // Calculate gain reduction
    const gainReduction1 = Math.log2(notes1.length) * 3;
    const gainReduction2 = Math.log2(notes2.length) * 3;
    
    synth1.volume.value = baseVolume - gainReduction1;
    synth2.volume.value = baseVolume - gainReduction2;
    
    // Convert current notes to strings for comparison
    const notesString1 = notes1.sort().join(',');
    const notesString2 = notes2.sort().join(',');
    const lastChordString1 = currentNotes.synth1 || "";
    const lastChordString2 = currentNotes.synth2 || "";
    
    // Only trigger new notes if they're different
    if (notesString1 !== lastChordString1) {
        synth1.releaseAll();
        synth1.triggerAttack(notes1);
    }
    
    if (notesString2 !== lastChordString2) {
        synth2.releaseAll();
        synth2.triggerAttack(notes2);
    }
    
    // Update current notes
    currentNotes = {
        synth1: notesString1,
        synth2: notesString2
    };
}

// Update stopProgression to release both synths
function stopProgression() {
    if (!isPlaying) return;
    
    isPlaying = false;
    const toggleBtn = document.getElementById('toggleBtn');
    toggleBtn.textContent = 'Continue';
    toggleBtn.classList.remove('stop');
    
    // Store the current chord before stopping
    lastPlayedChord = currentChord;
    
    // Clear all timers
    if (progressionTimer) {
        clearInterval(progressionTimer);
        progressionTimer = null;
    }
    
    // Stop all sounds with a gentle release
    synth1.releaseAll();
    synth2.releaseAll();
    currentNotes = { synth1: "", synth2: "" };
}

// Update resetControlsToDefaults to handle all new controls
function resetControlsToDefaults() {
    // Reset waveform 1
    waveformSelect.value = 'sawtooth';
    synth1.set({
        oscillator: {
            type: 'sawtooth'
        }
    });
    
    // Reset waveform 2
    waveformSelect2.value = 'sine';
    synth2.set({
        oscillator: {
            type: 'sine'
        }
    });
    
    // Reset tempo
    tempoSlider.value = 20;
    tempoValue.textContent = 20;
    CHORD_DURATION = Math.round(60000 / 20);
    
    // Reset reverb 1
    reverbSlider1.value = 60;
    reverbValue1.textContent = 60;
    reverb1.wet.value = 0.6;
    
    // Reset reverb 2
    reverbSlider2.value = 60;
    reverbValue2.textContent = 60;
    reverb2.wet.value = 0.6;
    
    // Reset filter 1
    filterSlider1.value = 641;
    filterValue1.textContent = 641;
    filter1.frequency.value = 641;
    
    // Reset filter 2
    filterSlider2.value = 641;
    filterValue2.textContent = 641;
    filter2.frequency.value = 641;
    
    // Reset temperature
    temperatureSlider.value = 1.0;
    temperatureValue.textContent = '1.0';
    temperature = 1.0;
    
    // Reset octave 1
    octaveSlider.value = 0;
    octaveValue.textContent = '0';
    octaveShift = 0;
    
    // Reset octave 2
    octaveSlider2.value = -1;
    octaveValue2.textContent = '-1';
    octaveShift2 = -1;
}

// Progression state variables
let isPlaying = false;
let hasStarted = false;
let chordHistory = [];
let currentChordIndex = -1;
let currentChord = null;
let progressionTimer = null;
let CHORD_DURATION = 3000; // 3 seconds per chord initially (60 BPM)
let currentNotes = { synth1: "", synth2: "" }; // Store currently playing notes
let lastChordString1 = ""; // Store string representation of last chord for comparison
let lastChordString2 = ""; // Store string representation of last chord for comparison
let progressionHistory = ""; // Store the entire progression history
let temperature = 1.0; // Default temperature value

// Add a variable to store the last played chord before stopping
let lastPlayedChord = null;

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

// Setup temperature control
const temperatureSlider = document.getElementById('temperatureSlider');
const temperatureValue = document.getElementById('temperatureValue');

temperatureSlider.addEventListener('input', () => {
    temperature = parseFloat(temperatureSlider.value);
    temperatureValue.textContent = temperature.toFixed(1);
});

// Setup custom seed controls
const customSeedInput = document.getElementById('customSeedInput');
const applySeedBtn = document.getElementById('applySeedBtn');

applySeedBtn.addEventListener('click', () => {
    const customSeed = customSeedInput.value.trim();
    
    if (!customSeed) {
        alert('Please enter a custom seed progression');
            return;
        }
    
    applyCustomSeed(customSeed);
});

// Function to apply a custom seed
function applyCustomSeed(seed) {
    if (isPlaying) {
        // If progression is already playing, stop it first
        stopProgression();
        
        // Update the history
        progressionHistory = seed;
        
        // Clear the last played chord since we're changing the seed
        lastPlayedChord = null;
        
        // Update button to "Start"
        const toggleBtn = document.getElementById('toggleBtn');
        toggleBtn.textContent = 'Start';
        toggleBtn.classList.remove('stop');
        
        // Reset playing state but keep hasStarted true
        isPlaying = false;
    } else if (hasStarted) {
        // If progression was started but is currently stopped
        progressionHistory = seed;
        
        // Clear the last played chord since we're changing the seed
        lastPlayedChord = null;
        
        // Update the button to "Start" instead of "Continue"
        const toggleBtn = document.getElementById('toggleBtn');
        toggleBtn.textContent = 'Start';
    } else {
        // If progression hasn't started yet, just set the seed
        progressionHistory = seed;
    }
    
    // Close the sidebar after applying
    sidebar.classList.remove('open');
    mainContent.classList.remove('sidebar-open');
}

// Function to generate the first chord from a custom seed
async function generateFirstChordFromSeed(seed) {
    // Show the spinner
    document.getElementById('loadingSpinner').style.display = 'block';
    document.getElementById('chordName').style.display = 'none';
    
    try {
        // Ensure audio context is started
        await startAudio();
        
        isPlaying = true;
        hasStarted = true;
        const toggleBtn = document.getElementById('toggleBtn');
        toggleBtn.textContent = 'Stop';
        toggleBtn.classList.add('stop');
        
        const response = await fetch('https://chordgen-uxfa.onrender.com/generate_progression_with_seed/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Origin': 'https://chordgen-uxfa.onrender.com'
            },
            mode: 'cors',
            body: JSON.stringify({
                seed_progression: seed,
                num_chords: 1,
                temperature: temperature,
                glue_chords: false
            })
        });
        
        if (!response.ok) {
            // Get the error details from the response
            const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
            const errorMessage = errorData.detail || `HTTP error! Status: ${response.status}`;
            
            throw new Error(errorMessage);
        }
        
        const data = await response.json();
        console.log("Generated first chord from seed:", data);
        
        // We're expecting an array of chords, but we only requested one
        const chordData = {
            chord: data.generated_progression[0],
            degrees: data.degrees[0]
        };
        
        // Display and play the chord
        displayAndPlayChord(chordData);
        
        // Schedule the progression loop
        progressionTimer = setInterval(() => {
            if (currentChord) {
                generateNextChord(progressionHistory);
            }
        }, CHORD_DURATION);
        
    } catch (error) {
        console.error('Error generating chord from seed:', error);
        document.getElementById('chordName').textContent = `Error: ${error.message}`;
        stopProgression();
    } finally {
        // Hide the spinner and show the chord name again
        document.getElementById('loadingSpinner').style.display = 'none';
        document.getElementById('chordName').style.display = 'block';
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
    
    // Update the visualization with the new chord
    if (window.updateVisualization) {
        window.updateVisualization(data.chord);
    }
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
            // Get the error details from the response
            const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
            const errorMessage = errorData.detail || `HTTP error! Status: ${response.status}`;
            
            throw new Error(errorMessage);
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
        document.getElementById('chordName').textContent = `Error: ${error.message}`;
        stopProgression();
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

// When the page loads, set the chord name to empty instead of "Press Start to begin"
document.addEventListener('DOMContentLoaded', function() {
    resetControlsToDefaults();
    
    // Clear the initial text
    document.getElementById('chordName').textContent = '';
});

// Function to continue the progression from where it left off
function continueProgression() {
    if (isPlaying) return;
    
    console.log("Continuing progression with lastPlayedChord:", lastPlayedChord);
    
    // Ensure audio context is started
    startAudio();
    
    isPlaying = true;
    const toggleBtn = document.getElementById('toggleBtn');
    toggleBtn.textContent = 'Stop';
    toggleBtn.classList.add('stop');
    
    // If we have a stored last played chord, use that
    if (lastPlayedChord) {
        // Restore the current chord
        currentChord = lastPlayedChord;
        
        // Display and play the chord
        displayAndPlayChord(currentChord);
        
        // Start the timer for the next chord
        progressionTimer = setInterval(() => {
            generateNextChord(progressionHistory);
        }, CHORD_DURATION);
    } else if (progressionHistory) {
        // If we have history but no stored chord, generate a new one
        generateNextChord(progressionHistory).then(() => {
            progressionTimer = setInterval(() => {
                generateNextChord(progressionHistory);
            }, CHORD_DURATION);
        });
    } else {
        // If we have neither, start fresh
        startProgression();
    }
}

// Completely rewrite the toggle button event listener
document.getElementById('toggleBtn').addEventListener('click', function() {
    const buttonText = this.textContent.trim();
    
    console.log("Button clicked:", buttonText, "isPlaying:", isPlaying, "hasStarted:", hasStarted);
    
    if (buttonText === 'Start') {
        // Starting fresh
        if (progressionHistory) {
            // If we have a custom seed, use it
            generateFirstChordFromSeed(progressionHistory);
        } else {
            // Otherwise start with a random chord
            startProgression();
        }
        hasStarted = true;
        isPlaying = true;
    } else if (buttonText === 'Stop') {
        // Currently playing, so stop
        stopProgression();
    } else if (buttonText === 'Continue') {
        // Currently stopped, so continue
        continueProgression();
    }
});

// Function to ensure audio context is started (needed due to browser autoplay policies)
async function startAudio() {
    if (Tone.context.state !== "running") {
        await Tone.start();
        console.log("Audio context started:", Tone.context.state);
    }
}