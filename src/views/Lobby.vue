<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useGameStore } from '../stores/gameStore'
import PlayerCard from '../components/PlayerCard.vue'

const route = useRoute()
const router = useRouter()
const gameStore = useGameStore()

const isClipboardCopied = ref(false)
const showRules = ref(false)

const roomCode = computed(() => route.params.roomCode as string)
const isHost = computed(() => gameStore.isHost)
const players = computed(() => gameStore.players)

onMounted(() => {
  // If we don't have a current player, go back to home
  if (!gameStore.currentPlayer) {
    router.replace('/')
    return
  }
  
  // If roomCode from route doesn't match store, update store
  if (gameStore.roomCode !== roomCode.value) {
    gameStore.roomCode = roomCode.value
  }
  
  // Listen for game phase changes
  const unsubscribe = gameStore.$subscribe((_, state) => {
    if (state.gamePhase === 'description') {
      // Game started, redirect to game view
      router.replace({ name: 'game', params: { roomCode: roomCode.value } })
    }
  })
  
  // Clean up subscription
  onBeforeUnmount(() => {
    unsubscribe()
  })
})

const copyRoomCode = () => {
  navigator.clipboard.writeText(roomCode.value)
  isClipboardCopied.value = true
  
  setTimeout(() => {
    isClipboardCopied.value = false
  }, 2000)
}

const startGame = () => {
  gameStore.startGame()
}

const toggleRules = () => {
  showRules.value = !showRules.value
}

const leaveRoom = () => {
  gameStore.leaveRoom()
  router.replace('/')
}
</script>

<template>
  <div class="page-container">
    <div class="max-w-3xl mx-auto">
      <div class="card animate-fade-in">
        <div class="flex flex-col md:flex-row justify-between items-center mb-8">
          <h1 class="text-2xl md:text-3xl font-bold mb-4 md:mb-0">Game Lobby</h1>
          
          <div class="flex items-center space-x-2">
            <span class="text-gray-500">Room Code:</span>
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
            <span v-if="isClipboardCopied" class="text-xs text-success-500 animate-fade-in">Copied!</span>
          </div>
        </div>
        
        <div class="mb-8">
          <h2 class="text-xl font-semibold mb-4">Players ({{ players.length }})</h2>
          
          <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <PlayerCard 
              v-for="player in players" 
              :key="player.id" 
              :player="player"
              :is-current="player.id === gameStore.currentPlayer?.id"
            />
          </div>
          
          <div v-if="players.length < 3" class="mt-4 text-center text-warning-500">
            <p>Need at least 3 players to start ({{ players.length }}/3)</p>
          </div>
        </div>
        
        <div class="flex flex-col md:flex-row justify-between space-y-4 md:space-y-0 md:space-x-4">
          <button 
            v-if="isHost" 
            @click="startGame" 
            class="btn btn-primary"
            :disabled="players.length < 3"
            :class="{ 'opacity-50 cursor-not-allowed': players.length < 3 }"
          >
            Start Game
          </button>
          
          <button v-else class="btn btn-outline" disabled>
            Waiting for host to start...
          </button>
          
          <div class="flex space-x-4">
            <button @click="toggleRules" class="btn btn-outline">
              Game Rules
            </button>
            
            <button @click="leaveRoom" class="btn btn-outline text-error-500 border-error-500 hover:bg-error-500 hover:bg-opacity-10">
              Leave Room
            </button>
          </div>
        </div>
        
        <!-- Game Rules Modal -->
        <div v-if="showRules" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div class="bg-white dark:bg-gray-800 rounded-xl shadow-lg max-w-lg w-full max-h-[80vh] overflow-y-auto p-6 animate-slide-up">
            <h2 class="text-2xl font-bold mb-4">Game Rules</h2>
            
            <div class="space-y-4">
              <div>
                <h3 class="text-lg font-semibold text-primary-500">Overview</h3>
                <p>One player is the "undercover" with a slightly different word than everyone else. Try to find out who it is!</p>
              </div>
              
              <div>
                <h3 class="text-lg font-semibold text-primary-500">Setup</h3>
                <ul class="list-disc list-inside space-y-2">
                  <li>All players except one receive the same word (Civilians)</li>
                  <li>One player receives a similar but different word (Undercover)</li>
                  <li>No one knows who has which word</li>
                </ul>
              </div>
              
              <div>
                <h3 class="text-lg font-semibold text-primary-500">Gameplay</h3>
                <ol class="list-decimal list-inside space-y-2">
                  <li><strong>Description Phase:</strong> Each player describes their word without saying it directly</li>
                  <li><strong>Voting Phase:</strong> Everyone votes on who they think is the undercover</li>
                  <li><strong>Elimination:</strong> The player with the most votes is eliminated</li>
                  <li><strong>Repeat:</strong> Continue until the undercover is eliminated or only one civilian remains</li>
                </ol>
              </div>
              
              <div>
                <h3 class="text-lg font-semibold text-primary-500">Winning</h3>
                <ul class="list-disc list-inside space-y-2">
                  <li><strong>Civilians win:</strong> If they eliminate the undercover</li>
                  <li><strong>Undercover wins:</strong> If only one civilian remains</li>
                </ul>
              </div>
              
              <div>
                <h3 class="text-lg font-semibold text-primary-500">Strategy</h3>
                <ul class="list-disc list-inside space-y-2">
                  <li>As a civilian, be vague but accurate to confuse the undercover</li>
                  <li>As the undercover, pay attention to others' descriptions to blend in</li>
                  <li>Look for inconsistencies in descriptions</li>
                </ul>
              </div>
            </div>
            
            <div class="mt-6 text-center">
              <button @click="toggleRules" class="btn btn-primary">
                Got it!
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>