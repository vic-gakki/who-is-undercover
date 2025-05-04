<template>
  <Transition name="message">
    <div v-if="visible" class="message-container" :class="[type]">
      <div class="message-content">
        <slot></slot>
      </div>
    </div>
  </Transition>
</template>

<script lang="ts" setup>
import { ref, onMounted, nextTick } from 'vue'
const props = defineProps({
  duration: {
    type: Number,
    default: 3000
  },
  type: {
    type: String,
    default: 'info',
    validator: (value: string) => ['info', 'success', 'warning', 'error'].includes(value)
  }
})
const emits = defineEmits(['remove'])
const visible = ref(false)
onMounted(() => {
  visible.value = true
  setTimeout(() => {
    visible.value = false
    nextTick(() => {
      emits('remove', true)
    })
  }, props.duration)
})


</script>

<style scoped>
.message-container {
  padding: 12px 16px;
  border-radius: 4px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
  background: #fff;
  color: #333;
  display: flex;
  align-items: center;
  transition: all 0.3s;
}

.message-container.info {
  background: #f4f4f5;
  color: #909399;
}

.message-container.success {
  background: #f0f9eb;
  color: #67c23a;
}

.message-container.warning {
  background: #fdf6ec;
  color: #e6a23c;
}

.message-container.error {
  background: #fef0f0;
  color: #f56c6c;
}

.message-enter-from {
  opacity: 0;
  transform: translateY(-20px);
}

.message-enter-to {
  opacity: 1;
  transform: translateY(0);
}

.message-leave-from {
  opacity: 1;
  transform: translateY(0);
}

.message-leave-to {
  opacity: 0;
  transform: translateY(-20px);
}

.message-enter-active,
.message-leave-active {
  transition: all 0.8s ease;
}
</style>