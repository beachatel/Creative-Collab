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

// keypoints as MIDI notes
const keypointMap = {
  10: 60, // right wrist C4
  9: 62,  // left wrist  D4
  16: 64, // right ankle E4
  15: 65  // left ankle  F4
};

function sendMIDINotes() {
  if (!poses.length || !midiOutput) return;

  let pose = poses[0];

  for (let keyIndex in keypointMap) {
    let keypoint = pose.keypoints[keyIndex];
    let note = keypointMap[keyIndex];

    if (keypoint.confidence > 0.1) {
      if (!activeNotes[note]) {
        midiOutput.send([0x90, note, 100]); // Note ON
        activeNotes[note] = true;
      }
    } else {
      if (activeNotes[note]) {
        midiOutput.send([0x80, note, 0]); // Note OFF
        activeNotes[note] = false;
      }
    }
  }
}
