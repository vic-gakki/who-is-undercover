import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { v4 as uuidv4 } from 'uuid'
import { socket, isConnected, connectionError } from '../services/socketService'
import socketService from '../services/socketService'

export type Player = {
  id: string
  name: string
  isHost: boolean
  isUndercover?: boolean
  isEliminated?: boolean
  word?: string
}

export type GamePhase = 'waiting' | 'description' | 'voting' | 'results'

interface GameSession {
  playerId: string
  playerName: string
  roomCode: string
  isHost: boolean
}

export const useGameStore = defineStore('game', () => {
  // State
  const roomCode = ref<string>('')
  const players = ref<Player[]>([])
  const currentPlayer = ref<Player | null>(null)
  const gamePhase = ref<GamePhase>('waiting')
  const currentTurn = ref<number>(0)
  const descriptions = ref<Record<string, string>>({})
  const votes = ref<Record<string, string>>({})
  const eliminations = ref<string[]>([])
  const winner = ref<'civilians' | 'undercover' | null>(null)
  const word = ref<string>('')
  const error = ref<string | null>(null)
  const isInitialized = ref(false)

  // Getters
  const isHost = computed(() => currentPlayer.value?.isHost || false)
  const activePlayers = computed(() => players.value.filter(p => !p.isEliminated))
  const currentTurnPlayer = computed(() => {
    const playerIndex = currentTurn.value % activePlayers.value.length
    return activePlayers.value[playerIndex] || null
  })
  const isCurrentTurn = computed(() => 
    currentTurnPlayer.value?.id === currentPlayer.value?.id
  )
  const canVote = computed(() => 
    gamePhase.value === 'voting' && !votes.value[currentPlayer.value?.id || '']
  )
  const voteResults = computed(() => {
    const results: Record<string, number> = {}
    Object.values(votes.value).forEach(playerId => {
      results[playerId] = (results[playerId] || 0) + 1
    })
    return results
  })
  const mostVotedPlayer = computed(() => {
    const results = voteResults.value
    if (Object.keys(results).length === 0) return null
    
    return Object.entries(results).reduce(
      (max, [playerId, count]) => count > max.count ? { playerId, count } : max,
      { playerId: '', count: 0 }
    ).playerId
  })
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
        })
      }
    }
  }

  function createRoom(playerName: string) {
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
      player: currentPlayer.value
    })
    
    return newRoomCode
  }

  function joinRoom(newRoomCode: string, playerName: string) {
    if (!socketConnected.value) {
      socketService.connect()
    }
    
    const playerId = uuidv4()
    
    currentPlayer.value = {
      id: playerId,
      name: playerName,
      isHost: false
    }
    
    roomCode.value = newRoomCode
    
    socket.emit('join-room', {
      roomCode: newRoomCode,
      player: currentPlayer.value
    })
  }

  function startGame() {
    if (!isHost.value) return
    
    socket.emit('start-game', {
      roomCode: roomCode.value
    })
  }

  function submitDescription(description: string) {
    if (!isCurrentTurn.value || !currentPlayer.value) return
    
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
    currentTurn.value = 0
    descriptions.value = {}
    votes.value = {}
    eliminations.value = []
    winner.value = null
    word.value = ''
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

    socket.on('game-started', (data: { players: Player[], word: string }) => {
      players.value = data.players
      
      const player = data.players.find(p => p.id === currentPlayer.value?.id)
      if (player) {
        word.value = player.word || ''
        currentPlayer.value = { ...currentPlayer.value, ...player }
      }
      
      gamePhase.value = 'description'
      currentTurn.value = 0
    })

    socket.on('description-submitted', (data: { 
      playerId: string, 
      description: string, 
      nextTurn: number 
    }) => {
      descriptions.value[data.playerId] = data.description
      currentTurn.value = data.nextTurn
      
      if (data.nextTurn >= players.value.length) {
        gamePhase.value = 'voting'
      }
    })

    socket.on('vote-cast', (data: { 
      voterId: string, 
      targetId: string, 
      allVotes: Record<string, string> 
    }) => {
      votes.value = data.allVotes
    })

    socket.on('player-eliminated', (data: { 
      playerId: string, 
      isUndercover: boolean, 
      nextRound: boolean, 
      winner: 'civilians' | 'undercover' | null 
    }) => {
      players.value = players.value.map(p => 
        p.id === data.playerId ? { ...p, isEliminated: true } : p
      )
      
      eliminations.value.push(data.playerId)
      winner.value = data.winner
      
      if (data.nextRound) {
        gamePhase.value = 'description'
        votes.value = {}
        currentTurn.value = 0
      }
    })

    socket.on('game-reset', () => {
      gamePhase.value = 'waiting'
      currentTurn.value = 0
      descriptions.value = {}
      votes.value = {}
      eliminations.value = []
      winner.value = null
      word.value = ''
      
      players.value = players.value.map(p => ({
        ...p,
        isUndercover: undefined,
        isEliminated: undefined,
        word: undefined
      }))
    })

    socket.on('error', (data: { message: string }) => {
      error.value = data.message
      
      setTimeout(() => {
        error.value = null
      }, 5000)
    })
  }

  return {
    // State
    roomCode,
    players,
    currentPlayer,
    gamePhase,
    currentTurn,
    descriptions,
    votes,
    eliminations,
    winner,
    word,
    error,
    
    // Getters
    isHost,
    activePlayers,
    currentTurnPlayer,
    isCurrentTurn,
    canVote,
    voteResults,
    mostVotedPlayer,
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