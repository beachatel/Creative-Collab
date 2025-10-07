let video;
let bodyPose;
let poses = [];
let connections;
let midiOutput;

let activeNotes = {};

function preload() {
  bodyPose = ml5.bodyPose();
}

function setup() {
  createCanvas(windowWidth, windowHeight);

  video = createCapture(VIDEO);
  video.size(width, height);
  video.hide();

  bodyPose.detectStart(video, gotPoses);
  connections = bodyPose.getSkeleton();

 
  if (navigator.requestMIDIAccess) {
    navigator.requestMIDIAccess().then(onMIDISuccess, onMIDIFailure);
  } else {
    console.log("WebMIDI is not supported in this browser.");
  }
}

function draw() {
  background(255);
  image(video, 0, 0, width, height);

  drawSkeleton();
  drawKeypoints();
  sendMIDINotes();
}

function drawSkeleton() {
  for (let i = 0; i < poses.length; i++) {
    let pose = poses[i];
    for (let j = 0; j < connections.length; j++) {
      let [a, b] = connections[j];
      let pointA = pose.keypoints[a];
      let pointB = pose.keypoints[b];
      if (pointA.confidence > 0.1 && pointB.confidence > 0.1) {
        stroke(255, 0, 0);
        strokeWeight(2);
        line(pointA.x, pointA.y, pointB.x, pointB.y);
      }
    }
  }
}

function drawKeypoints() {
  for (let i = 0; i < poses.length; i++) {
    let pose = poses[i];
    for (let j = 0; j < pose.keypoints.length; j++) {
      let keypoint = pose.keypoints[j];
      if (keypoint.confidence > 0.1) {
        fill(0, 255, 0);
        noStroke();
        circle(keypoint.x, keypoint.y, 10);
      }
    }
  }
}

function gotPoses(results) {
  poses = results;
}

// MIDI setup
function onMIDISuccess(midiAccess) {
  midiOutput = Array.from(midiAccess.outputs.values())[0];
  console.log("MIDI ready:", midiOutput);

  midiOutput.open().then(() => {
    console.log("MIDI port is now open!");
  });
}

function onMIDIFailure() {
  console.log("Could not access MIDI devices.");
}

// Map keypoints to MIDI notes
const keypointMap = {
  10: 60, // right wrist → C4
  9: 62,  // left wrist → D4
  16: 64, // right ankle → E4
  15: 65  // left ankle → F4
};

function sendMIDINotes() {
  if (!poses.length || !midiOutput) return;

  let pose = poses[0];
  let rightWrist = pose.keypoints[10]; // Right wrist

  if (rightWrist.confidence > 0.1) {
    // Map Y position to CC value (0–127)
    let ccValue = floor(map(rightWrist.y, 0, height, 0, 127));

    // Send MIDI CC 91 (Reverb) on channel 1
    midiOutput.send([0xB0, 91, ccValue]); // 0xB0 = Control Change, channel 1
  }
}


function sendReverbControl() {
  if (!poses.length || !midiOutput) return;

  let rightWrist = poses[0].keypoints[10]; // Right wrist

  if (rightWrist.confidence > 0.1) {

    let ccValue = floor(map(rightWrist.y, 0, height, 0, 127));
    
    // Send CC91 (MIDI Control Change) on channel 1
    midiOutput.send([0xB0, 91, ccValue]); 
  }
}