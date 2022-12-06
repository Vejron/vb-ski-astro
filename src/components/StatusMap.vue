<template>
  <div id="mainMapContainer" class="w-full"></div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, PropType } from "vue";
import "leaflet/dist/leaflet.css";

const props = defineProps({
  data: Object as PropType<{
    name: string;
    info: string;
    date: string;
    length: number;
    electric: boolean;
    location: number[];
  }>,
});

let map: any;

onMounted(async () => {
  const L = await import("leaflet");
  map = setupLeafletMap(props.data.location, L);
});


onUnmounted(() => {
  map && map.remove();
})
const setupLeafletMap = (location: any, L) => {
  const map = new L.map("mainMapContainer", { zoomControl: false })
    .setView(location, 14);
  L.control
    .zoom({
      position: "topright",
    })
    .addTo(map);
  L.tileLayer
    .wms("https://wms.umea.se/geoserver/gwc/service/wms?", {
      layers: "Projektkarta_V2",
    })
    .addTo(map);
  L.marker(location).addTo(map);
  return map;
};
</script>