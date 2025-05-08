import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';
import { PenTool } from 'lucide-react';

const Home: React.FC = () => {
  const [username, setUsername] = useState('');
  const [roomId, setRoomId] = useState('');
  const [error, setError] = useState('');
  const { socket, connected } = useSocket();
  const navigate = useNavigate();

  const handleCreateRoom = () => {
    if (!username) {
      setError('Please enter a username');
      return;
    }

    if (!socket || !connected) {
      setError('Not connected to server');
      return;
    }

    socket.emit('create-room', (newRoomId: string) => {
      joinRoom(newRoomId);
    });
  };

  const handleJoinRoom = () => {
    if (!username) {
      setError('Please enter a username');
      return;
    }

    if (!roomId) {
      setError('Please enter a room ID');
      return;
    }

    joinRoom(roomId);
  };

  const joinRoom = (roomToJoin: string) => {
    if (!socket || !connected) {
      setError('Not connected to server');
      return;
    }

    socket.emit('join-room', { roomId: roomToJoin, username }, (response: any) => {
      if (response.success) {
        navigate(`/game/${roomToJoin}`);
      } else {
        setError(response.message || 'Failed to join room');
      }
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-500 to-purple-600 p-4">
      <div className="bg-white rounded-xl shadow-2xl p-8 w-full max-w-md">
        <div className="flex items-center justify-center mb-8">
          <PenTool className="h-10 w-10 text-indigo-600 mr-3" />
          <h1 className="text-3xl font-bold text-gray-800">ScribblSpace</h1>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <div className="mb-6">
          <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
            Username
          </label>
          <input
            type="text"
            id="username"
            value={username}
            onChange={e => setUsername(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="Enter your username"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 mb-6">
          <button
            onClick={handleCreateRoom}
            className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 transition duration-200"
          >
            Create New Room
          </button>

          <div className="text-center text-gray-500">or</div>

          <div className="flex space-x-2">
            <input
              type="text"
              value={roomId}
              onChange={e => setRoomId(e.target.value)}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Enter Room ID"
            />
            <button
              onClick={handleJoinRoom}
              className="bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 transition duration-200"
            >
              Join
            </button>
          </div>
        </div>

        <div className="text-center text-sm text-gray-500">
          <p>Draw and guess with friends in ScribblSpace</p>
        </div>
      </div>
    </div>
  );
};

export default Home;
