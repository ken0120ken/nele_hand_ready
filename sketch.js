let video;
let faceDetector;
let predictions = [];

let osc;          // 音を出すオシレーター
let lowPassFilter;  // 音質を変化させるフィルター

function setup() {
  createCanvas(windowWidth, windowHeight);
  video = createCapture(VIDEO);
  video.size(width, height);
  video.hide();

  const model = faceLandmarksDetection.SupportedModels.MediaPipeFaceMesh;
  const detectorConfig = {
    runtime: 'mediapipe',
    solutionPath: 'https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh',
    maxFaces: 1
  };
  faceLandmarksDetection.createDetector(model, detectorConfig).then(detector => {
    faceDetector = detector;
    detectFaces();
  });

  // --- ★★★ サウンドのセットアップを変更 ★★★ ---
  osc = new p5.Oscillator('sawtooth'); // 少しザラついた音に変更
  lowPassFilter = new p5.LowPass();   // ローパスフィルターを追加

  // 音の流れ: オシレーター → フィルター → スピーカー
  osc.disconnect();
  osc.connect(lowPassFilter);

  osc.start();
  osc.freq(220); // 音の高さは固定
  osc.amp(0);    // 最初は音量0
}

function draw() {
  background(0);
  
  push();
  translate(width, 0);
  scale(-1, 1);
  image(video, 0, 0, width, height);
  pop();
  
  if (predictions.length > 0) {
    const keypoints = predictions[0].keypoints;
    const noseTip = keypoints[1]; // 鼻先のポイントを基準にする

    // --- ★★★ 音のコントロールを変更 ★★★ ---
    // 1. 顔の上下の位置で音量をコントロール
    //    y座標は下に行くほど値が大きくなるので、mapの範囲を逆にします
    const vol = map(noseTip.y, 0, video.elt.videoHeight, 0.5, 0, true);
    osc.amp(vol, 0.1);

    // 2. 顔の左右の位置で音質（フィルターの周波数）をコントロール
    const filterFreq = map(noseTip.x, 0, video.elt.videoWidth, 100, 2200, true);
    lowPassFilter.freq(filterFreq);

    // --- ビジュアルの描画 ---
    noFill();
    
    // 左右の位置（音質）で色を変化
    const hue = map(noseTip.x, 0, video.elt.videoWidth, 240, 0); // 紫から赤へ
    colorMode(HSB);
    stroke(hue, 255, 255);
    
    // 上下の位置（音量）で線の太さを変化
    const sw = map(noseTip.y, 0, video.elt.videoHeight, 5, 0.5, true);
    strokeWeight(sw);
    
    beginShape();
    for (let point of keypoints) {
      const x = map(point.x, 0, video.elt.videoWidth, 0, width);
      const y = map(point.y, 0, video.elt.videoHeight, 0, height);
      vertex(x, y);
    }
    endShape();
  } else {
    osc.amp(0, 0.2);
  }
}

function detectFaces() {
  setInterval(async () => {
    if (faceDetector && video.elt.readyState === 4) {
      const faces = await faceDetector.estimateFaces(video.elt, { flipHorizontal: true });
      predictions = faces;
    }
  }, 100);
}

function mousePressed() {
  if (getAudioContext().state !== 'running') {
    getAudioContext().resume();
  }
}
