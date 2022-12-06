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
  const fluid = L.divIcon({
    className: "map-pin",
    iconSize: [30, 30],
    iconAnchor: [18, 30],
    html: `<svg xmlns="http://www.w3.org/2000/svg" width="3rem" height="3rem" preserveAspectRatio="xMidYMid meet" viewBox="0 0 256 256"><path fill="currentColor" d="M128.1 16a88.1 88.1 0 0 0-88 88c0 75.3 80 132.2 83.4 134.6a8.3 8.3 0 0 0 9.2 0c3.4-2.4 83.4-59.3 83.4-134.6a88.1 88.1 0 0 0-88-88Zm0 56a32 32 0 1 1-32 32a32 32 0 0 1 32-32Z"/></svg>`,
  });

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

  L.marker(location, { icon: fluid }).addTo(map);

  return map;
};
</script>