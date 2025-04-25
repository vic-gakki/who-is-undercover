import { Injectable } from '@nestjs/common';
import { Socket } from 'socket.io';

export interface RoomSetting {
  mode: 'online' | 'offline';
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
  descriptions?: string[];
  votes?: string[];
}

export interface GameRoom extends RoomSetting {
  code: string;
  players: Player[];
  phase: 'waiting' | 'description' | 'voting' | 'results';
  civilianWord?: string;
  undercoverWord?: string;
  round: number;
}

@Injectable()
export class GameService {
  private rooms: Map<string, GameRoom> = new Map();

  createRoom(roomCode: string, player: Player, settings: RoomSetting): GameRoom {
    const room: GameRoom = {
      code: roomCode,
      players: [player],
      phase: 'waiting',
      round: 0,
      ...settings
    };
    
    this.rooms.set(roomCode, room); 
    return room;
  }

  joinRoom(roomCode: string, player: Player, password: string): GameRoom | null | Error {
    const room = this.rooms.get(roomCode);
    if (!room) return null;
    if (room.password && room.password !== password) return new Error('Invalid password');
    room.players.push(player);
    return room;
  }

  rejoinRoom(roomCode: string, player: Player): GameRoom | null {
    const room = this.rooms.get(roomCode);
    if (!room) return null;

    // Update the player's socket ID if they already exist in the room
    const existingPlayerIndex = room.players.findIndex(p => p.id === player.id);
    if (existingPlayerIndex !== -1) {
      room.players[existingPlayerIndex] = {
        ...room.players[existingPlayerIndex],
        socketId: player.socketId,
      };
    } else {
      // If player doesn't exist (rare case), add them
      room.players.push(player);
    }

    return room;
  }

  leaveRoom(roomCode: string, playerId: string): GameRoom | null {
    const room = this.rooms.get(roomCode);
    if (!room) return;
    
    room.players = room.players.filter(p => p.id !== playerId);
    
    if (room.players.length === 0) {
      this.rooms.delete(roomCode);
    } else if (room.players.length > 0 && room.players[0].isHost === false) {
      room.players[0].isHost = true;
    }
    return room
  }

  getRoom(roomCode: string): GameRoom | null {
    return this.rooms.get(roomCode) || null;
  }

  startGame(roomCode: string): GameRoom | null {
    const room = this.rooms.get(roomCode);
    if (!room) return null;
    
    const words = this.getWordPair();
    const undercoverIndex = Math.floor(Math.random() * room.players.length);
    
    room.civilianWord = words.civilian;
    room.undercoverWord = words.undercover;
    
    room.players = room.players.map((player, index) => ({
      ...player,
      isUndercover: index === undercoverIndex,
      word: index === undercoverIndex ? words.undercover : words.civilian,
      isEliminated: false,
    }));
    
    room.phase = 'description';
    
    return room;
  }

  private getWordPair(): { civilian: string; undercover: string } {
    const wordPairs = [
      { civilian: 'Beach', undercover: 'Desert' },
      { civilian: 'Pizza', undercover: 'Burger' },
      { civilian: 'Cat', undercover: 'Dog' },
      { civilian: 'Coffee', undercover: 'Tea' },
      { civilian: 'Summer', undercover: 'Winter' },
    ];
    
    return wordPairs[Math.floor(Math.random() * wordPairs.length)];
  }

  submitDescription(roomCode: string, playerId: string, description: string): GameRoom | null {
    const room = this.rooms.get(roomCode);
    if (!room) return null;
    
    const name = room.players.find(player => player.id === playerId)?.name;
    // room.descriptions[room.round].push({ playerId, description, name });
    // // Move to next player's turn
    // room.currentTurn = (room.currentTurn + 1) % this.getActivePlayers(roomCode).length;
    // if(room.currentTurn === 0){
    //   room.round++
    // }
    return room;
  }

  getActivePlayers(roomCode: string): Player[] | null {
    const room = this.rooms.get(roomCode);
    if (!room) return [];
    
    return room.players.filter(player => !player.isEliminated);
  }

  castVote(roomCode: string, voterId: string, targetId: string): GameRoom | null {
    const room = this.rooms.get(roomCode);
    if (!room) return null;
    // if(!room.votes[room.round]){
    //   room.votes[room.round] = []
    // }
    // room.votes[room.round].push({ voterId, targetId });
    
    // // Check if all players have voted
    // if (Object.keys(room.votes).length === room.players.length) {
    //   const voteCounts = Object.values(room.votes).reduce((acc, vote) => {
    //     acc[vote] = (acc[vote] || 0) + 1;
    //     return acc;
    //   }, {} as Record<string, number>);
      
    //   const maxVotes = Math.max(...Object.values(voteCounts));
    //   const targets = Object.keys(voteCounts).filter(playerId => voteCounts[playerId] === maxVotes);
      
    //   if (targets.length > 0) {
    //     const targetId = targets[0];
    //     const targetPlayer = room.players.find(player => player.id === targetId);
        
    //     if (targetPlayer) {
    //       targetPlayer.isEliminated = true;
    //       room.phase = 'results';
    //       room.votes = {}; // Reset votes for the next round
    //     }
    //   }
    // }
    
    return room;
  }
}