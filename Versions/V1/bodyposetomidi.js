let video;
let starvideo;
let star;
let bodyPose;
let midiOutput;
let chordNotes = [60, 64, 67]; // c major
let activeNotes = {};
let connections; 
let crowdVideo;



var gif_loadImg, gif_createImg;


function preload() {
  bodyPose = ml5.bodyPose('MoveNet');
    // video = createVideo("video/crowdVideo.mp4")
    // star = createVideo("video/star.gif")

    gif_loadImg = loadImage("video/star.gif");
    gif_createImg = createImg("video/star.gif");
}

function setup() {
  createCanvas(windowWidth, windowHeight);


  // starvideo.play();
  // starvideo.loop();
  // starvideo.hide();

  // star.autoplay();
  // star.loop();
  // star.hide();
  // starvideo.size(100,100);

  video = createCapture(VIDEO);
  video.hide();

  gif_createImg.hide();

  imageMode(CENTER);

  // // testing for old crowd video
  // video.size(width, height);
  // video.loop();
  // video.hide();

  bodyPose.ready.then(() => {
    bodyPose.detectStart(video, (results) => poses = results);
    connections = bodyPose.getSkeleton();
  });

  if (navigator.requestMIDIAccess) {
    navigator.requestMIDIAccess().then(midi => midiOutput = Array.from(midi.outputs.values())[0]);
  }
}

let poses = [];

function draw() {
  background(0);
  // image(video, 0, 0, width, height);

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

function drawSkeleton() {
  let pose = poses[0];
  stroke(255,0,0);
  strokeWeight(5);
  for (let [a, b] of connections) {
    let pa = pose.keypoints[a];
    let pb = pose.keypoints[b];
    if (pa.confidence > 0.1 && pb.confidence > 0.1) {
      // line(pa.x, pa.y, pb.x, pb.y);
    }
  }

  for (let k of pose.keypoints) {
    if (k.confidence > 0.1) {
      fill(0, 0, 255);
      noStroke();
      // circle(k.x, k.y, 14);
    //  image(star,k.x,k.y,100,100);
       image(gif_loadImg, k.x, k.y,100,100);
       gif_createImg.position(k.x, k.y,100,100);
    }
  }
}
