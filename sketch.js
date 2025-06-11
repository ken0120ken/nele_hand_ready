let video;
let handpose;
let predictions = [];
let osc;
let reverb;

function setup() {
  createCanvas(windowWidth, windowHeight);
  video = createCapture(VIDEO);
  video.size(width, height);
  video.hide();

  handpose = window.handPoseDetection;
  const model = handpose.SupportedModels.MediaPipeHands;
  handpose.createDetector(model, {
    runtime: "mediapipe",
    modelType: "lite",
    maxHands: 2,
    solutionPath: "https://cdn.jsdelivr.net/npm/@mediapipe/hands",
  }).then(detector => {
    detectHands(detector);
  });

  osc = new p5.Oscillator('sawtooth');
  osc.start();
  osc.amp(0.5);

  reverb = new p5.Reverb();
  reverb.process(osc, 3, 2);
}

function draw() {
  background(0);
  tint(255);
  image(video, 0, 0, width, height);

  noFill();
  strokeWeight(4);

  for (let i = 0; i < predictions.length; i++) {
    let hand = predictions[i];
    const keypoints = hand.keypoints;

    const thumbTip = keypoints.find(k => k.name === "thumb_tip");
    const indexTip = keypoints.find(k => k.name === "index_finger_tip");

    if (thumbTip && indexTip) {
      let d = dist(thumbTip.x, thumbTip.y, indexTip.x, indexTip.y);
      let hue = map(d, 0, width, 0, 255);
      stroke(hue, 255, 255);
      line(thumbTip.x, thumbTip.y, indexTip.x, indexTip.y);

      if (i === 0) {
        let vol = map(d, 0, width / 2, 0, 1, true);
        osc.amp(vol, 0.1);
      } else {
        let freq = map(d, 0, width / 2, 200, 1000);
        osc.freq(freq, 0.1);
      }
    }
  }
}

function detectHands(detector) {
  setInterval(async () => {
    const hands = await detector.estimateHands(video.elt, { flipHorizontal: true });
    predictions = hands;
  }, 100);
}

function mousePressed() {
  getAudioContext().resume();
}
