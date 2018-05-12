<template>
    <div id="app">
        <main-nav :routes="[
            {
                name: 'Home',
                path: '/'
            }, {
                name: 'About',
                path: '/about'
            }
        ]" />
        <router-view/>
    </div>
</template>

<script>
import MainNav from '@/components/MainNav.vue';

export default {
    components: {
        MainNav
    }
};
</script>


<style lang="scss">
#app {
    font-family: 'Roboto', sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    text-align: center;
    color: #2c3e50;
}

h1,
h2,
h3,
h4,
h5,
h6 {
    font-family: 'Ubuntu', sans-serif;
    font-weight: 700;
}

.heading-font {
    font-family: 'Ubuntu', sans-serif;
    font-weight: 700;
}
</style>
