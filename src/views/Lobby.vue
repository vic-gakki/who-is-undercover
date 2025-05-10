<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useGameStore } from '../stores/gameStore'
import PlayerCard from '../components/PlayerCard.vue'
import { storeToRefs } from 'pinia'
import InfoModal from '../components/InfoModal.vue'
const { t } = useI18n()
const gameStore = useGameStore()
const {
  isHost,
  roomCode,
  players,
  inGamePlayers,
  currentPlayer
} = storeToRefs(gameStore)

const isClipboardCopied = ref(false)
const showWordSetting = ref(false)
const {civilianWord: cw, undercoverWord: uw} = JSON.parse(localStorage.getItem('game-word') ?? '{}')
const civilianWord = ref(cw)
const undercoverWord = ref(uw)

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

const leaveRoom = () => {
  gameStore.leaveRoom()
}

const toggleWordSetter = () => {
  gameStore.toggleWordSetter()
}

const onSetWord = () => {
  if(!civilianWord.value || !undercoverWord.value) return
  gameStore.setWord({
    civilianWord: civilianWord.value,
    undercoverWord: undercoverWord.value
  })
  showWordSetting.value = false
}

const onRefreshWord = () => {
  
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
          <h2 class="text-xl font-semibold mb-4">{{ t('players', {count: inGamePlayers.length}) }}</h2>
          
          <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <PlayerCard 
              v-for="player in players" 
              :key="player.id" 
              :player="player"
              :is-current="player.id === currentPlayer?.id"
            />
          </div>
          
          <div v-if="inGamePlayers.length < 3" class="mt-4 text-center text-warning-500">
            <p>{{ t('minPlayers', {current: inGamePlayers.length}) }}</p>
          </div>
        </div>
        
        <div class="flex flex-col md:flex-row justify-between space-y-4 md:space-y-0 md:space-x-4">
          <button 
            v-if="isHost" 
            @click="startGame" 
            class="btn btn-primary"
            :disabled="inGamePlayers.length < 3"
            :class="{ 'opacity-50 cursor-not-allowed': inGamePlayers.length < 3 }"
          >
            {{ t('op.startGame') }}
          </button>
          
          <button v-else class="btn btn-outline" disabled>
            {{ t('waitingForHost') }}
          </button>

          <div class="flex gap-4 items-center">
            <button @click="toggleWordSetter" class="btn btn-primary flex-auto">
              {{ t(currentPlayer?.isWordSetter ? 'op.quitSetWord' : 'op.setWord') }}
            </button>
  
            <span class="icon-[carbon--settings-edit] text-[28px]" v-if="currentPlayer?.isWordSetter" @click="showWordSetting = true"></span>
          </div>

          <button @click="leaveRoom" class="btn btn-outline text-error-500 border-error-500 hover:bg-error-500 hover:bg-opacity-10">
            {{ t('op.leaveRoom') }}
          </button>
          
        </div>
      </div>
      <InfoModal :title="$t('op.setWord')" :show="showWordSetting" @close="showWordSetting = false">
        <template #body>
          <div class="p-4">
            <div class="mb-4 flex items-center gap-4">
              <label for="civilianWord" class="text-sm font-medium flex-none">{{ $t('civilian') }}</label>
              <input
                v-model="civilianWord"
                type="text"
                id="civilianWord"
                class="input"
              />
            </div>
            <div class="mb-4 flex items-center gap-4">
              <label for="undercoverWord" class="text-sm font-medium flex-none">{{ $t('undercover') }}</label>
              <input
                v-model="undercoverWord"
                type="text"
                id="undercoverWord"
                class="input"
              />
            </div>
          </div>
        </template>
        <template #footer>
          <div class="mt-2 flex items-center gap-4 justify-center">
            <button @click="onSetWord" class="btn btn-primary" :disabled="!civilianWord || !undercoverWord" :class="{ 'opacity-50 cursor-not-allowed': !civilianWord || !undercoverWord }">
              {{ $t('op.confirm') }}
            </button>
            <span class="icon-[ion--refresh] text-[28px] cursor-pointer" @click="onRefreshWord"></span>
          </div>
        </template>
      </InfoModal>
    </div>
  </div>
</template>