<template>
    <div class="resume">
        <sign-in-form v-if="!$store.state.loggedIn"/>
        <admin-panel v-if="$store.state.loggedIn"/>
    </div>
</template>

<script>
// @ is an alias to /src
import SignInForm from '@/components/SignInForm.vue';
import AdminPanel from '@/components/AdminPanel.vue';


export default {
    name: 'AdminPortal',
    components: {
        SignInForm,
        AdminPanel
    }
};
</script>

<style lang="scss" scoped>
@import '../scssUtils/colors';

em {
    color: $blue;
    font-style: normal;
}
</style>
