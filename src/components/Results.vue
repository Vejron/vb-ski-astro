<template>
  <table class="table">
    <thead>
      <tr>
        <th>Plac</th>
        <th>Nr</th>
        <th>Namn</th>
        <th>Klubb</th>
        <th>Tid</th>
      </tr>
    </thead>
  </table>
  <button @click="onPress" class="p-4 bg-red-400">Press</button>
</template>

<script setup lang="ts">

const dummy = [
  {
    startNumber: 1,
    name: 'Olle banjeras',
    club: 'IFK Umeå',
    duration: '1:23:18',
  }
]

const props = defineProps({
  cols: Array
})

const onPress = async () => {
  console.log('Wiii');
  const cartResponse = await fetch(`/.netlify/functions/test`);
  const data = await cartResponse.json();
  console.log(data);
}
</script>

<style scoped lang="pcss">
.table th, .table td {
    @apply px-2;
}
.table th:first {
  @apply pl-4
}
</style>
