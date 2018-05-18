<template>
    <div id="app">
        <!-- <main-nav :routes="[
            {
                name: 'Resume',
                path: '/'
            }, {
                name: 'Timeline',
                path: '/timeline'
            }
        ]" /> -->
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
@import './scssUtils/colors';

#app {
    font-family: 'Roboto', sans-serif;
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
    font-family: 'Ubuntu', sans-serif;
    font-weight: 700;
}

.heading-font {
    font-family: 'Ubuntu', sans-serif;
    font-weight: 700;
}

button {
    color: $grey;
}
</style>
