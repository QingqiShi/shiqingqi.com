import Vue from 'vue';
import Router from 'vue-router';
import Meta from 'vue-meta';
import Resume from './views/Resume.vue';
import Timeline from './views/Timeline.vue';
import AdminPortal from './views/AdminPortal.vue';

Vue.use(Router);
Vue.use(Meta);

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
            path: '/admin/',
            component: AdminPortal,
            meta: { title: 'adminPortal', normalized: '/admin/' }
        },
        {
            path: '/en/admin/',
            redirect: '/admin/'
        },
        {
            path: '/:lang/admin',
            component: AdminPortal,
            meta: { title: 'adminPortal', normalized: '/admin/' }
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
