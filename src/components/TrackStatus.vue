<template>
  <div>
    <h2 class="text-4xl font-bold text-white sm:text-center uppercase py-6">Spårstatus i umeåområdet</h2>

    <p class="sm:text-center mb-7 mx-auto max-w-4xl">
      Vi rekomenderar starkt att alla deltagare i <a class="underline hover:text-purple-500"
        href="/umeloppet">Umeloppet</a> åtminstonde åker ett
      par mil innan start. Här presenterar vi aktuell spårstatus för de spår som rapporterar in status till Umeå kommuns
      anläggningsregister
    </p>

    <div class="min-h-screen">
      <transition name="fade" mode="out-in">
        <SkiGrid v-if="tracks?.length > 0" :table="tracks"></SkiGrid>
        <div v-else class=" flex justify-center items-center">
          <div class="relative h-72 w-72">
            <Loader show simple></Loader>
          </div>
        </div>

      </transition>
    </div>


  </div>

</template>

<script setup lang="ts">
import { onBeforeMount, ref } from 'vue'
import SkiGrid from "./SkiGrid.vue"
import Loader from "./Loader.vue"

const loading = ref(false)
const error = ref(false)
const tracks = ref()

const getTrackStatus = async () => {
  loading.value = true
  await new Promise(r => setTimeout(r, 500));
  try {
    const resp = await fetch('/.netlify/functions/get-tracks', {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
    })
    if (resp.status !== 200) {
      throw new Error('')
    }
    loading.value = false;
    return await resp.json()
  } catch (error) {
    console.log(error)
  }
}

onBeforeMount(async () => {
  tracks.value = await getTrackStatus()
})
</script>