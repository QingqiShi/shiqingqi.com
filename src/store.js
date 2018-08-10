import Vue from 'vue';
import Vuex from 'vuex';

Vue.use(Vuex);

export default new Vuex.Store({
    state: {
        lang: 'en',
        hreflang: 'en-GB'
    },
    mutations: {
        setLang(state, newLang) {
            state.lang = newLang;

            switch (newLang) {
                case 'zh':
                    state.hreflang = 'zh-Hans';
                    break;
                default:
                    state.hreflang = 'en';
            }
        }
    },
    actions: {}
});
