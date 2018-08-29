<template>
    <div class="lang-switcher">
        <button :class="{selected: $store.state.lang == 'en'}" class="lang-option" @click="switchLang('en')">en</button>
        <button :class="{selected: $store.state.lang == 'zh'}" class="lang-option" @click="switchLang('zh')">中</button>
    </div>
</template>

<script>
export default {
    name: 'LanguageSwitcher',
    methods: {
        switchLang(lang) {
            this.$store.commit('setLang', lang);
            this.$router.push(`/${lang}${this.$route.meta.normalized}`);
        }
    }
};
</script>

<style lang="scss" scoped>
@import '../scssUtils/utils';

.lang-switcher {
    display: flex;
    margin-top: 0.1rem;
}

.lang-option {
    width: 50%;
    border: none;
    background-color: transparent;
    padding: 1rem;
    text-transform: uppercase;
    cursor: pointer;
    color: $grey;
    text-decoration: none;

    &:hover {
        background-color: $blue;
    }

    &.selected {
        background-color: $green;
        color: $white;
    }
}
</style>
