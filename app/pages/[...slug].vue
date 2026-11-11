<script setup lang="ts">
import { phaseSummary } from '#shared/race'

const route = useRoute()
const path = route.path.replace(/\/$/, '') || '/'
const isPost = path.startsWith('/blog/')

// Pages (content/*.md) and news posts (content/blog/*.md)
const { data: page } = await useAsyncData(`page-${path}`, async () => {
  if (isPost) {
    const post = await queryCollection('blog').path(path).first()
    return post && { ...post, title: post.displaytitle, footer: 'bg-white', image: post.thumbnail }
  }
  const page = await queryCollection('pages').path(path).first()
  return page && { ...page, image: undefined as string | undefined }
})

if (!page.value) {
  throw createError({ statusCode: 404, statusMessage: 'Sidan finns inte', fatal: true })
}

const { race, phase } = useRace()
const title = computed(() => page.value?.title)
const description = computed(() =>
  path === '/umeloppet' ? phaseSummary(race.value, phase.value) : page.value?.description,
)
const image = `https://skidveteraner.se${page.value.image ?? '/assets/veteranerna-logga.svg'}`

useSeoMeta({
  title,
  description,
  ogTitle: title,
  ogDescription: description,
  ogSiteName: 'Skidveteranerna',
  ogType: 'website',
  ogUrl: `https://skidveteraner.se${path}`,
  ogImage: image,
  twitterCard: 'summary_large_image',
  twitterImage: image,
})
</script>

<template>
  <div>
    <section v-if="isPost" class="mx-auto px-6 my-12 prose prose-lg lg:prose-xl min-h-[85vh]">
      <ContentRenderer :value="page!" />
    </section>
    <ContentRenderer v-else :value="page!" />
    <!-- Wave into the footer; background = colour of the last section (frontmatter "footer") -->
    <TopShape class="block text-gray-100 -mb-px" :class="page!.footer ?? 'bg-white'" />
  </div>
</template>
