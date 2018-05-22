import Vue from 'vue';
import Router from 'vue-router';
import Resume from './views/Resume.vue';
import Timeline from './views/Timeline.vue';

Vue.use(Router);

export default new Router({
    mode: 'history',
    scrollBehavior(to, from, savedPosition) {
        if (to.params.lang != from.params.lang) {
            return {};
        } else {
            return savedPosition || { x: 0, y: 0 };
        }
    },
    routes: [
        {
            path: '/timeline/',
            component: Timeline,
            meta: { title: 'timeline', normalized: '/timeline/' }
        },
        {
            path: '/en/timeline/',
            redirect: '/timeline/'
        },
        {
            path: '/:lang/timeline',
            component: Timeline,
            meta: { title: 'timeline', normalized: '/timeline/' }
        },
        {
            path: '/',
            component: Resume,
            meta: { title: 'resume', normalized: '/' }
        },
        {
            path: '/en/',
            redirect: '/'
        },
        {
            path: '/:lang/',
            component: Resume,
            meta: { title: 'resume', normalized: '/' }
        }
    ]
});
