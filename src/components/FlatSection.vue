<template>
    <section :class="{ 
        'no-margin': noMargin, 
        'large-font': largeFont, 
        dark: dark,
        'flex': flex
    }">
        <slot/>
    </section>
</template>

<script>
export default {
    name: 'FlatSection',
    props: {
        noMargin: {
            type: Boolean,
            default: false
        },
        largeFont: {
            type: Boolean,
            default: false
        },
        dark: {
            type: Boolean,
            default: false
        },
        flex: {
            type: Boolean,
            default: false
        }
    }
};
</script>

<style lang="scss" scoped>
@import '../scssUtils/utils';

section {
    background-color: $white;
    padding: 3rem;
    font-size: 1rem;

    @include breakpoint($tablet) {
        padding: 4rem;
        font-size: 1.1rem;
    }
    @include breakpoint($laptop) {
        padding: 5rem 10rem;
        font-size: 1.2rem;
    }
    @include breakpoint($desktop) {
        padding: 6rem 15rem;
        font-size: 1.4rem;
    }
}

.no-margin {
    padding: 0;
}

.large-font {
    font-size: 1.3rem;
    @include breakpoint($tablet) {
        font-size: 1.4rem;
    }
    @include breakpoint($laptop) {
        font-size: 1.7rem;
    }
    @include breakpoint($desktop) {
        font-size: 2rem;
    }
}

.dark {
    color: $white;
    background-color: $grey;
}
</style>
