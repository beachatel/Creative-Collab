function setup(){
WebMidi.enable(function(err) { 
  if (err) {
    console.log("WebMidi could not be enabled.", err); // catch error for web midi fail
  } else {
    console.log("WebMidi enabled!");
  }
});

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