import { Injectable } from '@nestjs/common';
import type {Player, GameRoom, RoomSetting} from './type'
import { ErrorMessage, OperateionMessage } from './constant';
import { generateErrorResponse, genereateSuccessResponse } from './utils';

@Injectable()
export class GameService {
  private rooms: Map<string, GameRoom> = new Map();

  getRoomList(){
    return [...this.rooms.values()].map(room => {
      return {
        code: room.code,
        host: room.players.find(player => player.isHost)?.name,
        availableNum: room.playerNumber - room.players.length
      }
    })
  }

  createRoom(roomCode: string, player: Player, settings: RoomSetting) {
    settings.playerNumber = settings.playerNumber ?? 8
    settings.undercoverNumber = settings.undercoverNumber ?? 1
    const room: GameRoom = {
      code: roomCode,
      players: [player],
      phase: 'waiting',
      round: 0,
      civilianWord: '',
      undercoverWord: '',
      descriptions: [],
      votes: [],
      winner: '',
      ...settings
    };
    
    this.rooms.set(roomCode, room); 
    return genereateSuccessResponse(OperateionMessage.ROOM_CREATED, {room})
  }

  joinRoom(roomCode: string, player: Player, password: string) {
    const room = this.rooms.get(roomCode);
    if (!room) {
      return generateErrorResponse(ErrorMessage.ROOM_NOT_FOUND);
    }
    if(room.players.length >= room.playerNumber){
      return generateErrorResponse(ErrorMessage.ROOM_FULL);
    }
    if (room.password && room.password !== password) {
      return generateErrorResponse(ErrorMessage.INVALID_PASSWORD);
    }
    if(room.phase !== 'waiting'){
      return generateErrorResponse(ErrorMessage.GAME_ALREADY_STARTED);
    }
    room.players.push(player);
    return genereateSuccessResponse(OperateionMessage.PLAYER_JOINED, {room})
  }

  rejoinRoom(roomCode: string, player: Player) {
    const room = this.rooms.get(roomCode);
    if (!room) {
      return generateErrorResponse(ErrorMessage.ROOM_NOT_FOUND);
    }

    const existingPlayerIndex = room.players.findIndex(p => p.id === player.id);
    if (existingPlayerIndex !== -1) {
      room.players[existingPlayerIndex] = {
        ...room.players[existingPlayerIndex],
        socketId: player.socketId,
      };
    } else {
      return generateErrorResponse(ErrorMessage.UNKNOEN_ERROR);
    }
    const currentPlayer = room.players[existingPlayerIndex]
    return genereateSuccessResponse(OperateionMessage.PLAYER_REJOINED, {room, currentPlayer});
  }


  // PLAYER_LEFT | GAME_ENDED | DESCRIPTION_SUBMITTED | VOTE_CASTED
  leaveRoom(roomCode: string, playerId: string) {
    const room = this.rooms.get(roomCode);
    if (!room) {
      return generateErrorResponse(ErrorMessage.ROOM_NOT_FOUND);
    }

    const leavedPlayer = room.players.find(player => player.id === playerId);
    room.players = room.players.filter(p => p.id !== playerId);
    
    if (room.players.length === 0) {
      this.rooms.delete(roomCode);
    } else if (room.players.length > 0 && room.players[0].isHost === false) {
      room.players[0].isHost = true;
    }

    if(!leavedPlayer.isEliminated && !leavedPlayer.isWordSetter && (room.phase === 'description' || room.phase === 'voting')){
      return this.updateGameStatus(roomCode, leavedPlayer)
    }
    return genereateSuccessResponse(OperateionMessage.PLAYER_LEFT, {
      room,
      playerId
    })
  }

  shufflePlayers<T>(players: T[]): T[] {
    players = [...players]
    players.sort(() => Math.random() - 0.5);
    return players
  }

  startGame(roomCode: string) {
    const room = this.rooms.get(roomCode);
    if (!room) {
      return generateErrorResponse(ErrorMessage.ROOM_NOT_FOUND);
    }
    const hasWordSetter = room.players.some(player => player.isWordSetter)
    if(hasWordSetter && !(room.civilianWord && room.undercoverWord)){
      return generateErrorResponse(ErrorMessage.SETTING_WORD)
    }
    if(!room.civilianWord && !room.undercoverWord){
      const {civilian, undercover} = this.getWordPair();
      room.civilianWord = civilian;
      room.undercoverWord = undercover;
    }
    const inGamePlayers = room.players.filter(p => !p.isWordSetter)
    const players = this.shufflePlayers(inGamePlayers)
    const underCoverIds = players.slice(0, room.undercoverNumber).map(player => player.id)
    
    room.phase = room.mode === 'offline' ? 'voting' : 'description';
    const firstId = inGamePlayers[0].id
    room.players = room.players.map((player) => {
      const isUndercover = underCoverIds.includes(player.id);
      return {
        ...player,
        isUndercover,
        word: isUndercover ? room.undercoverWord : room.civilianWord,
        isEliminated: false,
        inTurn: player.id === firstId
      }
    });
    return genereateSuccessResponse(OperateionMessage.GAME_STARTED, {room});
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

  submitDescription(roomCode: string, playerId: string, description: string) {
    const room = this.rooms.get(roomCode);
    if (!room) {
      return generateErrorResponse(ErrorMessage.ROOM_NOT_FOUND);
    }
    const roundDescriptions = room.descriptions[room.round] || (room.descriptions[room.round] = {})
    roundDescriptions[playerId] = description
    return this.updateGameStatus(roomCode)
  }

  getActivePlayers(roomCode: string): Player[] {
    const room = this.rooms.get(roomCode);
    return room.players.filter(player => !player.isEliminated && !player.isWordSetter);
  }

  getVoteResults(votes: Record<string, string>): Record<string, number> {
    return Object.values(votes).reduce((acc, cur) => {
      acc[cur] = (acc[cur] || 0) + 1;
      return acc;
    }, {})
  }

  castVote(roomCode: string, voterId: string, targetId: string) {
    const room = this.rooms.get(roomCode);
    if (!room) {
      return generateErrorResponse(ErrorMessage.ROOM_NOT_FOUND);
    }
    const roundVotes = room.votes[room.round] || (room.votes[room.round] = {})
    roundVotes[voterId] = targetId
    return this.updateGameStatus(roomCode)
  }
  resetGame(roomCode: string) {
    const room = this.rooms.get(roomCode);
    if (!room) {
      return generateErrorResponse(ErrorMessage.ROOM_NOT_FOUND);
    }
    room.civilianWord = '';
    room.undercoverWord = '';
    room.phase = 'waiting';
    room.round = 0;
    room.descriptions = []
    room.votes = []
    room.winner = ''
    room.players = room.players.map((player) => {
      return {
        ...player,
        isUndercover: undefined,
        word: undefined,
        isEliminated: undefined,
        inTurn: undefined,
        isWordSetter: false
      }
    });
    return genereateSuccessResponse(OperateionMessage.GAME_RESTARTED, {room})
  }
  
  // GAME_ENDED | DESCRIPTION_SUBMITTED | VOTE_CASTED
  updateGameStatus(roomCode: string, leavedPlayer?: Player){
    const res = this.isGameOver(roomCode)
    if(res){
      return res
    }
    const room = this.rooms.get(roomCode);
    let activePlayers = this.getActivePlayers(roomCode)
    const activePlayerIds = activePlayers.map(player => player.id)
    if(room.phase === 'description'){
      const roundDescriptions = room.descriptions[room.round]
      const submittedDescriptonIds = Object.keys(roundDescriptions).filter(playerId => activePlayerIds.includes(playerId))
      const nextTurnPlayer = activePlayers.filter(player => !submittedDescriptonIds.includes(player.id))?.[0]
      activePlayers.forEach(player => player.inTurn = false)
      if(nextTurnPlayer){
        nextTurnPlayer.inTurn = true
      }
      const roundEnd = !nextTurnPlayer
      if(roundEnd){
        room.phase = 'voting'
      }
      return genereateSuccessResponse(OperateionMessage.DESCRIPTION_SUBMITTED, {
        roundEnd,
        room
      })
    }else if(room.phase === 'voting'){
      let roundVotes = room.votes[room.round]
      for(let key in roundVotes){
        if(roundVotes[key] === leavedPlayer?.id){
          delete roundVotes[key]
        }
      }
      const catedVoteIds = Object.keys(roundVotes).filter(voteId => activePlayerIds.includes(voteId))
      const voteDone = catedVoteIds.length === activePlayers.length
      let eliminatedPlayer: Player
      if(voteDone){
        const votes = this.getVoteResults(roundVotes)
        const maxVoteCount = Math.max(...Object.values(votes))
        const maxVotedPlayers = activePlayers.filter(player => votes[player.id] === maxVoteCount)
        if(maxVotedPlayers.length > 1){
          room.votes[room.round] = {}
          return genereateSuccessResponse(OperateionMessage.VOTE_CASTED, {
            room,
            tie: maxVotedPlayers.map(player => player.id),
            maxVoteCount,
            voteDone
          })
        }
        eliminatedPlayer = maxVotedPlayers[0]
        eliminatedPlayer.isEliminated = true
        const isGameOver = this.isGameOver(roomCode)
        if(isGameOver) {
          return isGameOver
        }
        activePlayers = this.getActivePlayers(roomCode)
        activePlayers[0].inTurn = true
        room.phase = room.mode === 'offline' ? 'voting' : 'description'
        room.round++
      }
      return genereateSuccessResponse(OperateionMessage.VOTE_CASTED, {
        room,
        voteDone,
        playerId: eliminatedPlayer?.id
      }) 
    }
  }
  isGameOver(roomCode: string) {
    const room = this.rooms.get(roomCode);
    const activePlayers = this.getActivePlayers(roomCode)
    const undercoverNum = activePlayers.filter(player => player.isUndercover).length
    const civilNum = activePlayers.filter(player => !player.isUndercover).length
    if(undercoverNum === 0 || undercoverNum === civilNum) {
      const isUndercoverWin = undercoverNum >= civilNum
      room.phase = 'results'
      room.winner = isUndercoverWin ? 'undercover' : 'civilian'
      return genereateSuccessResponse(OperateionMessage.GAME_ENDED, {
        room,
      })
    }
  }

  maskPlayerInfo(players: Player[], playerId?: string){
    return players.map(p => {
      const {socketId, ...res} = p
      return {
        ...res,
        isUndercover: p.id === playerId ? p.isUndercover : undefined,
        word: p.id === playerId ? p.word : undefined,
      }
    })
  }
  toggleWordSetter(data: {roomCode: string, playerId: string}){
    const {roomCode, playerId} = data
    const room = this.rooms.get(roomCode);
    if (!room) {
      return generateErrorResponse(ErrorMessage.ROOM_NOT_FOUND);
    }
    const setter = room.players.find(player => player.id === playerId)
    setter.isWordSetter = !setter.isWordSetter
    if(!setter.isWordSetter){
      room.civilianWord = '';
      room.undercoverWord = '';
    }
    return genereateSuccessResponse(OperateionMessage.WORD_SETTER_CHANGED, {
      room,
    })
  }
  setWord(data: {civilianWord: string, undercoverWord: string, roomCode: string}){
    const {roomCode, undercoverWord, civilianWord} = data
    const room = this.rooms.get(roomCode);
    if (!room) {
      return generateErrorResponse(ErrorMessage.ROOM_NOT_FOUND);
    }
    room.civilianWord = civilianWord;
    room.undercoverWord = undercoverWord;
    return genereateSuccessResponse(OperateionMessage.WORD_SETTER_CHANGED, {
      room,
    })
  }
}