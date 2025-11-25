let video;
let bodyPose;
let midiOutput;
let chordNotes = [60, 64, 67]; // C major chord
let activeNotes = {};
let poses = [];
let xArray = [];
let yArray = [];
let starcolours = [];
let connections;
let gif_loadImg, gif_createImg,load;
let counter = 0;

let colourcodes = [
  "#FFFFFF",
  "#FDFBF6",
  "#FAF2DF",
  "#FAE7B9",
  "#FADE7C",
  "#FADA5E",
];

let stars = [];
let starPositions = [];
function preload() {
  bodyPose = ml5.bodyPose({ flipped: true });

  gif_loadImg = loadImage("video/star.gif");
  gif_createImg = createImg("video/star.gif");
  for (let i = 0; i < 7; i++){
    load = loadImage(`video/stars/${i}.gif`)
    stars.push(load)
  }
  
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  imageMode(CENTER);


  

  gif_createImg.hide();


  // Background stars
  for (let i = 0; i < 100; i++) {
    xArray[i] = random(width);
    yArray[i] = random(height);
    starcolours[i] = color(random(colourcodes));
  }


  video = createCapture(VIDEO);
  video.size(width, height);
  video.hide();


  bodyPose.ready.then(() => {
    bodyPose.detectStart(video, gotPoses);
    connections = bodyPose.getSkeleton();
  });


  if (navigator.requestMIDIAccess) {
    navigator.requestMIDIAccess().then(midi => {
      midiOutput = Array.from(midi.outputs.values())[0];
    });
  }


  //for (let i = 0; i < poses.length; i++) {
    for(let j = 0; j < 50; j++){
      starPositions[j] = random(stars);
    }
  //}

}

function draw() {
  background(0);



  // draw twinkling stars
  for (let i = 0; i < xArray.length; i++) {
    fill(starcolours[i]);
    noStroke();
    circle(xArray[i], yArray[i], 3, 3);
  }

  if (poses.length) drawSkeleton();
  if (!poses.length || !midiOutput) return;

  for(let i = 0; i < poses.length; i++){

  
  let pose = poses[i];


  let lw = pose.keypoints.find(k => k.name === "left_wrist");
  let rw = pose.keypoints.find(k => k.name === "right_wrist");
  let la = pose.keypoints.find(k => k.name === "left_ankle");
  let ra = pose.keypoints.find(k => k.name === "right_ankle");


  if (lw && rw && lw.confidence > 0.3 && rw.confidence > 0.3) {
    let avgY = (lw.y + rw.y) / 2;


    let bend = map(avgY, height, 0, 0, 16383);
    midiOutput.send([0xE0, bend & 0x7F, (bend >> 7) & 0x7F]);


    let ccVal = constrain(map(dist(lw.x, lw.y, rw.x, rw.y), 0, width / 2, 0, 127), 0, 127);
    midiOutput.send([0xB0, 74, ccVal]);


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
    chordNotes.forEach(n => midiOutput.send([0x90, n, 90]));
  } else {
    chordNotes.forEach(n => midiOutput.send([0x80, n, 0]));
  }
  if (i == 0) {
  console.log("Person 1 is sending MIDI data");
  } if ( i == 1) {
      console.log("Person 2 is sending MIDI data");
  } if ( i == 2 ){
    console.log("Person 3 is sending MIDI data");
  } 
  if (i > 2)  {
    console.log("Person ... is sending MIDI data")
  }

}
}


function drawSkeleton() {
  if (!poses.length) return;

  for (let i = 0; i < poses.length; i++) {
    let pose = poses[i];


    if (connections) {
      for (let j = 0; j < connections.length; j++) {
        let [a, b] = connections[j];
        let pointA = pose.keypoints[a];
        let pointB = pose.keypoints[b];
        if (pointA.confidence > 0.1 && pointB.confidence > 0.1) {
          stroke(255, 255, 255, 40);
          strokeWeight(1);
          line(pointA.x, pointA.y, pointB.x, pointB.y);
        }
      }
    }


    for (let k of pose.keypoints) {
      if (k.confidence > 0.1) {
        push();
        translate(35,35);

        image(starPositions[counter], k.x, k.y, 100, 100);
        // print(k);
        pop();
              counter++;  
              print(counter);
      }


    }
    counter = 0;
  }
}

function gotPoses(results) {
  poses = results;
}
