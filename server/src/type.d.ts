export type GamePhase = 'waiting' | 'description' | 'voting' | 'results'
export type PlayerType = 'civilian' | 'undercover'
export type descriptionType = Array<Record<string, string>>
export type voteType = Array<Record<string, string>>
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
  isUndercover?: boolean;
  word?: string;
  isEliminated?: boolean;
  inTurn?: boolean;
}

export interface GameRoom extends RoomSetting {
  code: string;
  players: Player[];
  phase: GamePhase;
  civilianWord?: string;
  undercoverWord?: string;
  round?: number;
  descriptions?: descriptionType
  votes?: voteType
}

export interface GameServiceResponse<T = {[key: string]: any}> {
  success: boolean;
  msg?: string;
  data: T
}