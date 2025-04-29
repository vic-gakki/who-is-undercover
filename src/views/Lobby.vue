<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useGameStore } from '../stores/gameStore'
import PlayerCard from '../components/PlayerCard.vue'
import { storeToRefs } from 'pinia'
const { t } = useI18n()
const gameStore = useGameStore()
const {
  isHost,
  roomCode,
  players,
  currentPlayer
} = storeToRefs(gameStore)

const isClipboardCopied = ref(false)
const showRules = ref(false)

const copyRoomCode = async () => {
  try {
    // Try modern clipboard API first
    await navigator.clipboard.writeText(roomCode.value)
    isClipboardCopied.value = true
  } catch (err) {
    // Fallback for non-HTTPS environments
    const textarea = document.createElement('textarea')
    textarea.value = roomCode.value
    textarea.style.position = 'fixed'  // Prevent scrolling to bottom
    document.body.appendChild(textarea)
    textarea.select()
    
    try {
      document.execCommand('copy')
      isClipboardCopied.value = true
    } catch (err) {
      console.error('Failed to copy room code:', err)
      return
    } finally {
      document.body.removeChild(textarea)
    }
  }
  
  setTimeout(() => {
    isClipboardCopied.value = false
  }, 2000)
}

const startGame = () => {
  gameStore.startGame()
}

const toggleRules = () => {
  showRules.value = !showRules.value
}

const leaveRoom = () => {
  gameStore.leaveRoom()
}
</script>

<template>
  <div class="page-container">
    <div class="max-w-3xl mx-auto">
      <div class="card animate-fade-in">
        <div class="flex flex-col md:flex-row justify-between items-center mb-8">
          <h1 class="text-2xl md:text-3xl font-bold mb-4 md:mb-0">{{t('lobbyTitle')}}</h1>
          
          <div class="flex items-center space-x-2">
            <span class="text-gray-500">{{ t('roomCode') }}: </span>
            <div 
              @click="copyRoomCode" 
              class="px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg font-mono font-bold cursor-pointer flex items-center"
            >
              {{ roomCode }}
              <button class="ml-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
                  <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
                </svg>
              </button>
            </div>
            <span v-if="isClipboardCopied" class="text-xs text-success-500 animate-fade-in">{{ t('op.copied') }}</span>
          </div>
        </div>
        
        <div class="mb-8">
          <h2 class="text-xl font-semibold mb-4">{{ t('players', {count: players.length}) }}</h2>
          
          <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <PlayerCard 
              v-for="player in players" 
              :key="player.id" 
              :player="player"
              :is-current="player.id === currentPlayer?.id"
            />
          </div>
          
          <div v-if="players.length < 3" class="mt-4 text-center text-warning-500">
            <p>{{ t('minPlayers', {current: players.length}) }}</p>
          </div>
        </div>
        
        <div class="flex flex-col md:flex-row justify-between space-y-4 md:space-y-0 md:space-x-4">
          <button 
            v-if="isHost" 
            @click="startGame" 
            class="btn btn-primary"
            :disabled="players.length < 3"
            :class="{ 'opacity-50 cursor-not-allowed': players.length < 3 }"
          >
            {{ t('op.startGame') }}
          </button>
          
          <button v-else class="btn btn-outline" disabled>
            {{ t('waitingForHost') }}
          </button>
          <button @click="leaveRoom" class="btn btn-outline text-error-500 border-error-500 hover:bg-error-500 hover:bg-opacity-10">
            {{ t('op.leaveRoom') }}
          </button>
          
        </div>
      </div>
    </div>
  </div>
</template>