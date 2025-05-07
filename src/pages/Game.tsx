import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';
import Canvas from '../components/Canvas';
import ChatBox from '../components/ChatBox';
import PlayerList from '../components/PlayerList';
import GameControls from '../components/GameControls';
import { PenTool, Clock, ArrowLeft } from 'lucide-react';

interface Player {
  id: string;
  username: string;
  score: number;
}

interface GameState {
  isPlaying: boolean;
  currentDrawer: string | null;
  word: string | null;
  round: number;
  maxRounds: number;
  timeLeft: number;
}

const Game: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const { socket, connected } = useSocket();
  const navigate = useNavigate();
  
  const [players, setPlayers] = useState<Player[]>([]);
  const [gameState, setGameState] = useState<GameState>({
    isPlaying: false,
    currentDrawer: null,
    word: null,
    round: 0,
    maxRounds: 3,
    timeLeft: 60
  });
  const [messages, setMessages] = useState<any[]>([]);
  const [isDrawer, setIsDrawer] = useState(false);
  const [gameEnded, setGameEnded] = useState(false);
  const [winners, setWinners] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingRetries, setLoadingRetries] = useState(0);

  // Set up socket event listeners
  useEffect(() => {
    if (!socket || !connected || !roomId) return;

    // Request initial room data when connecting
    requestRoomData();

    // Add listener for room data response
    socket.on('room-data', (roomData) => {
      if (roomData.players) {
        setPlayers(roomData.players);
        setLoading(false);
      }
      
      if (roomData.isPlaying) {
        setGameState(prev => ({
          ...prev,
          isPlaying: roomData.isPlaying,
          currentDrawer: roomData.currentDrawer,
          round: roomData.round,
          maxRounds: roomData.maxRounds,
          timeLeft: roomData.timeLeft
        }));
        setIsDrawer(socket.id === roomData.currentDrawer);
      }
    });

    // Player joined
    socket.on('player-joined', ({ players: newPlayers }) => {
      setPlayers(newPlayers);
    });

    // Player left
    socket.on('player-left', ({ players: newPlayers }) => {
      setPlayers(newPlayers);
    });

    // Game started
    socket.on('game-started', ({ currentDrawer, round, maxRounds }) => {
      setGameState(prev => ({
        ...prev,
        isPlaying: true,
        currentDrawer,
        round,
        maxRounds
      }));
      setIsDrawer(socket.id === currentDrawer);
    });

    // Word to draw
    socket.on('word-to-draw', (word) => {
      setGameState(prev => ({ ...prev, word }));
    });

    // Time update
    socket.on('time-update', (timeLeft) => {
      setGameState(prev => ({ ...prev, timeLeft }));
    });

    // Chat message
    socket.on('chat-message', (message) => {
      setMessages(prev => [...prev, message]);
    });

    // Correct guess
    socket.on('correct-guess', ({ players: updatedPlayers }) => {
      setPlayers(updatedPlayers);
    });

    // Round end
    socket.on('round-end', ({ word, players: updatedPlayers }) => {
      setMessages(prev => [
        ...prev,
        { system: true, message: `Round ended! The word was: ${word}` }
      ]);
      setPlayers(updatedPlayers);
    });

    // New round
    socket.on('new-round', ({ currentDrawer, round }) => {
      setGameState(prev => ({
        ...prev,
        currentDrawer,
        round,
        word: null,
        timeLeft: 60
      }));
      setIsDrawer(socket.id === currentDrawer);
      setMessages(prev => [
        ...prev,
        { system: true, message: `Round ${round} started!` }
      ]);
    });

    // Game end
    socket.on('game-end', ({ players: sortedPlayers }) => {
      setGameState(prev => ({ ...prev, isPlaying: false }));
      setGameEnded(true);
      setWinners(sortedPlayers);
      setMessages(prev => [
        ...prev,
        { system: true, message: 'Game ended!' }
      ]);
    });

    return () => {
      socket.off('room-data');
      socket.off('player-joined');
      socket.off('player-left');
      socket.off('game-started');
      socket.off('word-to-draw');
      socket.off('time-update');
      socket.off('chat-message');
      socket.off('correct-guess');
      socket.off('round-end');
      socket.off('new-round');
      socket.off('game-end');
    };
  }, [socket, connected, roomId]);

  // Add function to request room data
  const requestRoomData = () => {
    if (socket && roomId) {
      console.log('Requesting room data from server...');
      socket.emit('request-room-data', roomId);
      setLoadingRetries(prev => prev + 1);
    }
  };

  // Add effect to retry loading if stuck
  useEffect(() => {
    if (loading && players.length === 0 && loadingRetries < 3) {
      const retryTimeout = setTimeout(requestRoomData, 5000); // Retry after 5 seconds
      return () => clearTimeout(retryTimeout);
    }
  }, [loading, players, loadingRetries]);

  const handleStartGame = () => {
    if (socket && roomId) {
      socket.emit('start-game', roomId);
    }
  };

  const handleSendMessage = (message: string) => {
    if (socket && roomId) {
      socket.emit('chat-message', { roomId, message });
    }
  };

  const handleLeaveRoom = () => {
    navigate('/');
  };

  if (gameEnded) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-2xl p-8 w-full max-w-md">
          <h1 className="text-3xl font-bold text-center mb-6">Game Over!</h1>
          
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Final Scores:</h2>
            <div className="space-y-2">
              {winners.map((player, index) => (
                <div key={player.id} className="flex items-center justify-between p-2 bg-gray-100 rounded">
                  <div className="flex items-center">
                    <span className="font-bold mr-2">{index + 1}.</span>
                    <span>{player.username}</span>
                  </div>
                  <span className="font-bold">{player.score} pts</span>
                </div>
              ))}
            </div>
          </div>
          
          <button
            onClick={handleLeaveRoom}
            className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 transition duration-200"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-md p-4">
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center">
            <PenTool className="h-6 w-6 text-indigo-600 mr-2" />
            <h1 className="text-xl font-bold text-gray-800"> ScribblSpace</h1>
          </div>
          
          <div className="flex items-center space-x-4">
            {gameState.isPlaying && (
              <div className="flex items-center bg-gray-100 px-3 py-1 rounded-full">
                <Clock className="h-4 w-4 text-gray-600 mr-1" />
                <span className="font-medium">{gameState.timeLeft}s</span>
              </div>
            )}
            
            {gameState.isPlaying && (
              <div className="bg-indigo-100 text-indigo-800 px-3 py-1 rounded-full">
                Round {gameState.round}/{gameState.maxRounds}
              </div>
            )}
            
            <button
              onClick={handleLeaveRoom}
              className="flex items-center text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Leave
            </button>
          </div>
        </div>
      </header>
      
      <div className="container mx-auto flex flex-col md:flex-row flex-1 p-4 gap-4">
        {/* Left sidebar - Players */}
        <div className="w-full md:w-64 bg-white rounded-lg shadow-md overflow-hidden">
          {players.length > 0 ? (
            <PlayerList 
              players={players} 
              currentDrawer={gameState.currentDrawer} 
            />
          ) : (
            <div className="p-4 text-center text-gray-500">
              <div className="animate-pulse flex flex-col items-center justify-center h-40">
                <div className="h-8 w-8 mb-4 rounded-full border-4 border-t-indigo-500 border-r-indigo-500 border-b-transparent border-l-transparent animate-spin"></div>
                <p>Loading players...</p>
                {loadingRetries > 0 && (
                  <p className="mt-2 text-sm">Retrying... ({loadingRetries})</p>
                )}
                {loadingRetries >= 3 && (
                  <button 
                    onClick={requestRoomData} 
                    className="mt-3 px-3 py-1 bg-indigo-500 text-white rounded-md text-sm hover:bg-indigo-600"
                  >
                    Refresh Data
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
        
        {/* Main content - Canvas and controls */}
        <div className="flex-1 flex flex-col">
          <div className="bg-white rounded-lg shadow-md p-4 mb-4">
            {isDrawer && gameState.word && (
              <div className="bg-indigo-100 text-indigo-800 px-4 py-2 rounded-md mb-4 text-center">
                <p className="font-medium">Your word to draw:</p>
                <p className="text-xl font-bold">{gameState.word}</p>
              </div>
            )}
            
            {!isDrawer && gameState.isPlaying && (
              <div className="bg-gray-100 px-4 py-2 rounded-md mb-4 text-center">
                <p className="font-medium">
                  {players.find(p => p.id === gameState.currentDrawer)?.username} is drawing...
                </p>
                <p className="text-xl font-bold">
                  {gameState.word ? '_ '.repeat(gameState.word.length).trim() : ''}
                </p>
              </div>
            )}
            
            <Canvas 
              roomId={roomId || ''} 
              isDrawer={isDrawer} 
              socket={socket}
            />
            
            {isDrawer && (
              <GameControls 
                roomId={roomId || ''} 
                socket={socket}
              />
            )}
          </div>
          
          {!gameState.isPlaying && players.length > 1 && (
            <button
              onClick={handleStartGame}
              className="bg-indigo-600 text-white py-3 px-6 rounded-md hover:bg-indigo-700 transition duration-200 mb-4 text-center font-bold"
            >
              Start Game
            </button>
          )}
          
          {!gameState.isPlaying && players.length < 2 && (
            <div className="bg-yellow-100 text-yellow-800 p-4 rounded-md mb-4 text-center">
              Waiting for more players to join... Share the room code: <span className="font-bold">{roomId}</span>
            </div>
          )}
        </div>
        
        {/* Right sidebar - Chat */}
        <div className="w-full md:w-80 bg-white rounded-lg shadow-md overflow-hidden">
          <ChatBox 
            messages={messages} 
            onSendMessage={handleSendMessage} 
            disabled={isDrawer}
          />
        </div>
      </div>
    </div>
  );
};

export default Game;