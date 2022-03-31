<template>
  <div class="p-8">
    <form @submit.prevent="submitForm">
      <div class="flex flex-col">
        <label for="id-name">Namn</label>
        <input v-model="formData.name" id="id-name" type="text" />
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
    </form>
  </div>
</template>

<script setup lang="ts">
import { reactive } from "vue";
import { loadStripe } from "@stripe/stripe-js";

const submitForm = async () => {
  const data = {
    sku: 'DEMO001',
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
