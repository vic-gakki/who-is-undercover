<script setup lang="ts">
import { RouterView } from 'vue-router'
import { useGameStore } from './stores/gameStore';
import { onMounted } from 'vue';
import Error from './components/Error.vue';
const gameStore = useGameStore()
onMounted(() => {
  // Initialize the socket connection status on component mount
  gameStore.initializeSocketConnection()
})
</script>

<template>
  <div class="min-h-screen flex flex-col">
    <main class="flex-grow">
      <RouterView />
    </main>
    <Error></Error>
    <footer class="py-4 px-6 text-center text-sm text-gray-500 dark:text-gray-400">
      <p>© {{ new Date().getFullYear() }} {{ $t('justForFun') }}</p>
    </footer>
  </div>
</template>