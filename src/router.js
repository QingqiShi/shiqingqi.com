import Vue from 'vue';
import Router from 'vue-router';
import About from './views/About.vue';
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
            path: '/about',
            name: 'about',
            component: About
        }
    ]
});
