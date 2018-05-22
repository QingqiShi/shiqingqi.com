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
        document.title = `${texts[to.params.lang].name} - ${
            texts[to.params.lang][to.meta.title]
        }`;
    } else {
        store.commit('setLang', 'en');
        document.title = `${texts.en.name} - ${texts.en[to.meta.title]}`;
    }
});

new Vue({
    router,
    store,
    render: h => h(App)
}).$mount('#app');
