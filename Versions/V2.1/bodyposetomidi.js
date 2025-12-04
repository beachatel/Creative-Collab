// Initialize video object
let video;

// Declare all variables for rotation of stars
let rotationAngle = 0;
let lastRotationTime = 0;
const rotationInterval = 2000;
const rotationAmount = 40;

// Timer variable to play shooting star video
let timer = 0;
// Interval between playbacks
const shootstarInterval = 5000;

// Body pose object from ml5.js
let bodyPose;
// MidiOutput variable for midi notes sending to Ableton
let midiOutput;

// Active notes dictionary
let activeNotes = {};
// Last seen timestamp for each person
let lastSeen = {};
const timeoutDuration = 200; // ms to wait before stopping notes

// Poses array, x and y array for background star positions
let poses = [];
let xArray = [];
let yArray = [];
let connections;

// Counter for stars
let counter = 0;

// Colour array for the background stars
let colourcodes = [
  "#FFFFFF",
  "#FDFBF6",
  "#FAF2DF",
  "#FAE7B9",
  "#FADE7C",
  "#FADA5E",
];

// Initialize arrays for stars
let stars = [];
let starcolours = [];
let starPositions = [];
let starSize = [];
let starRotation = [];

// Harmonic Chords
let chordSets = [
  [60, 64, 67],
  [62, 65, 69],
  [64, 67, 71],
  [65, 69, 72],
  [67, 71, 74],
  [69, 72, 76],
  [71, 74, 77],
  [60, 64, 67, 71],
  [65, 69, 72, 76],
  [67, 71, 74, 77],
];

// Declare variables for shooting star, position and boolean
let shootingStar;
let shootStarBool = false;
let shootStarPos = [];

function preload() {
  bodyPose = ml5.bodyPose({ flipped: true });

  for (let i = 0; i < 7; i++) stars.push(loadImage(`video/stars/${i}.gif`));
  shootingStar = loadImage("video/output.gif");
}

// Note On status for a each body in positions array (0–15)
function getMidiChannel(personIndex) {
  return 0x90 + (personIndex % 16);
}
// Control change status for a each body in positions array (0–15)
function getCCChannel(personIndex) {
  return 0xb0 + (personIndex % 16);
}
// Pitch bend status for a each body in positions array (0–15)
function getPitchBendChannel(personIndex) {
  return 0xe0 + (personIndex % 16);
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  imageMode(CENTER);
  angleMode(DEGREES);
  lastRotationTime = millis();

  for (let i = 0; i < 250; i++) {
    xArray[i] = random(width);
    yArray[i] = random(height);
    starcolours[i] = color(random(colourcodes));
  }

  video = createCapture(VIDEO);
  video.size(width, height);
  video.hide();
  video.volume(0);

  bodyPose.ready.then(() => {
    bodyPose.detectStart(video, gotPoses);
    connections = bodyPose.getSkeleton();
  });

  if (navigator.requestMIDIAccess) {
    navigator.requestMIDIAccess().then((midi) => {
      const TARGET_PORT_NAME = "loopMIDI Port";
      midiOutput = Array.from(midi.outputs.values()).find(
        (o) => o.name === TARGET_PORT_NAME
      );
      if (midiOutput)
        console.log(`Connected to MIDI output: ${midiOutput.name}`);
      else console.error(`MIDI output "${TARGET_PORT_NAME}" not found`);
    }, onMIDIFailure);
  } else console.error("WebMIDI is not supported in this browser.");

  for (let j = 0; j < 50; j++) {
    starPositions[j] = random(stars);
    starSize.push(random(5, 75));
    starRotation.push(random(20, 300));
  }
}

function onMIDIFailure(e) {
  console.error("Could not access MIDI devices.", e);
}

function draw() {
  background(0);

  // ⭐⭐⭐ FIX — STOP ALL NOTES WHEN NO ONE IS DETECTED ⭐⭐⭐
  if (poses.length === 0 && midiOutput) {
    Object.keys(activeNotes).forEach((key) => {
      if (!activeNotes[key]) return;
      let note = parseInt(key.split("_").pop());
      let match = key.match(/person(\d+)_/) || key.match(/p(\d+)_/);
      if (match) {
        let person = parseInt(match[1]);
        midiOutput.send([0x80 + (person % 16), note, 0]);
        activeNotes[key] = false;
      }
    });
  }

  // Star rotation
  if (millis() - lastRotationTime >= rotationInterval) {
    rotationAngle += rotationAmount;
    lastRotationTime = millis();
  }

  // Shooting star
  if (millis() - timer >= shootstarInterval) {
    shootStarBool = !shootStarBool;
    shootStarPos = [
      random(100, windowWidth - 100),
      random(100, windowHeight - 100),
      random(110, 300),
    ];
    timer = millis();
  }
  if (shootStarBool) {
    tint(255, 50);
    image(
      shootingStar,
      shootStarPos[0],
      shootStarPos[1],
      shootStarPos[2],
      shootStarPos[2]
    );
    tint(255, 255);
  }

  // Background stars
  for (let i = 0; i < xArray.length; i++) {
    fill(starcolours[i]);
    noStroke();
    circle(xArray[i], yArray[i], 1.5);
  }

  if (poses.length) drawSkeleton();
  if (!midiOutput) return;

  for (let i = 0; i < poses.length; i++) {
    let pose = poses[i];
    let lw = pose.keypoints.find((k) => k.name === "left_wrist");
    let rw = pose.keypoints.find((k) => k.name === "right_wrist");
    let la = pose.keypoints.find((k) => k.name === "left_ankle");
    let ra = pose.keypoints.find((k) => k.name === "right_ankle");

    lastSeen[i] = millis();

    // Wrist melodic notes
    if (lw && rw && lw.confidence > 0.3 && rw.confidence > 0.3) {
      let avgY = (lw.y + rw.y) / 2;

      let bend = map(avgY, height, 0, 0, 16383);
      midiOutput.send([
        getPitchBendChannel(i),
        bend & 0x7f,
        (bend >> 7) & 0x7f,
      ]);

      let ccVal = constrain(
        map(dist(lw.x, lw.y, rw.x, rw.y), 0, width / 2, 0, 127),
        0,
        127
      );
      midiOutput.send([getCCChannel(i), 7, ccVal]);

      let scale = [62, 64, 65, 67, 69, 71, 72, 74];
      let note = scale[floor(map(avgY, height, 0, 0, scale.length))];
      let key = `person${i}_note_${note}`;

      if (!activeNotes[key]) {
        midiOutput.send([getMidiChannel(i), note, 100]);
        activeNotes[key] = true;
        setTimeout(() => {
          midiOutput.send([0x80 + (i % 16), note, 0]);
          activeNotes[key] = false;
        }, 200);
      }
    }

    // Ankle → chord notes
    if (la && ra && la.confidence > 0.3 && ra.confidence > 0.3) {
      let avgX = (la.x + ra.x) / 2;

      let chordIndex = constrain(
        floor(map(avgX, 0, width, 0, chordSets.length)),
        0,
        chordSets.length - 1
      );
      let chord = chordSets[chordIndex];

      chord.forEach((note) => {
        let key = `p${i}_note_${note}`;
        if (!activeNotes[key]) {
          midiOutput.send([getMidiChannel(i), note, 100]);
          activeNotes[key] = true;
        }
      });

      // Remove chord notes that should no longer play
      Object.keys(activeNotes).forEach((key) => {
        if (!key.startsWith(`p${i}_note_`)) return;
        let note = parseInt(key.split("_").pop());
        if (!chord.includes(note)) {
          midiOutput.send([0x80 + (i % 16), note, 0]);
          activeNotes[key] = false;
        }
      });
    }
  }

  // ⭐⭐⭐ FIX — stop notes when person disappears ⭐⭐⭐
  Object.keys(lastSeen).forEach((person) => {
    if (millis() - lastSeen[person] > timeoutDuration) {
      Object.keys(activeNotes).forEach((key) => {
        if (
          key.startsWith(`person${person}_`) ||
          key.startsWith(`p${person}_note_`)
        ) {
          let note = parseInt(key.split("_").pop());
          midiOutput.send([0x80 + (person % 16), note, 0]);
          activeNotes[key] = false;
        }
      });
      delete lastSeen[person];
    }
  });
}

function drawSkeleton() {
  if (!poses.length) return;
  for (let i = 0; i < poses.length; i++) {
    let pose = poses[i];

    for (let k of pose.keypoints) {
      if (k.confidence > 0.1) {
        push();
        image(starPositions[counter % starPositions.length], k.x, k.y, 35, 35);
        pop();
        counter++;
      }
    }

    if (connections) {
      for (let j = 0; j < connections.length; j++) {
        let [a, b] = connections[j];
        let pA = pose.keypoints[a],
          pB = pose.keypoints[b];
        if (pA.confidence > 0.1 && pB.confidence > 0.1) {
          for (let s = 1; s < 3; s++) {
            let t = s / 3;
            let x = lerp(pA.x, pB.x, t),
              y = lerp(pA.y, pB.y, t);
            push();
            translate(x, y);
            rotate(rotationAngle + starRotation[counter]);
            image(
              starPositions[counter % starPositions.length],
              0,
              0,
              starSize[counter],
              starSize[counter]
            );
            pop();
            counter++;
          }
        }
      }
    }
    counter = 0;
  }
}

function gotPoses(results) {
  poses = results;
}

function keyPressed() {
  if (key === "f") fullscreen(!fullscreen());
}
