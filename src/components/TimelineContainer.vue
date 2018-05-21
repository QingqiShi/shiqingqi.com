<template>
    <div class="timeline-container">
        <slot/>
    </div>
</template>

<style lang="scss" scoped>
.timeline-container > :last-child {
    .bot {
        .target {
            fill: url(#gradientBot);
        }
    }
}
</style>
