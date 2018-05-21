<template>
    <card class="timeline-item">
        <div v-if="$slots.media" class="media">
            <slot name="media" />
        </div>
        <div class="info">
            <slot/>
            <div v-if="$slots.action" class="actions">
                <slot name="action" />
            </div>
        </div>
        <div v-if="icon" class="icon">
            <i class="material-icons">
                {{ icon }}
            </i>
        </div>
    </card>
</template>

<script>
import Card from '@/components/Card.vue';

export default {
    name: 'TimelineItem',
    components: {
        Card
    },
    props: {
        'img-src': {
            type: String,
            default: ''
        },
        'img-alt': {
            type: String,
            default: ''
        },
        action: {
            type: String,
            default: ''
        },
        icon: {
            type: String,
            default: ''
        }
    }
};
</script>

<style lang="scss">
@import '../scssUtils/colors';
@import '../scssUtils/breakpoint';

@mixin span($prefix, $size) {
    @for $i from 1 through 4 {
        @include breakpoint($size) {
            &[#{$prefix}-row-#{$i}] {
                grid-row-end: span $i;
            }
            &[#{$prefix}-col-#{$i}] {
                grid-column-end: span $i;
            }
        }
    }
}

.timeline-item {
    color: $grey;
    position: relative;

    &[dark] {
        background-color: $green;
        color: $white;

        .icon {
            color: $green;
            background-color: $blue;
        }
    }

    &[media] {
        overflow: hidden;

        @include breakpoint($tablet) {
            display: flex;
            flex-direction: row;
            align-items: stretch;

            .info {
                flex-basis: 60%;
                width: 60%;
            }
        }

        .media {
            position: relative;
            width: 100%;
            height: 15rem;

            @include breakpoint($tablet) {
                width: 40%;
                height: auto;
            }

            > * {
                position: absolute;
                width: 100%;
                height: 100%;
                left: 0;
            }

            > img {
                object-fit: cover;
            }
        }
    }

    @include span('s', $tablet);
    @include span('m', $laptop);
    @include span('l', $desktop);

    .info {
        padding: 1rem;

        @include breakpoint($laptop) {
            padding: 2rem;
        }
    }

    .actions {
        display: flex;
        flex-direction: row-reverse;
    }

    .icon {
        position: absolute;
        top: 0.5rem;
        right: 0.5rem;
        border-radius: 50%;
        color: $white;
        background-color: $green;
        width: 1.2rem;
        height: 1.2rem;
        display: flex;
        justify-content: center;
        align-items: center;
        transform: rotate(-20deg);

        .material-icons {
            font-size: 0.7rem;
        }

        @include breakpoint($laptop) {
            top: 1rem;
            right: 1rem;
            width: 1.5rem;
            height: 1.5rem;

            .material-icons {
                font-size: 0.9rem;
            }
        }
    }
}
</style>
