import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { v4 as uuidv4 } from 'uuid'
import { socket, isConnected, connectionError } from '../services/socketService'
import socketService from '../services/socketService'
import { useRouter } from 'vue-router'
import type {Player, GamePhase, descriptionType, voteType, PlayerType, GameRoom} from '../../server/src/type'
interface GameSession {
  roomCode: string
  player: Pick<Player, 'id' | 'name' | 'isHost'>
}

const ERROR_TIMEOUT = 1500

export const useGameStore = defineStore('game', () => {
  const router = useRouter()
  // State
  const roomCode = ref<string>('')
  const players = ref<Player[]>([])
  const gamePhase = ref<GamePhase | null>(null)
  const gaming = ref(false)
  const winner = ref()
  const word = ref('')
  const isUndercover = ref(false)
  const error = ref<string | null>(null)
  const isInitialized = ref(false)
  const round = ref(0)
  const votes = ref<voteType>([])
  const descriptions = ref<descriptionType>([])
  const currentPlayerId = ref('')

  // Getters
  const currentPlayer = computed(() => players.value.find(player => player.id === currentPlayerId.value))
  const isHost = computed(() => currentPlayer.value?.isHost || false)
  const activePlayers = computed(() => players.value.filter(p => !p.isEliminated))
  const currentTurnPlayer = computed(() => players.value.find(player => player.inTurn))
  const canVote = computed(() =>
    currentPlayer.value && gaming.value && gamePhase.value === 'voting' && !descriptions.value[round.value][currentPlayer.value.id]
  )
  const gameOver = computed(() => {
    if (!winner.value) return false
    return true
  })
  const socketConnected = computed(() => isConnected.value)
  const socketError = computed(() => connectionError.value)

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
            const {room, player} = data as {room: GameRoom, player: Player}
            gamePhase.value = room.phase
            round.value = room.round!
            players.value = room.players
            word.value = player.word!
            isUndercover.value = player.isUndercover!
            descriptions.value = room.descriptions!
            votes.value = room.votes!
            roomCode.value = room.code
            currentPlayerId.value = player.id
          }
        })
      }
    }
  }

  function createRoom(playerName: string, password: string, isOnline: boolean) {
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
        mode: isOnline ? 'online' : 'offline'
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
      
      // roomCode.value = newRoomCode
      // router.push({ name: 'lobby', params: { roomCode: newRoomCode } })
    })
  }

  function startGame() {
    if (!isHost.value) return
    
    socket.emit('start-game', {
      roomCode: roomCode.value
    })
  }

  function submitDescription(description: string) {
    if (!currentPlayer.value) return
    
    socket.emit('submit-description', {
      roomCode: roomCode.value,
      playerId: currentPlayer.value.id,
      description
    })
  }

  function submitVote(targetPlayerId: string) {
    if (!canVote.value || !currentPlayer.value) return
    
    socket.emit('cast-vote', {
      roomCode: roomCode.value,
      voterId: currentPlayer.value.id,
      targetId: targetPlayerId
    })
  }

  function resetGame() {
    if (!isHost.value) return
    
    socket.emit('reset-game', {
      roomCode: roomCode.value
    })
  }

  function leaveRoom() {
    if (!currentPlayer.value) return
    
    socket.emit('leave-room', {
      roomCode: roomCode.value,
      playerId: currentPlayer.value.id
    })
    
    clearSession()
    roomCode.value = ''
    players.value = []
    gamePhase.value = ''
    winner.value = null
    word.value = ''
    isUndercover.value = false
    round.value = null
    descriptions.value = []
    votes.value = []
  }

  // Helper functions
  function generateRoomCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase()
  }

  // Socket listeners
  function initSocketListeners() {
    socket.on('room-joined', (data: { players: Player[] }) => {
      players.value = data.players
    })

    socket.on('player-joined', (data: { player: Player }) => {
      players.value.push(data.player)
    })

    socket.on('player-left', (data: { playerId: string }) => {
      players.value = players.value.filter(p => p.id !== data.playerId)
    })

    socket.on('game-started', (data: { players: Player[], word: string, phase: GamePhase }) => {
      players.value = data.players
      
      const player = data.players.find(p => p.id === currentPlayer.value?.id)
      if (player) {
        word.value = player.word || ''
        currentPlayer.value = { ...currentPlayer.value, ...player }
      }
      
      gamePhase.value = data.phase
    })

    socket.on('description-submitted', (data: { 
      players: Player[]
    }) => {
      players.value = data.players
    })

    socket.on('phase-changed', (data: { 
      phase: GamePhase, 
    }) => {
      gamePhase.value = data.phase
    })

    socket.on('vote-cast', (data: { 
      players: Player[]
    }) => {
      players.value = data.players
    })

    socket.on('game-reset', (data: {
      players: Player[]
    }) => {
      gamePhase.value = 'waiting'
      winner.value = null
      word.value = ''
      round.value = null
      players.value = data.players
      router.replace({ name: 'lobby', params: { roomCode: roomCode.value } })
    })

    socket.on('new-round', (data: {
      players: Player[],
      round: number,
      phase: GamePhase
    }) => {
      players.value = data.players
      round.value = data.round
      gamePhase.value = data.phase
    })

    socket.on('vote-conflict', () => {
      
    })

    socket.on('game-end', (data: {
      players: Player[],
      winner: PlayerType,
      phase: GamePhase
    }) => {
      players.value = data.players
      winner.value = data.winner
      gamePhase.value = data.phase
    })

    socket.on('error', (data: { message: string }) => {
      showError(data.message)
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
    gaming,
    
    // Getters
    isHost,
    activePlayers,
    canVote,
    gameOver,
    socketConnected,
    socketError,
    
    // Actions
    initializeSocketConnection,
    createRoom,
    joinRoom,
    startGame,
    submitDescription,
    submitVote,
    resetGame,
    leaveRoom
  }
})