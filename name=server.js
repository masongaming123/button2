const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

app.use(express.static('public'));

let gameState = {
  player1: "",
  player2: "",
  buttonActive: false
};

let timer = null;

// Generate a random delay between 30-45 seconds
function startRandomTimer() {
  const delay = 30000 + Math.random() * 15000;
  gameState.buttonActive = false;
  io.emit('updateState', gameState);

  if (timer) clearTimeout(timer);

  timer = setTimeout(() => {
    gameState.buttonActive = true;
    io.emit('updateState', gameState);
  }, delay);
}

io.on('connection', (socket) => {
  console.log('A user connected');

  // Send current state to new client
  socket.emit('updateState', gameState);

  // Set player name
  socket.on('setName', ({ player, name }) => {
    gameState[player] = name;
    io.emit('updateState', gameState);
  });

  // Handle button press
  socket.on('pressButton', (player) => {
    if (!gameState.buttonActive) return;

    gameState.buttonActive = false;
    io.emit('buttonPressed', player);

    // Reset names and start a new round after 3 seconds
    setTimeout(() => {
      gameState.player1 = "";
      gameState.player2 = "";
      io.emit('updateState', gameState);
      startRandomTimer();
    }, 3000);
  });

  socket.on('disconnect', () => {
    console.log('A user disconnected');
  });
});

// Start the first random timer
startRandomTimer();

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
