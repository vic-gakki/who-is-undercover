<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()

const goHome = () => {
  router.push('/')
}
</script>

<template>
  <div class="page-container h-screen flex items-center justify-center">
    <div class="card max-w-md w-full text-center">
      <h1 class="text-4xl font-bold text-gray-900 dark:text-white mb-4">404</h1>
      <p class="text-xl mb-8 text-gray-600 dark:text-gray-300">{{ $t('info.notFound') }}</p>
      
      <div class="mb-8">
        <svg class="mx-auto w-32 h-32 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg>
      </div>
      
      <button @click="goHome" class="btn btn-primary">
        {{ $t('op.goHome') }}
      </button>
    </div>
  </div>
</template>