<script setup lang="ts">
import { ref } from 'vue'
import { useGameStore } from '../stores/gameStore'
import DescriptionPhase from '../components/DescriptionPhase.vue'
import VotingPhase from '../components/VotingPhase.vue'
import EliminateHistory from '../components/EliminateHistory.vue'
import { storeToRefs } from 'pinia'

const gameStore = useGameStore()

const {
  roomCode,
  word,
  isUndercover,
  gamePhase,
  activePlayers,
  currentPlayer,
  players,
  isOfflineRoom
} = storeToRefs(gameStore)

const showWordModal = ref(false)
const showLeaveConfirm = ref(false)

const closeWordModal = () => {
  showWordModal.value = false
}

const leaveGame = () => {
  gameStore.leaveRoom()
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
            <h1 class="text-2xl md:text-3xl font-bold mb-2" v-if="!isOfflineRoom">
              <span v-if="gamePhase === 'description'">{{ $t('descPhase') }}</span>
              <span v-else-if="gamePhase === 'voting'">{{ $t('votePhase') }}</span>
            </h1>
            <p class="text-gray-500">{{ $t('roomCode') }}: {{ roomCode }}</p>
          </div>
          
          <div class="mt-4 md:mt-0 flex items-center">
            <button
              class="flex items-center px-3 py-2 rounded-lg border border-primary-500 text-primary-500 hover:bg-primary-500 hover:bg-opacity-10 transition-colors"
              @click="showWordModal = true"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
              </svg>
              {{ $t('op.viewMyWord') }}
            </button>
          </div>
        </div>
        
        <!-- Game Status Indicators -->
        <div class="mb-6 p-4 bg-gray-100 dark:bg-gray-700 rounded-lg">
          <div class="flex flex-col sm:flex-row justify-between items-center">
            <div class="mb-4 sm:mb-0">
              <div class="text-sm text-gray-500 mb-1">{{ $t('remainPlayer') }}</div>
              <div class="font-bold text-lg">{{ activePlayers.length }} / {{ players.length }}</div>
            </div>
            
            <div class="flex items-center space-x-3">
              <div class="text-sm font-medium px-3 py-1 rounded-full bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300">
                <span v-if="isUndercover" class="animate-pulse">{{ $t('isUndercover') }}</span>
                <span v-else>{{ $t('isCivilian') }}</span>
              </div>
              
              <div class="text-sm px-3 py-1 rounded-full bg-secondary-100 text-secondary-700 dark:bg-secondary-900 dark:text-secondary-300">
                {{ $t('yourWord') }}: {{ word }}
              </div>
            </div>
          </div>
        </div>

        <div v-if="currentPlayer?.isEliminated" class="mb-6 p-4 bg-gray-100 dark:bg-gray-700 rounded-lg">
          <p>{{ $t('info.youAreEliminated') }}</p>
        </div>

        <EliminateHistory />

        <!-- Description Phase -->
        <DescriptionPhase
        v-if="!isOfflineRoom"
          @submit-description="gameStore.submitDescription"
        />
        
        <!-- Voting Phase -->
        <VotingPhase
          @submit-vote="gameStore.submitVote"
        />
        
        <!-- Action Buttons -->
        <div class="mt-8 flex justify-center">
          <button 
            @click="confirmLeave" 
            class="btn btn-outline text-error-500 border-error-500 hover:bg-error-500 hover:bg-opacity-10"
          >
            {{ $t('op.leaveRoom') }}
          </button>
        </div>
        
        <!-- Player's Word Modal -->
        <div v-if="showWordModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div class="bg-white dark:bg-gray-800 rounded-xl shadow-lg max-w-md w-full p-6 animate-slide-up">
            <h2 class="text-2xl font-bold mb-4">{{ $t('yourWord') }}</h2>
            
            <div class="p-4 rounded-lg text-center mb-6" :class="isUndercover ? 'bg-accent-100 text-accent-700 dark:bg-accent-900 dark:text-accent-300' : 'bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300'">
              <div class="text-sm font-medium mb-2">
                <span v-if="isUndercover">{{ $t('isUndercover') }}!</span>
                <span v-else>{{ $t('isCivilian') }}</span>
              </div>
              <div class="text-2xl font-bold">{{ word }}</div>
            </div>
            
            <div v-if="isUndercover" class="mb-6 text-sm">
              <p class="font-medium">{{ $t('yourMission') }}:</p>
              <ul class="list-disc list-inside mt-2 space-y-1">
                <li v-for="num in 3">{{ $t(`info.undercoverMission[${num - 1}]`) }}</li>
              </ul>
            </div>
            
            <div v-else class="mb-6 text-sm">
              <p class="font-medium">{{ $t('yourMission') }}:</p>
              <ul class="list-disc list-inside mt-2 space-y-1">
                <li v-for="num in 3">{{ $t(`info.civilianMission[${num - 1}]`) }}</li>
              </ul>
            </div>
            
            <div class="text-center">
              <button @click="closeWordModal" class="btn btn-primary">
                {{ $t('op.readyToPlay') }}
              </button>
            </div>
          </div>
        </div>
        
        <!-- Leave Confirmation Modal -->
        <div v-if="showLeaveConfirm" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div class="bg-white dark:bg-gray-800 rounded-xl shadow-lg max-w-md w-full p-6 animate-slide-up">
            <h2 class="text-2xl font-bold mb-4">{{ $t('op.leaveGame') }}?</h2>
            
            <p class="mb-6">
              {{ $t('info.leaveGame') }}
            </p>
            
            <div class="flex justify-end space-x-4">
              <button @click="cancelLeave" class="btn btn-outline">
                {{ $t('op.cancel') }}
              </button>
              
              <button @click="leaveGame" class="btn bg-error-500 hover:bg-error-600 text-white">
                {{ $t('op.leaveGame') }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>