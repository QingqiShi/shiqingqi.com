<template>
    <div class="timeline-section">
        <div class="top"/>
        <h1>{{ year }}</h1>
        <div class="center">
            <slot/>
        </div>
        <div class="bot"/>
    </div>
</template>

<script>
export default {
    name: 'TimelineSection',
    props: {
        year: {
            type: Number,
            default: new Date().getFullYear()
        }
    }
};
</script>


<style lang="scss" scoped>
@import '../scssUtils/colors';
@import '../scssUtils/breakpoint';

.top,
.bot {
    height: 5rem;
    display: flex;
    align-items: center;
    flex-direction: column;

    &:before {
        content: '';
        width: 0.2rem;
        height: 100%;
        background-color: $white;
    }

    &:after {
        content: '';
        width: 0.8rem;
        height: 0.8rem;
        background-color: $white;
        border-radius: 50%;
        transform: translateY(-0.4rem);
    }
}

.bot {
    flex-direction: column-reverse;

    &:after {
        transform: translateY(0.4rem);
    }
}

.timeline-section:first-child {
    .top {
        &:before {
            background: linear-gradient(0deg, $white, RGBA($white-rgb, 0));
        }
    }
}

.timeline-section:last-child {
    .bot {
        &:before {
            background: linear-gradient(180deg, $white, RGBA($white-rgb, 0));
        }
    }
}

.center {
    display: grid;
    grid-auto-flow: dense;
    grid-gap: 1rem;
    text-align: left;
    margin-bottom: 2rem;

    @include breakpoint($tablet) {
        grid-template-columns: repeat(auto-fit, minmax(20rem, 1fr));
    }

    @include breakpoint($laptop) {
        grid-gap: 2rem;
    }
}
</style>
