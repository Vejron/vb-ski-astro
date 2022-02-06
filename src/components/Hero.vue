<template>
  <div class="relative h-96 flex flex-col justify-center items-center px-8">
    <div class="absolute mask w-full h-full" :style="{ backgroundImage: `url(${svgurl})` }"></div>
    <!--img class="mask" :src="svgurl" alt="" srcset=""-->
    <div class="text-center">
      <h2 class="glow z-10 text-4xl sm:text-6xl md:text-7xl font-bold">Umeloppet 2022</h2>
    <p class="mt-4 text-lg font-medium">Skidveteranerna bjuder in till årets upplaga</p>
    </div>
    
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import svgurl from "../assets/pattern3.svg"
const props = defineProps({
  blok: Object,
});
</script>

<style lang="css" scoped>
.mask {
    mask-image: linear-gradient(to top, rgba(0, 0, 0, .5) 0%, transparent 100%);
    
}
.glow {
  color: rgb(99, 2, 91);
  text-shadow: 
    1px 0px 1px #aaa, 0px 1px 1px #999, 
    2px 1px 1px #aaa, 1px 2px 1px #999,
    3px 2px 1px #aaa, 2px 3px 1px #999,
    4px 3px 1px #aaa, 3px 4px 1px #999,
    5px 4px 1px #aaa, 4px 5px 1px #999,
    6px 5px 1px #aaa;
}
</style>
