<script>
export default {
    name: 'IconButton',
    props: {
        icon: {
            type: String,
            default: ''
        },
        link: {
            type: String,
            default: ''
        }
    },
    render() {
        const inner = this.icon ? (
            <i class="material-icons">{this.icon}</i>
        ) : (
            this.$slots.default
        );

        return this.link ? (
            <a class="icon-button" href={this.link}>
                {inner}
            </a>
        ) : (
            <button class="icon-button">{inner}</button>
        );
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

button,
a {
    // Center align menu icon
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;

    // Circle
    width: 4rem;
    height: 4rem;
    border-radius: 50%;
    border: none;

    // Colors
    color: $white;
    fill: $white;
    background: transparent;

    // Pointer style and transitions
    cursor: pointer;
    transition: color 0.2s linear, fill 0.2s linear;
    border-radius: 50%;

    i,
    svg {
        z-index: 2;
    }

    &:before,
    &:after {
        // Same shape and position as parent
        content: '';
        width: 100%;
        height: 100%;
        position: absolute;
        border-radius: inherit;
    }

    // Drop shadow
    &:before {
        @include small-shadow;
        background-color: $green;
        z-index: 0;

        // Change background color with scroll for laptop and above
        @include breakpoint($laptop) {
            background-color: RGBA($green-rgb, var(--main-nav-scroll, 1));
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
        z-index: 1;
        background-color: $blue;

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
        fill: $grey;

        &:after {
            animation-name: expand;
        }
    }
}

[no-bg] {
    &:before {
        background: transparent;
        box-shadow: none;
    }

    &:hover,
    &:focus {
        background: transparent;
    }
}

[invert] {
    color: $grey;
    fill: $grey;

    &:hover,
    &:focus {
        color: $white;
        fill: $white;
    }

    &:after {
        background-color: $green;
    }
}
</style>
