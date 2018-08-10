<template>
    <div class="sign-in-form">
        <h1>Sign In</h1>
        <form>
            <input type="text" name="email" placeholder="email" ref="emailField"/>
            <input type="password" name="password" placeholder="password" ref="passwordField"/>
            <button @click="signIn">Sign In</button>
            <div class="error" v-if="errorMsg">
                {{ errorMsg }}
            </div>
        </form>
        <white-footer/>
    </div>
</template>

<script>
import fb from '../utilities/firebase.js';
import WhiteFooter from '@/components/WhiteFooter.vue';

export default {
    name: 'SignInForm',
    components: {
        WhiteFooter
    },
    data() {
        return {
            errorMsg: ''
        };
    },
    methods: {
        signIn(e) {
            e.preventDefault();
            
            fb.firebase.auth().signInWithEmailAndPassword(
                this.$refs.emailField.value,
                this.$refs.passwordField.value
            ).then(() => {
                this.errorMsg = '';
            }).catch(error => {
                this.errorMsg = error.message
            });
        }
    }
};
</script>

<style lang="scss" scoped>
@import '../scssUtils/colors';

.sign-in-form {
    background-color: $white;
    padding: 4rem;
}

form {
    display: flex;
    flex-direction: column;
    max-width: 30rem;
    margin: 5rem auto;
    border-radius: 0.3rem;
    overflow: hidden;
    // padding: 2rem;

    input {
        // margin-bottom: 2rem;
        padding: 1rem;
        border: none;
    }

    button {
        border: none;
        background-color: $green;
        color: $white;
        padding: 1rem;
        transition: 0.2s;
        cursor: pointer;

        &:hover {
            background-color: $blue;
            color: $green;
        }
    }

    .error {
        color: nth($palette, 1);
        margin-top: 2rem;
    }
}
</style>
