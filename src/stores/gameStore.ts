import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { v4 as uuidv4 } from 'uuid'
import { socket, isConnected, connectionError } from '../services/socketService'
import socketService from '../services/socketService'
import { useRouter } from 'vue-router'
const ERROR_TIMEOUT = 1500

export type Player = {
  id: string
  name: string
  isHost: boolean
  isUndercover?: boolean
  isEliminated?: boolean
  word?: string
  inTurn?: boolean;
  descriptions?: string[];
  votes?: string[];
}

export type GamePhase = 'waiting' | 'description' | 'voting' | 'results'
export type PlayerType = 'civilians' | 'undercover'
interface GameSession {
  playerId: string
  playerName: string
  roomCode: string
  isHost: boolean
}

export const useGameStore = defineStore('game', () => {
  const router = useRouter()
  // State
  const roomCode = ref<string>('')
  const players = ref<Player[]>([])
  const currentPlayer = ref<Player | null>(null)
  const gamePhase = ref<GamePhase>('waiting')
  const winner = ref<PlayerType | null>(null)
  const word = ref<string>('')
  const error = ref<string | null>(null)
  const isInitialized = ref(false)
  const round = ref<number | null>(0)

  // Getters
  const isHost = computed(() => currentPlayer.value?.isHost || false)
  const activePlayers = computed(() => players.value.filter(p => !p.isEliminated))
  const currentTurnPlayer = computed(() => players.value.find(player => player.inTurn))
  const canVote = computed(() => 
    gamePhase.value === 'voting' && !currentPlayer.value?.votes?.[round.value ?? 0]
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
      const session: GameSession = {
        playerId: currentPlayer.value.id,
        playerName: currentPlayer.value.name,
        roomCode: roomCode.value,
        isHost: currentPlayer.value.isHost
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


  watch(players, () => {
    currentPlayer.value = players.value.find(player => player.id === currentPlayer.value?.id) ?? null
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
        currentPlayer.value = {
          id: session.playerId,
          name: session.playerName,
          isHost: session.isHost
        }
        roomCode.value = session.roomCode

        // Rejoin room
        socket.emit('rejoin-room', {
          roomCode: session.roomCode,
          player: currentPlayer.value
        }, (room:any) => {
          if(room.errorCode){
            showError(room.error)
            router.replace('/')
            clearSession()
          }else if(room) {
            router.replace({ name: 'game', params: { roomCode: roomCode.value } })
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
    
    currentPlayer.value = {
      id: playerId,
      name: playerName,
      isHost: true
    }
    
    roomCode.value = newRoomCode
    
    socket.emit('create-room', {
      roomCode: newRoomCode,
      settings: {
        password,
        mode: isOnline ? 'online' : 'offline'
      },
      player: currentPlayer.value
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
    
    socket.emit('join-room', {
      roomCode: newRoomCode,
      player,
      password
    }, (res: Record<string ,string>) => {
      if(res?.error){
        showError(res.error)
        return
      }
      roomCode.value = newRoomCode
      currentPlayer.value = player
      router.push({ name: 'lobby', params: { roomCode: newRoomCode } })
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
    currentPlayer.value = null
    gamePhase.value = 'waiting'
    winner.value = null
    word.value = ''
    round.value = null
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