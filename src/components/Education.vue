<template>
    <div class="container">
        <card :class="{'flip': flipped}" class="education vertical">
            <button class="front" @click="flip">
                <div class="logo">
                    <img :src="options.logo" alt="">
                </div>
                <div class="info">
                    <t :t="options.time" class="time" tag="div" />
                    <t :t="options.type" class="type heading-font" tag="div" />
                    <t :t="options.school" class="school heading-font" tag="strong" />
                </div>
            </button>
            <div slot="backSide" class="back-side">
                <button @click="flip">
                    <t :t="options.course" class="course heading-font" tag="div" />
                    <div class="details">
                        <div v-for="detail in options.details" :key="detail.name" class="detail">
                            <t :t="detail.name" class="name heading-font" tag="div" />
                            <t :t="detail.value" class="value" tag="div" />
                        </div>
                    </div>
                </button>
            </div>
        </card>
    </div>
</template>

<script>
import Card from '@/components/Card.vue';

export default {
    name: 'Education',
    components: {
        Card
    },
    props: {
        options: {
            type: Object,
            required: true
        }
    },
    data: () => ({
        flipped: false
    }),
    methods: {
        flip() {
            this.flipped = !this.flipped;
        }
    }
};
</script>

<style lang="scss" scoped>
@import '../scssUtils/colors';
@import '../scssUtils/breakpoint';

.container {
    perspective: 2000px;
    flex-basis: 0;
    flex-grow: 1;
}

.back-side {
    height: 100%;
    width: 100%;
}

.education {
    height: 100%;

    margin: 1rem 0;
    @include breakpoint($tablet) {
        margin: 2rem 0;
    }
    @include breakpoint($laptop) {
        margin: 0 0.5rem;
    }
    @include breakpoint($desktop) {
        margin: 0 1rem;
    }
}

.education button {
    -webkit-appearance: none;
    background: none;
    border: none;
    cursor: pointer;
    width: 100%;
    height: 100%;
    padding: 2rem;
    transition: background-color 0.2s linear;

    @include breakpoint($tablet) {
        display: flex;
        align-items: center;
    }

    @include breakpoint($laptop) {
        display: block;
    }

    @include breakpoint($desktop) {
        display: flex;
    }
}
.back-side button {
    padding: 1rem;
}

img {
    max-width: 100%;
    max-height: 10rem;
}

.logo {
    flex-basis: 30%;
}

.info {
    margin: 1rem 0;
    flex-grow: 1;

    @include breakpoint-minmax($tablet, $laptop) {
        margin: 0 0 0 1rem;
    }

    @include breakpoint($desktop) {
        margin: 0 0 0 1rem;
    }
}

.time {
    margin-bottom: 1rem;
    font-size: 0.8rem;
}

.type {
    font-size: 0.8rem;
    text-transform: uppercase;
}

.school {
    font-size: 1.5rem;
}

.course {
    font-size: 1.2rem;
    margin-bottom: 1rem;
    flex-basis: 50%;
    min-width: 50%;
}

.details {
    flex-grow: 1;

    @include breakpoint($tablet) {
        padding: 1rem;
    }

    @include breakpoint($laptop) {
        padding: 0;
    }

    @include breakpoint($desktop) {
        padding: 1rem;
    }
}

.detail {
    margin-bottom: 0.8rem;
    font-size: 0.8rem;
}
</style>
