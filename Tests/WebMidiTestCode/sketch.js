let midiAccess;
let midiOut;

function setup() {
  noCanvas();

  if (navigator.requestMIDIAccess) {
    navigator.requestMIDIAccess().then(onMIDISuccess, onMIDIFailure);
  } else {
    console.log("Web MIDI API not supported in this browser.");
  }
}

function onMIDISuccess(midi) {
  midiAccess = midi;
  // Pick the first output
  for (let output of midiAccess.outputs.values()) {
    midiOut = output;
    break;
  }
}

function onMIDIFailure() {
  console.log("Could not access MIDI devices.");
}

// Send a note
function sendNote(note = 60, velocity = 100, channel = 0) {
  if (!midiOut) return;
  let noteOn = [0x90 + channel, note, velocity];
  let noteOff = [0x80 + channel, note, 0];
  midiOut.send(noteOn); // play
  setTimeout(() => midiOut.send(noteOff), 300); // stop after 300ms
}

function gotPoses(poses) {
  if (poses.length > 0) {
    let leftWrist = poses[0].pose.leftWrist;
    let rightWrist = poses[0].pose.rightWrist;

    if (leftWrist.confidence > 0.2 && leftWrist.y < 200) {
      sendNote(60); // C4 when left wrist is high
    }
    if (rightWrist.confidence > 0.2 && rightWrist.y < 200) {
      sendNote(64); // E4 when right wrist is high
    }
  }
}
