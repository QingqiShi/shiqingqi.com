import Vue from 'vue';
import Router from 'vue-router';
import Resume from './views/Resume.vue';
import Timeline from './views/Timeline.vue';

Vue.use(Router);

export default new Router({
    mode: 'history',
    routes: [
        {
            path: '/timeline/',
            component: Timeline,
            meta: { normalized: '/timeline/' }
        },
        {
            path: '/en/timeline/',
            redirect: '/timeline/'
        },
        {
            path: '/:lang/timeline',
            component: Timeline,
            meta: { normalized: '/timeline/' }
        },
        {
            path: '/',
            component: Resume,
            meta: { normalized: '/' }
        },
        {
            path: '/en/',
            redirect: '/'
        },
        {
            path: '/:lang/',
            component: Resume,
            meta: { normalized: '/' }
        }
    ]
});
