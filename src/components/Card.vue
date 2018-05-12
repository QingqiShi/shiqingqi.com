<script>
export default {
    render() {
        if (this.$slots.backSide) {
            return (
                <div class="can-flip">
                    <div class="card side">{this.$slots.default}</div>
                    <div class="card back side">{this.$slots.backSide}</div>
                </div>
            );
        } else {
            return <div class="card">{this.$slots.default}</div>;
        }
    }
};
</script>


<style lang="scss" scoped>
@import '../scssUtils/colors';
@import '../scssUtils/shadow';
@import '../scssUtils/breakpoint';

.can-flip {
    position: relative;
    transform-style: preserve-3d;
    transition: transform 1s ease;
}

.card {
    background-color: $white;
    border-radius: 0.2rem;

    @include small-shadow;
    @include breakpoint($laptop) {
        @include medium-shadow;
    }
    @include breakpoint($desktop) {
        @include large-shadow;
    }
}

.side {
    backface-visibility: hidden;
    height: 100%;
}

.back {
    color: $white;
    background-color: $green;
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    left: 0;
    display: flex;
    transform: rotateY(180deg);

    button {
        color: $white;
    }
}

.vertical .back {
    transform: rotateX(-180deg);
}

.flip {
    transform: rotateY(180deg);
}

.vertical.flip {
    transform: rotateX(-180deg);
}
</style>
