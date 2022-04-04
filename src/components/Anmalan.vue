<template>
  <div class="max-w-4xl mx-auto py-8 px-6">
    <h2 class="font-bold text-center text-4xl uppercase">Anmäl dig här</h2>
    <form @submit.prevent="submitForm" class="grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-6">
      <div class="flex flex-col">
        <label for="id-name">Namn</label>
        <input v-model="formData.name" id="id-name" type="text" />
      </div>
      <div class="flex flex-col">
        <label for="id-mail">E-post</label>
        <input v-model="formData.email" id="id-mail" type="email" />
      </div>
      <div class="flex flex-col">
        <label for="id-klubb">Klubb</label>
        <input v-model="formData.club" id="id-klubb" type="text" />
      </div>
      <div class="flex flex-col">
        <label for="id-klass">Klass</label>
        <select v-model="formData.class" id="id-klass">
          <option v-for="klass in klasser" :value="klass">{{ klass }}</option>
        </select>
      </div>
      <div class="flex sm:col-span-2 justify-end mt-4">
        <button
          class="px-4 py-2 bg-green-500 rounded-md text-white text-2xl font-semibold"
        >
          Anmälan
        </button>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { reactive } from "vue";
import { loadStripe } from "@stripe/stripe-js";

const submitForm = async () => {
  return;
  const data = {
    sku: "DEMO001",
    quantity: 1,
  };

  const response = await fetch("/.netlify/functions/create-checkout", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  }).then((res) => res.json());

  const stripe = await loadStripe(response.publishableKey);
  const { error } = await stripe.redirectToCheckout({
    sessionId: response.sessionId,
  });

  if (error) {
    console.error(error);
  }
};

const formData = reactive({
  name: "John doe",
  email: "",
  club: "TTGU",
  class: "Motion 40Km",
});

const klasser = [
  "Motion 20Km",
  "Motion 40Km",
  "D21",
  "D30",
  "D35",
  "D40",
  "D45",
  "D50",
  "D60",
  "D70",
  "H21",
  "H30",
  "H35",
  "H40",
  "H45",
  "H50",
  "H60",
  "H70",
];
</script>
