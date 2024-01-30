<template>
  <div v-if="true" class="max-w-4xl mx-auto py-8 px-6">
    <h2 class="font-bold sm:text-center text-4xl uppercase mb-4">Anmäl är nu stängd för 2024 års lopp</h2>
    <p class="sm:text-center font-semibold text-lg mb-4">
      Vi har nått max antal startande.
    </p>
    <!--
    <h2 class="font-bold sm:text-center text-4xl uppercase mb-4">Anmälan för 2024 års lopp</h2>
    <p class="sm:text-center font-semibold text-lg mb-4">
      Öppnar här den 15:e december.
    </p>
    -->
  </div>
  <div v-else class="max-w-4xl mx-auto py-8 px-6">
    <h2 class="font-bold sm:text-center text-4xl uppercase mb-4">Anmäl dig här</h2>
    <p class="sm:text-center font-semibold text-lg mb-4">
      Obs! Max 400 startande och sista anmälningstid 31:a januari kl 24:00
    </p>
    <form @submit.prevent="submitForm" class="grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-6">
      <div class="flex flex-col">
        <label class="required font-medium mb-1" for="id-name">Namn</label>
        <input required v-model="formData.name" id="id-name" type="text" />
      </div>
      <div class="flex flex-col">
        <label class="required font-medium mb-1" for="id-mail">E-post</label>
        <input required v-model="formData.email" id="id-mail" type="email" />
      </div>
      <div class="flex flex-col">
        <label for="id-klubb" class="font-medium mb-1">Klubb</label>
        <input v-model="formData.club" id="id-klubb" type="text" />
      </div>

      <div class="flex flex-col">
        <label for="id-klubb" class="font-medium mb-1">Vasa-ID</label>
        <input v-model="formData.vasa" id="id-klubb" type="text" />
        <span class="text-sm mt-1">Nödvändigt för ev seedning</span>
      </div>

      <div class="flex flex-col">
        <label class="required font-medium mb-1" for="id-distance">Sträcka</label>
        <select required v-model="formData.distance" id="id-distance">
          <option v-for="distance in distances" :value="distance.value">{{ distance.key }}</option>
        </select>
      </div>
      <div v-if="formData.distance" class="flex flex-col">
        <label class="required font-medium mb-1" for="id-klass">Klass</label>
        <select required v-model="formData.class" id="id-klass">
          <option v-for="klass in klasser" :value="klass">{{ klass }}</option>
        </select>
      </div>
      <div class="flex sm:col-span-2 justify-between items-end mt-4">
        <fieldset>
          <legend class="font-medium mb-1">Jag betalar via:</legend>
          <div class="flex items-center">
            <input class="transition-all" type="radio" v-model="formData.paymethod" id="id-swish" value="swish">
            <label class="ml-2" for="id-swish">Swish (123 541 1848)</label>
          </div>
          <div class="flex items-center">
            <input class="transition-all" type="radio" v-model="formData.paymethod" id="id-bg" value="pg">
            <label class="ml-2" for="id-bg">PlusGirot (780801-7)</label>
          </div>

        </fieldset>

        <button type="submit"
          :class="[valid ? 'bg-green-500 hover:bg-green-700 text-white' : 'bg-gray-300 text-gray-600']"
          class="inline-flex justify-center rounded-md border border-transparent px-4 py-2 text-sm font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2">
          Anmäl mig
        </button>
      </div>
    </form>
    <TransitionRoot appear :show="isOpen" as="template">
      <Dialog as="div" @close="clickOutside" class="relative z-10">
        <TransitionChild as="template" enter="duration-300 ease-out" enter-from="opacity-0" enter-to="opacity-100"
          leave="duration-200 ease-in" leave-from="opacity-100" leave-to="opacity-0">
          <div class="fixed inset-0 bg-black bg-opacity-25" />
        </TransitionChild>

        <div class="fixed inset-0 overflow-y-auto">
          <div class="flex min-h-full items-center justify-center p-4 text-center">
            <TransitionChild as="template" enter="duration-300 ease-out" enter-from="opacity-0 scale-95"
              enter-to="opacity-100 scale-100" leave="duration-200 ease-in" leave-from="opacity-100 scale-100"
              leave-to="opacity-0 scale-95">
              <DialogPanel
                class="w-full relative max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                <Loader :show="showLoader"></Loader>
                <DialogTitle as="h3" class="text-xl sm:text-2xl font-medium leading-6 text-gray-900">
                  Granska och slutför anmälan
                </DialogTitle>
                <div v-if="state === 'done'" class="h-44 mt-2 flex flex-col justify-between">
                  <p class="text-gray-700 mb-2">
                    Tack. Vi har nu mottagit din anmälan. En bekräftelse skickas också till
                    den e-post du uppgav. Glöm inte att betala så fort som möjligt
                  </p>
                  <div class="mt-4 flex justify-end gap-4">
                    <button type="button"
                      class="inline-flex shadow-lg justify-center rounded-md border border-transparent bg-green-200 px-4 py-2 text-sm font-medium text-gray-900 hover:bg-green-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                      @click="isOpen = false">
                      Stäng dialog
                    </button>
                  </div>
                </div>
                <div v-else class="mt-2">
                  <p class="text-gray-700 mb-2">
                    Dubbelkolla gärna dina uppgifter innan du slutför anmälan. Genom att slutföra anmälan ger du oss
                    tillstånd att publicera dina uppgifter i resultatlistan
                  </p>
                  <div class="final-grid">
                    <span>Namn</span><span class="font-medium">{{ formData.name }}</span>
                    <span>E-post</span><span class="font-medium">{{ formData.email }}</span>
                    <span v-if="formData.club">Klubb</span>
                    <span v-if="formData.club" class="font-medium">{{ formData.club }}</span>
                    <span v-if="formData.vasa">Vasa-ID</span>
                    <span v-if="formData.vasa" class="font-medium">{{ formData.vasa }}</span>
                    <span>Sträcka</span>
                    <span class="font-medium">{{ translateDistance(formData.distance) }}</span>
                    <span>Klass</span><span class="font-medium">{{ formData.class }}</span>
                  </div>
                  <p class="mt-4">
                  <p v-if="formData.distance === 'long'">Anmälningsavgift 400 kr</p>
                  <p v-if="formData.distance === 'short'">Anmälningsavgift 300 kr</p>
                  <p v-if="formData.distance === 'para'">Anmälningsavgift 100 kr</p>
                  <span v-if="formData.paymethod === 'pg'">Betala via PlusGirot: <span
                      class="font-medium">780801-7</span></span>
                  <span v-else>Swisha betalning till nr: <span class="font-medium">123 541 1848</span></span>
                  </p>
                  <div class="mt-4 flex justify-end gap-4">
                    <button type="button"
                      class="inline-flex shadow-lg justify-center rounded-md border border-transparent bg-red-200 px-4 py-2 text-sm font-medium text-gray-900 hover:bg-red-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                      @click="isOpen = false">
                      Avbryt
                    </button>
                    <button type="button"
                      class="inline-flex shadow-lg justify-center rounded-md border border-transparent bg-green-200 px-4 py-2 text-sm font-medium text-gray-900 hover:bg-green-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                      @click="finalize">
                      Slutför anmälan
                    </button>
                  </div>
                </div>
              </DialogPanel>
            </TransitionChild>
          </div>
        </div>
      </Dialog>
    </TransitionRoot>
  </div>
</template>

<script setup lang="ts">
import { reactive, computed, ref } from "vue";
import { useNow } from '@vueuse/core'
import {
  TransitionRoot,
  TransitionChild,
  Dialog,
  DialogPanel,
  DialogTitle,
} from '@headlessui/vue'
import Loader from './Loader.vue'

const now = useNow()
const registerOverdue = computed(() => {
  return now.value > new Date(2024, 0, 30, 21, 35, 59)
})

const state = ref<'initial' | 'submitting' | 'done'>('initial')
const showLoader = computed(() => state.value === 'submitting')
const isOpen = ref(false)
const submitForm = async () => {
  if (state.value !== 'submitting') {
    isOpen.value = true
    state.value = 'initial'
  }
};
const clickOutside = () => {
  isOpen.value = false
}
const finalize = async () => {
  state.value = 'submitting'
  await new Promise(r => setTimeout(r, 500));
  try {
    const resp = await fetch('/.netlify/functions/sign-up', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(formData)
    })
    if (resp.status !== 200) {
      throw new Error('')
    }
    state.value = 'done'
    formData.name = ""
    formData.email = ""
    formData.club = ""
    formData.class = ""
    formData.distance = ""
    formData.vasa = ""
  } catch (error) {
    alert('Vi kunde inte slutföra din anmälan')
    state.value = 'initial'
    isOpen.value = false
  }

}

const formData = reactive({
  name: "",
  email: "",
  club: "",
  class: "",
  distance: "",
  vasa: "",
  paymethod: "swish",
});

const valid = computed(() => {
  return formData.name && formData.email && formData.class && formData.distance
})

const klasser = computed(() => {
  return distances.find(d => d.value === formData.distance)?.classes
})

const distances = [
  {
    value: 'long',
    key: '40 km',
    classes: [
      'Herrar Motion',
      'Damer Motion',
      'D21',
      'D35',
      'D40',
      'D45',
      'D50',
      'D55',
      'D60',
      'D65',
      'D70',
      'D75',
      'D80+',
      'H21',
      'H35',
      'H40',
      'H45',
      'H50',
      'H55',
      'H60',
      'H65',
      'H70',
      'H75',
      'H80+',
    ]
  },
  {
    value: 'short',
    key: '20 km',
    classes: [
      'Herrar Motion',
      'Damer Motion',
    ]
  },
]

const translateDistance = (distance: string) => {
  switch (distance) {
    case 'long':
      return '40 Km'
    case 'short':
      return '20 Km'
    case 'para':
      return '5 km Paraklass'

    default:
      return 'Okänd'
  }
}

</script>

<style scoped>
.required::after {
  @apply text-red-600;
  content: ' *';
}

.final-grid {
  display: grid;
  grid-template-columns: 0.3fr 1fr;
  align-items: baseline;
}
</style>
