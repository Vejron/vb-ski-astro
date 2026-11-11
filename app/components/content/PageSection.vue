<script setup lang="ts">
// Page section with background colour and optional wave at the bottom.
// Usage:
//   ::page-section{bg="bg-slate-100" width="max-w-3xl" center wave="text-slate-200"}
//   ## Rubrik
//   Text …
//   ::
// - bg:     background class
// - width:  max width class of the content (default max-w-5xl)
// - center: center the text on larger screens
// - wave:   colour class (text-*) of the next section, draws a wave at the bottom
// - waveTop: colour class (text-*) of the previous section, draws a wave at the top
withDefaults(defineProps<{
  bg?: string
  width?: string
  center?: boolean
  wave?: string
  waveTop?: string
}>(), { width: 'max-w-5xl' })
</script>

<template>
  <section class="relative" :class="[bg, wave ? 'pb-16' : 'pb-8', waveTop ? 'pt-10' : 'pt-4']">
    <BottomShape v-if="waveTop" class="absolute top-0" :class="waveTop" />
    <div class="md-section mx-auto px-6" :class="[width, center && 'sm:text-center']">
      <slot />
    </div>
    <TopShape v-if="wave" class="absolute bottom-0" :class="wave" />
  </section>
</template>
