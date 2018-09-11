<template>
    <div class="resume">
        <banner/>
        <statement-section/>
        <works-section/>
        <educations-section/>
        <white-footer/>
    </div>
</template>

<script>
// @ is an alias to /src
import Banner from '@/components/Banner.vue';
import FlatSection from '@/components/FlatSection.vue';
import Education from '@/components/Education.vue';
import StatementSection from '@/components/StatementSection.vue';
import WorksSection from '@/components/WorksSection.vue';
import EducationsSection from '@/components/EducationsSection.vue';
import WhiteFooter from '@/components/WhiteFooter.vue';

export default {
    name: 'Home',
    components: {
        Banner,
        FlatSection,
        Education,
        StatementSection,
        WorksSection,
        EducationsSection,
        WhiteFooter
    }
};
</script>

<style lang="scss" scoped>
</style>
