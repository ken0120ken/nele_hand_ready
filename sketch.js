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

  // カメラ映像を左右反転させる処理の開始
  push();
  translate(width, 0);
  scale(-1, 1);
  image(video, 0, 0, width, height);

  // ▼▼▼【ここから】線の描画や手の処理を、反転ブロックの中に移動しました ▼▼▼
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
      // 2つの指先を線で結ぶ
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
  // ▲▲▲【ここまで】が移動した部分です ▲▲▲

  // カメラ映像を左右反転させる処理の終了
  pop();
}

function detectHands(detector) {
  setInterval(async () => {
    if (video.elt.readyState === 4) {
      // 検出は元の反転していない映像に対して行う
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
