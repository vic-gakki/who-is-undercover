<script setup lang="ts">
import { ref, computed } from 'vue'
import { useGameStore } from '../stores/gameStore'
import { storeToRefs } from 'pinia'
const gameStore = useGameStore()
const {
  currentPlayer,
  canVote,
  activePlayers,
  roundVotes
} = storeToRefs(gameStore)
const emit = defineEmits<{
  (e: 'submitVote', targetId: string): void
}>()

const selectedPlayer = ref<string | null>(null)
const isLoading = ref(false)

const hasVoted = computed(() => {
  if (!currentPlayer.value) return false
  return !!roundVotes.value[currentPlayer.value.id]
})

const myVote = computed(() => {
  if (!currentPlayer.value || !hasVoted.value) return null
  return roundVotes.value[currentPlayer.value.id]
})

const submitVote = () => {
  if (!selectedPlayer.value || !canVote.value) return
  
  isLoading.value = true
  emit('submitVote', selectedPlayer.value)
  
  // Reset after submission
  setTimeout(() => {
    isLoading.value = false
  }, 500)
}

const votedPlayers = computed(() => {
  return Object.keys(roundVotes.value)
})

const isVoteComplete = computed(() => {
  return votedPlayers.value.length === activePlayers.value.length
})

const voteResults = computed(() => {
  return Object.values(roundVotes.value).reduce((acc: Record<string, number>, cur) => {
    acc[cur] = (acc[cur] || 0) + 1;
    return acc;
  }, {})
})

const getVoteCount = (playerId: string) => {
  return voteResults.value[playerId] || 0
}

</script>

<template>
  <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
    <div class="bg-white dark:bg-gray-800 rounded-xl shadow-lg max-w-md w-full p-6 animate-slide-up">
      <div
        class="mb-6 p-4 rounded-lg"
        :class="{ 
          'bg-primary-50 dark:bg-primary-900 dark:bg-opacity-20 border-2 border-primary-500': canVote,
          'bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700': !canVote
        }"
      >
        <h3 class="font-medium text-lg mb-2">
          <span v-if="canVote">{{ $t('info.timeToVote') }}</span>
          <span v-else-if="hasVoted">{{ $t('info.haveVoted') }}</span>
          <span v-else>{{ $t('info.voteInProgress') }}</span>
        </h3>
        
        <p class="text-sm text-gray-600 dark:text-gray-300">
          <span v-if="canVote">
            {{ $t('info.selectToVote') }}
          </span>
          <span v-else-if="hasVoted">
            {{ $t('info.waitingOthersVote', {name: activePlayers.find(p => p.id === myVote)?.name || 'Unknown'}) }}
          </span>
          <span v-else>
            {{ $t('info.waitVoteForAll') }}
          </span>
        </p>
        
        <div v-if="isVoteComplete" class="mt-4 p-3 bg-warning-500 bg-opacity-10 border border-warning-500 rounded-lg text-warning-500 text-sm font-medium">
          {{ $t('info.voteComplete') }}
        </div>
      </div>
      
      <!-- Players to Vote -->
      <div v-if="canVote" class="mb-8">
        <h3 class="text-lg font-semibold mb-4">{{ $t('info.selectPlayer') }}:</h3>
        
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div 
            v-for="player in activePlayers" 
            :key="player.id"
            @click="selectedPlayer = player.id === currentPlayer?.id ? selectedPlayer : player.id"
            class="cursor-pointer transition-all transform hover:scale-102"
            :class="{ 'opacity-50': player.id === currentPlayer?.id }"
          >
            <div 
              class="p-4 rounded-lg border-2 transition-colors"
              :class="selectedPlayer === player.id 
                ? 'border-primary-500 bg-primary-50 dark:bg-primary-900 dark:bg-opacity-20' 
                : 'border-gray-200 dark:border-gray-700'"
            >
              <div class="flex items-center">
                <div 
                  class="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white"
                  :class="player.isHost ? 'bg-secondary-500' : 'bg-primary-500'"
                >
                  {{ player.name.charAt(0) }}
                </div>
                
                <div class="ml-3 flex-grow">
                  <div class="font-medium">
                    {{ player.name }}
                    <span v-if="player.id === currentPlayer?.id" class="ml-1 text-xs text-gray-500">({{ $t('you') }})</span>
                  </div>
                </div>
                
                <div v-if="selectedPlayer === player.id" class="w-6 h-6 rounded-full bg-primary-500 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-white" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div class="mt-6 flex justify-center">
          <button 
            @click="submitVote" 
            class="btn btn-primary"
            :disabled="!selectedPlayer || isLoading || selectedPlayer === currentPlayer?.id"
            :class="{ 'opacity-70': !selectedPlayer || isLoading || selectedPlayer === currentPlayer?.id }"
          >
            <span v-if="isLoading">{{ $t('info.submitting') }}</span>
            <span v-else>{{ $t('op.submitVote') }}</span>
          </button>
        </div>
      </div>
      
      <!-- Vote Status -->
      <div v-if="!canVote && !isVoteComplete" class="mb-8">
        <h3 class="text-lg font-semibold mb-4">{{ $t('info.voteStatus') }}:</h3>
        
        <div class="p-4 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
          <div class="mb-4">
            <div class="flex justify-between items-center mb-2">
              <span class="text-sm font-medium">{{ $t('info.votesCast') }}</span>
              <span class="text-sm font-bold">{{ votedPlayers.length }} / {{ activePlayers.length }}</span>
            </div>
            
            <div class="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div 
                class="h-full bg-primary-500 transition-all" 
                :style="{ width: `${(votedPlayers.length / activePlayers.length) * 100}%` }"
              ></div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Vote Results (once everyone has voted) -->
      <div v-if="isVoteComplete" class="mb-8">
        <h3 class="text-lg font-semibold mb-4">{{ $t('info.voteResults') }}:</h3>
        
        <div class="space-y-4 flex">
          <div 
            v-for="player in activePlayers" 
            :key="player.id"
            class="p-4 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
            :class="{ 'border-error-500': getVoteCount(player.id) === Math.max(...Object.values(voteResults)) && getVoteCount(player.id) > 0 }"
          >
            <div class="flex items-center justify-between">
              <div class="flex items-center">
                <div 
                  class="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white"
                  :class="player.isHost ? 'bg-secondary-500' : 'bg-primary-500'"
                >
                  {{ player.name.charAt(0) }}
                </div>
                
                <div class="ml-3">
                  <div class="font-medium">
                    {{ player.name }}
                    <span v-if="player.id === currentPlayer?.id" class="ml-1 text-xs text-gray-500">({{ $t('you') }})</span>
                  </div>
                </div>
              </div>
              
              <div 
                class="px-3 py-1 rounded-full text-sm font-medium"
                :class="getVoteCount(player.id) > 0 
                  ? 'bg-error-500 bg-opacity-10 text-error-500' 
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'"
              >
                {{ getVoteCount(player.id) }} {{ getVoteCount(player.id) === 1 ? 'vote' : 'votes' }}
              </div>
            </div>
            
            <!-- Vote Bar -->
            <div class="mt-3">
              <div class="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div 
                  v-if="getVoteCount(player.id) > 0"
                  class="h-full bg-error-500 transition-all" 
                  :style="{ width: `${(getVoteCount(player.id) / activePlayers.length) * 100}%` }"
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>