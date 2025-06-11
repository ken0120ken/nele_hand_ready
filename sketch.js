// 新改造案：ネビュラ・ハンド (Nebula Hand)
let video;
let handpose;
let predictions = [];
let particles = [];

let drone; // 背景音（ドローン）
let baseHue = 180; // 基本の色相（青）

function setup() {
  createCanvas(windowWidth, windowHeight);
  video = createCapture(VIDEO);
  video.size(width, height);
  video.hide();

  // ★描画モードをADD（加算）に。色が混ざるところが光るようになります。
  blendMode(ADD);

  handpose = window.handPoseDetection;
  const model = handpose.SupportedModels.MediaPipeHands;
  handpose.createDetector(model, {
    runtime: "mediapipe",
    modelType: "full", // 全ての関節ポイントを使うため'full'に変更
    maxHands: 1,
    solutionPath: "https://cdn.jsdelivr.net/npm/@mediapipe/hands"
  }).then(detector => {
    detectHands(detector);
  });
  
  // --- サウンドのセットアップ ---
  drone = new p5.Oscillator('sine');
  drone.freq(100); // 低い周波数
  drone.amp(0); // 最初は音量0
  drone.start();
}

function draw() {
  background(0); // 背景は黒

  // 手が検出されていれば、各関節からパーティクルを生成
  if (predictions.length > 0) {
    const keypoints = predictions[0].keypoints;
    for (let point of keypoints) {
      // 3フレームに1回くらいの頻度でパーティクルを追加
      if (frameCount % 3 === 0) {
        let p = new Particle(point.x, point.y);
        particles.push(p);
      }
    }
    
    // 手の位置と形で音をコントロール
    const wrist = keypoints[0];
    const thumbTip = keypoints[4];
    const indexTip = keypoints[8];

    // 手の高さで音の高さを少し変える
    const droneFreq = map(wrist.y, 0, video.elt.videoHeight, 150, 80);
    drone.freq(droneFreq, 0.2);

    // つまむ距離で色相を変える
    const d = dist(thumbTip.x, thumbTip.y, indexTip.x, indexTip.y);
    if (d < 50) {
      baseHue = (baseHue + 0.5) % 360; // 色相がゆっくり回転する
    }
  }

  // パーティクルの更新と描画
  for (let i = particles.length - 1; i >= 0; i--) {
    particles[i].update();
    particles[i].show();
    if (particles[i].isFinished()) {
      particles.splice(i, 1);
    }
  }
}

// パーティクルクラス
class Particle {
  constructor(x, y) {
    this.videoWidth = video.elt.videoWidth;
    this.videoHeight = video.elt.videoHeight;
    
    // 座標をビデオ基準から画面基準に変換
    this.x = map(x, 0, this.videoWidth, 0, width);
    this.y = map(y, 0, this.videoHeight, 0, height);
    
    this.vx = random(-0.5, 0.5);
    this.vy = random(-0.5, 0.5);
    this.alpha = 150; // 透明度
  }

  isFinished() {
    return this.alpha < 0;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.alpha -= 2;
  }

  show() {
    noStroke();
    colorMode(HSB, 360, 255, 255, 255);
    // baseHueを基準に、少しだけ色を揺らがせる
    const hue = baseHue + random(-20, 20);
    fill(hue % 360, 200, 255, this.alpha);
    ellipse(this.x, this.y, 12);
  }
}


function detectHands(detector) {
  setInterval(async () => {
    if (video.elt.readyState === 4 && video.elt.videoWidth > 0) {
      const hands = await detector.estimateHands(video.elt, { flipHorizontal: true });
      predictions = hands;
    }
  }, 30); // 検出の頻度を少し上げる
}

function mousePressed() {
  if (getAudioContext().state !== 'running') {
    getAudioContext().resume();
    drone.amp(0
