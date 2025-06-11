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

// ▼▼▼【draw関数を修正】▼▼▼
// 座標の補正と描画をすべて反転ブロック内で行います
function draw() {
  background(0);
  tint(255);
  
  // 映像の反転表示と、座標系の反転を開始
  push();
  translate(width, 0);
  scale(-1, 1);
  
  // 反転した空間に映像を描画（画面サイズに引き伸ばされる）
  image(video, 0, 0, width, height);

  const videoWidth = video.width;
  const videoHeight = video.height;

  // 同じ反転空間内で、線の描画も行う
  noFill();
  strokeWeight(4);
  colorMode(HSB, 255);

  for (let i = 0; i < predictions.length; i++) {
    let hand = predictions[i];
    const keypoints = hand.keypoints;

    const thumbTip = keypoints.find(k => k.name === "thumb_tip");
    const indexTip = keypoints.find(k => k.name === "index_finger_tip");

    if (thumbTip && indexTip) {
      // 座標をビデオ基準から画面基準に変換
      const thumbX = map(thumbTip.x, 0, videoWidth, 0, width);
      const thumbY = map(thumbTip.y, 0, videoHeight, 0, height);
      const indexX = map(indexTip.x, 0, videoWidth, 0, width);
      const indexY = map(indexTip.y, 0, videoHeight, 0, height);
      
      // 変換後の座標を、反転した空間内に描画
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

  // 反転処理を終了
  pop();
}

// ▼▼▼【detectHands関数を修正】▼▼▼
// AIには座標を反転させず、元のデータをそのままもらいます
function detectHands(detector) {
  setInterval(async () => {
    if (video.elt.readyState === 4) {
      // flipHorizontal を `false` に戻します
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
