<template>
    <div class="admin-panel">
        <div class="side-bar">
            <div class="section">
                <h1><i class="material-icons">build</i> Admin Portal</h1>
                <div class="user">{{ $store.state.currentUser.email }}</div>
            </div>
            <div class="section">
                <ul>
                    <li>
                        Translations
                    </li>
                </ul>
            </div>
            <div class="spacer"></div>
            <button class="section" @click="signOut">Sign out</button>
        </div>
        <div class="main">
            test
        </div>
    </div>
</template>

<script>
import fb from '../utilities/firebase.js';

export default {
    methods: {
        signOut() {
            fb.firebase.auth().signOut().then(() => {
                this.$store.commit('setLogin', false);
            });
        }
    }
}
</script>

<style lang="scss" scoped>
@import '../scssUtils/colors';

.admin-panel {
    display: flex;
    flex-direction: row;
    height: 100vh;
}

.side-bar {
    color: $white;
    background-color: $green;
    display: flex;
    flex-direction: column;

    .spacer {
        flex-grow: 1;
        border-bottom: 1px solid RGBA($white-rgb, 0.2);
    }

    .section {
        border-bottom: 1px solid RGBA($white-rgb, 0.2);
        padding: 1rem;
    }

    h1 {
        font-size: 1.3rem;
        margin: 0;

        i {
            font-size: 1rem;
            margin-right: 0.5rem;
        }
    }

    h2 {
        font-size: 1rem;
        text-align: left;
    }

    ul {
        list-style: none;
        margin: 0;
        padding: 0;

        li {
            text-align: left;
            cursor: pointer;
            transition: 0.2s;

            &:hover {
                color: $black;
                background-color: $blue;
            }
        }
    }

    > button {
        border: none;
        background-color: $green;
        color: $white;
        cursor: pointer;
        transition: 0.2s;

        &:hover {
            color: $black;
            background-color: $blue;
        }
    }

    .user {
        text-align: right;
        font-size: 0.5rem;
    }
}
</style>

