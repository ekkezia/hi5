/*
 * Hi5 - Hand Tracking Application
 * Learn more about the ml5.js project: https://ml5js.org/
 * ml5.js license and Code of Conduct: https://github.com/ml5js/ml5-next-gen/blob/main/LICENSE.md
 *
 */

let handPose;
let video;
let hands = [];
let socket;
let otherHands = {}; // Store other clients' hands

let extendedCount = 0;
let txt = '';

function preload() {
  // Load the handPose model
  handPose = ml5.handPose();
}

function setup() {
  createCanvas(640, 480);
  // socket connection
  // Connect to the server's URL (will work both locally and on Vercel)
  const socketURL = window.location.origin;
  socket = io.connect(socketURL);

  // Handle receiving other clients' hand data
  socket.on('hand', function (data) {
    console.log('draw other hand 🤟', data);
    otherHands[data.id] = data.hands; // Store other client's hand data
  });

  // Handle client disconnection
  socket.on('disconnect', function () {
    otherHands = {}; // Clear other hands when disconnected
  });

  // Create the webcam video and hide it
  video = createCapture(VIDEO);
  video.size(640, 480);
  video.hide();
  // start detecting hands from the webcam video
  handPose.detectStart(video, gotHands);
}

function mousePressed() {
  console.log(hands);
}

let s = 0;

function draw() {
  // Draw the webcam video
  image(video, 0, 0, width, height);

  if (s < width) {
    s += 10;
  }

  // if no hands are detected, return early
  if (!hands || hands.length === 0) {
    textSize(32);
    textAlign(CENTER, CENTER);
    fill(255, 0, 0);
    txt = 'HANDS UP DAWG';
    text(txt, width / 2, height / 2);
  }

  if (isPalmOpen(hands).open) {
    fill(0, 255, 0);
    socket.emit('palmOpen', {
      id: socket.id,
      status: 'open',
      position: isPalmOpen(hands).wristPosition,
    });
  } else {
    s = 0;
    fill(255, 0, 0);
  }

  // Draw your own hand keypoints (green)
  for (let i = 0; i < hands.length; i++) {
    let hand = hands[i];
    for (let j = 0; j < hand.keypoints.length; j++) {
      let keypoint = hand.keypoints[j];
      fill(0, 255, 0); // Green for your own hand
      noStroke();
      ellipse(keypoint.x, keypoint.y, 10, 10);
    }
  }

  // Draw other clients' hands (red)
  for (let clientId in otherHands) {
    if (clientId !== socket.id) {
      // Don't draw your own hand again
      let clientHands = otherHands[clientId];
      for (let i = 0; i < clientHands.length; i++) {
        let hand = clientHands[i];
        for (let j = 0; j < hand.keypoints.length; j++) {
          let keypoint = hand.keypoints[j];
          fill(255, 0, 0); // Red for other clients' hands
          noStroke();
          ellipse(keypoint.x, keypoint.y, 10, 10);
        }
      }
    }
  }

  // Check for hand overlap between your hands and other clients' hands
  checkHandOverlap();

  // Show indicator if other hands are detected
  if (Object.keys(otherHands).length > 0) {
    fill(255, 255, 0);
    textSize(16);
    textAlign(LEFT, TOP);
    text('Other hands detected: ' + Object.keys(otherHands).length, 10, 10);
  }
}

// Callback function for when handPose outputs data
function gotHands(results) {
  hands = results;
  drawHand();
}

function drawHand() {
  socket.emit('hand', {
    id: socket.id,
    hands: hands,
  });
}

function isPalmOpen(landmarks) {
  if (!landmarks || landmarks.length === 0)
    return { open: false, wristPosition: { x: 0, y: 0 } };

  const wrist = landmarks[0].keypoints[0];
  const tips = [4, 8, 12, 16, 20]; // thumb, index, middle, ring, pinky tips
  let extendedCount = 0;

  for (let tipIdx of tips) {
    const tip = landmarks[0].keypoints[tipIdx];
    const d = dist(wrist.x, wrist.y, tip.x, tip.y);

    console.log(d > 200 ? 'open♥️' : 'closed🤣', d);
    if (d > 200) {
      extendedCount++;
    }
  }

  return {
    wristPosition: { x: wrist.x, y: wrist.y },
    open: extendedCount >= 4,
  };
}

function checkHandOverlap() {
  const overlapThreshold = 50; // Distance in pixels to consider "close enough"

  // Only check if we have our own hands and other clients' hands
  if (!hands || hands.length === 0) return;

  let otherClientsArray = Object.keys(otherHands);
  if (otherClientsArray.length === 0) return;

  // Check each of your hands against each other client's hands
  for (let myHandIdx = 0; myHandIdx < hands.length; myHandIdx++) {
    let myHand = hands[myHandIdx];
    let myWrist = myHand.keypoints[0]; // Wrist is always keypoint 0

    for (let clientId of otherClientsArray) {
      if (clientId === socket.id) continue; // Skip your own hands

      let clientHands = otherHands[clientId];
      for (
        let otherHandIdx = 0;
        otherHandIdx < clientHands.length;
        otherHandIdx++
      ) {
        let otherHand = clientHands[otherHandIdx];
        let otherWrist = otherHand.keypoints[0];

        let overlapCount = 0;
        let totalPoints = Math.min(
          myHand.keypoints.length,
          otherHand.keypoints.length,
        );

        // Check corresponding keypoints (same index) between hands
        for (let pointIdx = 0; pointIdx < totalPoints; pointIdx++) {
          let myPoint = myHand.keypoints[pointIdx];
          let otherPoint = otherHand.keypoints[pointIdx];

          let distance = dist(myPoint.x, myPoint.y, otherPoint.x, otherPoint.y);

          if (distance <= overlapThreshold) {
            overlapCount++;
          }
        }

        // If enough points are overlapping, draw ellipses at both wrist positions
        let overlapPercentage = overlapCount / totalPoints;
        if (overlapCount >= 5) {
          // At least 5 corresponding points are close enough
          // Draw ellipse at your wrist
          fill(0, 255, 255, 100); // Cyan with transparency
          stroke(0, 255, 255);
          strokeWeight(3);
          ellipse(myWrist.x, myWrist.y, 60, 60);

          // Draw ellipse at other client's wrist
          fill(255, 255, 0, 100); // Yellow with transparency
          stroke(255, 255, 0);
          strokeWeight(3);
          ellipse(otherWrist.x, otherWrist.y, 60, 60);

          // Draw ellipse at both wrists
          fill(255, 0, 255, 100); // purple with transparency
          noStroke();
          if (s === width) {
            stroke(0, 255, 0);
          }
          ellipse(myWrist.x, myWrist.y, s, s);

          // Draw connection line
          stroke(255, 0, 255);
          strokeWeight(2);
          line(myWrist.x, myWrist.y, otherWrist.x, otherWrist.y);

          // Show overlap info
          fill(255);
          textSize(14);
          textAlign(CENTER, CENTER);
          let midX = (myWrist.x + otherWrist.x) / 2;
          let midY = (myWrist.y + otherWrist.y) / 2;
          text(`Overlap: ${overlapCount} points`, midX, midY - 30);
          text(
            `Distance: ${Math.round(
              dist(myWrist.x, myWrist.y, otherWrist.x, otherWrist.y),
            )}px`,
            midX,
            midY - 15,
          );
        }
      }
    }
  }
}

function drawGrowingCircle() {}
