<script setup lang="ts">
// Big header with the club logo on a faded background image.
// Usage:
//   ::page-hero{title="UMELOPPET" background="map" wave="text-slate-100"}
//   :link-pills
//   ::
// background: hero | map | track
withDefaults(defineProps<{
  title?: string
  background?: 'hero' | 'map' | 'track'
  wave?: string
}>(), { background: 'hero', wave: 'text-slate-200' })
</script>

<template>
  <div class="relative">
    <section
      class="h-72 sm:h-[500px] max-w-5xl mx-auto px-6 flex flex-col justify-center items-center"
      :class="[`${background}-grid`, $slots.default && 'h-[340px]']"
    >
      <div class="bg-slate-200 h-40 w-40 sm:h-60 sm:w-60 rounded-full border-4 border-black">
        <img src="/assets/veteranerna-logga.svg" class="w-full h-full" alt="Skidveteranernas logotyp">
      </div>
      <h1
        v-if="title"
        class="font-bold absolute transform text-5xl text-purple-600 sm:text-8xl text-outline"
        :class="$slots.default ? '-translate-y-5' : '-translate-y-2'"
      >
        {{ title }}
      </h1>
      <div v-if="$slots.default" class="pt-1 sm:pt-4">
        <slot />
      </div>
    </section>
    <TopShape class="absolute bottom-0" :class="wave" />
  </div>
</template>
