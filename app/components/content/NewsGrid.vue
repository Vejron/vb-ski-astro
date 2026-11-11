<script setup lang="ts">
// Latest news as image tiles. Usage: :news-grid{limit="6"}
const props = defineProps<{ limit?: number | string }>()
const { data: posts } = await useAsyncData(`news-grid-${props.limit ?? 'all'}`, () => {
  const q = queryCollection('blog').select('path', 'displaytitle', 'thumbnail', 'date').order('date', 'DESC')
  return props.limit ? q.limit(Number(props.limit)).all() : q.all()
})
</script>

<template>
  <ul class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-8">
    <li v-for="post in posts" :key="post.path" class="group relative overflow-hidden">
      <NuxtLink :to="post.path">
        <img
          class="transition-transform duration-700 group-hover:scale-105 w-full object-cover"
          style="aspect-ratio: 1.618 / 1"
          :src="post.thumbnail"
          :alt="post.displaytitle"
        >
        <p
          class="absolute pointer-events-none transition-transform duration-300 group-hover:scale-110 translate-y-2 group-hover:-translate-y-0 text-xl font-semibold w-full text-white py-5 text-center bg-gradient-to-t from-gray-800 bottom-0"
        >
          {{ post.displaytitle }}
        </p>
      </NuxtLink>
    </li>
  </ul>
</template>
