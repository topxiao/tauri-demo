<script setup lang="ts">
import DomTree from './DomTree.vue'
</script>

<template>
  <div class="left-panel">
    <DomTree />
  </div>
</template>

<style scoped>
.left-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
}
</style>
