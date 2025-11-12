// public/client.js
// Client for Cut The Button — tracks local player and handles UI + socket events

const socket = io();

const player1El = document.getElementById('player1');
const player2El = document.getElementById('player2');
const button = document.getElementById('theButton');
const prompt = document.getElementById('prompt');
const message = document.getElementById('message');
const eliminateSound = document.getElementById('eliminateSound');

const name1Input = document.getElementById('name1Input');
const name2Input = document.getElementById('name2Input');

let buttonActive = false;
let myPlayer = null; // 'player1' | 'player2' | null
let canPress = true; // local throttle to avoid double-emits

function setMessage(text, timeout = 4000) {
  message.textContent = text;
  if (message._t) clearTimeout(message._t);
  if (timeout) message._t = setTimeout(() => message.textContent = '', timeout);
}

function markLocalPlayer(player) {
  myPlayer = player;
  player1El.classList.toggle('you', player === 'player1');
  player2El.classList.toggle('you', player === 'player2');
  setMessage(player ? `You are ${player === 'player1' ? 'Player 1' : 'Player 2'}` : '');
}

// Update UI from server state
socket.on('updateState', (state) => {
  player1El.textContent = state.player1 || "Player 1";
  player2El.textContent = state.player2 || "Player 2";
  buttonActive = !!state.buttonActive;

  if (buttonActive) {
    button.classList.add('active');
    prompt.textContent = "PRESS THE BUTTON!";
    button.title = 'Active - click to cut';
  } else {
    button.classList.remove('active');
    prompt.textContent = "Waiting for button to activate...";
    button.title = 'Not active';
  }
});

// Someone pressed the button
socket.on('buttonPressed', (player) => {
  try {
    eliminateSound.currentTime = 0;
    const p = eliminateSound.play();
    if (p && p.catch) p.catch(() => {/* ignore autoplay block */});
  } catch (e) { /* ignore */ }

  if (player === 'player1') {
    setMessage(`${player1El.textContent} pressed first! ${player2El.textContent} eliminated.`);
    player2El.classList.add('eliminated');
    player1El.classList.remove('eliminated');
  } else {
    setMessage(`${player2El.textContent} pressed first! ${player1El.textContent} eliminated.`);
    player1El.classList.add('eliminated');
    player2El.classList.remove('eliminated');
  }

  canPress = false;
  setTimeout(() => { canPress = true; }, 3000);
});

socket.on('connect', () => {
  if (myPlayer === 'player1' && name1Input.value.trim()) {
    socket.emit('setName', { player: 'player1', name: name1Input.value.trim() });
  } else if (myPlayer === 'player2' && name2Input.value.trim()) {
    socket.emit('setName', { player: 'player2', name: name2Input.value.trim() });
  }
});

// Name inputs: set server name and mark this client as that player
name1Input.addEventListener('change', () => {
  const name = name1Input.value.trim();
  if (!name) return setMessage('Enter a name for Player 1');
  socket.emit('setName', { player: 'player1', name });
  markLocalPlayer('player1');
});

name2Input.addEventListener('change', () => {
  const name = name2Input.value.trim();
  if (!name) return setMessage('Enter a name for Player 2');
  socket.emit('setName', { player: 'player2', name });
  markLocalPlayer('player2');
});

// Clicking the player boxes also joins (reads corresponding input)
player1El.addEventListener('click', () => {
  const name = name1Input.value.trim();
  if (!name) return alert('Enter a name for Player 1');
  socket.emit('setName', { player: 'player1', name });
  markLocalPlayer('player1');
});

player2El.addEventListener('click', () => {
  const name = name2Input.value.trim();
  if (!name) return alert('Enter a name for Player 2');
  socket.emit('setName', { player: 'player2', name });
  markLocalPlayer('player2');
});

// Button click uses the player's assigned role
button.addEventListener('click', () => {
  if (!myPlayer) return alert('Join as Player 1 or Player 2 first (type your name and press Enter or click your player box).');
  if (!buttonActive) {
    setMessage('Button is not active yet.');
    return;
  }
  if (!canPress) return;
  canPress = false;
  socket.emit('pressButton', myPlayer);
});

// Keyboard shortcuts — only for the local player
// Player 1 key: 'a'  | Player 2 key: 'l'
document.addEventListener('keydown', (e) => {
  if (!buttonActive) return;
  if (!myPlayer) return;
  const key = e.key.toLowerCase();
  if (key === 'a' && myPlayer === 'player1') {
    if (!canPress) return;
    canPress = false;
    socket.emit('pressButton', 'player1');
  }
  if (key === 'l' && myPlayer === 'player2') {
    if (!canPress) return;
    canPress = false;
    socket.emit('pressButton', 'player2');
  }
});
