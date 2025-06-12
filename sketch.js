let video;
let faceDetector;
let predictions = [];

let osc;
let lowPassFilter;
let distortion;

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

  osc = new p5.Oscillator('sawtooth');
  lowPassFilter = new p5.LowPass();
  distortion = new p5.Distortion();

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

    // --- ★★★ 新しい音のコントロールロジック ★★★ ---

    // 1. 口の開き具合で、音量と歪みをコントロール
    const upperLip = keypoints[13];
    const lowerLip = keypoints[14];
    const mouthOpening = dist(upperLip.x, upperLip.y, lowerLip.x, lowerLip.y);
    const vol = map(mouthOpening, 5, 30, 0, 0.4, true);
    osc.amp(vol, 0.1);
    const distortionAmount = map(mouthOpening, 10, 35, 0, 0.9, true);
    distortion.set(distortionAmount, '4x');

    // 2. 顔の上下の位置で、音の高さを直接コントロール
    const freq = map(noseTip.y, video.elt.videoHeight, 0, 80, 1200, true);
    osc.freq(freq, 0.05);

    // 3. 顔の左右の位置で、フィルターの周波数とレゾナンス（癖の強さ）をコントロール
    const filterFreq = map(noseTip.x, 0, video.elt.videoWidth, 200, 5000, true);
    lowPassFilter.freq(filterFreq);
    const filterRes = map(noseTip.x, 0, video.elt.videoWidth, 20, 1, true); // 左右の端でレゾナンスが高まる
    lowPassFilter.res(filterRes);


    // --- ビジュアルの描画 ---
    noFill();
    const hue = map(noseTip.x, 0, video.elt.videoWidth, 240, 0);
    const saturation = map(distortionAmount, 0, 0.9, 0, 255);
    const brightness = map(vol, 0, 0.4, 100, 255);
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
