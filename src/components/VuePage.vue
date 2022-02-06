<template>
  <div>
    <component :is="resolve(story.content.component)" :blok="story.content"> </component>
  </div>
</template>

<script setup lang="ts">
import { ref, provide } from "vue";
import { resolve } from "../lib/vue-resolver"

const props = defineProps({
  story: Object,
  articles: Array
});
provide('articles', props.articles);
</script>
