<script setup lang="ts">
const menuOpen = ref(false)
const route = useRoute()
watch(() => route.fullPath, () => (menuOpen.value = false))

const links = [
  { to: '/', label: 'Hem' },
  { to: '/nyheter', label: 'Nyheter' },
  { to: '/umeloppet', label: 'Umeloppet' },
  { to: '/spar-status', label: 'Spårstatus' },
  { to: '#kontakt', label: 'Kontakt' },
]
</script>

<template>
  <div>
    <div class="shadow-xl bg-gray-100">
      <header class="z-50 relative px-4 py-4 flex justify-center items-center w-full max-w-4xl mx-auto">
        <NuxtLink
          to="/"
          class="sm:ml-4 whitespace-nowrap text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 via-pink-500 to-purple-600"
        >
          Västerbottens skidveteraner
        </NuxtLink>
        <nav class="nav text-black bg-gray-100">
          <input
            v-model="menuOpen"
            class="h-auto"
            type="checkbox"
            role="button"
            aria-label="Visa menyn"
            :aria-expanded="menuOpen"
            aria-controls="menu"
          >
          <ul id="menu" class="menu-list">
            <li v-for="link in links" :key="link.to">
              <NuxtLink class="main-link" :to="link.to" @click="menuOpen = false">{{ link.label }}</NuxtLink>
            </li>
          </ul>
        </nav>
      </header>
    </div>

    <slot />

    <footer class="bg-gray-100 px-6 pt-8 pb-8 relative">
      <div id="kontakt" class="max-w-5xl mx-auto grid grid-col-1 sm:grid-cols-2 gap-8">
        <div>
          <h2 class="font-semibold text-lg">Postadress</h2>
          <address>
            Västerbottens Skidveteraner <br>
            c/o Trude Hietha, Vittervägen 191 <br>
            90751 Umeå
          </address>
        </div>
        <div>
          <h2 class="font-semibold text-lg">Kontakt</h2>
          Tel: <i>0730644462</i>
          <br>
          E-post: <a href="mailto:trude.hietha@outlook.com">trude.hietha@outlook.com</a>
        </div>
      </div>
    </footer>
  </div>
</template>
