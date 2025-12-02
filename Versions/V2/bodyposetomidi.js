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
const timeoutDuration = 500; // ms to wait before stopping notes

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
  // load bodyPose from ml5.js and flip the detection to match flipped camera
  bodyPose = ml5.bodyPose({ flipped: true });

  // Preloaded video (for testing)
  video = createVideo("video/ankles.mp4");
  // For loop to cycle through the different star gifs array
  for (let i = 0; i < 7; i++) stars.push(loadImage(`video/stars/${i}.gif`));

  // Load shooting star video
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
  // Create canvas to the width&height of display screen
  createCanvas(windowWidth, windowHeight);
  // Draw image from centre instead of corners
  imageMode(CENTER);
  // Use degrees instead of radians (default)
  angleMode(DEGREES);
  // Track last rotation time
  lastRotationTime = millis();

  // Background stars
  for (let i = 0; i < 250; i++) {
    // Random x and y location generated before draw
    xArray[i] = random(width);
    yArray[i] = random(height);
    // Random colour from colours array before draw
    starcolours[i] = color(random(colourcodes));
  }

  // Video setup
  // video=createCapture(VIDEO);

  video.play();
  video.loop();
  video.size(width, height);
  video.hide();
  video.volume(0);

  // Body pose detection
  bodyPose.ready.then(() => {
    bodyPose.detectStart(video, gotPoses);
    connections = bodyPose.getSkeleton();
  });

  // WebMIDI setup
  if (navigator.requestMIDIAccess) {
    navigator.requestMIDIAccess().then((midi) => {
      const TARGET_PORT_NAME = "IAC Driver Bus 1";
      midiOutput = Array.from(midi.outputs.values()).find(
        (o) => o.name === TARGET_PORT_NAME
      );
      if (midiOutput)
        console.log(`Connected to MIDI output: ${midiOutput.name}`);
      else console.error(`MIDI output "${TARGET_PORT_NAME}" not found`);
    }, onMIDIFailure);
  } else console.error("WebMIDI is not supported in this browser.");

  // Random star positions, sizes, rotation
  for (let j = 0; j < 50; j++) {
    starPositions[j] = random(stars);
    starSize.push(random(5, 75));
    starRotation.push(random(20, 300));
  }
}

// Debugging function on MIDI setup in browser failure
function onMIDIFailure(e) {
  console.error("Could not access MIDI devices.", e);
}

function draw() {
  // Sets background colour to black
  background(0);

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

  // Draw background stars
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

    // Update last seen timestamp
    lastSeen[i] = millis();

    // Pitch Bend, Control Change and Note for wrists
    if (lw && rw && lw.confidence > 0.3 && rw.confidence > 0.3) {
      let avgY = (lw.y + rw.y) / 2;
      let bend = map(avgY, height, 0, 0, 16383);
      midiOutput.send([
        getPitchBendChannel(i),
        bend & 0x7f,
        (bend >> 7) & 0x7f,
      ]);

      // Constrain the value of change between 0 and 127
      let ccVal = constrain(
        map(dist(lw.x, lw.y, rw.x, rw.y), 0, width / 2, 0, 127),
        0,
        127
      );
      midiOutput.send([getCCChannel(i), 7, ccVal]);

      // Map pitch to scale
      let scale = [62, 64, 65, 67, 69, 71, 72, 74];
      let note = scale[floor(map(avgY, height, 0, 0, scale.length))];
      let noteKey = `person${i}_note_${note}`;

      if (!activeNotes[noteKey]) {
        midiOutput.send([getMidiChannel(i), note, 100]);
        activeNotes[noteKey] = true;
        setTimeout(() => {
          midiOutput.send([0x80 + (i % 16), note, 0]);
          activeNotes[noteKey] = false;
        }, 200);
      }
    }

    // Ankles control chords
    if (la && ra && la.confidence > 0.3 && ra.confidence > 0.3) {
      // Average X position of ankles
      let avgX = (la.x + ra.x) / 2;

      // Pick chord based on X position
      let chordIndex = constrain(
        floor(map(avgX, 0, width, 0, chordSets.length)),
        0,
        chordSets.length - 1
      );
      let chord = chordSets[chordIndex];

      // Play chord notes
      chord.forEach((note) => {
        let key = `p${i}_note_${note}`;
        if (!activeNotes[key]) {
          midiOutput.send([getMidiChannel(i), note, 100]);
          activeNotes[key] = true;
        }
      });

      // Release notes not in current chord
      Object.keys(activeNotes).forEach((key) => {
        if (key.startsWith(`p${i}_ch_`)) {
          let note = parseInt(key.split("_").pop());
          if (!chord.includes(note)) {
            midiOutput.send([0x80 + (i % 16), note, 0]);
            activeNotes[key] = false;
          }
        }
      });
    }
  }

  // Stop notes if person disappears after delay - to avoid infinite midi buildup in Ableton
  Object.keys(lastSeen).forEach((person) => {
    if (millis() - lastSeen[person] > timeoutDuration) {
      Object.keys(activeNotes).forEach((key) => {
        if (key.startsWith(`person${person}_`)) {
          let note = parseInt(key.split("_").pop());
          midiOutput.send([0x80 + (person % 16), note, 0]);
          activeNotes[key] = false;
        }
      });
      delete lastSeen[person];
    }
  });
}

// Function to draw the stars on skeleton of detected bodies
function drawSkeleton() {
  if (!poses.length) return;
  for (let i = 0; i < poses.length; i++) {
    let pose = poses[i];

    // Draw stars on keypoints
    for (let k of pose.keypoints) {
      if (k.confidence > 0.1) {
        push();
        image(starPositions[counter % starPositions.length], k.x, k.y, 35, 35);
        pop();
        counter++;
      }
    }

    // Draw stars between keypoints
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

// Debugging function to see results of ml5.js poses array
function gotPoses(results) {
  poses = results;
}

// Function to put chrome into fullscreen
function keyPressed() {
  if (key === "§") fullscreen(!fullscreen());
}
