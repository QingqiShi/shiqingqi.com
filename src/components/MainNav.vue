<template>
    <nav :style="{ '--main-nav-scroll': scroll }" class="main-nav">
        <icon-button ref="menu-btn" icon="menu" />
        <div ref="menu-overlay" class="main-nav-overlay">
            <card ref="menu-card" class="main-nav-card">
                <ul>
                    <li v-for="route in routes" :key="route.name">
                        <router-link :to="route.path">{{ route.name }}</router-link>
                    </li>
                </ul>
            </card>
        </div>
    </nav>
</template>

<script>
// import { routes } from '@/router';
import IconButton from '@/components/IconButton';
import Card from '@/components/Card';

export default {
    name: 'MainNav',
    components: {
        Card,
        IconButton
    },
    props: {
        routes: {
            type: Array,
            default: () => []
        }
    },
    data() {
        return {
            scroll: 0
        };
    },
    mounted() {
        window.addEventListener('scroll', this.scrollHandler);

        this.$refs['menu-btn'].$el.addEventListener('click', this.openMenu);
        this.$refs['menu-overlay'].addEventListener('click', e => {
            if (e.target && e.target != this.$refs['menu-overlay']) {
                return;
            }

            this.closeMenu();
        });

        this.$router.afterEach(() => {
            this.closeMenu();
        });
    },
    methods: {
        scrollHandler: function() {
            const scrollHeight = 100;
            const scroll = Math.min(
                scrollHeight,
                Math.max(0, scrollHeight - window.pageYOffset)
            );
            this.scroll = 1 - scroll / scrollHeight;
        },
        openMenu: function() {
            const overlay = this.$refs['menu-overlay'];
            const card = this.$refs['menu-card'].$el;
            const btn = this.$refs['menu-btn'].$el;

            // Show overlay
            overlay.style.display = 'block';
            overlay.getBoundingClientRect();
            overlay.classList.add('open');

            // Morph menu
            card.style.width = 'auto';
            card.style.height = 'auto';
            const cardRect = card.getBoundingClientRect();
            card.style.width = '';
            card.style.height = '';
            card.classList.add('main-nav-card-animation');
            btn.classList.add('main-nav-card-animation');
            card.getBoundingClientRect();
            btn.getBoundingClientRect();
            card.style.width = cardRect.width + 'px';
            card.style.height = cardRect.height + 'px';
            card.style.opacity = 1;
            card.style['border-radius'] = '0.2rem';
            card.style['padding'] = '1rem 0';
            btn.style.width = cardRect.width + 'px';
            btn.style.height = `calc(${cardRect.height}px + 1rem)`;
            btn.style['border-radius'] = '0.2rem';
            btn.style.opacity = 0;
        },
        closeMenu: function() {
            const overlay = this.$refs['menu-overlay'];
            const card = this.$refs['menu-card'].$el;
            const btn = this.$refs['menu-btn'].$el;

            // Morph menu
            card.style.width = '';
            card.style.height = '';
            card.style.opacity = '';
            card.style['border-radius'] = '';
            card.style['padding'] = '';
            btn.style.width = '';
            btn.style.height = '';
            btn.style['border-radius'] = '';
            btn.style['padding'] = '';
            btn.style.opacity = '';

            // Hide overlay
            overlay.classList.remove('open');

            // Hide when animation finished
            card.addEventListener(
                'transitionend',
                () => {
                    // console.log(e);
                    card.classList.remove('main-nav-card-animation');
                    overlay.style.display = 'none';
                    btn.classList.remove('main-nav-card-animation');
                },
                {
                    once: true
                }
            );
        }
    }
};
</script>

<style scoped lang="scss">
@import '../scssUtils/breakpoint';
@import '../scssUtils/colors';
@import '../scssUtils/shadow';

.main-nav {
    position: fixed;
    right: 2rem;
    bottom: 2rem;
    z-index: 100;
    font-family: 'Ubuntu', sans-serif;

    @include breakpoint($laptop) {
        bottom: initial;
        top: 1rem;
        right: 1rem;
    }
}

.main-nav-overlay {
    display: none;

    position: fixed;
    z-index: 500;
    top: 0;
    bottom: 0;
    left: 0;
    right: 0;
    transition: background-color 0.2s ease;

    &.open {
        background-color: RGBA(#{$black-rgb}, 0.9);
    }

    ul {
        list-style: none;
        padding: 0;
        margin: 0;
    }

    a {
        display: block;
        padding: 1.5rem 3rem;
        text-decoration: none;
        color: $grey;
        font-size: 1.3rem;
        text-transform: uppercase;
        transition: background-color 0.2s linear, color 0.2s linear;

        &:hover {
            color: $grey;
            background-color: $blue;
        }
    }

    .router-link-exact-active {
        background-color: $green;
        color: $white;
    }
}

.main-nav-card {
    position: absolute;
    padding: 0;
    right: 2rem;
    bottom: 2rem;
    width: 4rem;
    height: 4rem;
    border-radius: 50%;
    overflow: hidden;
    opacity: 0;
    z-index: 500;

    @include breakpoint($laptop) {
        bottom: initial;
        top: 1rem;
        right: 1rem;
    }
}

.main-nav-card-animation {
    transition: height 0.3s ease, width 0.3s ease, opacity 0.3s ease,
        border-radius 0.3s ease, padding 0.3s ease;
}
</style>
