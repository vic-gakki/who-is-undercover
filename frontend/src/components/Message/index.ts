import { createApp, h, ref } from 'vue'
import Message from './Message.vue'
import { sleep } from '../../util'

type MessageType = 'info' | 'success' | 'warning' | 'error'

interface MessageOptions {
  type?: MessageType
  message: string
  duration?: number
}

const messageInstances = ref<any[]>([])
let msgContainer: HTMLElement| null
const createMessage = ({ type = 'info', message, duration = 3000 }: MessageOptions) => {
  if(!msgContainer){
    msgContainer = document.createElement('div')
    msgContainer.classList.add('msg-wrapper', 'space-y-2')
    document.body.appendChild(msgContainer)
  }
  const mountNode = document.createElement('div')
  msgContainer.appendChild(mountNode)

  const app = createApp({
    render() {
      return h(Message, {
        type,
        duration,
        onRemove,
      }, {
        default: () => message
      })
    }
  })

  const onRemove = async (delay: boolean) => {
    if(delay){
      await sleep(800)
    }
    app.unmount()
    msgContainer?.removeChild(mountNode)
    messageInstances.value = messageInstances.value.filter(instance => instance !== app)
    if(!messageInstances.value.length && msgContainer){
      document.body.removeChild(msgContainer)
      msgContainer = null
    }
  }
  
  app.mount(mountNode)
  messageInstances.value.push(app)
  
  return onRemove
}

const MessageFn = (options: MessageOptions | string) => {
  if (typeof options === 'string') {
    return createMessage({ message: options })
  }
  return createMessage(options)
}

// 添加快捷方法
MessageFn.info = (message: string, duration?: number) => 
  createMessage({ type: 'info', message, duration })

MessageFn.success = (message: string, duration?: number) => 
  createMessage({ type: 'success', message, duration })

MessageFn.warning = (message: string, duration?: number) => 
  createMessage({ type: 'warning', message, duration })

MessageFn.error = (message: string, duration?: number) => 
  createMessage({ type: 'error', message, duration })

export default MessageFn