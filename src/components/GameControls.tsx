import React from 'react';
import { Eraser } from 'lucide-react';
import { Socket } from 'socket.io-client';

interface GameControlsProps {
  roomId: string;
  socket: Socket | null;
}

const GameControls: React.FC<GameControlsProps> = ({ roomId, socket }) => {
  const handleClearCanvas = () => {
    if (socket) {
      socket.emit('clear-canvas', roomId);
      
      // Also clear local canvas
      const canvas = document.querySelector('canvas');
      if (canvas) {
        const context = canvas.getContext('2d');
        if (context) {
          context.clearRect(0, 0, canvas.width, canvas.height);
        }
      }
    }
  };

  return (
    <div className="mt-4 flex justify-center">
      <button
        onClick={handleClearCanvas}
        className="flex items-center bg-red-100 text-red-700 px-4 py-2 rounded-md hover:bg-red-200 transition duration-200"
      >
        <Eraser className="h-4 w-4 mr-2" />
        Clear Canvas
      </button>
    </div>
  );
};

export default GameControls;