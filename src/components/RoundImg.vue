<template>
    <div :style="{'--img-bg': `url(${src})`}" class="round-img"/>
</template>

<script>
export default {
    props: {
        src: {
            type: String,
            required: true
        }
    }
};
</script>


<style lang="scss" scoped>
@import '../scssUtils/utils';

.round-img {
    min-width: 10px;

    &:before {
        content: '';
        display: block;
        padding-top: 100%;
        background-image: var(--img-bg);
        background-size: cover;
        background-position: center;
        border-radius: 50%;
        border: 0.2rem solid #fff;

        @include small-shadow;
        @include breakpoint($laptop) {
            @include medium-shadow;
        }
        @include breakpoint($desktop) {
            @include large-shadow;
        }
    }
}
</style>
