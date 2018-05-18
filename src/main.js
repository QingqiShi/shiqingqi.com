import Vue from 'vue';
import App from './App.vue';
import router from './router';
import store from './store';
import T from './utilities/t';
import texts from './texts';

Vue.config.productionTip = false;

Vue.use(T(texts, store.state.lang));

router.afterEach(to => {
    if (to.params.lang === 'zh') {
        store.commit('setLang', to.params.lang);
    } else {
        store.commit('setLang', 'en');
    }
});

new Vue({
    router,
    store,
    render: h => h(App)
}).$mount('#app');
