export interface Player {
  id: string;
  username: string;
  score: number;
}

export interface Room {
  id: string;
  players: Player[];
  currentDrawer: string | null;
  word: string | null;
  isPlaying: boolean;
  round: number;
  maxRounds: number;
  timeLeft: number;
}

export interface ChatMessage {
  senderId: string;
  username: string;
  message: string;
  system?: boolean;
}

export interface DrawLine {
  from: { x: number; y: number };
  to: { x: number; y: number };
  color: string;
  size: number;
}