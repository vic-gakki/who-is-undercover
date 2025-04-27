<script setup lang="ts">
import { RouterView, useRouter } from 'vue-router'
import { useGameStore } from './stores/gameStore';
import { onMounted } from 'vue';
import Error from './components/Error.vue';
const gameStore = useGameStore()
const router = useRouter()
onMounted(() => {
  // Initialize the socket connection status on component mount
  gameStore.initializeSocketConnection()
  if(gameStore.currentPlayer){
    router.push({ name: 'lobby', params: { roomCode: gameStore.roomCode } })
  }
})
</script>

<template>
  <div class="min-h-screen flex flex-col">
    <main class="flex-grow h-0">
      <RouterView />
    </main>
    <Error></Error>
    <footer class="py-4 px-6 text-center text-sm text-gray-500 dark:text-gray-400">
      <p>© {{ new Date().getFullYear() }} Who Is the Undercover Game</p>
    </footer>
  </div>
</template>