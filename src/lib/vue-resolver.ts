import Page from "../components/Page.vue";
import Hero from "../components/Hero.vue";
import CallToAction from "../components/CallToAction.vue";
import FeaturedArticles from "../components/FeaturedArticles.vue";
import Marquee from "../components/Marquee.vue";
import Dummy from "../components/Dummy.vue";

export function resolve(component: string) {
  switch (component) {
    case "page": return Page;
    case "hero": return Hero;
    case "CallToAction": return CallToAction;
    case "featured-articles": return FeaturedArticles;
    case "marquee": return Marquee;
  
    default:
      break;
  };
  return Dummy;
}