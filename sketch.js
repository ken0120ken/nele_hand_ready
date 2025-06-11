// 最終修正版：サイバー・ディレイ（solutionPathを修正）
let video;
let handpose;
let predictions = [];

let osc;
let lowPassFilter;
let delay;

function setup() {
  createCanvas(windowWidth, windowHeight);
  video = createCapture(VIDEO);
  video.size(width, height);
  video.hide();

  handpose = window.handPoseDetection;
  const model = handpose.SupportedModels.MediaPipeHands;
  
  // ここに solutionPath を追加しました
  handpose.createDetector(model, {
    runtime: "mediapipe",
    modelType: "lite",
    maxHands: 2,
    solutionPath: "https://cdn.jsdelivr.net/npm/@mediapipe/hands"
  }).then(detector => {
    detectHands(detector);
  });
  
  osc = new p5.Oscillator('sawtooth');
  
  lowPassFilter = new p5.LowPass();
  delay = new p5.Delay();

  osc.disconnect();
  osc.connect(lowPassFilter);
  delay.process(lowPassFilter, 0.5, 0.5, 2300);

  osc.start();
  osc.amp(0);
}

function draw() {
  background(0);
  push();
  translate(width, 0);
  scale(-1, 1);
  filter(INVERT);
  image(video, 0, 0, width, height);
  pop();

  const videoWidth = video.elt.videoWidth;
  const videoHeight = video.elt.videoHeight;

  let rightHand, leftHand;
  
  if (predictions.length > 0) {
    for (const hand of predictions) {
      hand.handedness === 'Right' ? rightHand = hand : leftHand = hand;
    }
  }

  if (rightHand) {
    const thumbTip = rightHand.keypoints[4];
    const indexTip = rightHand.keypoints[8];
    const wrist = rightHand.keypoints[0];

    const d = dist(thumbTip.x, thumbTip.y, indexTip.x, indexTip.y);
    const vol = map(d, 20, videoWidth / 4, 0.3, 0, true);
    osc.amp(vol, 0.1);

    const freq = map(wrist.y, 0, videoHeight, 800, 100);
    osc.freq(freq, 0.1);
    
    const feedback = map(wrist.x, 0, videoWidth, 0, 0.8);
    delay.feedback(feedback);

    const wristX = map(wrist.x, 0, videoWidth, 0, width);
    const wristY = map(wrist.y, 0, videoHeight, 0, height);
    noFill();
    stroke(255, 100, 0, 200);
    strokeWeight(vol * 20);
    ellipse(wristX, wristY, 50);
  } else {
    osc.amp(0, 0.5);
  }

  if (leftHand) {
    const wrist = leftHand.keypoints[0];

    const filterFreq = map(wrist.y, 0, videoHeight, 2000, 100);
    lowPassFilter.freq(filterFreq);

    const delayTime = map(wrist.x, 0, videoWidth, 0, 1.0);
    delay.delayTime(delayTime);
    
    const wristX = map(wrist.x, 0, videoWidth, 0, width);
    const wristY = map(wrist.y, 0, videoHeight, 0, height);
    noFill();
    stroke(0, 150, 255, 200);
    strokeWeight(4);
    ellipse(wristX, wristY, 50);
  }
}

function detectHands(detector) {
  setInterval(async () => {
    if (video.elt.readyState === 4 && video.elt.videoWidth > 0) {
      const hands = await detector.estimateHands(video.elt, { flipHorizontal: false });
      predictions = hands;
    }
  }, 100);
}

function mousePressed() {
  if (getAudioContext().state !== 'running') {
    getAudioContext().resume();
  }
}
