<script setup lang="ts">
import { reactive, computed, ref } from "vue";
const props = defineProps({
  show: Boolean,
});


</script>

<template>
  <transition name="fade">
    <div v-if="show" class="bg-black/20 absolute p-[30%] z-50 inset-0 flex justify-center items-center">
      <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <circle class="ring-track" fill="transparent" stroke-width="6px" stroke="#9c9c9c30" cx="50" cy="50" r="44" />
        <circle class="loader-ring" fill="transparent" stroke-width="6px" stroke-dashoffset="276.460"
          stroke-dasharray="276.460 276.460" cx="50" cy="50" r="44" />
      </svg>
    </div>
  </transition>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity .6s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.loader-ring {
  @apply stroke-purple-600;
  transform-origin: 50px 50px;
  animation:
    starting-fill 0.5s forwards,
    vary-loader-width 3s 0.5s linear infinite alternate,
    spin 1.6s 0.2s linear infinite;
}

.loader-ring-overlay {
  visibility: hidden;
  transform-origin: 50px 50px;
  animation: spin 1.6s 0.2s linear infinite;
}


@keyframes starting-fill {
  to {
    stroke-dashoffset: 270;
  }
}

@keyframes vary-loader-width {
  0% {
    stroke-dashoffset: 270;
  }

  50% {
    stroke-dashoffset: 170;
  }

  100% {
    stroke-dashoffset: 275;
  }
}

@keyframes complete-fill {
  to {
    stroke-dashoffset: 0;
  }
}

@keyframes fade {
  from {
    opacity: 1;
  }

  to {
    opacity: 0;
  }
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
