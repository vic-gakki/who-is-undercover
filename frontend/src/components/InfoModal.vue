<script setup lang="ts">
withDefaults(defineProps<{
  show: boolean,
  showConfirm?: boolean,
  showCloseIcon?: boolean,
  title?: string
}>(), {
  showConfirm: true,
  showCloseIcon: true
})

const emit = defineEmits<{
  (e: 'close'): void
}>()
</script>

<template>
  <div v-if="show" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
    <div class="bg-white dark:bg-gray-800 rounded-xl shadow-lg max-w-lg w-full max-h-[80vh] p-6 animate-slide-up relative flex flex-col">
      <header class="mb-4 pr-8">
        <slot name="title">
          <p>{{ title }}</p>
        </slot>
        <button 
          @click="emit('close')"
          class="absolute top-4 right-4 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          v-if="showCloseIcon"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </header>
      <section class="overflow-y-auto">
        <div class="">
          <slot name="body"></slot>
        </div>
        <slot name="footer">
          <div class="mt-6 text-center" v-if="showConfirm">
            <button @click="emit('close')" class="btn btn-primary">
              {{ $t('op.gotIt') }}
            </button>
          </div>
        </slot>
      </section>
    </div>
  </div>
</template>