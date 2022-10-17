<template>
  <div class="max-w-4xl mx-auto py-8 px-6">
    <h2 class="font-bold text-center text-4xl uppercase">Anmäl dig här</h2>
    <form @submit.prevent="submitForm" class="grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-6">
      <div class="flex flex-col">
        <label for="id-name">Namn</label>
        <input required v-model="formData.name" id="id-name" type="text" />
      </div>
      <div class="flex flex-col">
        <label for="id-klubb">Klubb</label>
        <input v-model="formData.club" id="id-klubb" type="text" />
      </div>
      <div class="flex flex-col">
        <label for="id-klubb">Vasa-ID</label>
        <input v-model="formData.vasa" id="id-klubb" type="text" />
      </div>
      <div class="flex flex-col">
        <label for="id-mail">E-post</label>
        <input required v-model="formData.email" id="id-mail" type="email" />
      </div>

      <div class="flex flex-col">
        <label for="id-klass">Sträcka</label>
        <select required v-model="formData.distance" id="id-klass">
          <option v-for="distance in distances" :value="distance.value">{{ distance.key }}</option>
        </select>
      </div>
      <div v-if="formData.distance" class="flex flex-col">
        <label for="id-klass">Klass</label>
        <select required v-model="formData.class" id="id-klass">
          <option v-for="klass in klasser" :value="klass">{{ klass }}</option>
        </select>
      </div>
      <div class="flex sm:col-span-2 justify-end mt-4">
        <button type="submit" class="px-4 py-2 bg-green-500 rounded-md text-white text-2xl font-semibold">
          Anmälan
        </button>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { reactive, computed } from "vue";

const submitForm = async () => {
  return;

};

const formData = reactive({
  name: "",
  email: "",
  club: "",
  class: "",
  distance: "",
  vasa: ""
});

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
      'D30',
      'D35',
      'D40',
      'D45',
      'D50',
      'D55',
      'D60',
      'D70',
      'D80',
      'D90',
      'H21',
      'H30',
      'H35',
      'H40',
      'H45',
      'H50',
      'H55',
      'H60',
      'H70',
      'H80',
      'H90',
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
  {
    value: 'para',
    key: '10 km Paraklass',
    classes: [
      'Herrar Motion',
      'Damer Motion',
    ]
  },
]

</script>
