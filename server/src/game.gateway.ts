import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { GameService } from './game.service';

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
  handleCreateRoom(client: Socket, payload: { roomCode: string; player: any }) {
    const player = { ...payload.player, socketId: client.id };
    const room = this.gameService.createRoom(payload.roomCode, player);
    
    client.join(payload.roomCode);
    this.server.to(payload.roomCode).emit('room-joined', { players: room.players });
  }

  @SubscribeMessage('join-room')
  handleJoinRoom(client: Socket, payload: { roomCode: string; player: any }) {
    const player = { ...payload.player, socketId: client.id };
    const room = this.gameService.joinRoom(payload.roomCode, player);
    
    if (room) {
      client.join(payload.roomCode);
      this.server.to(payload.roomCode).emit('room-joined', { players: room.players });
    } else {
      client.emit('error', { message: 'Room not found' });
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
    } else {
      client.emit('error', { message: 'Room not found' });
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
    } else {
      client.emit('error', { message: 'Room not found' });
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
    }
  }
}