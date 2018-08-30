<template>
    <div class="banner">
        <div class="title">
            <transition name="text-reveal" appear>
                <t t="name" tag="h1" />
            </transition>
            <transition name="slide-down" appear>
                <div class="background"><t t="name" tag="h1" /></div>
            </transition>
        </div>
        <div class="selfie-container">
            <transition name="slide-left" appear>
                <img :src="require('../assets/selfie.jpg')" alt="selfie" class="selfie">
            </transition>
        </div>
        
        <transition name="slide-right" appear>
            <div class="tags">
                <t t="husband" class="tag" />
                <t t="coder" class="tag" />
                <t t="gamer" class="tag" />
                <t t="frontEnd" class="tag" />
                <t t="designer" class="tag" />
                <t t="chinese" class="tag" />
                <t t="photographer" class="tag" />
                <t t="creator" class="tag" />
            </div>
        </transition>

        <transition name="fade-in" appear>
            <div class="shape shape1"></div>
        </transition>
        
        <transition name="fade-in" appear>
            <div class="shape shape2"></div>
        </transition>
            
        <transition name="fade-in" appear>
            <div class="shape shape3"></div>
        </transition>
    </div>
</template>

<script>
export default {
    name: 'Banner'
};
</script>

<style lang="scss" scoped>
@import '../scssUtils/utils';
@import '../scssUtils/transitions';

@keyframes gradient {
    0% {
        background-position: 0% 0%;
    }
    50% {
        background-position: 67% 0%;
    }
    100% {
        background-position: 0% 0%;
    }
}

.banner {
    position: relative;
    display: grid;
    grid-template-columns: 20% 80%;
    background: linear-gradient(to bottom right, $blue, $purple, $orange);
    background-size: 300% 100%;
    overflow: hidden;
    animation: gradient 25s ease infinite;

    @include breakpoint($laptop) {
        grid-template-columns: 50% 50%;
    }
}

.title {
    color: $white;
    grid-column: 1 / 3;

    h1 {
        position: relative;
        top: 0.8rem;
        margin: 0;
        padding-left: 2rem;
        text-align: left;
        font-size: 2rem;
        z-index: 10;

        @include breakpoint($laptop) {
            font-size: 3.5rem;
        }

        @include breakpoint($desktop) {
            font-size: 5rem;
        }
    }

    .background {
        position: absolute;
        top: 0;
        left: 3rem;
        color: transparent;
        background-color: $grey;
        user-select: none;
        pointer-events: none;
        z-index: 5;

        h1 {
            padding: 0;
        }
    }
}

.selfie-container {
    padding: 3rem 0;
    grid-row: 2 / 3;
    grid-column: 2 / 3;

    @include breakpoint($laptop) {
        padding-bottom: 6rem;
    }

    .selfie {
        position: relative;
        width: 100%;
        overflow: hidden;
        border-top-left-radius: $border-radius-medium;
        border-bottom-left-radius: $border-radius-medium;
        user-select: none;
        z-index: 10;

        @include medium-shadow;

        @include breakpoint($tablet) {
            @include large-shadow;
        }
    }
}

.tags {
    position: relative;
    top: -5rem;
    margin-right: 20%;
    padding: 2rem;
    grid-row: 3 / 4;
    grid-column: 1 / 3;
    color: $grey;
    background-color: $white;
    border-top-right-radius: $border-radius-small;
    border-bottom-right-radius: $border-radius-small;
    text-align: left;
    z-index: 20;

    @include medium-shadow;

    @include breakpoint($tablet) {
        @include large-shadow;
    }

    @include breakpoint($laptop) {
        position: static;
        grid-row: 2 / 3;
        grid-column: 1 / 2;
        align-self: center;
        padding: 5rem 5rem 8rem;
        margin: 0;
        color: $white;
        background-color: transparent;
        box-shadow: none;
    }

    @include breakpoint($desktop) {
        padding: 8rem;
    }

    .tag {
        display: block;
        margin-right: 10%;
        text-transform: uppercase;
        font-size: 1.5rem;
        text-align: right;

        &:after {
            content: '.';
        }

        @include breakpoint($tablet) {
            display: inline-block;
            text-align: left;
            margin-right: 1rem;
        }

        @include breakpoint($laptop) {
            display: block;
            text-align: right;
            font-size: 2rem;
        }

        @include breakpoint($desktop) {
            font-size: 3rem;
        }
    }
}

.shape {
    position: absolute;
    z-index: 0;
}

.shape1 {
    left: -10%;
    top: 10rem;
    width: 50%;
    padding-top: 50%;
    border-radius: 50%;
    background: linear-gradient(
        45deg,
        RGBA($blue-rgb, 0),
        RGBA($blue-rgb, 0) 50%,
        RGBA($blue-rgb, 0.5)
    );
}

.shape2 {
    right: -10%;
    top: -11rem;
    width: 50%;
    height: 15rem;
    border-radius: 2rem;
    background: linear-gradient(
        -135deg,
        RGBA($blue-rgb, 0),
        RGBA($blue-rgb, 0) 50%,
        RGBA($blue-rgb, 0.5)
    );
    transform: skewX(-20deg);
}

.shape3 {
    bottom: 5%;
    right: 10%;
    width: 30%;
    padding-top: 30%;
    border-radius: 50%;
    background: linear-gradient(
        -135deg,
        RGBA($blue-rgb, 0),
        RGBA($blue-rgb, 0) 50%,
        RGBA($blue-rgb, 0.5)
    );
}
</style>
