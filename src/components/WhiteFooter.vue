<template>
    <footer>
        <flat-section class="footer-section">
            <div class="socials">
                <icon-button :svg="true" 
                             aria-label="Github" 
                             link="https://github.com/QingqiShi"
                             target="blank" 
                             no-bg 
                             invert>
                    <github-svg/>
                </icon-button>
                <icon-button :svg="true" 
                             aria-label="Instagram" 
                             link="https://www.instagram.com/qingqishi/"
                             target="blank" 
                             no-bg 
                             invert>
                    <instagram-svg/>
                </icon-button>
                <icon-button :svg="true" 
                             aria-label="LinkedIn" 
                             link="https://www.linkedin.com/in/qingqi-shi"
                             target="blank" 
                             no-bg 
                             invert>
                    <linkedin-svg/>
                </icon-button>
            </div>
            <div class="copyright heading-font">
                &copy; {{ new Date().getFullYear() }}
                <t t="name" />
            </div>
            <div v-if="$route.meta.normalized != '/admin/'" class="admin-portal">
                <router-link :to="$store.state.lang != 'en' ? `/${$store.state.lang}/admin/` : `/admin/`">
                    <t t="adminPortal" />
                </router-link>
            </div>
        </flat-section>
    </footer>
</template>

<script>
// @ is an alias to /src
import FlatSection from '@/components/FlatSection.vue';
import IconButton from '@/components/IconButton.vue';
import GithubSvg from '@/components/GithubSvg.vue';
import InstagramSvg from '@/components/InstagramSvg.vue';
import LinkedinSvg from '@/components/LinkedinSvg.vue';

export default {
    name: 'WhiteFooter',
    components: {
        IconButton,
        FlatSection,
        GithubSvg,
        InstagramSvg,
        LinkedinSvg
    }
};
</script>

<style lang="scss" scoped>
@import '../scssUtils/colors';
@import '../scssUtils/breakpoint';

.footer-section {
    @include breakpoint($laptop) {
        display: flex;
    }
}

.socials {
    display: flex;
    justify-content: center;
}

.copyright {
    line-height: 4rem;

    @include breakpoint($laptop) {
        flex-grow: 1;
        text-align: right;
    }
}

.admin-portal {
    font-size: 0.5rem;
    position: relative;
    top: 3rem;

    a {
        display: inline-block;
        text-decoration: none;
        color: $green;
        padding: 0.2rem;
        border-radius: 0.2rem;

        &:hover {
            color: $white;
            background-color: $green;
        }
    }
}
</style>
