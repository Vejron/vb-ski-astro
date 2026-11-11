<script setup lang="ts">
// "När / Var / Pris" summary for the race. Usage: :race-facts
import { capitalize } from '#shared/race'

const { race, fields } = useRace()
</script>

<template>
  <div class="not-prose">
    <div class="grid border-t border-slate-400 grid-cols-1 pt-8 gap-4">
      <div class="flex justify-between md:justify-center gap-6">
        <p class="font-semibold md:hidden">När:</p>
        <p class="md:text-xl">{{ capitalize(fields.date!) }} kl {{ race.startTime }}</p>
      </div>
      <div class="flex justify-between md:justify-center gap-6">
        <p class="font-semibold md:hidden">Var:</p>
        <p class="md:text-lg">{{ race.location }}</p>
      </div>
    </div>
    <div class="flex flex-col md:flex-row md:justify-center pt-4 gap-4 md:gap-12">
      <div v-for="d in race.distances" :key="d.id" class="flex justify-between md:justify-center gap-6">
        <p class="font-semibold">Pris {{ d.name }}:</p>
        <p>{{ d.price }}:-</p>
      </div>
    </div>
  </div>
</template>
