<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useGameStore } from '../stores/gameStore'

const router = useRouter()
const gameStore = useGameStore()

const playerName = ref('')
const roomCode = ref('')
const showCreateRoom = ref(false)
const showJoinRoom = ref(false)
const isLoading = ref(false)
const error = ref('')

const toggleCreateRoom = () => {
  showCreateRoom.value = !showCreateRoom.value
  showJoinRoom.value = false
  error.value = ''
}

const toggleJoinRoom = () => {
  showJoinRoom.value = !showJoinRoom.value
  showCreateRoom.value = false
  error.value = ''
}

const createRoom = async () => {
  if (!playerName.value.trim()) {
    error.value = 'Please enter your name'
    return
  }

  // Check if socket is connected
  debugger
  if (!gameStore.socketConnected) {
    error.value = gameStore.socketError || 'Unable to connect to game server. Please try again later.'
    return
  }
  
  isLoading.value = true
  
  try {
    const newRoomCode = gameStore.createRoom(playerName.value.trim())
    router.push({ name: 'lobby', params: { roomCode: newRoomCode } })
  } catch (err) {
    error.value = 'Failed to create room. Please try again.'
    console.error(err)
  } finally {
    isLoading.value = false
  }
}

const joinRoom = async () => {
  if (!playerName.value.trim()) {
    error.value = 'Please enter your name'
    return
  }
  
  if (!roomCode.value.trim()) {
    error.value = 'Please enter a room code'
    return
  }

  // Check if socket is connected
  if (!gameStore.socketConnected) {
    error.value = gameStore.socketError || 'Unable to connect to game server. Please try again later.'
    return
  }
  
  isLoading.value = true
  
  try {
    gameStore.joinRoom(roomCode.value.trim().toUpperCase(), playerName.value.trim())
    router.push({ name: 'lobby', params: { roomCode: roomCode.value.trim().toUpperCase() } })
  } catch (err) {
    error.value = 'Failed to join room. Please check the room code and try again.'
    console.error(err)
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div class="page-container h-screen flex items-center justify-center">
    <div class="w-full max-w-md">
      <div class="card animate-fade-in">
        <h1 class="text-center text-3xl font-bold mb-8">Who Is the Undercover?</h1>
        
        <!-- Socket connection warning -->
        <div 
          v-if="!gameStore.socketConnected" 
          class="mb-6 p-4 bg-warning-500 bg-opacity-10 border border-warning-500 rounded-lg text-warning-500 text-center"
        >
          <p class="font-medium mb-1">Game server not available</p>
          <p class="text-sm">{{ gameStore.socketError || 'Waiting for server connection...' }}</p>
          <p class="text-sm mt-2">You can still explore the app, but multiplayer features won't work until the server is available.</p>
        </div>
        
        <div v-if="error" class="mb-6 p-4 bg-error-500 bg-opacity-10 border border-error-500 rounded-lg text-error-500 text-center">
          {{ error }}
        </div>
        
        <div class="space-y-6">
          <div class="text-center">
            <button 
              @click="toggleCreateRoom" 
              class="btn btn-primary w-full"
              :class="{ 'bg-opacity-90': isLoading }"
              :disabled="isLoading"
            >
              Create New Game
            </button>
          </div>
          
          <div class="text-center">
            <button 
              @click="toggleJoinRoom" 
              class="btn btn-secondary w-full"
              :class="{ 'bg-opacity-90': isLoading }"
              :disabled="isLoading"
            >
              Join Existing Game
            </button>
          </div>
          
          <!-- Create Room Form -->
          <div v-if="showCreateRoom" class="space-y-4 animate-slide-up">
            <div>
              <label for="playerName" class="block text-sm font-medium mb-1">Your Name</label>
              <input
                v-model="playerName"
                type="text"
                id="playerName"
                class="input"
                placeholder="Enter your name"
                :disabled="isLoading"
                @keyup.enter="createRoom"
              />
            </div>
            
            <button 
              @click="createRoom" 
              class="btn btn-primary w-full"
              :class="{ 'opacity-70': isLoading || !gameStore.socketConnected }"
              :disabled="isLoading || !gameStore.socketConnected"
            >
              <span v-if="isLoading">Creating...</span>
              <span v-else-if="!gameStore.socketConnected">Waiting for Server...</span>
              <span v-else>Create Room</span>
            </button>
          </div>
          
          <!-- Join Room Form -->
          <div v-if="showJoinRoom" class="space-y-4 animate-slide-up">
            <div>
              <label for="playerNameJoin" class="block text-sm font-medium mb-1">Your Name</label>
              <input
                v-model="playerName"
                type="text"
                id="playerNameJoin"
                class="input"
                placeholder="Enter your name"
                :disabled="isLoading"
                @keyup.enter="joinRoom"
              />
            </div>
            
            <div>
              <label for="roomCode" class="block text-sm font-medium mb-1">Room Code</label>
              <input
                v-model="roomCode"
                type="text"
                id="roomCode"
                class="input uppercase"
                placeholder="Enter room code"
                :disabled="isLoading"
                @keyup.enter="joinRoom"
              />
            </div>
            
            <button 
              @click="joinRoom" 
              class="btn btn-secondary w-full"
              :class="{ 'opacity-70': isLoading || !gameStore.socketConnected }"
              :disabled="isLoading || !gameStore.socketConnected"
            >
              <span v-if="isLoading">Joining...</span>
              <span v-else-if="!gameStore.socketConnected">Waiting for Server...</span>
              <span v-else>Join Room</span>
            </button>
          </div>
        </div>
        
        <div class="mt-8 text-center text-sm text-gray-500">
          <p>A social deduction game where you must find the undercover player!</p>
        </div>
      </div>
    </div>
  </div>
</template>