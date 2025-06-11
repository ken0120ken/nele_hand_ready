// 新改造案：パンク・ノイズ・マシン
let video;
let handpose;
let predictions = [];

let noise;        // ノイズ音源
let bandPass;     // 特定の周波数帯を強調するフィルター
let distortion;   // 音を歪ませるディストーション

function setup() {
  createCanvas(windowWidth, windowHeight);
  video = createCapture(VIDEO);
  video.size(width, height);
  video.hide();

  noSmooth(); // ★描画をギザギザにするパンクな設定

  handpose = window.handPoseDetection;
  const model = handpose.SupportedModels.MediaPipeHands;
  handpose.createDetector(model, {
    runtime: "medipe",
    modelType: "lite",
    maxHands: 1, // ★片手しか使わないので1に設定
    solutionPath: "https://cdn.jsdelivr.net/npm/@mediapipe/hands"
  }).then(detector => {
    detectHands(detector);
  });
  
  // --- オーディオのセットアップ ---
  noise = new p5.Noise('white');
  bandPass = new p5.BandPass();
  distortion = new p5.Distortion();

  // 音の流れ: ノイズ → フィルター → ディストーション → スピーカー
  noise.disconnect();
  noise.connect(bandPass);
  bandPass.disconnect();
  bandPass.connect(distortion);

  noise.start();
  noise.amp(0); // 最初は音量0
}

function draw() {
  let distortionAmount = 0; // このフレームの歪み量を保持する変数

  if (predictions.length > 0) {
    const hand = predictions[0];
    const wrist = hand.keypoints[0];
    const thumbTip = hand.keypoints[4];
    const indexTip = hand.keypoints[8];

    // --- 操作性のマッピング ---
    // 左右の位置で音量 (0 ~ 0.3)
    const vol = map(wrist.x, 0, video.elt.videoWidth, 0.3, 0, true);
    noise.amp(vol, 0.05);

    // 上下の位置でフィルター周波数 (100Hz ~ 1500Hz)
    const filterFreq = map(wrist.y, 0, video.elt.videoHeight, 1500, 100);
    bandPass.freq(filterFreq);

    // つまむ距離でディストーション量 (0.0 ~ 0.9)
    const d = dist(thumbTip.x, thumbTip.y, indexTip.x, indexTip.y);
    distortionAmount = map(d, 20, video.elt.videoWidth / 3, 0.9, 0.0, true);
    distortion.set(distortionAmount, '4x'); // '4x'は歪みの種類
  } else {
    noise.amp(0, 0.2); // 手がなければ音を消す
  }

  // --- ビジュアルの描画 ---
  // 歪みが最大に近いなら背景を白く点滅させる
  if (distortionAmount > 0.85) {
    background(255);
  } else {
    background(0);
  }
  
  // 手が検出されている時だけ線を描画
  if (predictions.length > 0) {
    const hand = predictions[0];
    const thumbTip = hand.keypoints[4];
    const indexTip = hand.keypoints[8];
    
    const videoWidth = video.elt.videoWidth;
    const videoHeight = video.elt.videoHeight;
    
    const thumbX = map(thumbTip.x, 0, videoWidth, 0, width);
    const thumbY = map(thumbTip.y, 0, videoHeight, 0, height);
    const indexX = map(indexTip.x, 0, videoWidth, 0, width);
    const indexY = map(indexTip.y, 0, videoHeight, 0, height);
    
    // グリッチ・ラインの描画
    strokeWeight(10);
    stroke(255, 0, 150); // ショッキングピンク
    
    // 毎回少しランダムにずらして線が震えるように見せる
    const offsetX = random(-5, 5);
    const offsetY = random(-5, 5);
    line(thumbX + offsetX, thumbY + offsetY, indexX + offsetX, indexY + offsetY);
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
