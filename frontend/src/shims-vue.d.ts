import MessageFn from './components/Message'

declare module 'vue' {
  interface ComponentCustomProperties {
    $message: typeof MessageFn
  }
}