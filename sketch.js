

function setup() {
  createCanvas(400, 400);

// web midi stuff keep in setup 
  WebMidi.enable(function(err) { //check if WebMidi.js is enabled
  if (err) {
    console.log("WebMidi could not be enabled.", err);
  } else {
    console.log("WebMidi enabled!");
  }
});
}

function draw() {
  background(220);
}
