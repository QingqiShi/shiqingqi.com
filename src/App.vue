<template>
    <div id="app">
        <main-nav :routes="[
            {
                name: 'resume',
                path: '/'
            }, {
                name: 'timeline',
                path: '/timeline'
            }
        ]" />
        <router-view/>
    </div>
</template>

<script>
import MainNav from '@/components/MainNav.vue';
import texts from '@/texts';

export default {
    components: {
        MainNav
    },
    metaInfo() {
        const lang = this.$store.state.lang;
        const title = this.$route.meta.title;
        return {
            title: `${texts[lang][title]} | ${texts[lang].name}`,
            link: [
                {
                    rel: 'alternate',
                    hreflang: this.$store.state.hreflang
                },
                {
                    rel: 'canonical',
                    href: `https://shiqingqi.com${this.$route.meta.normalized}`
                }
            ],
            meta: [
                {
                    name: 'Description',
                    content: texts[lang][title + 'Description']
                }
            ]
        };
    }
};
</script>


<style lang="scss">
@import './scssUtils/colors';

#app {
    font-family: 'Roboto', 'Microsoft YaHei', 微软雅黑, 'Hiragino Sans GB', 冬青黑体, sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    text-align: center;
    color: $grey;
}

h1,
h2,
h3,
h4,
h5,
h6 {
    font-family: 'Ubuntu', 'Microsoft YaHei', 微软雅黑, 'Hiragino Sans GB', 冬青黑体, sans-serif;
    font-weight: 700;
}

.heading-font {
    font-family: 'Ubuntu', 'Microsoft YaHei', 微软雅黑, 'Hiragino Sans GB', 冬青黑体, sans-serif;
    font-weight: 700;
}

button {
    color: $grey;
}
</style>
