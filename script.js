const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const audioCtx = new AudioContext({sampleRate: 48000});
const image = document.getElementById('source');
var continuePlay = false;

const cursor = {
    w: 60,
    h: 70,
    x: 0,
    y: canvas.height,
    speed: 10,
    dx: 0,
    dy: 0
}

const snareVals = {
    decay: 0.5,
    cutoff: 1500,
    pitch: 100,
    gain: 0.5
}

const kickVals = {
    decay: 0.5,
    pitch: 250.0,
    gain: 1
}

const hatsVals = {
    decay: 0.4,
    pitch: 300,
    gain: 0.5
}

function drawCursor() {
    ctx.fillStyle = '#f8a176';
    ctx.fillRect(cursor.x, cursor.y, cursor.w, cursor.h);
    ctx.drawImage(image, cursor.x+5, cursor.y+5, cursor.w-10, cursor.h-10);
}

function clear() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function newPos() {
    cursor.x += cursor.dx;
    cursor.y += cursor.dy;
    detectWalls();
}

function detectWalls() {
    if (cursor.x < 0) {
        cursor.x = 0;
    } 
    else if (cursor.x + cursor.w > canvas.width) {
        cursor.x = canvas.width - cursor.w;
    }

    if (cursor.y < 0) {
        cursor.y = 0;
    }
    else if (cursor.y + cursor.h > canvas.height) {
        cursor.y = canvas.height - cursor.h;
    }
}

function update() {
    clear();
    drawCursor();
    newPos();
    updateBeatParams();
    requestAnimationFrame(update);
}

function updateBeatParams() {
    let xNormedVal = cursor.x / (canvas.width - cursor.w);
    let yNormedVal = cursor.y / (canvas.height - cursor.h);

    kickVals.decay = (xNormedVal * 5) + 0.5;
    kickVals.pitch = ((1 - yNormedVal) * 350) + 100;

    snareVals.decay = (xNormedVal * 0.75) + 0.5;
    snareVals.cutoff = ((1 - yNormedVal) * 12000) + 1500;
    snareVals.pitch = ((1 - yNormedVal) * 200) + 100;

    hatsVals.decay = (xNormedVal) + 0.25;
    hatsVals.pitch = ((1 - yNormedVal) * 1000) + 500;
}

function keyDown(e) {
    if (e.key == "ArrowRight" || e.key == "Right") {
        cursor.dx = cursor.speed;
    }
    else if (e.key == "ArrowLeft" || e.key == "Left") {
        cursor.dx = cursor.speed * -1;
    }
    else if (e.key == "ArrowUp" || e.key == "Up") {
        cursor.dy = cursor.speed * -1;
    }
    else if (e.key == "ArrowDown" || e.key == "Down") {
        cursor.dy = cursor.speed;
    }
}

function keyUp(e) {
    if (e.key == "ArrowRight" || e.key == "Right" || e.key == "ArrowLeft" || e.key == "Left") {
        cursor.dx = 0;
    }

    if (e.key == "ArrowUp" || e.key == "Up" || e.key == "ArrowDown" || e.key == "Down") {
        cursor.dy = 0;
    }
}

// Global gain control
const gainControl = audioCtx.createGain();
gainControl.gain.setValueAtTime(0.1, 0);
gainControl.connect(audioCtx.destination)

function playSnare() {
    // White noise generator
    const buffer = audioCtx.createBuffer(1, audioCtx.sampleRate * snareVals.decay, audioCtx.sampleRate)
    const channelData = buffer.getChannelData(0);

    for (let i = 0; i < buffer.length; i++) {
        channelData[i] = Math.random() * 2 - 1;
    }
    const whiteNoiseSource = audioCtx.createBufferSource();
    whiteNoiseSource.buffer = buffer;

    // Snare osc
    const snareOsc = audioCtx.createOscillator();
    snareOsc.type = 'triangle';
    snareOsc.frequency.setValueAtTime(snareVals.pitch, audioCtx.currentTime);
    snareOsc.frequency.exponentialRampToValueAtTime(snareVals.pitch * 0.8, audioCtx.currentTime + snareVals.decay)

    // Snare osc gain control
    const snareOscGainControl = audioCtx.createGain();
    snareOscGainControl.gain.setValueAtTime(snareVals.gain, audioCtx.currentTime);
    snareOscGainControl.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.2);
    snareOscGainControl.connect(gainControl)
    snareOsc.connect(snareOscGainControl);
    snareOsc.start()

    // Snare white noise gain control
    const snareWhiteGainControl = audioCtx.createGain();
    snareWhiteGainControl.gain.setValueAtTime(snareVals.gain, audioCtx.currentTime);
    snareWhiteGainControl.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + snareVals.decay);
    snareWhiteGainControl.connect(gainControl);

    // White noise filter
    const snareFilter = audioCtx.createBiquadFilter();
    snareFilter.frequency.value = snareVals.cutoff;
    snareFilter.type = 'highpass';
    snareFilter.connect(snareWhiteGainControl)
    whiteNoiseSource.connect(snareFilter);
    whiteNoiseSource.start();
}

function playKick() {
    // Kick gain control
    const kickGainControl = audioCtx.createGain();
    kickGainControl.gain.setValueAtTime(kickVals.gain, 0);
    kickGainControl.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + kickVals.decay);
    kickGainControl.connect(gainControl);

    // Kick osc
    const kickOsc = audioCtx.createOscillator();
    kickOsc.frequency.setValueAtTime(kickVals.pitch, 0);
    kickOsc.frequency.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + kickVals.decay);
    kickOsc.connect(kickGainControl);   
    
    // Play sound
    kickOsc.start();
    kickOsc.stop(audioCtx.currentTime + kickVals.decay);
}

function playHats() {
    // Hats gain control
    const hatsGainControl = audioCtx.createGain();
    hatsGainControl.gain.setValueAtTime(hatsVals.gain, 0);
    hatsGainControl.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + hatsVals.decay);
    hatsGainControl.connect(gainControl);

    // Hats osc
    const hatsOsc = audioCtx.createOscillator();
    hatsOsc.type = "triangle";
    hatsOsc.frequency.setValueAtTime(hatsVals.pitch, 0);
    hatsOsc.frequency.linearRampToValueAtTime(200, audioCtx.currentTime + kickVals.decay);
    hatsOsc.connect(hatsGainControl);   
    
    // Hats sound
    hatsOsc.start();
    hatsOsc.stop(audioCtx.currentTime + hatsVals.decay);
}

// Drum beat sequence
const bpm = 130.0;
const eighthNoteTime = (60000.0 / bpm) / 2;
function playBeat() {
    if (continuePlay) {
        playKick();
        setTimeout(function(){ playHats(); }, eighthNoteTime);
        setTimeout(function(){ playSnare(); }, eighthNoteTime *2);
        setTimeout(function(){ playKick(); }, eighthNoteTime * 2);
        setTimeout(function(){ playHats(); }, eighthNoteTime * 3);
        setTimeout(function(){ playBeat(); }, eighthNoteTime * 4);
    }
}

// Play button
const playButton = document.createElement('button');
playButton.innerText = 'Play';
playButton.id = 'play';
playButton.addEventListener('click', () => {
    if(!continuePlay) {
        resetDefaultGains();
        continuePlay = true;
        playBeat();
    }
})
document.body.appendChild(playButton);

// Stop button
const stopButton = document.createElement('button');
stopButton.innerText = 'Stop';
stopButton.id = 'stop';
stopButton.addEventListener('click', () => {
    silenceAll();
    continuePlay = false;
    
})
document.body.appendChild(stopButton);

function silenceAll() {
    hatsVals.gain = 0.0;
    snareVals.gain = 0.0;
    kickVals.gain = 0.0;
}

function resetDefaultGains() {
    hatsVals.gain = 0.7;
    snareVals.gain = 0.5;
    kickVals.gain = 1;
}

document.addEventListener('keydown', keyDown);
document.addEventListener('keyup', keyUp);

// Prevent arrow keys from scrolling the page
window.addEventListener("keydown", function(e) {
    if(["Space","ArrowUp","ArrowDown","ArrowLeft","ArrowRight"].indexOf(e.code) > -1) {
        e.preventDefault();
    }
}, false);

update();
