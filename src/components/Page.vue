<template>
  <div>
    <component
      v-for="blok in blok.body"
      :key="blok._uid"
      :blok="blok"
      :is="resolve(blok.component)"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { resolve } from "../lib/vue-resolver"
const props = defineProps({
  blok: Object
})

</script>