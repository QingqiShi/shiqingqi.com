<template>
    <div class="timeline">
        <flat-section dark>
            <t t="timeline" tag="h1"/>
        </flat-section>
        <flat-section dark>
            <t t="timeline"/>
        </flat-section>
        <white-footer/>
    </div>
</template>

<script>
// @ is an alias to /src
import FlatSection from '@/components/FlatSection.vue';
import WhiteFooter from '@/components/WhiteFooter.vue';

export default {
    name: 'Home',
    components: {
        FlatSection,
        WhiteFooter
    }
};
</script>

<style lang="scss" scoped>
@import '../scssUtils/colors';

h1 {
    text-transform: uppercase;
}
</style>
