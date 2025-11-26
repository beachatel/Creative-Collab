let video;

let rotationAngle = 0;
let lastRotationTime = 0;
const rotationInterval = 2000;
const rotationAmount = 40;

let bodyPose;
let midiOutput;
let chordNotes = [52, 56, 60, 64, 67, 71];
let activeNotes = {};

let poses = [];
let xArray = [];
let yArray = [];
let connections;

let gif_loadImg, gif_createImg, load;

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

// Initiliase all arrays
let stars = [];
let starcolours = [];
let starPositions = [];
let starSize = [];
let starRotation = [];

function preload() {
  bodyPose = ml5.bodyPose({ flipped: true });

  // video = createVideo("video/people.mp4")

  gif_loadImg = loadImage("video/star.gif");
  gif_createImg = createImg("video/star.gif");

  for (let i = 0; i < 7; i++) {
    load = loadImage(`video/stars/${i}.gif`);
    stars.push(load);
  }
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  imageMode(CENTER);

  angleMode(DEGREES);
  lastRotationTime = millis();

  gif_createImg.hide();

  // Background stars
  for (let i = 0; i < 250; i++) {
    xArray[i] = random(width);
    yArray[i] = random(height);
    starcolours[i] = color(random(colourcodes));
  }

  // Set up video capture

  // For live video capture:
  video = createCapture(VIDEO);

  // with pre video
  // video.play();
  // video.loop();
  video.size(width, height);
  video.hide();
  video.volume(0);

  // Start body pose detection
  bodyPose.ready.then(() => {
    bodyPose.detectStart(video, gotPoses);
    connections = bodyPose.getSkeleton();
  });

  if (navigator.requestMIDIAccess) {
    navigator.requestMIDIAccess().then((midi) => {
      const TARGET_PORT_NAME = "IAC Driver Bus 1";

      let outputs = Array.from(midi.outputs.values());

      midiOutput = outputs.find((output) => output.name === TARGET_PORT_NAME);

      if (midiOutput) {
        console.log(
          `Successfully connected to MIDI output: ${midiOutput.name}`
        );
      } else {
        console.error(
          `ERROR: MIDI output port named "${TARGET_PORT_NAME}" not found.`
        );
        console.log(
          "Available output ports:",
          outputs.map((o) => o.name)
        );
      }
    }, onMIDIFailure);
  } else {
    console.error("WebMIDI is not supported in this browser.");
  }

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

  if (millis() - lastRotationTime >= rotationInterval) {
    rotationAngle += rotationAmount;
    lastRotationTime = millis();
  }

  for (let i = 0; i < xArray.length; i++) {
    fill(starcolours[i]);
    noStroke();
    circle(xArray[i], yArray[i], 1.5, 1.5);
  }

  if (poses.length) drawSkeleton();

  if (!poses.length || !midiOutput) return;

  // Process MIDI for each detected person
  for (let i = 0; i < poses.length; i++) {
    let pose = poses[i];

    let lw = pose.keypoints.find((k) => k.name === "left_wrist");
    let rw = pose.keypoints.find((k) => k.name === "right_wrist");
    let la = pose.keypoints.find((k) => k.name === "left_ankle");
    let ra = pose.keypoints.find((k) => k.name === "right_ankle");

    if (lw && rw && lw.confidence > 0.3 && rw.confidence > 0.3) {
      let avgY = (lw.y + rw.y) / 2;

      let bend = map(avgY, height, 0, 0, 16383);
      midiOutput.send([0xe0, bend & 0x7f, (bend >> 7) & 0x7f]);

      let ccVal = constrain(
        map(dist(lw.x, lw.y, rw.x, rw.y), 0, width / 2, 0, 127),
        0,
        127
      );

      midiOutput.send([0xb0, 7, ccVal]);

      let scale = [62, 64, 65, 67, 69, 71, 72, 74];
      let note = scale[floor(map(avgY, height, 0, 0, scale.length))];

      if (!activeNotes[note]) {
        midiOutput.send([0x90, note, 100]);
        activeNotes[note] = true;

        setTimeout(() => {
          midiOutput.send([0x80, note, 0]);
          activeNotes[note] = false;
        }, 200);
      }
    }

    if (la && ra && la.confidence > 0.3 && ra.confidence > 0.3) {
      chordNotes.forEach((n) => {
        if (!activeNotes["chord_" + n]) {
          midiOutput.send([0x90, n, 90]);
          activeNotes["chord_" + n] = true;
        }
      });
    } else {
      chordNotes.forEach((n) => {
        if (activeNotes["chord_" + n]) {
          midiOutput.send([0x80, n, 0]);
          activeNotes["chord_" + n] = false;
        }
      });
    }
  }
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

    // Draw stars between keypoints
    if (connections) {
      for (let j = 0; j < connections.length; j++) {
        let [a, b] = connections[j];
        let pointA = pose.keypoints[a];
        let pointB = pose.keypoints[b];
        if (pointA.confidence > 0.1 && pointB.confidence > 0.1) {
          let steps = 3;
          for (let s = 1; s < steps; s++) {
            let t = s / steps;
            let x = lerp(pointA.x, pointB.x, t);
            let y = lerp(pointA.y, pointB.y, t);
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

// Debugging function to print results
function gotPoses(results) {
  poses = results;
  // console.log(results);
}
