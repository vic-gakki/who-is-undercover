<script setup lang="ts">
import { computed } from 'vue'
import { useGameStore } from '../stores/gameStore'
import { storeToRefs } from 'pinia'

const gameStore = useGameStore()
const {
  winner,
  isUndercover,
  players,
  currentPlayer,
  isHost
} = storeToRefs(gameStore)

const undercoverPlayers = computed(() => players.value.filter(p => p.isUndercover))
const civilianPlayers = computed(() => players.value.filter(p => !p.isUndercover))

const startNewGame = () => {
  gameStore.resetGame()
}

const leaveGame = () => {
  gameStore.leaveRoom()
}
</script>

<template>
  <div class="page-container">
    <div class="max-w-4xl mx-auto">
      <div class="card animate-fade-in">
        <div class="flex flex-col items-center mb-8">
          <h1 class="text-3xl md:text-4xl font-bold mb-2 text-center">{{ $t('gameOver') }}!</h1>
          
          <!-- Winner Announcement -->
          <div 
            class="mt-4 py-3 px-6 rounded-full text-xl font-bold"
            :class="winner === 'undercover' ? 'bg-accent-100 text-accent-700 dark:bg-accent-900 dark:text-accent-300' : 'bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300'"
          >
            <span v-if="winner === 'undercover'">{{ $t('info.undercoverWin') }}!</span>
            <span v-else>{{ $t('info.civilianWin') }}!</span>
          </div>
          
          <!-- Personal Result -->
          <div class="mt-6 text-center">
            <p v-if="isUndercover && winner === 'undercover'" class="text-lg text-accent-500 font-medium">
              {{ $t('info.undercoverWinDesc') }}
            </p>
            <p v-else-if="isUndercover && winner === 'civilian'" class="text-lg text-gray-500 font-medium">
              {{ $t('info.undercoverLoseDesc') }}
            </p>
            <p v-else-if="!isUndercover && winner === 'civilian'" class="text-lg text-primary-500 font-medium">
              {{ $t('info.civilianWinDesc') }}
            </p>
            <p v-else class="text-lg text-gray-500 font-medium">
              {{ $t('info.civilianLoseDesc') }}
            </p>
          </div>
        </div>
        
        <!-- Game Summary -->
        <div class="mb-8">
          <h2 class="text-xl font-semibold mb-4">{{ $t('gameSummary') }}</h2>
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <!-- Undercover -->
            <div class="p-4 rounded-lg bg-accent-50 dark:bg-accent-900 dark:bg-opacity-20 border border-accent-200 dark:border-accent-800">
              <h3 class="text-lg font-medium mb-3 text-accent-700 dark:text-accent-300">{{ $t('undercover') }}</h3>
              
              <div class="space-y-3">
                <div v-for="undercoverPlayer of undercoverPlayers" :key="undercoverPlayer.id" class="flex items-center space-x-3">
                  <div class="w-10 h-10 rounded-full bg-accent-200 flex items-center justify-center text-accent-800 font-bold">
                    {{ undercoverPlayer.name.charAt(0) }}
                  </div>
                  <div>
                    <div class="font-medium">{{ undercoverPlayer.name }}</div>
                    <div class="text-sm text-accent-600 dark:text-accent-400">{{ $t('word') }}: {{ undercoverPlayer.word }}</div>
                  </div>
                  <div v-if="undercoverPlayer.id === currentPlayer?.id" class="ml-auto text-xs px-2 py-1 rounded-full bg-accent-200 text-accent-800">
                    {{ $t('you') }}
                  </div>
                </div>
              </div>
            </div>
            
            <!-- Civilians -->
            <div class="p-4 rounded-lg bg-primary-50 dark:bg-primary-900 dark:bg-opacity-20 border border-primary-200 dark:border-primary-800">
              <h3 class="text-lg font-medium mb-3 text-primary-700 dark:text-primary-300">{{ $t('civilian') }}</h3>
              
              <div class="space-y-3">
                <div 
                  v-for="player in civilianPlayers" 
                  :key="player.id"
                  class="flex items-center space-x-3"
                >
                  <div class="w-10 h-10 rounded-full bg-primary-200 flex items-center justify-center text-primary-800 font-bold">
                    {{ player.name.charAt(0) }}
                  </div>
                  <div>
                    <div class="font-medium">{{ player.name }}</div>
                    <div class="text-sm text-primary-600 dark:text-primary-400">{{ $t('word') }}: {{ player.word }}</div>
                  </div>
                  <div v-if="player.id === currentPlayer?.id" class="ml-auto text-xs px-2 py-1 rounded-full bg-primary-200 text-primary-800">
                    {{ $t('you') }}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Action Buttons -->
        <div class="flex flex-col sm:flex-row justify-center space-y-4 sm:space-y-0 sm:space-x-4">
          <button 
            v-if="isHost" 
            @click="startNewGame" 
            class="btn btn-primary"
          >
            {{ $t('op.playAgain') }}
          </button>
          
          <button 
            v-else 
            class="btn btn-outline" 
            disabled
          >
            {{ $t('waitingForRestart') }}
          </button>
          
          <button 
            @click="leaveGame" 
            class="btn btn-outline"
          >
            {{ $t('op.leaveGame') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>