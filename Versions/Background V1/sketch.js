let bgimage;
let xArray = [];
let yArray = [];
function preload() {
  bgimage = loadImage("video/star.gif");
}
function setup() {
  createCanvas(1400, 900);
  for (let i = 0; i < 20; i++) {
    xArray[i] = random(0, 1400);
    yArray[i] = random(0, 900);
  }
}


function draw() {
  background(0);


  for (let i = 0; i < xArray.length; i += 1) {
    image(bgimage, xArray[i], yArray[i], 100, 100);
  }
}
