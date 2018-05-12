<template>
    <div class="card">
        <slot />
    </div>
</template>

<style lang="scss" scoped>
@import '../scssUtils/shadow';
@import '../scssUtils/breakpoint';

.card {
    background: #fff;
    border-radius: 0.2rem;

    @include small-shadow;
    @include breakpoint($laptop) {
        @include medium-shadow;
    }
    @include breakpoint($desktop) {
        @include large-shadow;
    }
}
</style>
