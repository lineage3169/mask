import Vue from 'vue'
import App from './App.vue'
import vuetify from './plugins/vuetify';
import * as VueGoogleMaps from 'vue2-google-maps'
import VueScrollTo from 'vue-scrollto'

Vue.config.productionTip = false
Vue.use(VueGoogleMaps, {
  load: {
    key: process.env.VUE_APP_MAP_KEY,
    libraries: 'places', 
    region: 'TW',
    language: 'zh-tw',
  }
})
Vue.use(VueScrollTo)
new Vue({
  vuetify,
  render: h => h(App)
}).$mount('#app')
