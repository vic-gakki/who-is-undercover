import { RouteRecordRaw } from 'vue-router'
import Home from '../views/Home.vue'
import Lobby from '../views/Lobby.vue'
import Game from '../views/Game.vue'
import Results from '../views/Results.vue'
import NotFound from '../views/NotFound.vue'

export const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'home',
    component: Home
  },
  {
    path: '/lobby/:roomCode',
    name: 'lobby',
    component: Lobby,
    props: true
  },
  {
    path: '/game/:roomCode',
    name: 'game',
    component: Game,
    props: true
  },
  {
    path: '/results/:roomCode',
    name: 'results',
    component: Results,
    props: true
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: NotFound
  }
]