<script setup lang="ts">
// Round button. Usage: :button-link{to="/umeloppet" label="Till loppet"}
defineProps<{ to: string, label: string }>()
</script>

<template>
  <NuxtLink
    :to="to"
    class="inline-block mt-5 px-6 py-3 text-xl font-bold text-white bg-slate-800 rounded-full hover:bg-opacity-90 focus:ring-2 focus:ring-offset-2 focus:ring-white focus:outline-none"
  >{{ label }}</NuxtLink>
</template>
