import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';
dotenv.config();
// Initialize Express app
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB connection (uncomment and update with your MongoDB URI)
mongoose.connect(process.env.MONGODB_URL)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Game state
const rooms = {};
const wordList = [
  'apple', 'banana', 'cat', 'dog', 'elephant', 'flower', 'guitar', 'house',
  'island', 'jacket', 'kite', 'lemon', 'mountain', 'notebook', 'ocean',
  'pizza', 'queen', 'rainbow', 'sun', 'tree', 'umbrella', 'violin', 'window',
  'xylophone', 'yacht', 'zebra', 'airplane', 'beach', 'castle', 'dolphin'
];

// Helper functions
function getRandomWord() {
  return wordList[Math.floor(Math.random() * wordList.length)];
}

function createRoom() {
  const roomId = uuidv4().substring(0, 6);
  rooms[roomId] = {
    id: roomId,
    players: [],
    currentDrawer: null,
    word: null,
    isPlaying: false,
    drawHistory: [],
    scores: {},
    round: 0,
    maxRounds: 3,
    timeLeft: 60
  };
  return roomId;
}

// Socket.io connection
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Create a new room
  socket.on('create-room', (callback) => {
    const roomId = createRoom();
    callback(roomId);
  });

  // Join room
  socket.on('join-room', ({ roomId, username }, callback) => {
    // Check if room exists
    if (!rooms[roomId]) {
      callback({ success: false, message: 'Room not found' });
      return;
    }

    // Add player to room
    socket.join(roomId);
    const player = { id: socket.id, username, score: 0 };
    rooms[roomId].players.push(player);
    rooms[roomId].scores[socket.id] = 0;

    // Notify room about new player
    io.to(roomId).emit('player-joined', { players: rooms[roomId].players });
    
    // Send room data to the new player
    callback({ 
      success: true, 
      room: rooms[roomId]
    });

    console.log(`${username} joined room ${roomId}`);
  });

  // Start game
  socket.on('start-game', (roomId) => {
    if (!rooms[roomId]) return;
    
    const room = rooms[roomId];
    room.isPlaying = true;
    room.round = 1;
    
    // Select first drawer
    room.currentDrawer = room.players[0].id;
    room.word = getRandomWord();
    
    // Reset scores
    room.players.forEach(player => {
      room.scores[player.id] = 0;
    });
    
    // Notify all players
    io.to(roomId).emit('game-started', {
      currentDrawer: room.currentDrawer,
      round: room.round,
      maxRounds: room.maxRounds
    });
    
    // Send word to drawer
    io.to(room.currentDrawer).emit('word-to-draw', room.word);
    
    // Start round timer
    startRoundTimer(roomId);
  });

  // Drawing
  socket.on('draw', ({ roomId, line }) => {
    if (!rooms[roomId]) return;
    
    const room = rooms[roomId];
    
    // Only allow current drawer to draw
    if (socket.id !== room.currentDrawer) return;
    
    // Add to draw history and broadcast
    room.drawHistory.push(line);
    socket.to(roomId).emit('draw', line);
  });

  // Clear canvas
  socket.on('clear-canvas', (roomId) => {
    if (!rooms[roomId]) return;
    
    const room = rooms[roomId];
    
    // Only allow current drawer to clear
    if (socket.id !== room.currentDrawer) return;
    
    room.drawHistory = [];
    socket.to(roomId).emit('clear-canvas');
  });

  // Chat message / guess
  socket.on('chat-message', ({ roomId, message }) => {
    if (!rooms[roomId]) return;
    
    const room = rooms[roomId];
    const player = room.players.find(p => p.id === socket.id);
    
    if (!player) return;
    
    // Check if message is correct guess
    if (room.isPlaying && socket.id !== room.currentDrawer && message.toLowerCase() === room.word.toLowerCase()) {
      // Correct guess
      const timeLeft = room.timeLeft;
      const pointsEarned = Math.ceil(timeLeft / 2);
      
      // Update score
      room.scores[socket.id] += pointsEarned;
      
      // Update player score in players array
      const playerIndex = room.players.findIndex(p => p.id === socket.id);
      if (playerIndex !== -1) {
        room.players[playerIndex].score = room.scores[socket.id];
      }
      
      // Notify all players about correct guess
      io.to(roomId).emit('correct-guess', {
        playerId: socket.id,
        username: player.username,
        scores: room.scores,
        players: room.players
      });
      
      // Check if all players guessed correctly
      const nonDrawingPlayers = room.players.filter(p => p.id !== room.currentDrawer);
      const allGuessedCorrectly = nonDrawingPlayers.every(p => room.scores[p.id] > 0);
      
      if (allGuessedCorrectly) {
        endRound(roomId);
      }
    } else {
      // Regular message
      io.to(roomId).emit('chat-message', {
        senderId: socket.id,
        username: player.username,
        message
      });
    }
  });

  // Add this event handler in the socket.io connection block
  socket.on('request-room-data', (roomId) => {
    if (!rooms[roomId]) {
      socket.emit('room-data', { error: 'Room not found' });
      return;
    }
    
    // Send current room data to the requesting client
    socket.emit('room-data', {
      players: rooms[roomId].players,
      isPlaying: rooms[roomId].isPlaying,
      currentDrawer: rooms[roomId].currentDrawer,
      round: rooms[roomId].round,
      maxRounds: rooms[roomId].maxRounds,
      timeLeft: rooms[roomId].timeLeft
    });
  });

  // Disconnect
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    
    // Remove player from all rooms they were in
    Object.keys(rooms).forEach(roomId => {
      const room = rooms[roomId];
      const playerIndex = room.players.findIndex(p => p.id === socket.id);
      
      if (playerIndex !== -1) {
        room.players.splice(playerIndex, 1);
        
        // If room is empty, delete it
        if (room.players.length === 0) {
          delete rooms[roomId];
          return;
        }
        
        // If current drawer left, end round
        if (room.currentDrawer === socket.id) {
          endRound(roomId);
        }
        
        // Notify remaining players
        io.to(roomId).emit('player-left', {
          playerId: socket.id,
          players: room.players
        });
      }
    });
  });
});

// Helper function to start round timer
function startRoundTimer(roomId) {
  const room = rooms[roomId];
  if (!room) return;
  
  room.timeLeft = 60;
  
  const timer = setInterval(() => {
    room.timeLeft -= 1;
    
    // Emit time update
    io.to(roomId).emit('time-update', room.timeLeft);
    
    // End round if time is up
    if (room.timeLeft <= 0) {
      clearInterval(timer);
      endRound(roomId);
    }
  }, 1000);
}

// Helper function to end round
function endRound(roomId) {
  const room = rooms[roomId];
  if (!room) return;
  
  // Reveal word to all
  io.to(roomId).emit('round-end', {
    word: room.word,
    scores: room.scores,
    players: room.players
  });
  
  // Clear canvas
  room.drawHistory = [];
  io.to(roomId).emit('clear-canvas');
  
  // Wait before starting next round
  setTimeout(() => {
    // Check if game should end
    if (room.round >= room.maxRounds) {
      endGame(roomId);
      return;
    }
    
    // Start next round
    room.round += 1;
    
    // Select next drawer
    const currentDrawerIndex = room.players.findIndex(p => p.id === room.currentDrawer);
    const nextDrawerIndex = (currentDrawerIndex + 1) % room.players.length;
    room.currentDrawer = room.players[nextDrawerIndex].id;
    
    // Select new word
    room.word = getRandomWord();
    
    // Notify all players
    io.to(roomId).emit('new-round', {
      currentDrawer: room.currentDrawer,
      round: room.round,
      maxRounds: room.maxRounds
    });
    
    // Send word to drawer
    io.to(room.currentDrawer).emit('word-to-draw', room.word);
    
    // Start round timer
    startRoundTimer(roomId);
  }, 5000);
}

// Helper function to end game
function endGame(roomId) {
  const room = rooms[roomId];
  if (!room) return;
  
  room.isPlaying = false;
  
  // Sort players by score
  const sortedPlayers = [...room.players].sort((a, b) => room.scores[b.id] - room.scores[a.id]);
  
  // Notify all players
  io.to(roomId).emit('game-end', {
    players: sortedPlayers,
    scores: room.scores
  });
}

// Start server
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});