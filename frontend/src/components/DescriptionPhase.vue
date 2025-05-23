<script setup lang="ts">
import { ref, computed } from 'vue'
import { useGameStore } from '../stores/gameStore';
import { storeToRefs } from 'pinia';
import { isNil } from '../util';

const {
  inGamePlayers,
  round,
  currentPlayer,
  currentTurnPlayer,
  descriptions,
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
  if (!isInputValid.value) return
  
  isLoading.value = true
  emit('submitDescription', description.value.trim())
  
  // Reset after submission
  setTimeout(() => {
    description.value = ''
    isLoading.value = false
  }, 500)
}

const getRound = (round:number) => {
  return descriptions.value[round] || {}
}

</script>

<template>
  <div>
    <!-- Current Player Turn Indicator -->
    <div
      v-if="currentTurnPlayer"
      class="mb-6 p-4 rounded-lg border-2 flex items-center"
      :class="currentPlayer?.inTurn ? 'border-accent-400 bg-accent-50 dark:bg-accent-900 dark:bg-opacity-20 animate-pulse-once' : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800'"
    >
      <div v-if="currentTurnPlayer" class="flex-grow">
        <div class="font-medium mb-1">
          <span v-if="currentPlayer?.inTurn" class="text-accent-600 dark:text-accent-400">{{ $t('info.yourTurnToDesc') }}!</span>
          <span v-else>{{ $t('info.someoneTurnToDesc', {name: currentTurnPlayer.name}) }}</span>
        </div>
        <p class="text-sm text-gray-600 dark:text-gray-300">
          <span v-if="currentPlayer?.inTurn">
            {{ $t('info.yourTurnTip') }}
          </span>
          <span v-else>
            {{ $t('info.watingDesc', {name: currentTurnPlayer.name}) }}
          </span>
        </p>
      </div>
      
      <div v-if="currentPlayer?.inTurn" class="ml-4">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-accent-500" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clip-rule="evenodd" />
        </svg>
      </div>
    </div>
    
    <!-- Description Input (only shown when it's current player's turn) -->
    <div v-if="currentPlayer?.inTurn" class="mb-8">
      <div class="mb-4">
        <label for="description" class="block text-sm font-medium mb-1">{{ $t('yourDesc') }}</label>
        <textarea
          v-model="description"
          id="description"
          rows="3"
          class="input"
          :placeholder="$t('info.descPlaceholder')"
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
          <span v-if="isLoading">{{ $t('info.submitting') }}</span>
          <span v-else>{{ $t('op.submitDesc') }}</span>
        </button>
      </div>
    </div>
    
    <!-- Previous Descriptions -->
    <div class="mt-8" v-if="!isNil(round)">
      <h3 class="text-lg font-semibold mb-4">{{ $t('prevDesc') }}</h3>
      <div v-for="(r, rindex) in (round + 1)" class="space-y-4">
          <p class="font-semibold">{{ $t('round', {round: r}) }}</p>
          <template v-for="(player, index) in inGamePlayers" :key="player.id">
            <div
              v-if="player.id in getRound(rindex)"
              class="p-4 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 animate-fade-in"
            >
              <div class="flex items-start">
                <div class="w-8 h-8 rounded-full bg-secondary-500 flex items-center justify-center text-white font-medium text-sm mr-3 flex-shrink-0">
                  {{ index + 1 }}
                </div>
                
                <div>
                  <div class="font-medium mb-1">
                    {{ player.id === currentPlayer?.id ? 'You' : player.name }}
                  </div>
                  <p class="text-gray-700 dark:text-gray-300">
                    "{{ getRound(rindex)[player.id] }}"
                  </p>
                </div>
              </div>
            </div>
          </template>
        </div>
    </div>
  </div>
</template>