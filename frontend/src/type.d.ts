export type GamePhase = 'waiting' | 'description' | 'voting' | 'results'
export type PlayerType = 'civilian' | 'undercover'
export type descriptionType = Record<string, string>[]
export type voteType = Record<string, string>[]
export interface RoomSetting {
  mode: 'online' | 'offline';
  playerNumber: number;
  undercoverNumber: number;
  password?: string;
}
export interface Player {
  id: string;
  name: string;
  isHost: boolean;
  socketId: string;
  isUndercover: boolean;
  word: string;
  isEliminated: boolean;
  inTurn: boolean;
  isWordSetter: boolean
}

export interface GameRoom extends RoomSetting {
  code: string;
  players: Player[];
  phase: GamePhase;
  civilianWord: string;
  undercoverWord: string;
  round: number;
  descriptions: descriptionType
  votes: voteType
  winner: string
}

export interface GameServiceResponse<T = {[key: string]: any}> {
  success: boolean;
  msg?: string;
  data: T
}

export interface Room {
  code: string,
  host: string,
  availableNum: number
}
