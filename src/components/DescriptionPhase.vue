<script setup lang="ts">
import { ref, computed } from 'vue'
import { useGameStore } from '../stores/gameStore';
import { storeToRefs } from 'pinia';

const {
  descriptions,
  currentPlayer,
  currentTurnPlayer,
  isCurrentTurn
} = storeToRefs(useGameStore())

const emit = defineEmits<{
  (e: 'submitDescription', description: string): void
}>()

const description = ref('')
const isLoading = ref(false)

const isInputValid = computed(() => {
  return description.value.trim().length >= 3
})

const submitDescription = () => {
  if (!isInputValid.value || !isCurrentTurn.value) return
  
  isLoading.value = true
  emit('submitDescription', description.value.trim())
  
  // Reset after submission
  setTimeout(() => {
    description.value = ''
    isLoading.value = false
  }, 500)
}
</script>

<template>
  <div>
    <!-- Current Player Turn Indicator -->
    <div 
      class="mb-6 p-4 rounded-lg border-2 flex items-center"
      :class="isCurrentTurn ? 'border-accent-400 bg-accent-50 dark:bg-accent-900 dark:bg-opacity-20 animate-pulse-once' : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800'"
    >
      <div v-if="currentTurnPlayer" class="flex-grow">
        <div class="font-medium mb-1">
          <span v-if="isCurrentTurn" class="text-accent-600 dark:text-accent-400">Your turn to describe!</span>
          <span v-else>{{ currentTurnPlayer.name }}'s turn to describe</span>
        </div>
        <p class="text-sm text-gray-600 dark:text-gray-300">
          <span v-if="isCurrentTurn">
            Describe your word without saying it directly. Be careful - the undercover is listening!
          </span>
          <span v-else>
            Waiting for {{ currentTurnPlayer.name }} to provide a description...
          </span>
        </p>
      </div>
      
      <div v-if="currentTurnPlayer && isCurrentTurn" class="ml-4">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-accent-500" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clip-rule="evenodd" />
        </svg>
      </div>
    </div>
    
    <!-- Description Input (only shown when it's current player's turn) -->
    <div v-if="isCurrentTurn" class="mb-8">
      <div class="mb-4">
        <label for="description" class="block text-sm font-medium mb-1">Your Description</label>
        <textarea
          v-model="description"
          id="description"
          rows="3"
          class="input"
          placeholder="Describe your word without saying it directly..."
          :disabled="isLoading"
        ></textarea>
      </div>
      
      <div class="flex justify-center">
        <button 
          @click="submitDescription" 
          class="btn btn-primary"
          :disabled="!isInputValid || isLoading"
          :class="{ 'opacity-70': !isInputValid || isLoading }"
        >
          <span v-if="isLoading">Submitting...</span>
          <span v-else>Submit Description</span>
        </button>
      </div>
    </div>
    
    <!-- Previous Descriptions -->
    <div class="mt-8" v-if="descriptions.length > 0">
      <h3 class="text-lg font-semibold mb-4">Previous Descriptions</h3>
      
      <div class="space-y-4">
        <div v-for="(round, rindex) of descriptions">
          <p>Round {{ rindex + 1 }}</p>
          <div 
            v-for="({playerId, description, name}, index) in round" 
            :key="playerId"
            class="p-4 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 animate-fade-in"
          >
            <div class="flex items-start">
              <div class="w-8 h-8 rounded-full bg-secondary-500 flex items-center justify-center text-white font-medium text-sm mr-3 flex-shrink-0">
                {{ index + 1 }}
              </div>
              
              <div>
                <div class="font-medium mb-1">
                  {{ playerId === currentPlayer?.id ? 'You' : name }}
                </div>
                <p class="text-gray-700 dark:text-gray-300">
                  "{{ description }}"
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>