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
let myHands;
let otherHands = {}; // Store other clients' hands
let isOverlapping = false;

let extendedCount = 0;
let txt = '';

let slackeyFont;

let handPointSize = 20;

function preload() {
  // Load the handPose model
  handPose = ml5.handPose();
}

let currentId;

function setup() {
  createCanvas(960, 640);

  // socket connection
  // Connect to the server's URL (will work both locally and on Vercel)
  const socketURL = window.location.origin;
  socket = io.connect(socketURL);

  socket.on('connect', () => {
    currentId = socket.id;
    let yourHandEl = select('#hand-1-wait');
    if (!yourHandEl.elt.classList.contains('available')) {
      yourHandEl.elt.className = 'available';
    }
  });

  // Handle receiving image
  socket.on('otherScreenshot', function (data) {
    updateImageContainer(data.image, data.id);
  });

  // Handle receiving other clients' hand data (when hand is detected / raised up)
  socket.on('hand', function (data) {
    // console.log('got hand', data, otherHands);
    if (data.id === currentId) {
      // This is ME
      myHands = data.hands;
    } else {
      // This is someone else
      otherHands[data.id] = data.hands;
      let otherHandEl = select('#hand-2-wait');
      if (!otherHandEl.elt.classList.contains('available')) {
        otherHandEl.elt.className = 'available';
      }
    }
    // console.log(
    //   'draw hands 🤟',
    //   currentId,
    //   'myHands',
    //   myHands,
    //   'otherhands',
    //   Object.entries(otherHands),
    //   // Object.entries(otherHands)[0][1],
    // );

    // only allow instruction to work when person hasnt finished the hi5 procedure
    if (!hasFinishedHighfiving) {
      // only one client
      //  myHands
      if (myHands.length > 0) {
        let instructionEl = select('#instruction');
        if (
          !instructionEl.elt.classList.contains('rotate-2') &&
          !isOverlapping
        ) {
          instructionEl.elt.classList = 'rotate-2';
        }

        let yourHandSymbolEl = select('#hand-1');
        if (!yourHandSymbolEl.elt.classList.contains('available')) {
          yourHandSymbolEl.elt.classList.add('available');
        }
      } else {
        let yourHandSymbolEl = select('#hand-1');
        if (yourHandSymbolEl.elt.classList.contains('available')) {
          yourHandSymbolEl.elt.classList.remove('available');
        }

        let instructionEl = select('#instruction');
        if (
          !instructionEl.elt.classList.contains('rotate-1') &&
          !isOverlapping
        ) {
          instructionEl.elt.classList = 'rotate-1';
        }
      }

      // other hands join
      if (
        Object.entries(otherHands).length > 0 &&
        Object.entries(otherHands)[0][1].length > 0
      ) {
        let otherHandSymbolEl = select('#hand-2');
        if (!otherHandSymbolEl.elt.classList.contains('available')) {
          otherHandSymbolEl.elt.classList.add('available');
        }

        // instruct to get closer
        let instructionEl = select('#instruction');
        if (
          !instructionEl.elt.classList.contains('rotate-3') &&
          !isOverlapping
        ) {
          instructionEl.elt.classList = 'rotate-3';
        }
      } else {
        let otherHandSymbolEl = select('#hand-2');
        if (otherHandSymbolEl.elt.classList.contains('available')) {
          otherHandSymbolEl.elt.classList.remove('available');
        }
      }
    }
  });

  // Handle client disconnection
  socket.on('disconnect', function () {
    let otherHandEl = select('#hand-2');
    if (otherHandEl.elt.classList.contains('available')) {
      otherHandEl.elt.classList.remove('available');
    }
    let waitEl = select('#handCount-wait');
    if (waitEl.elt.classList.contains('available')) {
      waitEl.elt.classList.remove('available');
    }
    otherHands = {}; // Clear other hands when disconnected
  });

  // Create the webcam video and hide it
  video = createCapture(VIDEO);
  video.size(960, 640);
  video.hide();
  // start detecting hands from the webcam video
  handPose.detectStart(video, gotHands);

  let restartBtn = document.getElementById('restart');
  console.log(restartBtn); // Should not be null

  if (restartBtn) {
    restartBtn.addEventListener('click', clickRestartBtn);
  } else {
    console.warn('#restart button not found in DOM');
  }
}

let s = 0;

function draw() {
  drawBackground();

  // Draw the webcam video
  // image(video, 0, 0, width, height);

  if (s < width) {
    s += 10;
  }

  // if (isPalmOpen(hands).open) {
  //   fill(0, 255, 0);
  //   socket.emit('palmOpen', {
  //     id: socket.id,
  //     status: 'open',
  //     position: isPalmOpen(hands).wristPosition,
  //   });
  // } else {
  //   s = 0;
  //   fill(255, 0, 0);
  // }

  // Draw your own hand keypoints (green)
  for (let i = 0; i < hands.length; i++) {
    let hand = hands[i];
    for (let j = 0; j < hand.keypoints.length; j++) {
      let keypoint = hand.keypoints[j];
      fill(0, 255, 0); // Green for your own hand
      noStroke();
      ellipse(keypoint.x, keypoint.y, handPointSize, handPointSize);
    }
  }

  // Draw other clients' hands (cyan)
  for (let clientId in otherHands) {
    if (clientId !== socket.id) {
      // Don't draw your own hand again
      let clientHands = otherHands[clientId];
      for (let i = 0; i < clientHands.length; i++) {
        let hand = clientHands[i];
        for (let j = 0; j < hand.keypoints.length; j++) {
          let keypoint = hand.keypoints[j];
          fill(0, 255, 255); // Red for other clients' hands
          noStroke();
          ellipse(keypoint.x, keypoint.y, handPointSize, handPointSize);
        }
      }
    }
  }

  // Check for hand overlap between your hands and other clients' hands
  checkHandOverlap();
}

function drawBackground() {
  video.loadPixels();
  let step = 10;

  for (let y = 0; y < video.height; y += step) {
    for (let x = 0; x < video.width; x += step) {
      let index = (x + y * video.width) * 4;
      let r = video.pixels[index];
      let g = video.pixels[index + 1];
      let b = video.pixels[index + 2];
      let bright = (r + g + b) / 3;
      let mapB = map(bright, 0, 255, 0, 20);
      fill(r, g, b);
      noStroke();
      ellipse(x, y, mapB, mapB);
    }
  }
}

// Callback function for when handPose outputs data
function gotHands(results) {
  hands = results;
  let loadingEl = select('#loadingContainer');
  if (!loadingEl.elt.classList.contains('modelReady')) {
    loadingEl.elt.className = 'modelReady';
  }

  let bodyEl = select('body');
  if (!bodyEl.elt.classList.contains('modelReady')) {
    bodyEl.elt.classList.add('modelReady');
  }

  if (hands.length > 0) {
    // emit to socket ONLY when there's hands detected
    socket.emit('hand', {
      id: socket.id,
      hands: hands,
    });
  } else {
    // no hands
    socket.emit('hand', {
      id: socket.id,
      hands: [],
    });
  }
}

// function isPalmOpen(landmarks) {
//   if (!landmarks || landmarks.length === 0)
//     return { open: false, wristPosition: { x: 0, y: 0 } };

//   const wrist = landmarks[0].keypoints[0];
//   const tips = [4, 8, 12, 16, 20]; // thumb, index, middle, ring, pinky tips
//   let extendedCount = 0;

//   for (let tipIdx of tips) {
//     const tip = landmarks[0].keypoints[tipIdx];
//     const d = dist(wrist.x, wrist.y, tip.x, tip.y);

//     // console.log(d > 200 ? 'open♥️' : 'closed🤣', d);
//     if (d > 200) {
//       extendedCount++;
//     }
//   }

//   return {
//     wristPosition: { x: wrist.x, y: wrist.y },
//     open: extendedCount >= 4,
//   };
// }

let hasFinishedHighfiving = false;

function checkHandOverlap() {
  if (hasFinishedHighfiving) return;

  console.log('checking hand overlap ✋🏼');

  const overlapThreshold = 50; // Distance in pixels to consider "close enough"

  // Only check if we have our own hands and other clients' hands
  if (!hands || hands.length === 0) {
    isOverlapping = false;
    return;
  }

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

        let totalPoints = Math.min(
          myHand.keypoints.length,
          otherHand.keypoints.length,
        );

        let overlapCount = 0; // ✅ Reset per comparison

        // Check corresponding keypoints (same index) between hands
        for (let pointIdx = 0; pointIdx < totalPoints; pointIdx++) {
          let myPoint = myHand.keypoints[pointIdx];
          let otherPoint = otherHand.keypoints[pointIdx];

          let distance = dist(myPoint.x, myPoint.y, otherPoint.x, otherPoint.y);

          if (distance <= overlapThreshold) {
            overlapCount++;
            isOverlapping = true;
          } else {
            isOverlapping = false;
          }

          // If enough points are overlapping, draw ellipses at both wrist positions
          let overlapPercentage = overlapCount / totalPoints;
          if (overlapCount >= 0) {
            let instructionEl = select('#instruction');
            if (!instructionEl.elt.classList.contains('rotate-4')) {
              instructionEl.elt.className = 'rotate-4';
            }

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
            fill(255, 0, 255, 20); // purple with transparency
            noStroke();
            if (s === width) {
              stroke(0, 255, 0);

              sendScreenshot(); // <--- TAKE & SEND IMAGE

              let instructionEl = select('#instruction');
              instructionEl.elt.className = '';

              let imageEl = select('#imageContainer');
              if (!imageEl.elt.classList.contains('available')) {
                imageEl.elt.className = 'available';
              }
              let restartEl = select('#restart');
              if (!restartEl.elt.classList.contains('show')) {
                restartEl.elt.className = 'show';
              }

              hasFinishedHighfiving = true;
            }
            ellipse(myWrist.x, myWrist.y, s, s);

            // Draw connection line
            // stroke(255, 0, 255);
            // strokeWeight(2);
            // line(myWrist.x, myWrist.y, otherWrist.x, otherWrist.y);

            // Show overlap info
            // fill(255);
            // textSize(14);
            // textAlign(CENTER, CENTER);
            // let midX = (myWrist.x + otherWrist.x) / 2;
            // let midY = (myWrist.y + otherWrist.y) / 2;
            // text(`Overlap: ${overlapCount} points`, midX, midY - 30);
            // text(
            //   `Distance: ${Math.round(
            //     dist(myWrist.x, myWrist.y, otherWrist.x, otherWrist.y),
            //   )}px`,
            //   midX,
            //   midY - 15,
            // );
          } else {
            let instructionEl = select('#instruction');
            if (instructionEl.elt.classList.contains('rotate-4')) {
              instructionEl.elt.className = '';
            }
          }
        }
      }
    }
  }
}

function sendScreenshot() {
  // Create a temporary graphics object
  let screenshot = createGraphics(video.width, video.height);
  screenshot.image(video, 0, 0, video.width, video.height);

  // Convert to base64
  let imgBase64 = screenshot.canvas.toDataURL('image/jpeg'); // or 'image/png'

  console.log('🎆 image got', imgBase64);
  // Emit to server
  socket.emit('screenshot', {
    id: socket.id,
    image: imgBase64,
  });

  // Optional: clean up
  screenshot.remove();
}

function updateImageContainer(base64Image, senderId) {
  const container = document.getElementById('imageContainer');

  // Remove old image from the same sender (optional, if one-per-client)
  const existing = document.getElementById(`img-${senderId}`);
  if (existing) existing.remove();

  // Create new img element
  const img = document.createElement('img');
  img.src = base64Image;
  img.id = `img-${senderId}`;
  img.className = 'img';
  img.alt = `Screenshot from ${senderId}`;

  container.appendChild(img);
}

function clickRestartBtn() {
  console.log('click restart');
  hasFinishedHighfiving = false;

  let imageEl = select('#imageContainer');
  let restartEl = select('#restart');

  if (imageEl.elt.classList.contains('available')) {
    imageEl.elt.classList = '';
  }

  if (restartEl.elt.classList.contains('show')) {
    restartEl.elt.classList = '';
  }
}
