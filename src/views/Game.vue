<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useGameStore } from '../stores/gameStore'
import DescriptionPhase from '../components/DescriptionPhase.vue'
import VotingPhase from '../components/VotingPhase.vue'

const route = useRoute()
const router = useRouter()
const gameStore = useGameStore()

const showWordModal = ref(true)
const showLeaveConfirm = ref(false)

const roomCode = computed(() => route.params.roomCode as string)
const word = computed(() => gameStore.word)
const isUndercover = computed(() => gameStore.currentPlayer?.isUndercover)

// Watch for game phase changes
watch(() => gameStore.gamePhase, (newPhase) => {
  if (newPhase === 'results') {
    router.replace({ name: 'results', params: { roomCode: roomCode.value } })
  }
})

// Watch for game over state
watch(() => gameStore.gameOver, (isGameOver) => {
  if (isGameOver) {
    router.replace({ name: 'results', params: { roomCode: roomCode.value } })
  }
})

onMounted(() => {
  // If we don't have a current player or word, go back to home
  if (!gameStore.currentPlayer || !gameStore.word) {
    router.replace('/')
    return
  }
  
  // If roomCode from route doesn't match store, update store
  if (gameStore.roomCode !== roomCode.value) {
    gameStore.roomCode = roomCode.value
  }
})

const closeWordModal = () => {
  showWordModal.value = false
}

const leaveGame = () => {
  gameStore.leaveRoom()
  router.replace('/')
}

const confirmLeave = () => {
  showLeaveConfirm.value = true
}

const cancelLeave = () => {
  showLeaveConfirm.value = false
}
</script>

<template>
  <div class="page-container">
    <div class="max-w-4xl mx-auto">
      <div class="card animate-fade-in">
        <div class="flex flex-col md:flex-row justify-between items-center mb-8">
          <div>
            <h1 class="text-2xl md:text-3xl font-bold mb-2">
              <span v-if="gameStore.gamePhase === 'description'">Description Phase</span>
              <span v-else-if="gameStore.gamePhase === 'voting'">Voting Phase</span>
            </h1>
            <p class="text-gray-500">Room: {{ roomCode }}</p>
          </div>
          
          <div class="mt-4 md:mt-0 flex items-center">
            <button
              class="flex items-center px-3 py-2 rounded-lg border border-primary-500 text-primary-500 hover:bg-primary-500 hover:bg-opacity-10 transition-colors"
              @click="showWordModal = true"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
              </svg>
              View My Word
            </button>
          </div>
        </div>
        
        <div v-if="gameStore.error" class="mb-6 p-4 bg-error-500 bg-opacity-10 border border-error-500 rounded-lg text-error-500 text-center">
          {{ gameStore.error }}
        </div>
        
        <!-- Game Status Indicators -->
        <div class="mb-6 p-4 bg-gray-100 dark:bg-gray-700 rounded-lg">
          <div class="flex flex-col sm:flex-row justify-between items-center">
            <div class="mb-4 sm:mb-0">
              <div class="text-sm text-gray-500 mb-1">Players Remaining</div>
              <div class="font-bold text-lg">{{ gameStore.activePlayers.length }} / {{ gameStore.players.length }}</div>
            </div>
            
            <div class="flex items-center space-x-3">
              <div class="text-sm font-medium px-3 py-1 rounded-full bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300">
                <span v-if="isUndercover" class="animate-pulse">You are the Undercover</span>
                <span v-else>You are a Civilian</span>
              </div>
              
              <div class="text-sm px-3 py-1 rounded-full bg-secondary-100 text-secondary-700 dark:bg-secondary-900 dark:text-secondary-300">
                Your word: {{ word }}
              </div>
            </div>
          </div>
        </div>
        
        <!-- Description Phase -->
        <DescriptionPhase
          @submit-description="gameStore.submitDescription"
        />
        
        <!-- Voting Phase -->
        <VotingPhase
          v-if="gameStore.gamePhase === 'voting'"
          @submit-vote="gameStore.submitVote"
        />
        
        <!-- Action Buttons -->
        <div class="mt-8 flex justify-center">
          <button 
            @click="confirmLeave" 
            class="btn btn-outline text-error-500 border-error-500 hover:bg-error-500 hover:bg-opacity-10"
          >
            Leave Game
          </button>
        </div>
        
        <!-- Player's Word Modal -->
        <div v-if="showWordModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div class="bg-white dark:bg-gray-800 rounded-xl shadow-lg max-w-md w-full p-6 animate-slide-up">
            <h2 class="text-2xl font-bold mb-4">Your Word</h2>
            
            <div class="p-4 rounded-lg text-center mb-6" :class="isUndercover ? 'bg-accent-100 text-accent-700 dark:bg-accent-900 dark:text-accent-300' : 'bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300'">
              <div class="text-sm font-medium mb-2">
                <span v-if="isUndercover">You are the Undercover!</span>
                <span v-else>You are a Civilian</span>
              </div>
              <div class="text-2xl font-bold">{{ word }}</div>
            </div>
            
            <div v-if="isUndercover" class="mb-6 text-sm">
              <p class="font-medium">Your mission:</p>
              <ul class="list-disc list-inside mt-2 space-y-1">
                <li>Blend in with the civilians</li>
                <li>Figure out what their word is</li>
                <li>Avoid being detected</li>
              </ul>
            </div>
            
            <div v-else class="mb-6 text-sm">
              <p class="font-medium">Your mission:</p>
              <ul class="list-disc list-inside mt-2 space-y-1">
                <li>Describe your word without saying it directly</li>
                <li>Try to identify who has a different word</li>
                <li>Vote to eliminate the undercover</li>
              </ul>
            </div>
            
            <div class="text-center">
              <button @click="closeWordModal" class="btn btn-primary">
                Ready to Play
              </button>
            </div>
          </div>
        </div>
        
        <!-- Leave Confirmation Modal -->
        <div v-if="showLeaveConfirm" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div class="bg-white dark:bg-gray-800 rounded-xl shadow-lg max-w-md w-full p-6 animate-slide-up">
            <h2 class="text-2xl font-bold mb-4">Leave Game?</h2>
            
            <p class="mb-6">
              Are you sure you want to leave the game? This action cannot be undone.
            </p>
            
            <div class="flex justify-end space-x-4">
              <button @click="cancelLeave" class="btn btn-outline">
                Cancel
              </button>
              
              <button @click="leaveGame" class="btn bg-error-500 hover:bg-error-600 text-white">
                Leave Game
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>