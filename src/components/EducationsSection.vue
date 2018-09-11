<template>
    <flat-section :dark="true" :flex="true">
        <t t="educations" tag="h1" />
        
        <div class="educations">
            <intersect-transition name="slide-up">
                <education :options="{
                    logo: require('@/assets/University_of_Bristol.svg'),
                    time: 'eduBristolTime',
                    type: 'eduBristolType',
                    school: 'eduBristolSchool',
                    course: 'eduBristolCourse',
                    details: [
                        {
                            name: 'eduBristolDetailName1',
                            value: 'eduBristolDetailValue1'
                        },
                        {
                            name: 'eduBristolDetailName2',
                            value: 'eduBristolDetailValue2'
                        },
                        {
                            name: 'eduBristolDetailName3',
                            value: 'eduBristolDetailValue3'
                        }
                    ]
                }" />
            </intersect-transition>
            <intersect-transition name="slide-up">
                <education :options="{
                    logo: require('@/assets/University_of_Nottingham.svg'),
                    time: 'eduNottinghamTime',
                    type: 'eduNottinghamType',
                    school: 'eduNottinghamSchool',
                    course: 'eduNottinghamCourse',
                    details: [
                        {
                            name: 'eduNottinghamDetailName1',
                            value: 'eduNottinghamDetailValue1'
                        },
                        {
                            name: 'eduNottinghamDetailName2',
                            value: 'eduNottinghamDetailValue2'
                        },
                        {
                            name: 'eduNottinghamDetailName3',
                            value: 'eduNottinghamDetailValue3'
                        }
                    ]
                }" />
            </intersect-transition>
            <intersect-transition name="slide-up">
                <education :options="{
                    logo: require('@/assets/AGSB.png'),
                    time: 'eduAGSBTime',
                    type: 'eduAGSBType',
                    school: 'eduAGSBSchool',
                    course: 'eduAGSBCourse',
                    details: [
                        {
                            name: 'eduAGSBDetailName1',
                            value: 'eduAGSBDetailValue1'
                        }
                    ]
                }" />
            </intersect-transition>
        </div>
    </flat-section>
</template>

<script>
// @ is an alias to /src
import FlatSection from '@/components/FlatSection.vue';
import Education from '@/components/Education.vue';
import IntersectTransition from '@/components/IntersectTransition.vue';

export default {
    name: 'EducationsSection',
    components: {
        FlatSection,
        Education,
        IntersectTransition
    }
};
</script>

<style lang="scss" scoped>
@import '../scssUtils/utils';

.educations {
    @include breakpoint($laptop) {
        display: flex;
        justify-content: center;
        align-items: stretch;
    }
}
</style>
