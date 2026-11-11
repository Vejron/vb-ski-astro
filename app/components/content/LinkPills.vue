<script setup lang="ts">
// Buttons under the Umeloppet header. Document links (startlista, PM, resultat)
// only show when they are set in content/umeloppet.yml.
const { race } = useRace()
const pills = computed(() => {
  const docs = race.value.documents ?? {}
  return [
    { label: 'Information', href: '#information', primary: true },
    docs.inbjudan && { label: 'Inbjudan', href: docs.inbjudan },
    docs.startlist && { label: 'Startlista', href: docs.startlist },
    docs.pm && { label: 'PM', href: docs.pm },
    docs.results && { label: 'Resultat', href: docs.results },
    { label: 'Sponsorer', href: '#sponsors', primary: true },
  ].filter(Boolean) as { label: string, href: string, primary?: boolean }[]
})
</script>

<template>
  <div class="flex flex-wrap justify-center gap-2 sm:gap-4 sm:text-lg text-black font-bold">
    <a
      v-for="pill in pills"
      :key="pill.label"
      :href="pill.href"
      :target="pill.href.startsWith('#') ? undefined : '_blank'"
      class="transition-colors hover:text-purple-600 hover:bg-white px-3 py-1 rounded-full"
      :class="pill.primary ? 'bg-pink-400' : 'bg-purple-400'"
    >{{ pill.label }}</a>
  </div>
</template>
