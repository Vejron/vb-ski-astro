<template>
  <section class="flex flex-col gap-8">
    <ul v-for="post in posts" :key="post.frontmatter.url">
      <li class="group relative overflow-hidden flex flex-col sm:flex-row gap-8">
        <a :href="post.frontmatter.url">
          <img
            class="transition-transform min-h-full duration-700 w-full sm:max-w-xs sm:w-auto group-hover:scale-105 object-cover"
            style="aspect-ratio: 1.618 / 1" :src="post.frontmatter.thumbnail" alt="" />

        </a>
        <div>
          <h3 class="font-semibold text-xl">{{ post.frontmatter.displaytitle }}</h3>
          <p>{{post.frontmatter.description}}</p>
        </div>
      </li>
    </ul>
  </section>
</template>

<script setup lang="ts">
const props = defineProps({
  posts: Array,
});

const sorted = () => {
  return props.posts.sort((a, b) => new Date(b.frontmatter.date) - new Date(a.frontmatter.date));
}
</script>