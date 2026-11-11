<script setup lang="ts">
// Markdown links. Files (/files/x.pdf etc.) must be plain <a> links –
// NuxtLink would try to route to them as pages and show a 404.
const props = defineProps({
  href: { type: String, default: '' },
  target: { type: String, default: undefined },
})
const isFile = computed(() => /\.[a-z0-9]{2,5}$/i.test(props.href.split(/[?#]/)[0] ?? ''))
</script>

<template>
  <a v-if="isFile" :href="href" :target="target ?? '_blank'" rel="noopener"><slot /></a>
  <NuxtLink v-else :to="href" :target="target"><slot /></NuxtLink>
</template>
