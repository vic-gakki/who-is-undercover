import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { createRouter, createWebHistory } from 'vue-router'
import './style.css'
import App from './App.vue'
import { routes } from './router'
import { createI18n } from 'vue-i18n'
import en from './locales/en.json'
import zh from './locales/zh.json'

// Create router instance
const router = createRouter({
  history: createWebHistory(),
  routes
})

// Create pinia store
const pinia = createPinia()

const i18n = createI18n({
  legacy: false,
  locale: 'en',
  fallbackLocale: 'en',
  messages: {
    en,
    zh
  }
})

// Create app
const app = createApp(App)

// Use plugins
app.use(router)
app.use(pinia)
app.use(i18n)

// Mount app
app.mount('#app')