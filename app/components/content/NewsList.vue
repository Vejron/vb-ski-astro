<script setup lang="ts">
// All news as a list. Usage: :news-list
const { data: posts } = await useAsyncData('news-list', () =>
  queryCollection('blog').select('path', 'displaytitle', 'thumbnail', 'description', 'date').order('date', 'DESC').all(),
)
</script>

<template>
  <ul class="flex flex-col gap-8 text-left">
    <li v-for="post in posts" :key="post.path" class="group relative overflow-hidden">
      <NuxtLink :to="post.path" class="flex flex-col sm:flex-row gap-8">
        <img
          class="transition-transform min-h-full duration-700 w-full sm:max-w-xs sm:w-auto group-hover:scale-105 object-cover"
          style="aspect-ratio: 1.618 / 1"
          :src="post.thumbnail"
          alt=""
        >
        <div>
          <h3 class="font-semibold text-xl group-hover:text-purple-600">{{ post.displaytitle }}</h3>
          <p>{{ post.description }}</p>
        </div>
      </NuxtLink>
    </li>
  </ul>
</template>
