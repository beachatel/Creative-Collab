function setup(){
WebMidi.enable(function(err) { //check if WebMidi.js is enabled
  if (err) {
    console.log("WebMidi could not be enabled.", err);
  } else {
    console.log("WebMidi enabled!");
  }
});

//name our visible MIDI input and output ports
console.log("---");
console.log("Inputs Ports: ");
for (i = 0; i < WebMidi.inputs.length; i++) {
  console.log(i + ": " + WebMidi.inputs[i].name);
}

console.log("---");
console.log("Output Ports: ");
for (i = 0; i < WebMidi.outputs.length; i++) {
  console.log(i + ": " + WebMidi.outputs[i].name);
}
}

function draw(){

}