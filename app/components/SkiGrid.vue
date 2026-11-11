<template>
  <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
    <SkiGridCard :data="data" v-for="data in ordered"></SkiGridCard>
  </div>
</template>

<script setup lang="ts">
import { computed, PropType } from "vue";
import SkiGridCard from "./SkiGridCard.vue"
const props = defineProps({
  table: Array as PropType<{ name: string, info: string, date: string }[]>
});
const ordered = computed(() =>
  props.table.sort((a, b) => new Date(b.date).valueOf() - new Date(a.date).valueOf())
);
</script>