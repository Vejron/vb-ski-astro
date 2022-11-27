<template>
  <div id="mainMapContainer" class="w-full"></div>
</template>

<script setup lang="ts">
import { PropType, onMounted, onUnmounted } from "vue";
import "leaflet/dist/leaflet.css";
import path from "../assets/path.json";
//import { getForecast } from "~~/services/smhi.service";

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
  map = setupLeafletMap([63.871, 20.183687], L);
});

onUnmounted(() => {
  console.log("destroy map now");
  map && map.remove();
});
const setupLeafletMap = (location: any, L) => {
  const map = new L.map("mainMapContainer", { zoomControl: false }).setView(
    location,
    13
  );
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
  L.geoJSON(path).addTo(map);


  const fluid1 = [63.862985, 20.148497];
  const fluid2 = [63.886115, 20.152617];
  const fluid3 = [63.864384, 20.186348];

  const start = L.divIcon({
    className: "map-pin",
    html: '<p class="inner-pin">START</p>',
    //iconSize: [30, 30],
    //iconAnchor: [18, 30]
    //iconAnchor: [10, 33]
  });
  const finish = L.divIcon({
    className: "map-pin",
    html: '<p class="inner-pin">MÅL</p>',
    //iconSize: [30, 30],
    //iconAnchor: [18, 30]
    //iconAnchor: [10, 33]
  });
  // you can set .my-div-icon styles in CSS
  const fluid = L.divIcon({
    className: "map-pin",
    iconSize: [30, 30],
    iconAnchor: [18, 30],
    html: `<svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" role="img" width="100%" height="100%" preserveAspectRatio="xMidYMid meet" viewBox="0 0 384 432"><path d="M0 3h384l-43 389q-2 16-14 26.5T299 429H85q-16 0-28-10.5T43 392zm192 362q27 0 45.5-18.5T256 301q0-19-16-47.5T208 205l-16-19q-7 8-17.5 21.5t-28.5 44t-18 49.5q0 27 18.5 45.5T192 365zm135-234l9-86H48l9 86h270z" fill="blue"/></svg>`,
  });

  L.marker([63.865065, 20.198879], { icon: finish }).addTo(map);
  L.marker([63.866312, 20.184803], { icon: start }).addTo(map);

  [fluid1, fluid2, fluid3].forEach((latLon) => {
    L.marker(latLon, { icon: fluid }).addTo(map);
  });
  return map;
};
</script>
