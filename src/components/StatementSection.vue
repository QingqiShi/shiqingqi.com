<template>
    <flat-section :dark="true" :large-font="true">
        <t t="statementWhy" tag="p">
            <em class="heading-font">
                <span>"</span><t t="craftsmanSpirit" /><span>"</span>
            </em>
        </t>
        <t t="statementHow" tag="p">
            <t class="heading-font" t="craftsmanProp1" tag="em" />
            <t class="heading-font" t="craftsmanProp2" tag="em" />
            <t class="heading-font" t="craftsmanProp3" tag="em" />
        </t>
        <t t="statementWhat" tag="p">
            <t class="heading-font" t="javascript" tag="em" />
        </t>
    </flat-section>
</template>

<script>
import FlatSection from '@/components/FlatSection.vue';
import IntersectTransition from '@/components/IntersectTransition.vue';

export default {
    name: 'StatementSection',
    components: {
        FlatSection,
        IntersectTransition
    }
};
</script>

<style lang="scss" scoped>
@import '../scssUtils/utils';

.heading-font {
    color: $blue;
    font-style: normal;
}
</style>
