<template>
<div class="">

</div>
  <section class="px-8 max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-8">
    <div v-for="article in articles" :key="article.uuid">
    <h3>{{article.content.title}}</h3>
    <img style="aspect-ratio: 1.618 / 1;" :src="article.content.image.filename" alt="" >
    <RichTextRenderer
      :text="article.content.intro"
    />
    </div>
    
  </section>
</template>

<script setup lang="ts">
import { ref, inject } from "vue";
//import { RichTextRenderer } from '@marvr/storyblok-rich-text-vue-renderer'
import RichTextRenderer from './RichTextRenderer.vue';
const props = defineProps({
  blok: Object,
});

const articles = inject('articles') as any;
console.log('fe!!!!!!!!!!!!', articles)
</script>
