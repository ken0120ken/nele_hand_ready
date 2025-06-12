let video;
let faceDetector;
let predictions = [];

let osc;
let lowPassFilter;
let distortion; // ★★★ 歪みエフェクトを追加 ★★★

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

  // --- サウンドのセットアップ ---
  osc = new p5.Oscillator('sawtooth');
  lowPassFilter = new p5.LowPass();
  distortion = new p5.Distortion();

  // 音の流れ: オシレーター → フィルター → ディストーション → スピーカー
  osc.disconnect();
  osc.connect(lowPassFilter);
  lowPassFilter.disconnect();
  lowPassFilter.connect(distortion);

  osc.start();
  osc.amp(0);
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
    const noseTip = keypoints[1];

    // --- ★★★ 新しい音のコントロール ★★★ ---
    // 1. 口の開き具合を取得
    const upperLip = keypoints[13];
    const lowerLip = keypoints[14];
    const mouthOpening = dist(upperLip.x, upperLip.y, lowerLip.x, lowerLip.y);

    // 2. 口の開き具合で全体の音量をコントロール
    const vol = map(mouthOpening, 5, 30, 0, 0.4, true);
    osc.amp(vol, 0.1);

    // 3. 顔の上下の位置で基本の周波数をコントロール
    const baseFreq = map(noseTip.y, 0, video.elt.videoHeight, 400, 100, true);

    // 4. 口の開き具合で周波数をさらに高くする（叫び声の効果）
    const shoutPitch = map(mouthOpening, 5, 30, 0, 400, true);
    osc.freq(baseFreq + shoutPitch, 0.05);

    // 5. 顔の左右の位置でフィルター（音のこもり具合）をコントロール
    const filterFreq = map(noseTip.x, 0, video.elt.videoWidth, 200, 2500, true);
    
    // 6. 口の開き具合でフィルターをさらに開く（叫び声の効果）
    const shoutFilter = map(mouthOpening, 5, 30, 0, 4000, true);
    lowPassFilter.freq(filterFreq + shoutFilter);

    // 7. 口の開き具合で歪みの量をコントロール
    const distortionAmount = map(mouthOpening, 10, 35, 0, 0.9, true);
    distortion.set(distortionAmount, '2x');

    // --- ビジュアルの描画 ---
    // 顔の輪郭を、音の状態に合わせて描画
    noFill();
    const hue = map(noseTip.x, 0, video.elt.videoWidth, 240, 0);
    const saturation = map(distortionAmount, 0, 0.9, 0, 255); // 歪むほど色が鮮やかに
    const brightness = map(vol, 0, 0.4, 100, 255); // 音量が大きいほど明るく
    colorMode(HSB);
    stroke(hue, saturation, brightness);
    strokeWeight(2);
    
    beginShape();
    for (let point of keypoints) {
      const x = map(point.x, 0, video.elt.videoWidth, 0, width);
      const y = map(point.y, 0, video.elt.videoHeight, 0, height);
      vertex(x, y);
    }
    endShape(CLOSE);

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
