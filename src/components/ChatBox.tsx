import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle } from 'lucide-react';

interface ChatBoxProps {
  messages: any[];
  onSendMessage: (message: string) => void;
  disabled?: boolean;
}

const ChatBox: React.FC<ChatBoxProps> = ({ messages, onSendMessage, disabled }) => {
  const [message, setMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !disabled) {
      onSendMessage(message);
      setMessage('');
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="bg-indigo-600 text-white p-3">
        <div className="flex items-center">
          <MessageCircle className="h-5 w-5 mr-2" />
          <h2 className="font-semibold">Chat</h2>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-3 space-y-2 max-h-[400px]">
        {messages.length === 0 ? (
          <div className="text-gray-500 text-center py-4">
            No messages yet. Start chatting!
          </div>
        ) : (
          messages.map((msg, index) => (
            <div key={index} className={`${msg.system ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100'} p-2 rounded-lg`}>
              {msg.system ? (
                <p className="text-sm font-medium">{msg.message}</p>
              ) : (
                <>
                  <p className="font-semibold text-sm text-indigo-600">{msg.username}</p>
                  <p className="text-gray-800">{msg.message}</p>
                </>
              )}
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>
      
      <form onSubmit={handleSubmit} className="p-3 border-t border-gray-200">
        <div className="flex">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={disabled ? "You are drawing..." : "Type your guess..."}
            disabled={disabled}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100 disabled:text-gray-500"
          />
          <button
            type="submit"
            disabled={disabled}
            className="bg-indigo-600 text-white px-4 py-2 rounded-r-md hover:bg-indigo-700 transition duration-200 disabled:bg-gray-400"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
};

export default ChatBox;