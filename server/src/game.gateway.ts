import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { GameService } from './game.service';
import type { Player } from './game.service';
import type { RoomSetting } from './game.service';
import { ErrorCode, ErrorMessage } from './constant';
@WebSocketGateway({
  cors: {
    origin: ['http://localhost:5173'],
    credentials: true,
  },
})
export class GameGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(private readonly gameService: GameService) {}

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('create-room')
  handleCreateRoom(client: Socket, payload: { roomCode: string, player: Player, settings: RoomSetting}) {
    const player = { ...payload.player, socketId: client.id };
    const room = this.gameService.createRoom(payload.roomCode, player, payload.settings);
    
    client.join(payload.roomCode);
    this.server.to(payload.roomCode).emit('room-joined', { players: room.players });
  }

  @SubscribeMessage('join-room')
  handleJoinRoom(client: Socket, payload: { roomCode: string; player: Player; password?: string }) {
    const player = { ...payload.player, socketId: client.id };
    const room = this.gameService.joinRoom(payload.roomCode, player, payload.password);
    if(room instanceof Error) {
      return {
        errorCode: ErrorCode.INVALID_PASSWORD,
        error: ErrorMessage.INVALID_PASSWORD,
      }
    }
    if (room) {
      client.join(payload.roomCode);
      this.server.to(payload.roomCode).emit('room-joined', { players: room.players });
      return room
    } else {
      return {
        errorCode: ErrorCode.ROOM_NOT_FOUND,
        error: ErrorMessage.ROOM_NOT_FOUND,
      }
    }
  }

  @SubscribeMessage('leave-room')
  handleLeaveRoom(client: Socket, payload: { roomCode: string; playerId: string }) {
    const room = this.gameService.leaveRoom(payload.roomCode, payload.playerId);
    if (room) {
      client.leave(payload.roomCode);
      this.server.to(payload.roomCode).emit('player-left', {
        playerId: payload.playerId,
        players: room.players
      });
    }
  }

  @SubscribeMessage('rejoin-room')
  handleRejoinRoom(client: Socket, payload: { roomCode: string; player: any }) {
    const player = { ...payload.player, socketId: client.id };
    const room = this.gameService.rejoinRoom(payload.roomCode, player);
    
    if (room) {
      client.join(payload.roomCode);
      this.server.to(payload.roomCode).emit('room-joined', { players: room.players });
      
      // If game is in progress, send current game state
      if (room.phase !== 'waiting') {
        const playerData = room.players.find(p => p.id === player.id);
        if (playerData) {
          client.emit('game-started', {
            players: room.players.map(p => ({
              id: p.id,
              name: p.name,
              isHost: p.isHost,
              isUndercover: p.id === player.id ? p.isUndercover : undefined,
              word: p.id === player.id ? p.word : undefined,
            })),
            word: playerData.word,
          });
        }
      }
    }
    return room ?? {
      errorCode: ErrorCode.ROOM_NOT_FOUND, 
      error: ErrorMessage.ROOM_NOT_FOUND,
    }
  }

  @SubscribeMessage('start-game')
  handleStartGame(client: Socket, payload: { roomCode: string }) {
    const room = this.gameService.startGame(payload.roomCode);
    
    if (room) {
      room.players.forEach(player => {
        this.server.to(player.socketId).emit('game-started', {
          players: room.players.map(p => ({
            id: p.id,
            name: p.name,
            isHost: p.isHost,
            isUndercover: p.id === player.id ? p.isUndercover : undefined,
            word: p.id === player.id ? p.word : undefined,
          })),
          word: player.word,
        });
      });
      room.phase = 'description';
      this.server.to(payload.roomCode).emit('phase-changed', { phase: 'description' });
    }
  }

  @SubscribeMessage('submit-description')
  handleSubmitDescription(client: Socket, payload: { roomCode: string; playerId: string; description: string }) {
    const room = this.gameService.submitDescription(
      payload.roomCode,
      payload.playerId,
      payload.description
    );
    
    // if (room) {
    //   // Broadcast the new description to all players
    //   this.server.to(payload.roomCode).emit('description-submitted', {
    //     playerId: payload.playerId,
    //     nextTurn: room.currentTurn,
    //     descriptions: room.descriptions,
    //     round: room.round
    //   });

    //   // Move to next turn or voting phase if all descriptions are in
    //   if (!room.descriptions[room.round]) {
    //     room.phase = 'voting';
    //     this.server.to(payload.roomCode).emit('phase-changed', { phase: 'voting' });
    //   }
    // }
  }
  @SubscribeMessage('cast-vote')
  handleCastVote(client: Socket, payload: { roomCode: string; voterId: string; targetId: string }) {
    const room = this.gameService.castVote(payload.roomCode, payload.voterId, payload.targetId);
    
    // if (room) {
    //   this.server.to(payload.roomCode).emit('vote-cast', {
    //     voterId: payload.voterId,
    //     targetId: payload.targetId,
    //     allVotes: room.votes,
    //   });
    // }
  }
}