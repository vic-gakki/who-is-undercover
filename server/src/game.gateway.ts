import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { GameService } from './game.service';
import type { GameRoom, Player, RoomSetting } from './type';
import { ErrorMessage, OperateionMessage } from './constant';
@WebSocketGateway({
  cors: {
    origin: ['http://localhost:5173', 'http://192.168.101.2:5173'],
    credentials: true,
  },
})
export class GameGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(private readonly gameService: GameService) {}

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
    client.emit('room-list', this.gameService.getRoomList())
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('create-room')
  handleCreateRoom(client: Socket, payload: { roomCode: string, player: Player, settings: RoomSetting}) {
    const player = { ...payload.player, socketId: client.id };
    const {
      data
    } = this.gameService.createRoom(payload.roomCode, player, payload.settings);
    
    client.join(payload.roomCode);
    this.server.to(payload.roomCode).emit('room-joined', { players: this.gameService.maskPlayerInfo(data.room.players), roomCode: data.room.code, roomMode: data.room.mode });
    this.server.emit('room-list', this.gameService.getRoomList())
  }

  @SubscribeMessage('join-room')
  handleJoinRoom(client: Socket, payload: { roomCode: string; player: Player; password?: string }) {
    const player = { ...payload.player, socketId: client.id };
    const res = this.gameService.joinRoom(payload.roomCode, player, payload.password);
    if(!res.success) {
      return res
    }
    const {room} = res.data as {room: GameRoom}
    client.join(payload.roomCode);
    this.server.to(payload.roomCode).emit('room-joined', { players: this.gameService.maskPlayerInfo(room.players), roomCode: room.code, roomMode: room.mode });
    this.server.emit('room-list', this.gameService.getRoomList())
  }

  emitGameStatusUpdate(res){
    if(res.success){
      let { room, tie, maxVoteCount, playerId } = res.data as {room: GameRoom, [key:string]: any}
      const roomCode = room.code
      switch (res.msg) {
        case OperateionMessage.PLAYER_LEFT:
          this.server.to(room.code).emit('player-left', playerId);
          break;
        case OperateionMessage.GAME_ENDED:
          this.server.to(roomCode).emit('game-end', room);
          break;
        case OperateionMessage.DESCRIPTION_SUBMITTED:
          this.server.to(roomCode).emit('description-submitted', {
            descriptions: room.descriptions,
            phase: room.phase,
            players: this.gameService.maskPlayerInfo(room.players)
          });
          break;
        case OperateionMessage.VOTE_CASTED:
          this.server.to(roomCode).emit('vote-cast', {
            playerId,
            votes: room.votes,
            phase: room.phase,
            round: room.round,
            descriptions: room.descriptions,
            tie: tie,
            maxVotes: maxVoteCount,
            players: this.gameService.maskPlayerInfo(room.players)
          });
          break;
        default:
          break;
      }
    }
  }

  @SubscribeMessage('leave-room')
  handleLeaveRoom(client: Socket, payload: { roomCode: string; playerId: string }) {
    const res = this.gameService.leaveRoom(payload.roomCode, payload.playerId);
    client.leave(payload.roomCode);
    if(!res.success){
      return res
    }
    this.emitGameStatusUpdate(res)
    this.server.emit('room-list', this.gameService.getRoomList())
  }

  @SubscribeMessage('rejoin-room')
  handleRejoinRoom(client: Socket, payload: { roomCode: string; player: any }) {
    const player = { ...payload.player, socketId: client.id };
    const res = this.gameService.rejoinRoom(payload.roomCode, player);
    if(!res.success){
      return res
    }
    client.join(payload.roomCode);
    return res
  }

  @SubscribeMessage('start-game')
  handleStartGame(client: Socket, payload: { roomCode: string }) {
    const res = this.gameService.startGame(payload.roomCode);
    if(!res.success){
      return res
    }
    const {data} = res as {data: {room: GameRoom, [key:string]: any}}
    data.room.players.forEach(player => {
      this.server.to(player.socketId).emit('game-started', {
        players: this.gameService.maskPlayerInfo(data.room.players, player.id),
      });
    });
  }

  @SubscribeMessage('submit-description')
  handleSubmitDescription(client: Socket, payload: { roomCode: string; playerId: string; description: string }) {
    const res = this.gameService.submitDescription(
      payload.roomCode,
      payload.playerId,
      payload.description
    );
    if(!res.success){
      return res
    }
    this.emitGameStatusUpdate(res)
  }
  @SubscribeMessage('cast-vote')
  handleCastVote(client: Socket, payload: { roomCode: string; voterId: string; targetId: string }) {
    const res = this.gameService.castVote(payload.roomCode, payload.voterId, payload.targetId);
    if(!res.success){
      return res
    }
    this.emitGameStatusUpdate(res)
  }
  @SubscribeMessage('reset-game')
  handleResetGame(client: Socket, roomCode: string) {
    const res = this.gameService.resetGame(roomCode);
    if (res.success) {
      const {room} = res.data as {room: GameRoom}
      this.server.to(roomCode).emit('game-reset', room)
    }
  }
  @SubscribeMessage('toggle-word-setter')
  handleToggleWordSetter(client: Socket, data: {roomCode: string, playerId: string}) {
    const res = this.gameService.toggleWordSetter(data);
    if(!res.success){
      return res
    }
    const {room} = res.data as {room: GameRoom}
    this.server.to(data.roomCode).emit('word-setter-changed', this.gameService.maskPlayerInfo(room.players, data.playerId))
  }
  @SubscribeMessage('set-word')
  handleSetWord(client: Socket, data: {civilianWord: string, undercoverWord: string, roomCode: string}) {
    const res = this.gameService.setWord(data);
    if(!res.success){
      return res
    }
  }
}