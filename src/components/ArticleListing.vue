<template>
  <section
    class="flex flex-col gap-8"
  >
    <ul v-for="post in sorted()" :key="post.url">
      <li class="group relative overflow-hidden flex flex-col sm:flex-row gap-8">
        <a :href="post.url">
          <img
            class="transition-transform min-h-full duration-700 w-full sm:max-w-xs sm:w-auto group-hover:scale-105 object-cover"
            style="aspect-ratio: 1.618 / 1"
            :src="post.thumbnail"
            alt=""
          />
          
        </a>
        <div>
            <h3 class="font-semibold text-xl">{{ post.displaytitle }}</h3>
            <p>{{post.description}}</p>
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
  return props.posts.sort((a, b) => new Date(b.date) - new Date(a.date) );
}
</script>