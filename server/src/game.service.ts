import { Injectable } from '@nestjs/common';
import { Socket } from 'socket.io';

interface Player {
  id: string;
  name: string;
  isHost: boolean;
  socketId: string;
  isUndercover?: boolean;
  word?: string;
  isEliminated?: boolean;
}

interface GameRoom {
  code: string;
  players: Player[];
  phase: 'waiting' | 'description' | 'voting' | 'results';
  currentTurn: number;
  descriptions: Record<string, string>;
  votes: Record<string, string>;
  civilianWord?: string;
  undercoverWord?: string;
}

@Injectable()
export class GameService {
  private rooms: Map<string, GameRoom> = new Map();

  createRoom(roomCode: string, player: Player): GameRoom {
    const room: GameRoom = {
      code: roomCode,
      players: [player],
      phase: 'waiting',
      currentTurn: 0,
      descriptions: {},
      votes: {},
    };
    
    this.rooms.set(roomCode, room);
    return room;
  }

  joinRoom(roomCode: string, player: Player): GameRoom | null {
    const room = this.rooms.get(roomCode);
    if (!room) return null;
    
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

  leaveRoom(roomCode: string, playerId: string): void {
    const room = this.rooms.get(roomCode);
    if (!room) return;
    
    room.players = room.players.filter(p => p.id !== playerId);
    
    if (room.players.length === 0) {
      this.rooms.delete(roomCode);
    } else if (room.players.length > 0 && room.players[0].isHost === false) {
      room.players[0].isHost = true;
    }
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
    room.currentTurn = 0;
    room.descriptions = {};
    room.votes = {};
    
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
}