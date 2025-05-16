import { io, Socket } from 'socket.io-client'
import { ref } from 'vue'

// This URL would point to your NestJS server in production
// For local development, this would be your local NestJS server
const API_URL = import.meta.env.VITE_API_URL || 'http://192.168.101.2:3000'

// Use a ref to track connection status
const isConnected = ref(false)
const connectionError = ref<string | null>(null)

// Create socket instance without auto-connecting
let socket: Socket = io(API_URL, {
  autoConnect: false,
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  // transports: ['websocket', 'polling'],
  withCredentials: true,
})

// Setup event listeners
function setupSocketListeners() {
  socket.on('connect', () => {
    console.log('Connected to server')
    isConnected.value = true
    connectionError.value = null
  })

  socket.on('disconnect', () => {
    console.log('Disconnected from server')
    isConnected.value = false
  })

  socket.on('connect_error', (error) => {
    console.warn('Connection error:', error.message)
    connectionError.value = `Unable to connect to game server: ${error.message}`
    isConnected.value = false
  })

  socket.on('reconnect', (attemptNumber) => {
    console.log(`Reconnected after ${attemptNumber} attempts`)
    isConnected.value = true
    connectionError.value = null
  })

  socket.on('reconnect_error', (error) => {
    console.warn('Reconnection error:', error)
    connectionError.value = 'Failed to reconnect to game server'
  })

  socket.on('reconnect_failed', () => {
    console.warn('Failed to reconnect after maximum attempts')
    connectionError.value = 'Failed to connect after multiple attempts'
  })
}

// Initialize listeners
setupSocketListeners()

export { socket, isConnected, connectionError }

export default {
  // Connect manually when needed
  connect() {
    if (socket.disconnected) {
      console.log('Attempting to connect to server...')
      socket.connect()
    }
    return isConnected
  },
  
  disconnect() {
    if (socket.connected) {
      socket.disconnect()
    }
  },
  
  isConnected() {
    return isConnected.value
  },

  getConnectionError() {
    return connectionError.value
  },
  
  // Create a new socket instance (useful for reconnecting with new options)
  resetConnection(options = {}) {
    this.disconnect()
    socket = io(API_URL, {
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      ...options
    })
    setupSocketListeners()
  }
}