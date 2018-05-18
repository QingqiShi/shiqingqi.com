import Vue from 'vue';
import Router from 'vue-router';
import Timeline from './views/Timeline.vue';
import Resume from './views/Resume.vue';

Vue.use(Router);

export default new Router({
    mode: 'history',
    routes: [
        {
            path: '/',
            name: 'resume',
            component: Resume
        },
        {
            path: '/timeline',
            name: 'timeline',
            component: Timeline
        }
    ]
});
