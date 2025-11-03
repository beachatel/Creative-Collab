let video;
let starvideo;
let star;
let bodyPose;
let poseNet;
let midiOutput;
let chordNotes = [60, 64, 67]; // c major
let activeNotes = {};
let connections; 
let crowdVideo;
let bgimage;
let xArray = [];
let yArray = [];
let poses = [];


let starcolours = [];
let colourcodes = [
  "#FFFFFF",
  "#FDFBF6",
  "#FAF2DF",
  "#FAE7B9",
  "#FADE7C",
  "#FADA5E",
];

var gif_loadImg, gif_createImg;


function preload() {
  bodyPose = ml5.bodyPose({ flipped: true}); // 'moveNet'
  // poseNet = ml5.poseNet(video, 'multiple', modelReady);
    // video = createVideo("video/crowdVideo.mp4")
    // star = createVideo("video/star.gif")

    gif_loadImg = loadImage("video/stars.gif");
    gif_createImg = createImg("video/stars.gif");
    // bgimage = loadImage("video/star.gif");
}

function setup() {
  createCanvas(windowWidth, windowHeight);


    for (let i = 0; i < 50; i++) {
    xArray[i] = random(0, width);
    starcolours[i] = color(random(colourcodes));
    yArray[i] = random(0, height);
  }

    

  // starvideo.play();
  // starvideo.loop();
  // starvideo.hide();

  // star.autoplay();
  // star.loop();
  // star.hide();
  // starvideo.size(100,100);

  video = createCapture(VIDEO);
  video.size(width, height);
  video.hide();

  gif_createImg.hide();

  imageMode(CENTER);

  // // testing for old crowd video

  // video.loop();
  // video.hide();

  bodyPose.ready.then(() => {
    bodyPose.detectStart(video, gotPoses);
      // (results) => poses = results);
    connections = bodyPose.getSkeleton();
  });

  if (navigator.requestMIDIAccess) {
    navigator.requestMIDIAccess().then(midi => midiOutput = Array.from(midi.outputs.values())[0]);
  }

}


function modelReady() {
  select('#status').html('Model Loaded');
}



function draw() {
  background(0);
  // image(video, 0, 0, width, height);


  //background stars


 
 for (let i = 0; i < xArray.length; i += 1) {
  fill(starcolours[i]);
     circle(xArray[i], yArray[i], 3, 3);
  }

  stroke(255);
  fill(255);


  if (poses.length) drawSkeleton();
  if (!poses.length || !midiOutput) return;

  let p = poses[0].keypoints;
  
  let lw = p[9], rw = p[10], la = p[15], ra = p[16];

// midi stuff for ableton 
  if (lw.confidence > 0.3 && rw.confidence > 0.3) {
    let avgY = (lw.y + rw.y) / 2;
    midiOutput.send([0xE0, (map(avgY, height, 0, 0, 16383) & 0x7F), ((map(avgY, height, 0, 0, 16383) >> 7) & 0x7F)]);
    midiOutput.send([0xB0, 74, constrain(map(dist(lw.x, lw.y, rw.x, rw.y), 0, width/2, 0, 127), 0, 127)]);

    let scale = [62,64,65,67,69,71,72,74];
    let note = scale[floor(map(avgY, height, 0, 0, scale.length))];
    if (!activeNotes[note]) {
      midiOutput.send([0x90, note, 100]);
      activeNotes[note] = true;
      setTimeout(() => { midiOutput.send([0x80, note, 0]); activeNotes[note] = false; }, 200);
    }
  }


  if (la.confidence > 0.3 && ra.confidence > 0.3) {
    chordNotes.forEach(n => midiOutput.send([0x90, n, 90]));
  } else {
    chordNotes.forEach(n => midiOutput.send([0x80, n, 0]));
  }

  
 
}


// for visual guide + debug



// function drawSkeleton() {
//   let pose = poses[0];
//   stroke(255);
//   strokeWeight(1);
//   for (let [a, b] of connections) {
//     let pa = pose.keypoints[a];
//     let pb = pose.keypoints[b];
//     if (pa.confidence > 0.1 && pb.confidence > 0.1) {
//       line(pa.x, pa.y, pb.x, pb.y);
//     }
//   }

//   for (let k of pose.keypoints) {
//     if (k.confidence > 0.1) {
//       fill(0, 0, 255);
//       noStroke();
//       // circle(k.x, k.y, 14);
//     //  image(star,k.x,k.y,100,100);
    
//        image(gif_loadImg, k.x, k.y,50,50);
//        gif_createImg.position(k.x, k.y,50,50);
//     }
//   }



// }

function drawSkeleton(){
   // Draw the skeleton connections
  for (let i = 0; i < poses.length; i++) {
    let pose = poses[i];
    for (let j = 0; j < connections.length; j++) {
      let pointAIndex = connections[j][0];
      let pointBIndex = connections[j][1];
      console.log(connections)
      let pointA = pose.keypoints[pointAIndex];
      let pointB = pose.keypoints[pointBIndex];
      // Only draw a line if both points are confident enough
      if (pointA.confidence > 0.1 && pointB.confidence > 0.1) {
        stroke(255, 255, 255, 40);
        strokeWeight(1);
        line(pointA.x, pointA.y, pointB.x, pointB.y);
      }
    }
  }

  // Draw all the tracked landmark points
  for (let i = 0; i < poses.length; i++) {
    let pose = poses[i];
    for (let j = 0; j < pose.keypoints.length; j++) {
      let keypoint = pose.keypoints[j];
      console.log(j);
      // Only draw a circle if the keypoint's confidence is bigger than 0.1
      if (keypoint.confidence > 0.1) {

    
     image(gif_loadImg, keypoint.x, keypoint.y,50,50);
    gif_createImg.position(keypoint.x, keypoint.y,50,50);

      }
    }
  }
}


// Callback function for when bodyPose outputs data
function gotPoses(results) {
  // Save the output to the poses variable
  poses = results;
}
