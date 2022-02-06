<template>
    <div class="prose lg:prose-xl" v-html="richtext"></div>
</template>
 
<script setup lang="ts">
import { computed } from "vue";
import richTextResolver from '../lib/rich-text-resolver';
const props = defineProps({
  text: Object
})
const richtext = computed(() => props.text ? new richTextResolver().render(props.text) : '');
</script>