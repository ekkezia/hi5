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

var socket = require('socket.io');
var io = socket(server);
io.on('connection', function (socket) {
  console.log('New connection: ' + socket.id);

  socket.on('disconnect', function () {
    console.log('User disconnected: ' + socket.id);
  });

  socket.on('palmOpen', function (data) {
    // console.log('🩸 Keypoint received:', data);
    socket.broadcast.emit('palmOpen', data);
  });

  socket.on('hand', function (data) {
    console.log('👏 Hand received:', data);
    socket.broadcast.emit('hand', data);
  });

  // Handle other events here
});
