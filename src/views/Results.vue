<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useGameStore } from '../stores/gameStore'
import PlayerCard from '../components/PlayerCard.vue'

const route = useRoute()
const router = useRouter()
const gameStore = useGameStore()

const roomCode = computed(() => route.params.roomCode as string)
const winner = computed(() => gameStore.winner)
const isUndercover = computed(() => gameStore.currentPlayer?.isUndercover)
const undercoverPlayer = computed(() => gameStore.players.find(p => p.isUndercover))
const civilianPlayers = computed(() => gameStore.players.filter(p => !p.isUndercover))

onMounted(() => {
  // If we don't have a current player or game over state, go back to home
  if (!gameStore.currentPlayer || !gameStore.winner) {
    router.replace('/')
    return
  }
  
  // If roomCode from route doesn't match store, update store
  if (gameStore.roomCode !== roomCode.value) {
    gameStore.roomCode = roomCode.value
  }
})

const startNewGame = () => {
  gameStore.resetGame()
  router.replace({ name: 'lobby', params: { roomCode: roomCode.value } })
}

const leaveGame = () => {
  gameStore.leaveRoom()
  router.replace('/')
}
</script>

<template>
  <div class="page-container">
    <div class="max-w-4xl mx-auto">
      <div class="card animate-fade-in">
        <div class="flex flex-col items-center mb-8">
          <h1 class="text-3xl md:text-4xl font-bold mb-2 text-center">Game Over!</h1>
          
          <!-- Winner Announcement -->
          <div 
            class="mt-4 py-3 px-6 rounded-full text-xl font-bold"
            :class="winner === 'undercover' ? 'bg-accent-100 text-accent-700 dark:bg-accent-900 dark:text-accent-300' : 'bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300'"
          >
            <span v-if="winner === 'undercover'">The Undercover Wins!</span>
            <span v-else>The Civilians Win!</span>
          </div>
          
          <!-- Personal Result -->
          <div class="mt-6 text-center">
            <p v-if="isUndercover && winner === 'undercover'" class="text-lg text-accent-500 font-medium">
              Congratulations! You successfully tricked the civilians.
            </p>
            <p v-else-if="isUndercover && winner === 'civilians'" class="text-lg text-gray-500 font-medium">
              You were discovered! Better luck next time.
            </p>
            <p v-else-if="!isUndercover && winner === 'civilians'" class="text-lg text-primary-500 font-medium">
              Congratulations! You successfully identified the undercover.
            </p>
            <p v-else class="text-lg text-gray-500 font-medium">
              The undercover was too clever this time.
            </p>
          </div>
        </div>
        
        <!-- Game Summary -->
        <div class="mb-8">
          <h2 class="text-xl font-semibold mb-4">Game Summary</h2>
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <!-- Undercover -->
            <div class="p-4 rounded-lg bg-accent-50 dark:bg-accent-900 dark:bg-opacity-20 border border-accent-200 dark:border-accent-800">
              <h3 class="text-lg font-medium mb-3 text-accent-700 dark:text-accent-300">Undercover</h3>
              
              <div v-if="undercoverPlayer" class="flex items-center space-x-3">
                <div class="w-10 h-10 rounded-full bg-accent-200 flex items-center justify-center text-accent-800 font-bold">
                  {{ undercoverPlayer.name.charAt(0) }}
                </div>
                <div>
                  <div class="font-medium">{{ undercoverPlayer.name }}</div>
                  <div class="text-sm text-accent-600 dark:text-accent-400">Word: {{ undercoverPlayer.word }}</div>
                </div>
                <div v-if="undercoverPlayer.id === gameStore.currentPlayer?.id" class="ml-auto text-xs px-2 py-1 rounded-full bg-accent-200 text-accent-800">
                  You
                </div>
              </div>
            </div>
            
            <!-- Civilians -->
            <div class="p-4 rounded-lg bg-primary-50 dark:bg-primary-900 dark:bg-opacity-20 border border-primary-200 dark:border-primary-800">
              <h3 class="text-lg font-medium mb-3 text-primary-700 dark:text-primary-300">Civilians</h3>
              
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
                    <div class="text-sm text-primary-600 dark:text-primary-400">Word: {{ player.word }}</div>
                  </div>
                  <div v-if="player.id === gameStore.currentPlayer?.id" class="ml-auto text-xs px-2 py-1 rounded-full bg-primary-200 text-primary-800">
                    You
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Eliminations -->
        <div class="mb-8">
          <h2 class="text-xl font-semibold mb-4">Elimination Order</h2>
          
          <div v-if="gameStore.eliminations.length > 0" class="space-y-2">
            <div 
              v-for="(playerId, index) in gameStore.eliminations" 
              :key="playerId"
              class="p-3 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center"
            >
              <span class="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-sm mr-3">
                {{ index + 1 }}
              </span>
              
              <span class="font-medium">
                {{ gameStore.players.find(p => p.id === playerId)?.name }}
              </span>
              
              <span 
                class="ml-auto text-xs px-2 py-1 rounded-full"
                :class="gameStore.players.find(p => p.id === playerId)?.isUndercover 
                  ? 'bg-accent-100 text-accent-800 dark:bg-accent-900 dark:bg-opacity-50 dark:text-accent-300' 
                  : 'bg-primary-100 text-primary-800 dark:bg-primary-900 dark:bg-opacity-50 dark:text-primary-300'"
              >
                {{ gameStore.players.find(p => p.id === playerId)?.isUndercover ? 'Undercover' : 'Civilian' }}
              </span>
            </div>
          </div>
          
          <div v-else class="text-center text-gray-500 italic">
            No eliminations occurred
          </div>
        </div>
        
        <!-- Action Buttons -->
        <div class="flex flex-col sm:flex-row justify-center space-y-4 sm:space-y-0 sm:space-x-4">
          <button 
            v-if="gameStore.isHost" 
            @click="startNewGame" 
            class="btn btn-primary"
          >
            Play Again
          </button>
          
          <button 
            v-else 
            class="btn btn-outline" 
            disabled
          >
            Waiting for host to start a new game...
          </button>
          
          <button 
            @click="leaveGame" 
            class="btn btn-outline"
          >
            Leave Game
          </button>
        </div>
      </div>
    </div>
  </div>
</template>