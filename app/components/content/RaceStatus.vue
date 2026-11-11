<script setup lang="ts">
// Shows its content only in the given race phase(s).
// Usage:
//   ::race-status{is="open"}
//   Anmälan är öppen!
//   ::
// Phases: upcoming, open, closed, full, cancelled, finished (comma separated)
const props = defineProps<{ is: string }>()
const { phase } = useRace()
const visible = computed(() =>
  props.is.split(',').map(s => s.trim()).includes(phase.value),
)
</script>

<template>
  <div v-if="visible"><slot /></div>
</template>
