<template>
    <div class="education">
        <div :class="{ showDetail: showDetail }" 
             :style="{ '--expand-height': expandHeight + 'px' }" 
             class="container" 
             @click="toggleDetail">
            <card class="top">
                <div class="logo">
                    <img :src="options.logo" alt="">
                </div>
                <div class="info">
                    <t :t="options.time" class="time" tag="div" />
                    <t :t="options.type" class="type heading-font" tag="div" />
                    <t :t="options.school" class="school heading-font" tag="strong" />
                </div>
            </card>

            <card ref="expandCard" class="expand">
                <t :t="options.course" class="course heading-font" tag="div" />
                <div class="details">
                    <div v-for="detail in options.details" :key="detail.name" class="detail">
                        <t :t="detail.name" class="name heading-font" tag="div" />
                        <t :t="detail.value" class="value" tag="div" />
                    </div>
                </div>
            </card>
        </div>
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
        showDetail: false,
        expandHeight: 0
    }),
    methods: {
        toggleDetail() {
            this.showDetail = !this.showDetail;

            const rect = this.$refs.expandCard.$el.getBoundingClientRect();
            this.expandHeight = rect.height;
        }
    }
};
</script>

<style lang="scss" scoped>
@import '../scssUtils/utils';

.education {
    flex-basis: 0;
    flex-grow: 1;
    color: $grey;
}

.container {
    perspective: 10rem;
    margin: 4rem 0;
    position: relative;
    cursor: pointer;

    @include breakpoint($laptop) {
        margin: 1rem;
    }

    @include breakpoint($desktop) {
        margin: 2rem;
    }
}

.top {
    position: relative;
    z-index: 10;
    transition: transform 0.2s, margin 0.2s;
    padding: 2rem;

    @include breakpoint($tablet) {
        display: flex;
        justify-content: space-between;
        padding: 2rem 4rem;
    }

    @include breakpoint($laptop) {
        display: block;
        padding: 2rem;
    }

    .container:hover & {
        transform: translate3d(0, 0, 0.1rem);
    }

    .showDetail & {
        margin-bottom: calc(var(--expand-height) + 2rem);
        transform: translate3d(0, 0, 0.5rem);
    }

    .showDetail:hover & {
        transform: none;
        transform: translate3d(0, 0, 0.5rem);
    }
}

.expand {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    padding: 4rem 2rem 2rem;
    color: $white;
    transition: transform 0.2s, background-color 0.2s;
    transform: translate3d(0, 2rem, -1rem) rotateX(0);
    z-index: 5;

    @include breakpoint($tablet) {
        display: flex;
        align-items: center;
        padding: 2rem 1rem 1rem;
    }

    @include breakpoint($laptop) {
        display: block;
        padding: 4rem 2rem 2rem;
    }

    .container:hover & {
        transform: translate3d(0, 2rem, -0.7rem) rotateX(0);
    }

    .showDetail & {
        transform: translate3d(0, var(--expand-height), -0.2rem) rotateX(0);
        background-color: $green;
    }

    .showDetail:hover & {
        transform: translate3d(0, var(--expand-height), -0.3rem) rotateX(0);
    }
}

img {
    max-width: 100%;
    max-height: 8rem;
}

.info {
    margin: 1rem 0;

    @include breakpoint($tablet) {
        flex-grow: 1;
        margin: 1rem;
        max-width: 60%;
    }

    @include breakpoint($laptop) {
        margin: 1rem 0;
        max-width: 100%;
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
    @include breakpoint($tablet) {
        flex-grow: 1;
        padding: 1rem;
        max-width: 60%;
    }

    @include breakpoint($laptop) {
        padding: 0;
        max-width: 100%;
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
