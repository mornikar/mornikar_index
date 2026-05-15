import AutoCarousel from './components/AutoCarousel.vue'

export function registerComponents(app) {
  app.component('AutoCarousel', AutoCarousel)
}

// 如果要在浏览器全局可用
if (typeof window !== 'undefined' && window.Vue) {
  registerComponents(window.Vue)
}