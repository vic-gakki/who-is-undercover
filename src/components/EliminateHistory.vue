<script setup lang="ts">
import { computed } from 'vue';
import { useGameStore } from '../stores/gameStore';
import { Player } from '../../server/src/type';
import BaseCollapse from './BaseCollapse.vue';
import { storeToRefs } from 'pinia';
const leftPlayerInfo = {name: 'left player'}
const findPlayer = (id: string): Player => {
  return gameStore.players.find(player => player.id === id) ?? leftPlayerInfo as Player
}
const gameStore = useGameStore()
const {
  currentPlayer
} = storeToRefs(gameStore)
const eliminatedHistory = computed(() => {
  return gameStore.votes.map((item) => {
    const voteRes = Object.values(item).reduce<Record<string, number>>((acc, cur) => {
      acc[cur] = (acc[cur] || 0) + 1;
      return acc;
    }, {})
    const maxVote = Math.max(...Object.values(voteRes))
    const convertedVoteRes = Object.fromEntries(Object.entries(voteRes).map(([key, value]) => [value, key]))
    return findPlayer(convertedVoteRes[maxVote])
  })
})

const getVoteInfo = (votes: Record<string, string>) => {
  return Object.entries(votes).map(([voteId, targetId]) => {
    return {
      votePlayer: findPlayer(voteId),
      targetPlayer: findPlayer(targetId)
    }
  })
}

</script>

<template>
  <div class="mb-4 space-y-4">
    <BaseCollapse>
      <template #title>
        <p>{{ $t('voteHistory') }}</p>
      </template>
      <template #content>
        <div class="flex flex-col">
          <div v-for="(roundVotes, index) of gameStore.votes">
            <p class="mb-4 font-semibold">{{ $t('round', {round: index + 1}) }}</p>
            <div class="gap-4 grid grid-cols-1 sm:grid-cols-2">
              <div class="flex items-center" v-for="voteInfo in getVoteInfo(roundVotes)" :key="index">
                <div class="flex flex-col space-y-4 items-center w-28 bg-gray-100 p-4 rounded-lg">
                  <div 
                    class="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white"
                    :class="voteInfo.votePlayer.isHost ? 'bg-secondary-500' : 'bg-primary-500'"
                  >
                    {{ voteInfo.votePlayer?.name.charAt(0) }}
                  </div>
                  
                  <div class="flex-grow w-full">
                    <div class="font-medium flex items-center text-center">
                      <p class="w-0 flex-grow truncate">{{ voteInfo.votePlayer.name }}</p>
                      <p v-if="voteInfo.votePlayer.id === currentPlayer?.id" class="ml-1 text-xs text-gray-500 flex-none">({{ $t('you') }})</p>
                    </div>
                  </div>
                </div>
                <span class="mx-4 sm:mx-8">👉</span>
                <div class="flex flex-col space-y-4 items-center w-28 bg-gray-100 p-4 rounded-lg">
                  <div 
                    class="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white"
                    :class="voteInfo.targetPlayer.isHost ? 'bg-secondary-500' : 'bg-primary-500'"
                  >
                    {{ voteInfo.targetPlayer?.name.charAt(0) }}
                  </div>
                  
                  <div class="flex-grow w-full">
                    <div class="font-medium flex items-center text-center">
                      <p class="w-0 flex-grow truncate">{{ voteInfo.targetPlayer.name }}</p>
                      <p v-if="voteInfo.targetPlayer.id === currentPlayer?.id" class="ml-1 text-xs text-gray-500 flex-none">({{ $t('you') }})</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>
    </BaseCollapse>
    <BaseCollapse>
      <template #title>
        <p>{{ $t('eliminatedHistory') }}</p>
      </template>
      <template #content>
        <div class="flex gap-12 flex-wrap">
          <div class="flex flex-col space-y-4 items-center w-28 bg-gray-100 p-4 rounded-lg relative" v-for="(eliminated, index) of eliminatedHistory" :key="index">
            <sup class="absolute top-4 left-4 text-gray-400">{{ index + 1 }}</sup>
            <div 
              class="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white"
              :class="eliminated.isHost ? 'bg-secondary-500' : 'bg-primary-500'"
            >
              {{ eliminated?.name.charAt(0) }}
            </div>
            
            <div class="flex-grow w-full">
              <div class="font-medium flex items-center text-center">
                <p class="w-0 flex-grow truncate">{{ eliminated.name }}</p>
                <p v-if="eliminated.id === currentPlayer?.id" class="ml-1 text-xs text-gray-500 flex-none">({{ $t('you') }})</p>
              </div>
            </div>
          </div>
        </div>
      </template>
    </BaseCollapse>
  </div>
</template>