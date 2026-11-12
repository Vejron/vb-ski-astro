<template>
  <!-- The course map, which can also be skied in 3D: the <umeloppet-map> element from public/umeloppet-map/,
       built in the ragnarok repo (embed/umeloppet). Client-only, since the element fills itself in. -->
  <ClientOnly>
    <umeloppet-map class="block w-full h-[80vh]" />
  </ClientOnly>
</template>

<script setup lang="ts">
useHead({ script: [{ src: "/umeloppet-map/umeloppet.js", type: "module" }] });
</script>
