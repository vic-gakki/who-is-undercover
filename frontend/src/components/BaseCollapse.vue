<script setup lang="ts">
import { ref, onMounted, onUpdated, onBeforeUnmount } from 'vue'

const props = defineProps({
  // 默认标题
  title: {
    type: String,
    default: '点击展开'
  },
  // 默认内容
  content: {
    type: String,
    default: '这里是内容区域'
  },
  // 初始状态
  isOpenByDefault: {
    type: Boolean,
    default: false
  }
})

const isOpen = ref(props.isOpenByDefault)
const content = ref<HTMLElement | null>(null)
const contentHeight = ref(0)

// 计算内容高度
const calculateHeight = () => {
  if (content.value) {
    contentHeight.value = content.value.scrollHeight
  }
}

// 切换展开/收起状态
const toggle = () => {
  isOpen.value = !isOpen.value
}

// 初始化和更新时计算高度
onMounted(() => {
  calculateHeight()
  window.addEventListener('resize', calculateHeight)
})

onUpdated(() => {
  calculateHeight()
})

// 组件卸载时移除事件监听
onBeforeUnmount(() => {
  window.removeEventListener('resize', calculateHeight)
})
</script>
<template>
  <div class="border rounded-lg overflow-hidden">
    <!-- 标题区域 -->
    <button
      @click="toggle"
      class="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors duration-200"
    >
      <div class="flex-1 text-left">
        <!-- 标题插槽 -->
        <slot name="title">
          <!-- 默认标题 -->
          <span class="font-medium">{{ title }}</span>
        </slot>
      </div>
      <!-- 箭头图标 -->
      <svg
        class="w-5 h-5 transform transition-transform duration-200"
        :class="{ 'rotate-180': isOpen }"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
      </svg>
    </button>

    <!-- 内容区域 - 带高度过渡 -->
    <div
      ref="content"
      class="transition-all duration-300 overflow-hidden"
      :style="{
        height: isOpen ? contentHeight + 'px' : '0px',
        opacity: isOpen ? 1 : 0.8
      }"
    >
      <div class="px-4 py-3">
        <!-- 内容插槽 -->
        <slot name="content">
          <!-- 默认内容 -->
          <p>{{ content }}</p>
        </slot>
      </div>
    </div>
  </div>
</template>