import { createApp } from 'vue';
import { createPinia } from 'pinia';
import { router } from './router';
import './style.css';
import App from './App.vue';
import { initAudioOnUserInteraction } from './utils/audio';

const app = createApp(App);
app.use(createPinia());
app.use(router);
app.mount('#app');

// Unlock Web Audio & Speech Synthesis on the first user interaction
// (browsers block audio until the user clicks/touches/presses a key)
initAudioOnUserInteraction();
