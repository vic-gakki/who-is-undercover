<script setup lang="ts">
import type { Player } from '../../server/src/type'

defineProps<{
  player: Player
  isCurrent?: boolean
  isEliminated?: boolean
  showRole?: boolean
  showVotes?: boolean
  voteCount?: number
}>()
</script>

<template>
  <div 
    class="p-4 rounded-lg border transition-all"
    :class="[
      isCurrent ? 'border-primary-500 bg-primary-50 dark:bg-primary-900 dark:bg-opacity-20' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600',
      isEliminated ? 'opacity-60' : '',
      player.isEliminated ? 'opacity-60 bg-gray-100 dark:bg-gray-800' : ''
    ]"
  >
    <div class="flex items-center">
      <div 
        class="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white"
        :class="[
          player.isHost ? 'bg-secondary-500' : 'bg-primary-500',
          player.isEliminated ? 'bg-gray-400' : ''
        ]"
      >
        {{ player.name.charAt(0) }}
      </div>
      
      <div class="ml-3 flex-grow">
        <div class="font-medium flex items-center">
          {{ player.name }}
          <span v-if="isCurrent" class="ml-2 text-xs bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300 px-2 py-0.5 rounded-full">
            {{$t('you')}}
          </span>
        </div>
        
        <div class="flex items-center text-xs text-gray-500 dark:text-gray-400 mt-1">
          <span v-if="player.isHost" class="flex items-center mr-2">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 mr-1" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
            </svg>
            {{ $t('host') }}
          </span>
          <span v-if="player.isWordSetter">
            {{ $t('info.wordSetter') }}
          </span>
          
          <span v-if="player.isEliminated" class="flex items-center ml-2">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 mr-1" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M13.477 14.89A6 6 0 015.11 6.524l8.367 8.368zm1.414-1.414L6.524 5.11a6 6 0 018.367 8.367zM18 10a8 8 0 11-16 0 8 8 0 0116 0z" clip-rule="evenodd" />
            </svg>
            {{ $t('eliminated') }}
          </span>
        </div>
      </div>
      
      <div v-if="showRole && player.isUndercover !== undefined" class="ml-2">
        <span 
          class="text-xs px-2 py-0.5 rounded-full"
          :class="player.isUndercover 
            ? 'bg-accent-100 text-accent-800 dark:bg-accent-900 dark:bg-opacity-50 dark:text-accent-300' 
            : 'bg-primary-100 text-primary-800 dark:bg-primary-900 dark:bg-opacity-50 dark:text-primary-300'"
        >
          {{ player.isUndercover ? 'Undercover' : 'Civilian' }}
        </span>
      </div>
      
      <div v-if="showVotes && voteCount && voteCount > 0" class="ml-2">
        <span class="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
          {{ voteCount }} {{ voteCount === 1 ? 'vote' : 'votes' }}
        </span>
      </div>
    </div>
  </div>
</template>