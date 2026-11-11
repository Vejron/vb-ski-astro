<script setup lang="ts">
// Registration form. Shows the form while registration is open; otherwise it
// shows the markdown written inside the component (use ::race-status in it).
// Distances, classes, prices, max participants and the deadline come from
// content/umeloppet.yml.
//
//   ::anmalan
//     :::race-status{is="closed,full"}
//     ## Anmälan är stängd
//     :::
//   ::
import { TransitionRoot, TransitionChild, Dialog, DialogPanel, DialogTitle } from '@headlessui/vue'

const { race, isOpen: registrationOpen, fields } = useRace()

const state = ref<'initial' | 'submitting' | 'done'>('initial')
const showLoader = computed(() => state.value === 'submitting')
const dialogOpen = ref(false)

const formData = reactive({
  name: '',
  email: '',
  club: '',
  class: '',
  distance: '',
  vasa: '',
  paymethod: 'swish' as 'swish' | 'pg',
})

const selectedDistance = computed(() => race.value.distances.find(d => d.id === formData.distance))
const klasser = computed(() => selectedDistance.value?.classes ?? [])
watch(() => formData.distance, () => {
  if (!klasser.value.includes(formData.class)) formData.class = ''
})

const valid = computed(() => formData.name && formData.email && formData.class && formData.distance)

const submitForm = () => {
  if (state.value !== 'submitting') {
    dialogOpen.value = true
    state.value = 'initial'
  }
}

const finalize = async () => {
  state.value = 'submitting'
  try {
    await $fetch('/api/sign-up', { method: 'POST', body: formData })
    state.value = 'done'
    Object.assign(formData, { name: '', email: '', club: '', class: '', distance: '', vasa: '' })
  }
  catch (error: any) {
    alert(error?.data?.message || 'Vi kunde inte slutföra din anmälan')
    state.value = 'initial'
    dialogOpen.value = false
  }
}
</script>

<template>
  <section id="anmalan" class="bg-slate-200 relative">
    <div v-if="!registrationOpen" class="anmalan-closed md-section max-w-4xl mx-auto py-8 px-6 sm:text-center">
      <slot />
    </div>
    <div v-else class="max-w-4xl mx-auto py-8 px-6">
      <h2 class="font-bold sm:text-center text-4xl uppercase mb-4">Anmäl dig här</h2>
      <p class="sm:text-center font-semibold text-lg mb-4">
        Obs!
        <template v-if="race.registration.maxParticipants">Max {{ race.registration.maxParticipants }} startande och sista</template>
        <template v-else>Sista</template>
        anmälningstid {{ fields.closes }}
      </p>
      <form class="grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-6" @submit.prevent="submitForm">
        <div class="flex flex-col">
          <label class="required font-medium mb-1" for="id-name">Namn</label>
          <input id="id-name" v-model="formData.name" required type="text">
        </div>
        <div class="flex flex-col">
          <label class="required font-medium mb-1" for="id-mail">E-post</label>
          <input id="id-mail" v-model="formData.email" required type="email">
        </div>
        <div class="flex flex-col">
          <label for="id-klubb" class="font-medium mb-1">Klubb</label>
          <input id="id-klubb" v-model="formData.club" type="text">
        </div>
        <div class="flex flex-col">
          <label for="id-vasa" class="font-medium mb-1">Vasa-ID</label>
          <input id="id-vasa" v-model="formData.vasa" type="text">
          <span class="text-sm mt-1">Nödvändigt för ev seedning</span>
        </div>
        <div class="flex flex-col">
          <label class="required font-medium mb-1" for="id-distance">Sträcka</label>
          <select id="id-distance" v-model="formData.distance" required>
            <option v-for="d in race.distances" :key="d.id" :value="d.id">{{ d.name }}</option>
          </select>
        </div>
        <div v-if="formData.distance" class="flex flex-col">
          <label class="required font-medium mb-1" for="id-klass">Klass</label>
          <select id="id-klass" v-model="formData.class" required>
            <option v-for="klass in klasser" :key="klass" :value="klass">{{ klass }}</option>
          </select>
        </div>
        <div class="flex sm:col-span-2 justify-between items-end mt-4">
          <fieldset>
            <legend class="font-medium mb-1">Jag betalar via:</legend>
            <div class="flex items-center">
              <input id="id-swish" v-model="formData.paymethod" class="transition-all" type="radio" value="swish">
              <label class="ml-2" for="id-swish">Swish ({{ race.payment.swish }})</label>
            </div>
            <div class="flex items-center">
              <input id="id-bg" v-model="formData.paymethod" class="transition-all" type="radio" value="pg">
              <label class="ml-2" for="id-bg">PlusGirot ({{ race.payment.plusgiro }})</label>
            </div>
          </fieldset>

          <button
            type="submit"
            :class="[valid ? 'bg-green-500 hover:bg-green-700 text-white' : 'bg-gray-300 text-gray-600']"
            class="inline-flex justify-center rounded-md border border-transparent px-4 py-2 text-sm font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
          >
            Anmäl mig
          </button>
        </div>
      </form>

      <TransitionRoot appear :show="dialogOpen" as="template">
        <Dialog as="div" class="relative z-10" @close="dialogOpen = false">
          <TransitionChild
            as="template" enter="duration-300 ease-out" enter-from="opacity-0" enter-to="opacity-100"
            leave="duration-200 ease-in" leave-from="opacity-100" leave-to="opacity-0"
          >
            <div class="fixed inset-0 bg-black bg-opacity-25" />
          </TransitionChild>

          <div class="fixed inset-0 overflow-y-auto">
            <div class="flex min-h-full items-center justify-center p-4 text-center">
              <TransitionChild
                as="template" enter="duration-300 ease-out" enter-from="opacity-0 scale-95"
                enter-to="opacity-100 scale-100" leave="duration-200 ease-in" leave-from="opacity-100 scale-100"
                leave-to="opacity-0 scale-95"
              >
                <DialogPanel class="w-full relative max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                  <Loader :show="showLoader" />
                  <DialogTitle as="h3" class="text-xl sm:text-2xl font-medium leading-6 text-gray-900">
                    Granska och slutför anmälan
                  </DialogTitle>
                  <div v-if="state === 'done'" class="h-44 mt-2 flex flex-col justify-between">
                    <p class="text-gray-700 mb-2">
                      Tack. Vi har nu mottagit din anmälan. En bekräftelse skickas också till
                      den e-post du uppgav. Glöm inte att betala så fort som möjligt
                    </p>
                    <div class="mt-4 flex justify-end gap-4">
                      <button
                        type="button"
                        class="inline-flex shadow-lg justify-center rounded-md border border-transparent bg-green-200 px-4 py-2 text-sm font-medium text-gray-900 hover:bg-green-300"
                        @click="dialogOpen = false"
                      >
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
                      <template v-if="formData.club">
                        <span>Klubb</span><span class="font-medium">{{ formData.club }}</span>
                      </template>
                      <template v-if="formData.vasa">
                        <span>Vasa-ID</span><span class="font-medium">{{ formData.vasa }}</span>
                      </template>
                      <span>Sträcka</span><span class="font-medium">{{ selectedDistance?.name }}</span>
                      <span>Klass</span><span class="font-medium">{{ formData.class }}</span>
                    </div>
                    <div class="mt-4">
                      <p v-if="selectedDistance">Anmälningsavgift {{ selectedDistance.price }} kr</p>
                      <p v-if="formData.paymethod === 'pg'">
                        Betala via PlusGirot: <span class="font-medium">{{ race.payment.plusgiro }}</span>
                      </p>
                      <p v-else>
                        Swisha betalning till nr: <span class="font-medium">{{ race.payment.swish }}</span>
                      </p>
                    </div>
                    <div class="mt-4 flex justify-end gap-4">
                      <button
                        type="button"
                        class="inline-flex shadow-lg justify-center rounded-md border border-transparent bg-red-200 px-4 py-2 text-sm font-medium text-gray-900 hover:bg-red-300"
                        @click="dialogOpen = false"
                      >
                        Avbryt
                      </button>
                      <button
                        type="button"
                        class="inline-flex shadow-lg justify-center rounded-md border border-transparent bg-green-200 px-4 py-2 text-sm font-medium text-gray-900 hover:bg-green-300"
                        @click="finalize"
                      >
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
  </section>
</template>

<style scoped>
.required::after {
  color: rgb(220 38 38);
  content: ' *';
}

.final-grid {
  display: grid;
  grid-template-columns: 0.3fr 1fr;
  align-items: baseline;
}
</style>
