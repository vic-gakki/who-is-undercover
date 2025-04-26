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
            players: room.players.map(p => {
              const {socketId, ...res} = p
              return {
                ...res,
                isUndercover: p.id === player.id ? p.isUndercover : undefined,
                word: p.id === player.id ? p.word : undefined,
              }
            }),
            word: playerData.word,
            phase: room.phase,
            round: room.round
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
      room.phase = 'description';
      room.players.forEach(player => {
        this.server.to(player.socketId).emit('game-started', {
          players: room.players.map(p => {
            const {socketId, ...res} = p
            return {
              ...res,
              isUndercover: p.id === player.id ? p.isUndercover : undefined,
              word: p.id === player.id ? p.word : undefined,
            }
          }),
          word: player.word,
          phase: room.phase
        });
      });
    }
  }

  @SubscribeMessage('submit-description')
  handleSubmitDescription(client: Socket, payload: { roomCode: string; playerId: string; description: string }) {
    const res = this.gameService.submitDescription(
      payload.roomCode,
      payload.playerId,
      payload.description
    );
    
    if (res) {
      // Broadcast the new description to all players
      const {room, roundEnd} = res
      this.server.to(payload.roomCode).emit('description-submitted', {
        players: room.players,
      });

      // Move to next turn or voting phase if all descriptions are in
      if (roundEnd) {
        room.phase = 'voting';
        this.server.to(payload.roomCode).emit('phase-changed', { phase: room.phase });
      }
    }
  }
  @SubscribeMessage('cast-vote')
  handleCastVote(client: Socket, payload: { roomCode: string; voterId: string; targetId: string }) {
    const res = this.gameService.castVote(payload.roomCode, payload.voterId, payload.targetId);
    if (res) {
      const {room, voteDone, gameOver, voteConflict, winner} = res
      this.server.to(payload.roomCode).emit('vote-cast', {
        players: room.players,
      });
      if (voteDone) {
        if(gameOver){
          room.phase = 'results';
          this.server.to(payload.roomCode).timeout(3000).emit('game-end', {
            players: room.players,
            winner,
            phase: room.phase
          })
        }else if(voteConflict) {
          this.server.to(payload.roomCode).timeout(3000).emit('vote-conflict', {
            players: room.players,
          })
        }else {
          room.phase = 'description';
          room.round++
          this.server.to(payload.roomCode).timeout(3000).emit('new-round', {
            players: room.players,
            round: room.round,
            phase: room.phase
          })
        }
      }
    }
  }
  @SubscribeMessage('reset-game')
  handleResetGame(client: Socket, roomCode: string) {
    const room = this.gameService.resetGame(roomCode);
    if (room) {
      this.server.to(roomCode).timeout(3000).emit('game-reset', {
        players: room.players,
        round: room.round,
        phase: room.phase
      })
    }
  }
}