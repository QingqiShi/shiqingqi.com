<template>
    <flat-section>
        <t t="works" tag="h1" />
        <div class="current">
            <!-- <img class="logo" src="@/assets/Salmon_Logo.svg" alt="Salmon Ltd"> -->
            <div class="description">
                <t t="myCurrentJob" tag="span" class="tag heading-font" />
                <t t="salmonDescription" tag="p" />
                <t t="salmonWork" tag="p" />
            </div>
            <card class="business-card">
                <div class="logo">
                    <img src="@/assets/Salmon_Logo_Grey.svg" alt="Salmon Ltd">
                    <svg class="diagonalBottom" 
                         viewBox="0 0 1280 100" 
                         preserveAspectRatio="none" 
                         role="presentation"
                         aria-hidden="true">
                        <polygon points="0 0 1280 100 0 100" fill="#07393C" />
                    </svg>
                    <svg class="diagonalLeft" 
                         viewBox="0 0 200 1280" 
                         preserveAspectRatio="none" 
                         role="presentation"
                         aria-hidden="true">
                        <polygon points="0 0 200 0 0 1280" fill="#07393C" />
                    </svg>
                </div>
                <div class="info">
                    <t t="salmonJobTitle" tag="em" class="heading-font" />
                    <t t="name" tag="div" />
                    <div>qshi@salmon.com</div>
                    <div>
                        <span>Salmon Ltd</span>
                        <span>64 Clarendon Road</span>
                        <span>Watford</span>
                        <span>Hertfordshire, WD17 1DA</span>
                    </div>
                </div>
            </card>
        </div>

        <!-- <t t="noExperienceExcuse" tag="p" class="excuse heading-font" /> -->
    </flat-section>
</template>

<script>
// @ is an alias to /src
import FlatSection from '@/components/FlatSection.vue';
import Card from '@/components/Card.vue';

export default {
    name: 'EducationsSection',
    components: {
        Card,
        FlatSection
    }
};
</script>

<style lang="scss" scoped>
@import '../scssUtils/colors';
@import '../scssUtils/breakpoint';

@mixin vertical-business-card {
    overflow: hidden;
    background-color: $blue;

    .logo {
        position: relative;
        padding-bottom: 2rem;
        margin: 0;
    }

    .info {
        color: $blue;
        background-color: $grey;
        padding: 2rem;
        margin: -1px 0 0;
        flex-grow: 1;
    }

    .diagonalBottom {
        display: block;
        position: absolute;
        bottom: 0;
        left: 0;
    }

    .diagonalLeft {
        display: none;
    }

    img {
        margin: 2rem 5% 0 50%;
    }

    em {
        font-style: normal;
        font-size: 1.5rem;
    }

    div {
        margin: 1rem 0 0;
        font-size: 0.9rem;
    }

    span {
        display: block;
    }
}

@mixin horizontal-business-card {
    display: flex;
    flex-direction: row-reverse;
    justify-content: flex-start;
    align-items: stretch;

    .logo {
        padding: 0;
        flex-basis: 40%;
        display: flex;
        flex-direction: row-reverse;
        flex-basis: 30%;
    }

    .info {
        margin: 0 -1px 0 0;
    }

    .diagonalBottom {
        display: none;
    }

    .diagonalLeft {
        display: block;
        position: absolute;
        height: 100%;
        left: 0;
        top: 0;
        bottom: 0;
    }

    img {
        width: 80%;
        margin: 0 2rem 2rem 0;
        align-self: flex-end;
    }
}

.current {
    text-align: left;

    @include breakpoint($laptop) {
        box-sizing: border-box;
        display: grid;
        grid-template-columns: calc(50% - 1rem) calc(50% - 1rem);
        grid-gap: 2rem;
        grid-template-areas: 'card .';
        max-width: 1000px;
        margin: 0 auto;
        align-items: center;
    }

    @include breakpoint($desktop) {
        grid-template-columns: calc(50% - 2rem) calc(50% - 2rem);
        grid-gap: 4rem;
        max-width: 1600px;
    }

    .description p:first-of-type {
        margin-top: 0.2rem;
    }

    .tag {
        background-color: $green;
        color: $white;
        display: inline-block;
        padding: 0.3rem;
        font-size: 0.7rem;
    }

    .business-card {
        @include vertical-business-card();

        @include breakpoint-minmax(0, $tablet) {
            max-width: 28rem;
            margin: 0 auto;
        }

        @include breakpoint-minmax($tablet, $laptop) {
            @include horizontal-business-card();
            max-width: 45rem;
            margin: 0 auto;
        }

        @include breakpoint($laptop) {
            grid-area: card;
        }

        @include breakpoint($desktop) {
            @include horizontal-business-card();
        }
    }
}

.excuse {
    margin-top: 5rem;
    color: $green;
}
</style>
