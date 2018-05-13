import T from './T.vue';

function getText(text, lang, key) {
    return text[lang][key] || text['en'][key] || `$$${key}$$`;
}

const Texts = (texts, initLang) => ({
    install: Vue => {
        let lang = initLang || 'en';

        Vue.prototype.$t = (key, langParam) => {
            return getText(texts, langParam || lang, key);
        };
        Vue.prototype.setLang = newLang => {
            lang = newLang;
        };
        Vue.prototype.getLang = () => {
            return lang;
        };

        Vue.component('t', T);
    }
});

export default Texts;
