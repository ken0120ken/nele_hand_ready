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

  // hand-pose-detectionライブラリのグローバルオブジェクトを取得
  handpose = window.handPoseDetection;
  const model = handpose.SupportedModels.MediaPipeHands;

  // 検出器を作成
  handpose.createDetector(model, {
    runtime: "mediapipe",
    modelType: "lite",
    maxHands: 2,
    solutionPath: "https://cdn.jsdelivr.net/npm/@mediapipe/hands",
  }).then(detector => {
    // 検出器の準備ができたら、手の検出を開始
    detectHands(detector);
  });

  // 音声（オシレーター）の準備
  osc = new p5.Oscillator('sawtooth');
  osc.start();
  osc.amp(0); // 最初は音量を0にしておく

  // リバーブ（残響）エフェクトの準備
  reverb = new p5.Reverb();
  reverb.process(osc, 3, 2);
}

function draw() {
  background(0);
  tint(255);
  // カメラ映像を左右反転して表示
  push();
  translate(width, 0);
  scale(-1, 1);
  image(video, 0, 0, width, height);
  pop();


  noFill();
  strokeWeight(4);
  colorMode(HSB, 255);

  // 検出された手の数だけループ
  for (let i = 0; i < predictions.length; i++) {
    let hand = predictions[i];
    const keypoints = hand.keypoints;

    // 親指の先端と人差し指の先端のキーポイントを取得
    const thumbTip = keypoints.find(k => k.name === "thumb_tip");
    const indexTip = keypoints.find(k => k.name === "index_finger_tip");

    // 両方の指先が検出された場合
    if (thumbTip && indexTip) {
      // 2つの指先の間の距離を計算
      let d = dist(thumbTip.x, thumbTip.y, indexTip.x, indexTip.y);
      // 距離に応じて色相（Hue）を変更
      let hue = map(d, 0, width, 0, 255);
      stroke(hue, 255, 255);
      // 2つの指先を線で結ぶ
      line(thumbTip.x, thumbTip.y, indexTip.x, indexTip.y);

      // 1つ目の手（i === 0）で音量を制御
      if (i === 0) {
        // 距離に応じて音量を0から1の範囲でマッピング
        // trueを指定することで、範囲外の値にならないようにする
        let vol = map(d, 20, width / 2, 0, 0.5, true);
        osc.amp(vol, 0.1); // 0.1秒かけて音量を変更
      }
      // 2つ目の手で周波数を制御
      else {
        // 距離に応じて周波数を200Hzから1000Hzの範囲でマッピング
        let freq = map(d, 20, width / 2, 200, 1000, true);
        osc.freq(freq, 0.1); // 0.1秒かけて周波数を変更
      }
    }
  }
}

// 非同期で手の検出を繰り返す関数
function detectHands(detector) {
  setInterval(async () => {
    // ビデオの準備が完了しているかチェック
    if (video.elt.readyState === 4) {
      // 手を検出
      const hands = await detector.estimateHands(video.elt, { flipHorizontal: false }); // 反転表示しているので検出は反転させない
      predictions = hands;
    }
  }, 100); // 100ミリ秒ごとに実行
}

// ユーザーが画面をクリックしたときに呼ばれる関数
function mousePressed() {
  // ブラウザの音声再生制限を解除するためにオーディオコンテキストを再開
  if (typeof getAudioContext === 'function' && getAudioContext().state !== 'running') {
    getAudioContext().resume();
  }
}
