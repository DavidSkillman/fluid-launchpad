const midiListInput = document.getElementById('midi-list-input');
const midiListOutput = document.getElementById('midi-list-output');
const startButton = document.getElementById('start');

const canvas = document.getElementsByTagName("canvas")[0];

let img = new Image();
let firstTimestamp = 0;
let time = 0;
function updateCanvas(t, output) {
  if (firstTimestamp == 0) firstTimestamp = t;
  time = t - firstTimestamp;
  img.src = canvas.toDataURL();
  requestAnimationFrame(t => updateCanvas(t, output));
}

function init(input, output) {
  const launchpad = new Launchpad(input, output);
  launchpad.setBPM(120);
  launchpad.startClock();
  var lastX = -1;
  var lastY = -1;
  launchpad.onMidiMessage = msg => {
    var {x, y} = Launchpad.mapDefaultToXY(msg.index, false);
    x = x / 8;
    y = y / 8;
    if (lastX + lastY < 0) { lastX = x; lastY = y; }
    if (msg.velocity > 0) {
      var c = HSVtoRGB(Math.abs(Math.sin(time / 10000)), 1.0, 1.0);
      c.r *= 1.5;
      c.g *= 1.5;
      c.b *= 1.5;
      var dx = 1000 * (x - lastX);
      var dy = 1000 * (y - lastY);
      splat(x, y, dx, dy, c);
    }
    lastX = x;
    lastY = y;
  };

  img.onload = () => {
    let c = document.createElement("canvas");
    let ctx = c.getContext("2d");
    c.width = img.width;
    c.height = img.height;
    ctx.drawImage(img, 0, 0);
    let imageData = 
      ctx.getImageData(0,0,c.width,c.height);
    const color = new colorspec();
    const threshold = 16;
    for (let i = 0; i < imageData.data.byteLength; i += 4) {
      const a = imageData.data.at(i+4);
      const r = Math.max(0, imageData.data.at(i) - threshold);
      const g = Math.max(0, imageData.data.at(i+1) - threshold);
      const b = Math.max(0, imageData.data.at(i+2) - threshold);
      const index = i >> 2;
      const row = index % 9 + 1;
      const column = Math.floor(10 - index / 9) * 10;
      color.RGB(row + column, r >> 1, g >> 1, b >> 1);
    }
    launchpad.send(color.message());
  };
  updateCanvas(0, output);
}

function onMIDISuccess(midi) {
  const inputs = {};
  const outputs = {};
  for (let input of midi.inputs.values()) {
    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = 'in';
    radio.id = input.id;
    radio.value = input.id;
    midiListInput.append(radio);

    const label = document.createElement('label');
    label.textContent = input.manufacturer + ' ' + input.name;
    label.setAttribute('for', input.id);
    midiListInput.append(radio, label);

    inputs[input.id] = input;
  }
  for (let output of midi.outputs.values()) {
    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = 'out';
    radio.id = output.id;
    radio.value = output.id;
    midiListOutput.append(radio);

    const label = document.createElement('label');
    label.textContent = output.manufacturer + ' ' + output.name;
    label.setAttribute('for', output.id);
    midiListOutput.append(radio, label);

    outputs[output.id] = output;
  }
  startButton.addEventListener('click', () => init(inputs[new FormData(midiListInput).get("in")], outputs[new FormData(midiListOutput).get("out")]));
}

navigator.requestMIDIAccess({ sysex: true })
  .then(onMIDISuccess, console.error);