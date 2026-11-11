<script setup lang="ts">
// Inline race value from content/umeloppet.yml
// Usage: :race{field="date"}  (add `capitalize` for a capital first letter)
// Fields: year, edition, date, dateShort, weekday, startTime, location, opens, closes,
//         closesDate, payBy, maxParticipants, swish, plusgiro, price.<id>, name.<id>
import { capitalize as cap } from '#shared/race'

const props = defineProps<{ field: string, capitalize?: boolean }>()
const { fields } = useRace()
const text = computed(() => {
  const value = fields.value[props.field]
  if (value === undefined) return `[okänt fält: ${props.field}]`
  return props.capitalize ? cap(value) : value
})
</script>

<template><span>{{ text }}</span></template>
