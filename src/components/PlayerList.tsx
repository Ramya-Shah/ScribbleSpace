import React from 'react';
import { Users, Crown } from 'lucide-react';

interface Player {
  id: string;
  username: string;
  score: number;
}

interface PlayerListProps {
  players: Player[];
  currentDrawer: string | null;
}

const PlayerList: React.FC<PlayerListProps> = ({ players, currentDrawer }) => {
  // Sort players by score (highest first)
  const sortedPlayers = [...players].sort((a, b) => b.score - a.score);

  return (
    <div className="flex flex-col h-full">
      <div className="bg-indigo-600 text-white p-3">
        <div className="flex items-center">
          <Users className="h-5 w-5 mr-2" />
          <h2 className="font-semibold">Players ({players.length})</h2>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto">
        {sortedPlayers.length === 0 ? (
          <div className="text-gray-500 text-center py-4">
            No players yet
          </div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {sortedPlayers.map((player) => (
              <li key={player.id} className="p-3 flex items-center justify-between">
                <div className="flex items-center">
                  {player.id === currentDrawer && (
                    <div className="w-6 h-6 bg-indigo-100 rounded-full flex items-center justify-center mr-2">
                      <span className="text-indigo-600 text-xs">✏️</span>
                    </div>
                  )}
                  <span className={player.id === currentDrawer ? 'font-bold' : ''}>
                    {player.username}
                  </span>
                </div>
                <span className="font-semibold">{player.score}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default PlayerList;