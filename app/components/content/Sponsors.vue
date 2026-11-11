<script setup lang="ts">
// Sponsor logos from content/umeloppet.yml. Usage: :sponsors
const { race } = useRace()
</script>

<template>
  <div class="mb-8 grid gap-2 grid-cols-2 md:grid-cols-4 place-items-center">
    <component
      :is="s.url ? 'a' : 'div'"
      v-for="s in race.sponsors"
      :key="s.name"
      :href="s.url"
      target="_blank"
      class="w-full h-full"
    >
      <img :src="s.logo" class="max-h-48 lg:max-h-72" :alt="s.name">
    </component>
  </div>
</template>
