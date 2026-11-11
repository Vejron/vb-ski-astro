<script setup lang="ts">
// Purple info box. Usage:
//   ::info-card{title="Innan loppet"}
//   Text, listor och bilder …
//   ::
defineProps<{ title?: string }>()
</script>

<template>
  <div class="info-card p-4 bg-purple-200 rounded-lg text-gray-800 text-lg">
    <h3 v-if="title" class="text-2xl font-semibold mb-3 text-black">{{ title }}</h3>
    <slot />
  </div>
</template>
