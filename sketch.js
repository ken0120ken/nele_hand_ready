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

// ▼▼▼【draw関数を元に戻しました】▼▼▼
// 線の描画処理を push/pop の外に出します。
function draw() {
  background(0);
  tint(255);
  
  // カメラ映像の反転表示
  push();
  translate(width, 0);
  scale(-1, 1);
  image(video, 0, 0, width, height);
  pop();

  // 描画処理は push/pop の外（通常の座標系）で行う
  noFill();
  strokeWeight(4);
  colorMode(HSB, 255);

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

// ▼▼▼【detectHands関数を変更しました】▼▼▼
// AIモデルに座標を左右反転させるように指示します。
function detectHands(detector) {
  setInterval(async () => {
    if (video.elt.readyState === 4) {
      // flipHorizontal を `true` に変更
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
