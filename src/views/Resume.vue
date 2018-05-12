<template>
    <div class="resume">
        <banner/>
        <statement-section/>
        <educations-section/>
    </div>
</template>

<script>
// @ is an alias to /src
import Banner from '@/components/Banner.vue';
import FlatSection from '@/components/FlatSection.vue';
import Education from '@/components/Education.vue';
import StatementSection from '@/components/StatementSection.vue';
import EducationsSection from '@/components/EducationsSection.vue';

export default {
    name: 'Home',
    components: {
        Banner,
        FlatSection,
        Education,
        StatementSection,
        EducationsSection
    }
};
</script>

<style lang="scss" scoped>
@import '../scssUtils/colors';

em {
    color: $green;
    font-style: normal;
}
</style>
