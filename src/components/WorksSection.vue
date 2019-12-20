<template>
    <flat-section>
        <t t="works" tag="h1" />

        <div class="job">
            <card class="work-logo work-logo__black">
                <img
                    src="@/assets/Spotify.svg"
                    alt="Wunderman Thompson Commerce logo"
                    class="work-logo"
                >
            </card>
            <div>
                <t t="spotifyName" tag="h2" />
                <t t="spotifyDates" tag="span" class="tag heading-font" />
                <t t="spotifyDescription" tag="p" />
                <t t="spotifyWork" tag="p" />
            </div>
        </div>

        <div class="job">
            <card class="work-logo">
                <img
                    src="@/assets/wunderman_thompson_commerce_logo.svg"
                    alt="Wunderman Thompson Commerce logo"
                    class="work-logo"
                >
            </card>
            <div>
                <t t="salmonName" tag="h2" />
                <t t="salmonDates" tag="span" class="tag heading-font" />
                <t t="salmonDescription" tag="p" />
                <t t="salmonWork" tag="p" />
            </div>
        </div>
    </flat-section>
</template>

<script>
// @ is an alias to /src
import FlatSection from '@/components/FlatSection.vue';
import Card from '@/components/Card.vue';
import IntersectTransition from '@/components/IntersectTransition.vue';

export default {
    name: 'WorksSection',
    components: {
        Card,
        FlatSection,
        IntersectTransition
    }
};
</script>

<style lang="scss" scoped>
@import '../scssUtils/utils';

.job {
    &:not(:last-child) {
        margin-bottom: 5rem;
    }

    > div {
        text-align: left;
        &:not(:last-child) {
            margin-bottom: 2rem;
        }
    }

    @include breakpoint($laptop) {
        display: flex;
        align-items: center;

        > div {
            &:not(:last-child) {
                margin-bottom: 0;
                margin-right: 2rem;
                min-width: 20rem;
            }
        }
    }
}

.work-logo {
    width: 50%;
    padding: 1rem;
    margin: 0 auto;
    max-width: 20rem;

    &__black {
        background-color: black;
        svg {
            color: white;
            fill: white;
        }
    }

    img {
        width: calc(100% - 2rem);
    }
}
</style>
