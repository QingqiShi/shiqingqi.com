<template>
    <card class="education">
        <button>
            <div class="logo">
                <img :src="options.logo" alt="">
            </div>
            <div class="info">
                <t :t="options.time" class="time" tag="div"/>
                <t :t="options.type" class="type" tag="div"/>
                <t :t="options.school" class="school" tag="strong"/>
            </div>
            <div class="expand">
                <t :t="options.course" class="course" tag="div"/>
                <div v-for="detail in options.details" :key="detail.name" class="details">
                    <t :t="options.name" class="name" tag="div"/>
                    <t :t="options.value" class="value" tag="div"/>
                </div>
            </div>
        </button>
    </card>
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
    }
};
</script>

<style lang="scss" scoped>
@import '../scssUtils/colors';
@import '../scssUtils/breakpoint';

.education {
    flex-basis: 0;
    flex-grow: 1;

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

    &:hover,
    &:focus {
        background-color: $blue;
    }

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

img {
    max-width: 100%;
    max-height: 10rem;
}

.logo {
    flex-basis: 30%;
}

.info {
    margin-top: 1rem;
    flex-grow: 1;

    @include breakpoint($tablet) {
        margin: 0 0 1rem;
    }
}

.time {
    margin-bottom: 1rem;
    font-size: 0.8rem;
}

.type {
    font-family: 'Ubuntu', sans-serif;
    font-size: 0.8rem;
    text-transform: uppercase;
}

.school {
    font-family: 'Ubuntu', sans-serif;
    font-size: 1.5rem;
}

.expand {
    display: none;
}
</style>
