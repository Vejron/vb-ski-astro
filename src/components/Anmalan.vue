<template>
<div class="p-8">
  <form action="">
    <div class="flex flex-col">
      <label for="id-name">Namn</label>
      <input id="id-name" type="text" />
    </div>
    <div class="flex flex-col">
      <label for="id-klubb">Klubb</label>
      <input id="id-klubb" type="text" />
    </div>
    <div class="flex flex-col">
      <label for="id-klass">Klass</label>
      <select id="id-klass">
        <option v-for="klass in klasser" value="">{{klass}}</option>
      </select>
    </div>
  </form>
</div>
  
</template>

<script setup lang="ts">

const klasser = [
  'Motion 20Km',
  'Motion 40Km',
  'D21',
  'D30',
  'D35',
  'D40',
  'D45',
  'D50',
  'D60',
  'D70',
  'H21',
  'H30',
  'H35',
  'H40',
  'H45',
  'H50',
  'H60',
  'H70',
]
</script>
