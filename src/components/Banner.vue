<template>
    <div class="banner">
        <div class="wrapper">
            <round-img :src="require('../assets/selfie.jpg')" class="selfie" />
            <card class="intro">
                <t t="name" tag="h1" class="title" />
                <p class="tags">
                    <t t="coder" class="palette-1" />
                    <t t="husband" class="palette-3" />
                    <t t="gamer" class="palette-2" />
                    <t t="frontEndDev" class="palette-4" />
                    <t t="designer" class="palette-3" />
                    <t t="chinese" class="palette-5" />
                    <t t="photographer" class="palette-2" />
                    <t t="creator" class="palette-1" />
                </p>
            </card>
        </div>
    </div>
</template>

<script>
import Card from '@/components/Card.vue';
import RoundImg from '@/components/RoundImg.vue';

export default {
    name: 'Banner',
    components: {
        Card,
        RoundImg
    }
};
</script>

<style lang="scss" scoped>
@import '../scssUtils/breakpoint';
@import '../scssUtils/colors';

$selfie-size: 24vw;

h1 {
    margin-bottom: 0;
}

.banner {
    background-image: url(../assets/main-bg.jpg);
    background-position: center;
    background-size: cover;
    text-align: center;
}

.wrapper {
    padding: 0 2rem 1rem;

    @include breakpoint($tablet) {
        padding: 0 5rem 3rem;
    }

    @include breakpoint($laptop) {
        padding: 8rem 2rem 8rem;
        display: grid;
        grid-template-columns: 23rem minmax(auto, max-content);
        align-items: center;
        justify-content: center;
        vertical-align: middle;
        max-width: $laptop;
        margin: 0 auto;
    }

    @include breakpoint($desktop) {
        padding: 8rem 5rem 8rem;
        grid-template-columns: 32rem minmax(auto, max-content);
        max-width: $desktop;
        margin: 0 auto;
    }
}

.selfie {
    position: relative;
    top: $selfie-size / 2;
    width: $selfie-size;
    margin: 0 auto;
    z-index: 10;

    @include breakpoint($laptop) {
        position: static;
        width: 23rem;
    }

    @include breakpoint($desktop) {
        width: 32rem;
    }
}

.intro {
    position: relative;
    padding: ($selfie-size / 2) 1rem ($selfie-size / 3);

    @include breakpoint($laptop) {
        position: static;
        padding: 1rem 2rem 2rem;
        margin-left: 2rem;
        max-width: 56rem;
        max-height: 23rem;
        justify-self: start;
    }

    @include breakpoint($desktop) {
        max-height: 32rem;
    }
}

.title {
    font-size: 3rem;

    @include breakpoint($tablet) {
        font-size: 5rem;
    }

    @include breakpoint($desktop) {
        font-size: 8rem;
    }
}

.tags {
    font-size: 1rem;

    @include breakpoint($tablet) {
        font-size: 1.5rem;
    }

    @include breakpoint($desktop) {
        font-size: 2.5rem;
    }

    span {
        margin: 0.2rem;
        display: inline-block;
    }

    @for $i from 1 through 5 {
        .palette-#{$i} {
            color: nth($palette, $i);
        }
    }
}
</style>
