<script setup lang="ts">
import Counter from './components/Counter.vue'
import viteLogo from '/vite.svg'

const hello = import.meta.env.VITE_HELLO
const modeText = import.meta.env.VITE_MODE_TEXT
</script>

<template>
  <div>
    <a href="https://vite.dev" target="_blank" rel="noreferrer">
      <img :src="viteLogo" class="logo" alt="Vite logo">
    </a>
    <h1>Vite + Vue 3</h1>
    <div class="card">
      <Counter />
    </div>
    <p class="read-the-docs">
      {{ hello }}
    </p>
    <p class="read-the-docs">
      {{ modeText }}
    </p>
  </div>
</template>
