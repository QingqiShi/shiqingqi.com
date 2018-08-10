import runtime from 'serviceworker-webpack-plugin/lib/runtime';
import Vue from 'vue';
import App from './App.vue';
import router from './router';
import store from './store';
import T from './utilities/t';
import texts from './texts';

Vue.config.productionTip = false;

Vue.use(T(texts, store.state.lang));

// Register service worker
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        runtime.register();
    });
}

// Handle language switch
const htmlTag = document.getElementsByTagName('html')[0];
router.afterEach(to => {
    if (to.params.lang === 'zh') {
        store.commit('setLang', to.params.lang);
        htmlTag.setAttribute('lang', to.params.lang);
    } else {
        store.commit('setLang', 'en');
        htmlTag.setAttribute('lang', 'en');
    }
});

new Vue({
    router,
    store,
    render: h => h(App)
}).$mount('#app');
