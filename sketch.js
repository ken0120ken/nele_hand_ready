// 改造案：サイバーFMドローン
let video;
let handpose;
let predictions = [];

// FMシンセサイザーのオブジェクト
let fmSynth;

function setup() {
  createCanvas(windowWidth, windowHeight);
  video = createCapture(VIDEO);
  video.size(width, height);
  video.hide();

  handpose = window.handPoseDetection;
  const model = handpose.SupportedModels.MediaPipeHands;
  handpose.createDetector(model, { runtime: "mediapipe", modelType: "lite", maxHands: 2 }).then(detector => {
    detectHands(detector);
  });
  
  // p5.FMOscillator をセットアップ
  // 'sawtooth'（ノコギリ波）や 'square'（矩形波）にすると、より攻撃的な音になります
  fmSynth = new p5.FMOscillator('sine');
  
  // 基本周波数 (Carrier)
  fmSynth.freq(220);
  
  // 変調周波数 (Modulator) - これが音色を複雑にします
  fmSynth.modFreq(110);
  
  // 変調の深さ (Modulation Index) - これが大きいほど音が複雑化・金属的になる
  fmSynth.modAmp(50);
  
  fmSynth.amp(0); // 最初は音量を0に
  fmSynth.start();
}

function draw() {
  background(0);
  // カッコよくするためにカメラ映像にエフェクトをかける
  push();
  translate(width, 0);
  scale(-1, 1);
  filter(GRAY); // モノクロームに
  tint(0, 255, 150, 150); // サイバーグリーンで薄く着色
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

  // 右手: 音量と基本周波数
  if (rightHand) {
    const thumbTip = rightHand.keypoints[4];
    const indexTip = rightHand.keypoints[8];
    const wrist = rightHand.keypoints[0];

    const d = dist(thumbTip.x, thumbTip.y, indexTip.x, indexTip.y);
    const vol = map(d, 20, videoWidth / 4, 0.4, 0, true);
    fmSynth.amp(vol, 0.1); // つまむ距離で音量

    const carrierFreq = map(wrist.y, 0, videoHeight, 600, 50);
    fmSynth.freq(carrierFreq, 0.1); // 上下で基本周波数

    // 右手の位置を円で表示
    const wristX = map(wrist.x, 0, videoWidth, 0, width);
    const wristY = map(wrist.y, 0, videoHeight, 0, height);
    noFill();
    stroke(0, 255, 150, 200);
    strokeWeight(vol * 20);
    ellipse(wristX, wristY, 50);
  } else {
    fmSynth.amp(0, 0.5); // 手が離れたら音量を0に
  }

  // 左手: FM変調のコントロール（音色の複雑さ）
  if (leftHand) {
    const wrist = leftHand.keypoints[0];

    // 上下で変調周波数をコントロール
    const modFreq = map(wrist.y, 0, videoHeight, 400, 10);
    fmSynth.modFreq(modFreq, 0.1);

    // 左右で変調の深さをコントロール
    const modAmp = map(wrist.x, 0, videoWidth, 500, 10);
    fmSynth.modAmp(modAmp, 0.1);
    
    // 左手の位置を円で表示
    const wristX = map(wrist.x, 0, videoWidth, 0, width);
    const wristY = map(wrist.y, 0, videoHeight, 0, height);
    noFill();
    stroke(200, 100, 255, 200);
    strokeWeight(4);
    ellipse(wristX, wristY, 50);
  }
}

function detectHands(detector) {
  const detect = async () => {
    if (video.elt.readyState === 4 && video.elt.videoWidth > 0) {
      predictions = await detector.estimateHands(video.elt, { flipHorizontal: true });
    }
    requestAnimationFrame(detect);
  };
  detect();
}

function mousePressed() {
  if (getAudioContext().state !== 'running') {
    getAudioContext().resume();
  }
}
