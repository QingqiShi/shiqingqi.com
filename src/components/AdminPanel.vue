<template>
    <div class="admin-panel">
        <div class="side-bar">
            <div class="section white-space">
                <h1>
                    <i class="material-icons">build</i>
                    Admin Portal
                </h1>
                <div class="user">
                    {{ $store.state.currentUser.email }}
                </div>
            </div>
            <div class="section">
                <h2 class="white-space">Content</h2>
                <div class="button-list">
                    <button @click="setPage('translations')">
                        <i class="material-icons">language</i>
                        Translations
                    </button>
                    <button @click="setPage('something')">
                        <i class="material-icons">menu</i>
                        Something
                    </button>
                </div>
            </div>
            <div class="spacer"></div>
            <button class="section" @click="signOut">
                <i class="material-icons">exit_to_app</i>
                Sign out
            </button>
        </div>
        <div class="main">
            <div v-if="currentPage == 'translations'" class="translations">
                test
            </div>
        </div>
    </div>
</template>

<script>
import fb from '../utilities/firebase.js';

export default {
    data() {
        return {
            currentPage: 'translations'
        };
    },
    methods: {
        signOut() {
            fb.firebase.auth().signOut().then(() => {
                this.$store.commit('setLogin', false);
            });
        },
        setPage(page) {
            this.currentPage = page;
        }
    },
    mounted() {
        fb.firebase.firestore().collection("Texts").get().then((querySnapshot) => {
            querySnapshot.forEach((doc) => {
                console.log(`${doc.id} => `, doc.data());
            });
        });
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
    }

    .white-space {
        padding: 1rem;
    }

    .button-list {
        display: flex;
        flex-direction: column;
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
        margin: 0;
        font-size: 1rem;
        text-align: left;
    }

    button {
        text-align: left;
        border: none;
        background-color: $green;
        color: $white;
        cursor: pointer;
        transition: 0.2s;
        width: 100%;
        padding: 0.5rem 1rem;

        &:hover {
            color: $black;
            background-color: $blue;
        }

        i {
            font-size: 0.8rem;
            margin-right: 0.5rem;
        }
    }

    .user {
        text-align: right;
        font-size: 0.5rem;
    }
}

.main {
    flex-grow: 1;
}
</style>

