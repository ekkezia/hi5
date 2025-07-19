/*
 * Hi5 - Hand Tracking Application
 * Server-side implementation
 */

var express = require('express');
var app = express();
require('dotenv').config();

// For local development
const PORT = process.env.PORT || 3000;
var server = app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

app.use(express.static('public'));

// Server status logged in the listener callback above
let connectedSockets = new Set();

var socket = require('socket.io');
var io = socket(server);
io.on('connection', function (socket) {
  console.log('New connection: ' + socket.id);
  connectedSockets.add(socket.id);

  // Broadcast to all clients the current connection count
  io.emit('connectionCount', connectedSockets.size);

  socket.on('disconnect', function () {
    console.log('User disconnected: ' + socket.id);
    connectedSockets.delete(socket.id);
    io.emit('connectionCount', connectedSockets);
  });

  socket.on('palmOpen', function (data) {
    // console.log('🩸 Keypoint received:', data);
    socket.broadcast.emit('palmOpen', data);
  });

  // emit when hand is raised up / detected
  socket.on('hand', function (data) {
    console.log('👏 Hand received:', data);
    io.emit('hand', data);
  });

  // Screenshot
  socket.on('screenshot', (data) => {
    console.log('Received screenshot from', data.id);
    socket.broadcast.emit('otherScreenshot', {
      id: socket.id,
      image: data.image,
    });
  });
});
