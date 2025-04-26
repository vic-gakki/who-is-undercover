import { Injectable } from '@nestjs/common';
import { Socket } from 'socket.io';

export type GamePhase = 'waiting' | 'description' | 'voting' | 'results'
export type PlayerType = 'civilians' | 'undercover'

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
  phase: GamePhase;
  civilianWord?: string;
  civilNumber?: number;
  undercoverNumber?: number;
  undercoverWord?: string;
  round: number;
  winner?: PlayerType
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
      inTurn: index === 0
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

  submitDescription(roomCode: string, playerId: string, description: string): {room: GameRoom, roundEnd: boolean} | null {
    const room = this.rooms.get(roomCode);
    if (!room) return null;
    const activePlayers = this.getActivePlayers(roomCode)
    const playerIndex = activePlayers.findIndex(player => player.id === playerId)
    const roundEnd = playerIndex === activePlayers.length - 1
    const currentPlayer = activePlayers[playerIndex]
    if(currentPlayer){
      if(!currentPlayer.descriptions){
        currentPlayer.descriptions = []
      }
      currentPlayer.descriptions[room.round] = description
    }
    currentPlayer.inTurn = false

    if(!roundEnd){
      room.players[playerIndex + 1].inTurn = true
    }
    
    return {
      room,
      roundEnd
    }
  }

  getActivePlayers(roomCode: string): Player[] | null {
    const room = this.rooms.get(roomCode);
    if (!room) return [];
    
    return room.players.filter(player => !player.isEliminated);
  }

  castVote(roomCode: string, voterId: string, targetId: string): {room: GameRoom, voteDone: boolean, gameOver: boolean, voteConflict: boolean, winner: string} | null {
    const room = this.rooms.get(roomCode);
    if (!room) return null;
    const voter = room.players.find(player => player.id === voterId)
    if(!voter.votes){
      voter.votes = []
    }
    voter.votes[room.round] = targetId
    let activePlayers = this.getActivePlayers(roomCode)
    const voteDone = activePlayers.every(player => !!player.votes?.[room.round])
    let gameOver = false
    let voteConflict = false
    let winner
    if(voteDone){
      const res = activePlayers.reduce((acc: Record<string, number>, cur) => {
        const id = cur.votes[room.round]
        if(id in acc){
          acc[id]++
        }else {
          acc[id] = 1
        }
        return acc
      }, {})
      const votes = Object.values(res)
      votes.sort()
      const maxVotes = votes.pop()
      const snd = votes.pop()
      let maxVotesId
      let maxVotePlayer
      if(maxVotes === snd) {
        // share same vote
        voteConflict = true
      }else {
        for(let key in res){
          if(res[key] === maxVotes){
            maxVotesId = key
          }
        }
      }
      if(maxVotesId){
        maxVotePlayer = room.players.find(player => player.id === maxVotesId)
        maxVotePlayer.isEliminated = true
        activePlayers = this.getActivePlayers(roomCode)
      }
      const undercoverNum = activePlayers.filter(player => player.isUndercover).length
      const civilNum = activePlayers.filter(player => !player.isUndercover).length
      if(undercoverNum === 0){
        gameOver = true
        winner = 'civil'
      }else if(undercoverNum >= civilNum){
        gameOver = true
        winner = 'undercover'
      }
    }
    if(gameOver){
      room.winner = winner
    }
    return {
      room,
      voteDone,
      gameOver,
      voteConflict,
      winner
    };
  }
  resetGame(roomCode: string){
    const room = this.rooms.get(roomCode);
    if (!room) return null;
    room.civilNumber = 0
    room.civilianWord = undefined
    room.undercoverNumber = 0
    room.undercoverWord = undefined
    room.round = null
    room.phase = 'waiting'
    room.winner = undefined
    room.players = room.players.map(player => {
      return {
        ...player,
        isUndercover: undefined,
        word: undefined,
        isEliminated: undefined,
        inTurn: undefined,
        descriptions: undefined,
        votes: undefined
      }
    })
    return room
  }
}