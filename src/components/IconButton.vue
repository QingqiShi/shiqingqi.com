<template>
    <button class="icon-button">
        <i class="material-icons">{{ icon }}</i>
    </button>
</template>

<script>
export default {
    name: 'IconButton',
    props: {
        icon: {
            type: String,
            default: 'star'
        }
    }
};
</script>


<style lang="scss" scoped>
@import '../scssUtils/breakpoint';
@import '../scssUtils/colors';
@import '../scssUtils/shadow';

@keyframes expand {
    from {
        transform: scale(0);
        opacity: 0;
    }

    to {
        transform: scale(1);
        opacity: 1;
    }
}

@keyframes shrink {
    from {
        transform: scale(1);
        opacity: 1;
    }

    to {
        transform: scale(0);
        opacity: 0;
    }
}

i {
    z-index: 110;
}

button {
    // Center align menu icon
    display: flex;
    align-items: center;
    justify-content: center;

    // Circle
    width: 4rem;
    height: 4rem;
    border-radius: 50%;
    border: none;

    // Colors
    color: $white;
    background: transparent;

    // Pointer style and transitions
    cursor: pointer;
    transition: color 0.2s linear;

    &:before,
    &:after {
        // Same shape and position as parent
        content: '';
        width: 100%;
        height: 100%;
        position: absolute;
        border-radius: 50%;
    }

    // Drop shadow
    &:before {
        @include small-shadow;
        background-color: $green;
        z-index: 90;

        // Change background color with scroll for laptop and above
        @include breakpoint($laptop) {
            background-color: RGBA($green-rgb, var(--main-nav-scroll));
        }

        // Medium shadow for tablet
        @include breakpoint($tablet) {
            @include medium-shadow;
        }

        // Change shadow with scroll for laptop and above
        @include breakpoint($laptop) {
            opacity: var(--main-nav-scroll);
        }
    }

    &:after {
        z-index: 95;
        background-color: $blue;
        // transform: scale(0);
        // opacity: 0;

        animation-name: shrink;
        animation-duration: 0.2s;
        animation-timing-function: ease;
        animation-fill-mode: forwards;

        transform-origin: center;
    }

    // Change color when hovering
    &:hover,
    &:focus {
        color: $grey;
        // background-color: $blue;

        &:after {
            animation-name: expand;
        }
    }
}
</style>
