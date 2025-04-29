<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useGameStore } from '../stores/gameStore'

const router = useRouter()
const gameStore = useGameStore()

const playerName = ref('')
const roomPassword = ref('')
const showPassword = ref(false)
const isOnline = ref(false) // true = online, false = offline
const roomCode = ref('')
const showCreateRoom = ref(false)
const showJoinRoom = ref(false)
const isLoading = ref(false)
const error = ref('')

const toggleCreateRoom = () => {
  showCreateRoom.value = !showCreateRoom.value
  showJoinRoom.value = false
  roomPassword.value = ''
  showPassword.value = false
  error.value = ''

}

const toggleJoinRoom = () => {
  showJoinRoom.value = !showJoinRoom.value
  showCreateRoom.value = false
  roomPassword.value = ''
  showPassword.value = false
  error.value = ''
}

const createRoom = async () => {
  if (!playerName.value.trim()) {
    error.value = 'Please enter your name'
    return
  }

  // Check if socket is connected
  if (!gameStore.socketConnected) {
    error.value = gameStore.socketError || 'Unable to connect to game server. Please try again later.'
    return
  }
  
  isLoading.value = true
  
  try {
    const newRoomCode = gameStore.createRoom(playerName.value.trim(), roomPassword.value.trim(), isOnline.value)
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
    gameStore.joinRoom(roomCode.value.trim().toUpperCase(), playerName.value.trim(), roomPassword.value.trim())
  } catch (err) {
    error.value = 'Failed to join room. Please check the room code and try again.'
    console.error(err)
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div class="page-container h-full flex items-center justify-center">
    <div class="w-full max-w-md">
      <div class="card animate-fade-in">
        <h1 class="text-center text-3xl font-bold mb-8">{{ $t('whoIsUndercover') }}</h1>
        
        <!-- Socket connection warning -->
        <div 
          v-if="!gameStore.socketConnected" 
          class="mb-6 p-4 bg-warning-500 bg-opacity-10 border border-warning-500 rounded-lg text-warning-500 text-center"
        >
          <p class="font-medium mb-1">{{$t('gameServerUnavailable')}}</p>
          <p class="text-sm">{{ gameStore.socketError || $t('waitForServerConnection') }}</p>
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
              {{ $t('op.createRoom') }}
            </button>
          </div>
          
          <div class="text-center">
            <button 
              @click="toggleJoinRoom" 
              class="btn btn-secondary w-full"
              :class="{ 'bg-opacity-90': isLoading }"
              :disabled="isLoading"
            >
              {{ $t('op.joinRoom') }}
            </button>
          </div>
          
          <!-- Create Room Form -->
          <div v-if="showCreateRoom" class="space-y-4 animate-slide-up">
            <div>
              <label for="playerName" class="block text-sm font-medium mb-1">{{ $t('yourName') }}</label>
              <input
                v-model="playerName"
                type="text"
                id="playerName"
                class="input"
                :placeholder="$t('info.inputName')"
                :disabled="isLoading"
              />
            </div>
            <div>
              <label for="roomPassword" class="block text-sm font-medium mb-1">{{ $t('roomPassword') }}</label>
              <div class="relative">
                <input
                  v-model="roomPassword"
                  :type="showPassword ? 'text' : 'password'"
                  id="roomPassword"
                  class="input !pr-10"
                  :placeholder="$t('inputPassword')"
                  :disabled="isLoading"
                  @keyup.enter="createRoom"
                />
                <button
                  type="button"
                  class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  @click="showPassword = !showPassword"
                >
                  <svg v-if="showPassword" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                    <path fill-rule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clip-rule="evenodd" />
                    <path d="M3 3l14 14" stroke="currentColor" stroke-width="2" />
                  </svg>
                  <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clip-rule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
            <div class="flex items-center">
              <label class="block text-sm font-medium mr-2">{{ $t('mode') }}</label>
              <div class="flex items-center">
                <div class="relative inline-block w-12 mr-2 align-middle select-none">
                  <input
                    v-model="isOnline"
                    type="checkbox"
                    name="mode"
                    id="mode"
                    class="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer transition-all duration-200 ease-in-out"
                    :class="!isOnline ? 'left-0' : 'left-full -translate-x-full'"
                  />
                  <label
                    for="mode"
                    class="toggle-label block overflow-hidden h-6 rounded-full cursor-pointer transition-colors duration-200"
                    :class="isOnline ? 'bg-green-400' : 'bg-gray-400'"
                  ></label>
                </div>
                <span class="text-sm font-medium ml-2" :class="isOnline ? 'text-green-400' : 'text-gray-600'">
                  {{ $t(isOnline ? 'online' : 'offline') }}
                </span>
              </div>
            </div>
            
            <button 
              @click="createRoom" 
              class="btn btn-primary w-full"
              :class="{ 'opacity-70': isLoading || !gameStore.socketConnected }"
              :disabled="isLoading || !gameStore.socketConnected"
            >
              <span v-if="isLoading">{{ $t('info.creating') }}</span>
              <span v-else-if="!gameStore.socketConnected">{{ $t('info.waitingForServer') }}</span>
              <span v-else>{{ $t('op.create') }}</span>
            </button>
          </div>
          
          <!-- Join Room Form -->
          <div v-if="showJoinRoom" class="space-y-4 animate-slide-up">
            <div>
              <label for="playerNameJoin" class="block text-sm font-medium mb-1">{{ $t('yourName') }}</label>
              <input
                v-model="playerName"
                type="text"
                id="playerNameJoin"
                class="input"
                :placeholder="$t('info.inputName')"
                :disabled="isLoading"
                @keyup.enter="joinRoom"
              />
            </div>
            
            <div>
              <label for="roomCode" class="block text-sm font-medium mb-1">{{ $t('roomCode') }}</label>
              <input
                v-model="roomCode"
                type="text"
                id="roomCode"
                class="input uppercase"
                :placeholder="$t('info.inputRoomCode')"
                :disabled="isLoading"
                @keyup.enter="joinRoom"
              />
            </div>

            <div>
              <label for="joinRoomPassword" class="block text-sm font-medium mb-1">{{ $t('roomPassword') }}</label>
              <div class="relative">
                <input
                  v-model="roomPassword"
                  :type="showPassword ? 'text' : 'password'"
                  id="joinRoomPassword"
                  class="input !pr-10"
                  :placeholder="$t('inputPassword')"
                  :disabled="isLoading"
                />
                <button
                  type="button"
                  class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  @click="showPassword = !showPassword"
                >
                  <svg v-if="showPassword" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                    <path fill-rule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clip-rule="evenodd" />
                    <path d="M3 3l14 14" stroke="currentColor" stroke-width="2" />
                  </svg>
                  <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clip-rule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
            
            <button 
              @click="joinRoom" 
              class="btn btn-secondary w-full"
              :class="{ 'opacity-70': isLoading || !gameStore.socketConnected }"
              :disabled="isLoading || !gameStore.socketConnected"
            >
              <span v-if="isLoading">{{ $t('info.joining') }}</span>
              <span v-else-if="!gameStore.socketConnected">{{ $t('info.waitingForServer') }}</span>
              <span v-else>{{ $t('op.join') }}</span>
            </button>
          </div>
        </div>
        
        <div class="mt-8 text-center text-sm text-gray-500">
          <p>{{ $t('info.desc') }}</p>
        </div>
      </div>
    </div>
  </div>
</template>