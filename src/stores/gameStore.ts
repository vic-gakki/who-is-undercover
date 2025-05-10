import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { v4 as uuidv4 } from 'uuid'
import { socket, isConnected, connectionError } from '../services/socketService'
import socketService from '../services/socketService'
import { useRouter } from 'vue-router'
import type {Player, GamePhase, descriptionType, voteType, GameRoom, Room} from '../../server/src/type'
import { isNil } from '../util'
import MessageFn from '../components/Message'
import {useI18n} from 'vue-i18n'
interface GameSession {
  roomCode: string
  player: Pick<Player, 'id' | 'name' | 'isHost'>
}
interface UpdateOptions {
  exit?: boolean, 
  room?: GameRoom
}

const ERROR_TIMEOUT = 1500

export const useGameStore = defineStore('game', () => {
  const router = useRouter()
  const {t} = useI18n()
  // State
  const roomCode = ref<string>('')
  const players = ref<Player[]>([])
  const gamePhase = ref<GamePhase | null>(null)
  const winner = ref('')
  const word = ref('')
  const isUndercover = ref(false)
  const error = ref<string | null>(null)
  const isInitialized = ref(false)
  const round = ref<number | null>(null)
  const votes = ref<voteType>([])
  const descriptions = ref<descriptionType>([])
  const civilianWord = ref('')
  const undercoverWord = ref('')
  const roomMode = ref('offline')
  const currentPlayerId = ref('')
  const showVoteModal = ref(false)
  const roomList = ref<Room[]>([])

  // Getters
  const currentPlayer = computed(() => players.value.find(player => player.id === currentPlayerId.value))
  const isHost = computed(() => currentPlayer.value?.isHost || false)
  const activePlayers = computed(() => players.value.filter(p => !p.isEliminated && !p.isWordSetter))
  const currentTurnPlayer = computed(() => players.value.find(player => player.inTurn))
  const roundDescriptions = computed(() => isNil(round.value) ? {} : descriptions.value[round.value] ?? {})
  const roundVotes = computed(() => isNil(round.value) ? {} : votes.value[round.value] ?? {})
  const isOfflineRoom = computed(() => roomMode.value === 'offline')
  const canVote = computed(() =>
    currentPlayer.value && gamePhase.value === 'voting' && !roundVotes.value[currentPlayer.value.id]
  )
  const gameOver = computed(() => {
    if (!winner.value) return false
    return true
  })
  const socketConnected = computed(() => isConnected.value)
  const socketError = computed(() => connectionError.value)
  const voteModalOpen = computed(() => {
    return !currentPlayer.value?.isEliminated && (isOfflineRoom.value ? showVoteModal.value : gamePhase.value === 'voting')
  })

  const inGamePlayers = computed(() => players.value.filter(player => !player.isWordSetter))

  // Session Management
  function saveSession() {
    if (currentPlayer.value && roomCode.value) {
      const {id, name, isHost} = currentPlayer.value
      const session: GameSession = {
        player: {
          id,
          name,
          isHost
        },
        roomCode: roomCode.value,
      }
      localStorage.setItem('gameSession', JSON.stringify(session))
    }
  }

  function loadSession(): GameSession | null {
    const sessionData = localStorage.getItem('gameSession')
    return sessionData ? JSON.parse(sessionData) : null
  }

  function clearSession() {
    localStorage.removeItem('gameSession')
  }

  function showError (message: string) {
    error.value = message
    setTimeout(() => {
      error.value = null
    }, ERROR_TIMEOUT)
  }

  // Watch for changes that should trigger session save
  watch([currentPlayer, roomCode], () => {
    if (currentPlayer.value && roomCode.value) {
      saveSession()
    }
  })

  watch(gamePhase, () => {
    switch(gamePhase.value){
      case null:
        router.replace('/')
        break;
      case 'waiting':
        router.replace({ name: 'lobby', params: { roomCode: roomCode.value } })
        break;
      case 'description':
      case "voting":
        router.replace({ name: 'game', params: { roomCode: roomCode.value } })
        break;
      case 'results':
        router.replace({ name: 'results', params: { roomCode: roomCode.value } })
    }
  })

  // Actions
  function initializeSocketConnection() {
    if (!isInitialized.value) {
      socketService.connect()
      initSocketListeners()
      isInitialized.value = true

      // Try to restore session
      const session = loadSession()
      if (session) {
        // Rejoin room
        socket.emit('rejoin-room', session, (res:any) => {
          const {data} = res
          if(!res.success){
            showError(res.msg)
            router.replace('/')
            clearSession()
          }else {
            const {room, currentPlayer} = data as {room: GameRoom, currentPlayer: Player}
            updateGameInfo({room})
            word.value = currentPlayer.word!
            isUndercover.value = currentPlayer.isUndercover!
            currentPlayerId.value = currentPlayer.id
          }
        })
      }else {
        router.replace('/')
      }
    }
  }

  function createRoom(playerName: string, password: string, isOnline: boolean, playerNumber: number, undercoverNumber: number) {
    if (!socketConnected.value) {
      socketService.connect()
    }
    
    const playerId = uuidv4()
    const newRoomCode = generateRoomCode()
    
    const player = {
      id: playerId,
      name: playerName,
      isHost: true
    }

    currentPlayerId.value = playerId
    roomCode.value = newRoomCode
    
    socket.emit('create-room', {
      roomCode: newRoomCode,
      settings: {
        password,
        mode: isOnline ? 'online' : 'offline',
        playerNumber,
        undercoverNumber
      },
      player
    })
    
    return newRoomCode
  }

  function joinRoom(newRoomCode: string, playerName: string, password: string) {
    if (!socketConnected.value) {
      socketService.connect()
    }
    
    const playerId = uuidv4()
    
    const player = {
      id: playerId,
      name: playerName,
      isHost: false
    }

    currentPlayerId.value = playerId
    
    socket.emit('join-room', {
      roomCode: newRoomCode,
      player,
      password
    }, (res: Record<string ,string>) => {
      if(!res.success){
        showError(res.msg)
        return
      }
    })
  }

  function startGame() {
    if (!isHost.value) return
    
    socket.emit('start-game', {
      roomCode: roomCode.value
    }, (res: Record<string ,string>) => {
      if(!res.success){
        showError(res.msg)
        return
      }
    })
  }

  function submitDescription(description: string) {
    if (!currentPlayer.value) return
    
    socket.emit('submit-description', {
      roomCode: roomCode.value,
      playerId: currentPlayer.value.id,
      description
    }, (res: Record<string ,string>) => {
      if(!res.success){
        showError(res.msg)
        return
      }
    })
  }

  function submitVote(targetPlayerId: string) {
    if (!canVote.value || !currentPlayer.value) return
    
    socket.emit('cast-vote', {
      roomCode: roomCode.value,
      voterId: currentPlayer.value.id,
      targetId: targetPlayerId
    }, (res: Record<string ,string>) => {
      if(!res.success){
        showError(res.msg)
        return
      }
    })
  }

  function resetGame() {
    if (!isHost.value) return
    
    socket.emit('reset-game', roomCode.value)
  }

  function leaveRoom() {
    if (!currentPlayer.value) return
    
    socket.emit('leave-room', {
      roomCode: roomCode.value,
      playerId: currentPlayer.value.id
    })
    
    clearSession()
    updateGameInfo({exit: true})
    currentPlayerId.value = ''
  }

  // Helper functions
  function generateRoomCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase()
  }
  
  function updateGameInfo({exit = false, room}: UpdateOptions = {exit: false}){
    exit && (roomCode.value = '')
    exit && (currentPlayerId.value = '')
    exit && (roomMode.value = '')
    !room && (word.value = '')
    !room && (isUndercover.value = false)
    roomMode.value = room?.mode ?? ''
    players.value = exit ? [] : room!.players
    gamePhase.value = exit ? null : room!.phase
    round.value = exit ? null : room!.round
    winner.value = room?.winner ?? ''
    votes.value = room?.votes ?? []
    descriptions.value = room?.descriptions ?? []
    civilianWord.value = room?.civilianWord ?? ''
    undercoverWord.value = room?.undercoverWord ?? ''
    roomCode.value = room?.code ?? ''
    showVoteModal.value = false
  }

  function toggleVoteModal(bool: boolean){
    showVoteModal.value = bool
  }

  function toggleWordSetter(){
    const wordSetter = players.value.find(player => player.isWordSetter)!
    if(wordSetter && wordSetter !== currentPlayer.value){
      MessageFn.error(t('info.someoneSetWord', {name: wordSetter.name}))
      return
    }
    socket.emit('toggle-word-setter', {
      roomCode: roomCode.value,
      playerId: currentPlayer.value?.id
    })
  }

  function setWord(data: {civilianWord: string, undercoverWord: string}){
    localStorage.setItem('game-word', JSON.stringify(data))
    socket.emit('set-word', {
      ...data,
      roomCode: roomCode.value
    })
  }

  // Socket listeners
  function initSocketListeners() {
    socket.on('room-list', (data: Room[]) => {
      roomList.value = data
    })
    socket.on('room-joined', (data: { players: Player[], roomCode: string, roomMode: string }) => {
      players.value = data.players
      gamePhase.value = 'waiting'
      roomCode.value = data.roomCode
      roomMode.value = data.roomMode
    })

    socket.on('player-left', (data: { playerId: string }) => {
      players.value = players.value.filter(p => p.id !== data.playerId)
    })

    socket.on('game-started', (data: { players: Player[] }) => {
      players.value = data.players
      word.value = currentPlayer.value?.word!
      isUndercover.value = currentPlayer.value?.isUndercover!
      gamePhase.value = isOfflineRoom.value ? 'voting' : 'description'
      round.value = 0
    })

    socket.on('description-submitted', (data: { 
      players: Player[],
      descriptions: descriptionType,
      phase: GamePhase
    }) => {
      players.value = data.players
      descriptions.value = data.descriptions
      gamePhase.value = data.phase
    })
    socket.on('vote-cast', (data: { 
      players: Player[],
      votes: voteType,
      phase: GamePhase,
      round: number,
      descriptions: descriptionType,
      tie?: string[],
      maxVotes?: number,
      playerId?: string
    }) => {
      players.value = data.players
      gamePhase.value = data.phase
      votes.value = data.votes
      descriptions.value = data.descriptions
      round.value = data.round
      if(data.tie) {
        const playNames = data.players.filter(player => data.tie?.includes(player.id)).map(player => player.name)
        return MessageFn.error(t('info.tie', {
          names: playNames.join(', '),
          count: data.maxVotes
        }))
      }
      if(data.playerId){
        if(currentPlayer.value?.id === data.playerId){
          MessageFn.error(t('info.youAreEliminated'))
        }else {
          const name = data.players.find(player => player.id === data.playerId)?.name
          MessageFn.success(t('info.elimilatedNotice', {name}))
        }
        showVoteModal.value = false
      }
    })

    socket.on('game-reset', (room) => {
      updateGameInfo({room})
    })

    socket.on('game-end', (room: GameRoom) => {
      updateGameInfo({room})
    })

    socket.on('error', (data: { message: string }) => {
      showError(data.message)
    })

    socket.on('word-setter-changed', (allPlayers: Player[]) => {
      players.value = allPlayers
    })
  }

  return {
    // State
    roomCode,
    players,
    currentPlayer,
    currentTurnPlayer,
    gamePhase,
    winner,
    word,
    error,
    round,
    votes,
    descriptions,
    isUndercover,
    roomMode,
    roomList,
    
    // Getters
    isHost,
    activePlayers,
    canVote,
    gameOver,
    socketConnected,
    socketError,
    roundVotes,
    roundDescriptions,
    isOfflineRoom,
    voteModalOpen,
    inGamePlayers,

    // Actions
    initializeSocketConnection,
    createRoom,
    joinRoom,
    startGame,
    submitDescription,
    submitVote,
    resetGame,
    leaveRoom,
    toggleVoteModal,
    toggleWordSetter,
    setWord
  }
})