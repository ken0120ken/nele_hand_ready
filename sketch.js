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
  
  // カメラ映像の反転表示
  push();
  translate(width, 0);
  scale(-1, 1);
  image(video, 0, 0, width, height);
  pop();

  noFill();
  strokeWeight(4);
  colorMode(HSB, 255);

  // p5.jsはvideo.widthとvideo.heightにカメラの元の解像度を保持しています
  const videoWidth = video.width;
  const videoHeight = video.height;

  for (let i = 0; i < predictions.length; i++) {
    let hand = predictions[i];
    const keypoints = hand.keypoints;

    const thumbTip = keypoints.find(k => k.name === "thumb_tip");
    const indexTip = keypoints.find(k => k.name === "index_finger_tip");

    if (thumbTip && indexTip) {
      // ▼▼▼【ここが今回の最重要修正点です】▼▼▼
      // AIが検出した指の座標（ビデオ基準）を、画面サイズ基準の座標に変換します
      const thumbX = map(thumbTip.x, 0, videoWidth, 0, width);
      const thumbY = map(thumbTip.y, 0, videoHeight, 0, height);
      const indexX = map(indexTip.x, 0, videoWidth, 0, width);
      const indexY = map(indexTip.y, 0, videoHeight, 0, height);
      // ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲

      // これ以降は、変換後の正しい座標を使って線画や計算を行います
      let d = dist(thumbX, thumbY, indexX, indexY);
      let hue = map(d, 0, width, 0, 255);
      stroke(hue, 255, 255);
      line(thumbX, thumbY, indexX, indexY);

      // 音声の制御
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

// detectHands関数は、前回提案した flipHorizontal: true のままにします
function detectHands(detector) {
  setInterval(async () => {
    if (video.elt.readyState === 4) {
      const hands = await detector.estimateHands(video.elt, { flipHorizontal: true });
      predictions = hands;
    }
  }, 100);
}

function mousePressed() {
  if (typeof getAudioContext === 'function' && getAudioContext().state !== 'running') {
    getAudioContext().resume();
  }
}
