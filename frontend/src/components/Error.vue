<script setup lang="ts">
import { useGameStore } from '../stores/gameStore';
const gameStore = useGameStore()

</script>

<template>
   <div v-show="gameStore.error" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
    <div class="rounded-xl shadow-lg p-6 animate-slide-up  bg-orange-200 text-error-500">
      <p>{{ gameStore.error }}</p>
    </div>
   </div>
</template>