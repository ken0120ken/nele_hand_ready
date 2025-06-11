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
  osc.amp(0);

  reverb = new p5.Reverb();
  reverb.process(osc, 3, 2);
}

function draw() {
  background(0);
  tint(255);

  push();
  translate(width, 0);
  scale(-1, 1);
  image(video, 0, 0, width, height);
  pop();

  const videoWidth = video.width;
  const videoHeight = video.height;

  // ▼▼▼【ここからがデバッグコードです】▼▼▼
  // 1秒に1回、コンソールに内部の数値を出力します
  if (frameCount > 1 && frameCount % 60 === 1) {
    console.log("--- 内部情報 ---");
    console.log("画面の幅/高さ:", width, height);
    console.log("映像の幅/高さ:", videoWidth, videoHeight);
    
    if (predictions.length > 0) {
      const firstHand = predictions[0];
      const thumbTip = firstHand.keypoints.find(k => k.name === "thumb_tip");
      if (thumbTip) {
        console.log("親指のX座標（変換前）:", thumbTip.x);
        const mappedX = map(thumbTip.x, 0, videoWidth, 0, width);
        console.log("親指のX座標（変換後）:", mappedX);
      }
    }
    console.log("--------------------");
  }
  // ▲▲▲【デバッグコードここまで】▲▲▲

  noFill();
  strokeWeight(4);
  colorMode(HSB, 255);

  for (let i = 0; i < predictions.length; i++) {
    let hand = predictions[i];
    const keypoints = hand.keypoints;
    const thumbTip = keypoints.find(k => k.name === "thumb_tip");
    const indexTip = keypoints.find(k => k.name === "index_finger_tip");

    if (thumbTip && indexTip) {
      const thumbX = map(thumbTip.x, 0, videoWidth, 0, width);
      const thumbY = map(thumbTip.y, 0, videoHeight, 0, height);
      const indexX = map(indexTip.x, 0, videoWidth, 0, width);
      const indexY = map(indexTip.y, 0, videoHeight, 0, height);
      
      let d = dist(thumbX, thumbY, indexX, indexY);
      let hue = map(d, 0, width, 0, 255);
      stroke(hue, 255, 255);
      line(thumbX, thumbY, indexX, indexY);

      if (i === 0) {
        let vol = map(d, 20, width / 2, 0, 0.5, true);
        osc.amp(vol, 0.1);
      } else {
        let freq = map(d, 20, width / 2, 200, 1000, true);
        osc.freq(freq, 0.1);
      }
    }
  }
}

function detectHands(detector) {
  setInterval(async () => {
    if (video.elt.readyState === 4) {
      const hands = await detector.estimateHands(video.elt, { flipHorizontal: false });
      predictions = hands;
    }
  }, 100);
}

function mousePressed() {
  if (typeof getAudioContext === 'function' && getAudioContext().state !== 'running') {
    getAudioContext().resume();
  }
}
