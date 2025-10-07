let video;
let handpose;
let predictions = [];

let midiOutput;
let activeNotes = {};

const baseNotes = [60, 62, 64, 65, 67]; // Thumb → Pinky
const pitchBendRange = 8192; // half of 16383
const maxBend = 8192;

function setup() {
  createCanvas(640, 480);
  video = createCapture(VIDEO);
  video.size(width, height);
  video.hide();

  handpose = ml5.handpose(video, () => console.log("✅ Handpose model ready!"));
  handpose.on("predict", results => {
    predictions = results;
  });

  // WebMIDI
  if (navigator.requestMIDIAccess) {
    navigator.requestMIDIAccess().then(onMIDISuccess, onMIDIFailure);
  } else {
    console.log("WebMIDI not supported in this browser.");
  }
}

function draw() {
  background(0);
  image(video, 0, 0, width, height);
  drawHands();
  sendMIDINotes();
}

function drawHands() {
  if (predictions.length === 0) return;
  for (let i = 0; i < predictions.length; i++) {
    const landmarks = predictions[i].landmarks;
    for (let j = 0; j < landmarks.length; j++) {
      const [x, y, z] = landmarks[j];
      fill(0, 255, 0);
      noStroke();
      ellipse(x, y, 10);
    }
  }
}

// MIDI setup
function onMIDISuccess(midiAccess) {
  midiOutput = Array.from(midiAccess.outputs.values())[0];
  console.log("MIDI ready:", midiOutput);
  midiOutput.open();
}

function onMIDIFailure() {
  console.log("Could not access MIDI devices.");
}

// Send MIDI notes and pitch bend
function sendMIDINotes() {
  if (!predictions.length || !midiOutput) return;

  const hand = predictions[0];
  const landmarks = hand.landmarks;

  // wrist = landmark 0
  const [wristX, wristY] = landmarks[0];

  // Pitch bend
  let bendValue = map(wristX, 0, width, -maxBend, maxBend);
  let bend = Math.floor(constrain(8192 + bendValue, 0, 16383));
  sendPitchBend(bend);

  // Velocity (up = louder)
  let velocity = Math.floor(map(wristY, height, 0, 40, 127));

  // Fingertips: [thumb=4, index=8, middle=12, ring=16, pinky=20]
  const tipIndices = [4, 8, 12, 16, 20];
  tipIndices.forEach((idx, i) => {
    const [x, y] = landmarks[idx];
    const note = baseNotes[i];

    // simple threshold: if fingertip visible
    if (y >= 0) {
      if (!activeNotes[note]) {
        midiOutput.send([0x90, note, velocity]); // Note ON
        activeNotes[note] = true;
      }
    } else {
      if (activeNotes[note]) {
        midiOutput.send([0x80, note, 0]); // Note OFF
        activeNotes[note] = false;
      }
    }
  });
}

function sendPitchBend(value) {
  if (!midiOutput) return;
  const lsb = value & 0x7F;
  const msb = (value >> 7) & 0x7F;
  midiOutput.send([0xE0, lsb, msb]);
}