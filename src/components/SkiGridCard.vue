<template>
  <button @click="openDialog" :aria-labelledby="data.name"
    class="relative overflow-hidden flex flex-col bg-slate-900 rounded-lg shadow-lg px-6 py-4 transform transition-all hover:bg-slate-300 hover:text-black hover:scale-105">
    <h3 :id="data.name" class="flex w-full justify-between text-lg sm:text-2xl font-medium mb-2">
      <span class="truncate">{{ data.name }}</span>
      <span class="flex-none">{{ data.length }} km</span>
    </h3>
    <p class="flex-grow text-left text-sm mb-4">{{ data.info }}</p>
    <div class="flex justify-between items-center">
      <p class="capitalize px-3 py-1 rounded text-black font-medium" :style="{ 'background-color': color }">
        {{ timeAgo }}
      </p>
    </div>
    <div v-if="data.electric"
      class="absolute text-lg font-medium text-black px-10 bottom-3 -right-9 transform rotate-[320deg] bg-yellow-200">
      Elljus
    </div>
  </button>
  <TransitionRoot as="template" :show="open">
    <Dialog as="div" class="fixed z-50 inset-0 overflow-y-auto" @close="open = false">
      <div class="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center block">
        <TransitionChild as="template" enter="ease-out duration-300" enter-from="opacity-0" enter-to="opacity-100"
          leave="ease-in duration-200" leave-from="opacity-100" leave-to="opacity-0">
          <DialogOverlay class="fixed inset-0 bg-gray-900 bg-opacity-75 transition-opacity" />
        </TransitionChild>

        <!-- This element is to trick the browser into centering the modal contents. -->
        <span class="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
        <TransitionChild as="template" enter="ease-out duration-300"
          enter-from="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
          enter-to="opacity-100 translate-y-0 sm:scale-100" leave="ease-in duration-200"
          leave-from="opacity-100 translate-y-0 sm:scale-100"
          leave-to="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95">
          <div
            class="inline-block align-bottom bg-white rounded-lg p-4 text-left overflow-hidden shadow-xl transform transition-all w-full max-w-5xl mx-2">
            <div>
              <div class="flex flex-col relative">
                <div class="mb-4 flex justify-between flex-wrap items-end">
                  <DialogTitle as="h2" class="text-2xl leading-8 font-medium text-gray-900">{{ data.name }}
                  </DialogTitle>
                  <p class="whitespace-nowrap">
                    <span>Aktuell temperatur&nbsp;</span>
                    <span :class="[temp > 0 ? ' text-red-500' : ' text-blue-500', 'font-semibold']">{{ temp }}
                      °C</span>
                  </p>
                  <p class="whitespace-nowrap">
                    <span>Relativ luftfuktighet&nbsp;</span>
                    <span class="font-semibold">{{ moist }}
                      %</span>
                  </p>
                </div>

                <StatusMap class="relative h-[60vh]" :data="data"></StatusMap>
              </div>
            </div>
            <div class="mt-5 sm:mt-6">
              <button type="button"
                class="inline-flex justify-center w-full rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:text-sm"
                @click="open = false">
                Stäng
              </button>
            </div>
          </div>
        </TransitionChild>
      </div>
    </Dialog>
  </TransitionRoot>
</template>

<script setup lang="ts">
import { computed, PropType, ref } from "vue"
import { useTimeAgo } from '@vueuse/core'
import StatusMap from "./StatusMap.vue"
import { getForecast } from "../services/smhi.service"

import {
  Dialog,
  DialogOverlay,
  DialogTitle,
  TransitionChild,
  TransitionRoot,
} from "@headlessui/vue"
const props = defineProps({
  data: Object as PropType<{
    name: string
    info: string
    date: string
    length: number
    electric: boolean
    location: any[]
  }>,
})
const open = ref(false)
const temp = ref(0)
const moist = ref(0)
const timeAgo = useTimeAgo(props.data.date)
const color = computed(() => {
  const diff = Date.now() - new Date(props.data.date).valueOf()
  const daysAgo = Math.round(diff / 86400000)
  return ["#71EF77", "#F8C084", "#E78497"][daysAgo] ?? "#8FC7FD"
});

const openDialog = async () => {
  open.value = true
  const res = await getForecast(props.data.location)
  if (res.status === 200) {
    const json = await res.json()
    console.log(json)
    temp.value = json.timeSeries[0].parameters[10].values[0]
    moist.value = json.timeSeries[0].parameters[15].values[0]
  }
  //

}
</script>

<style scoped>
.map-part {
  height: calc(60vh - 200px);
}
</style>