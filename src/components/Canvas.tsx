import React, { useEffect, useRef, useState } from 'react';
import { Socket } from 'socket.io-client';

interface CanvasProps {
  roomId: string;
  isDrawer: boolean;
  socket: Socket | null;
}

const Canvas: React.FC<CanvasProps> = ({ roomId, isDrawer, socket }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentColor, setCurrentColor] = useState('#000000');
  const [currentSize, setCurrentSize] = useState(5);
  const [prevPos, setPrevPos] = useState<{ x: number, y: number } | null>(null);

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext('2d');
    if (!context) return;

    // Set canvas size
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    // Set default styles
    context.lineCap = 'round';
    context.lineJoin = 'round';
    context.strokeStyle = currentColor;
    context.lineWidth = currentSize;

    // Clear canvas on window resize
    const handleResize = () => {
      const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      context.lineCap = 'round';
      context.lineJoin = 'round';
      context.strokeStyle = currentColor;
      context.lineWidth = currentSize;
      context.putImageData(imageData, 0, 0);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [currentColor, currentSize]);

  // Handle socket drawing events
  useEffect(() => {
    if (!socket || !canvasRef.current) return;

    // Listen for draw events
    socket.on('draw', (line) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const context = canvas.getContext('2d');
      if (!context) return;

      context.strokeStyle = line.color;
      context.lineWidth = line.size;
      context.beginPath();
      context.moveTo(line.from.x * canvas.width, line.from.y * canvas.height);
      context.lineTo(line.to.x * canvas.width, line.to.y * canvas.height);
      context.stroke();
    });

    // Listen for clear canvas events
    socket.on('clear-canvas', () => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const context = canvas.getContext('2d');
      if (!context) return;

      context.clearRect(0, 0, canvas.width, canvas.height);
    });

    return () => {
      socket.off('draw');
      socket.off('clear-canvas');
    };
  }, [socket]);

  // Drawing handlers
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawer) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    setIsDrawing(true);

    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;

    if ('touches' in e) {
      // Touch event
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      // Mouse event
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const x = (clientX - rect.left) / canvas.width;
    const y = (clientY - rect.top) / canvas.height;

    setPrevPos({ x, y });
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !isDrawer || !prevPos) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext('2d');
    if (!context) return;

    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;

    if ('touches' in e) {
      // Touch event
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
      e.preventDefault(); // Prevent scrolling on touch devices
    } else {
      // Mouse event
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const x = (clientX - rect.left) / canvas.width;
    const y = (clientY - rect.top) / canvas.height;

    // Draw on local canvas
    context.strokeStyle = currentColor;
    context.lineWidth = currentSize;
    context.beginPath();
    context.moveTo(prevPos.x * canvas.width, prevPos.y * canvas.height);
    context.lineTo(x * canvas.width, y * canvas.height);
    context.stroke();

    // Send to server
    if (socket) {
      socket.emit('draw', {
        roomId,
        line: {
          from: prevPos,
          to: { x, y },
          color: currentColor,
          size: currentSize
        }
      });
    }

    setPrevPos({ x, y });
  };

  const endDrawing = () => {
    setIsDrawing(false);
    setPrevPos(null);
  };

  return (
    <div className="relative">
      <canvas
        ref={canvasRef}
        className="w-full h-[400px] bg-white border border-gray-300 rounded-md cursor-crosshair"
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={endDrawing}
        onMouseLeave={endDrawing}
        onTouchStart={startDrawing}
        onTouchMove={draw}
        onTouchEnd={endDrawing}
      />
      
      {isDrawer && (
        <div className="absolute bottom-2 left-2 flex space-x-2">
          <input
            type="color"
            value={currentColor}
            onChange={(e) => setCurrentColor(e.target.value)}
            className="w-8 h-8 cursor-pointer"
          />
          
          <select
            value={currentSize}
            onChange={(e) => setCurrentSize(Number(e.target.value))}
            className="bg-white border border-gray-300 rounded px-2 py-1 text-sm"
          >
            <option value="2">Small</option>
            <option value="5">Medium</option>
            <option value="10">Large</option>
            <option value="20">X-Large</option>
          </select>
        </div>
      )}
    </div>
  );
};

export default Canvas;