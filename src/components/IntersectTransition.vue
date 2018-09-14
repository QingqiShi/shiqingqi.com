<script>
export default {
    name: 'IntersectTransition',
    render() {
        // Only render first child slot
        return this.$slots.default[0];
    },
    props: ['name', 'duration', 'delay'],
    data() {
        return {
            intersecting: true,
            showing: false,
            animating: false,
            currentAnimation: {
                delayTimeoutId: undefined,
                transitionListener: null,
                animationListener: null
            }
        };
    },
    mounted() {
        if ('IntersectionObserver' in window) {
            // Use IntersectionObserver if available
            new IntersectionObserver(this.intersectCallback, {
                threshold: [0, 0.5, 1]
            }).observe(this.$el);
        } else {
            // Use scroll event as fallback
            window.addEventListener('scroll', this.intersectCallback);
            this.intersectCallback();
        }
    },
    methods: {
        intersectCallback() {
            const rect = this.$el.getBoundingClientRect();
            const windowHeight = window.innerHeight;

            // Three different senarios:
            // 1. Entire element below screen
            // 2. The bottom screen edge is intersecting top half of the element
            // 3. The bottom screen edge is below top half of the element

            // 1. Entire element below screen
            if (rect.top > windowHeight && this.intersecting) {
                this.intersecting = false;
                if (this.showing) {
                    this.leave();
                    this.showing = false;
                }
            }

            // 2. The bottom screen edge is intersecting top half of the element
            if (
                rect.top < windowHeight &&
                rect.top + rect.height / 2 > windowHeight &&
                !this.intersecting
            ) {
                this.intersecting = true;
                this.above = true;

                if (!this.showing) {
                    this.enter();
                    this.showing = true;
                } else {
                    this.leave();
                    this.showing = false;
                }
            }

            // 3. The bottom screen edge is below top half of the element
            if (
                rect.top + rect.height / 2 < windowHeight &&
                this.intersecting
            ) {
                this.intersecting = false;
                if (!this.showing) {
                    this.enter();
                    this.showing = true;
                }
            }
        },
        enter() {
            if (this.animating) {
                this.cancelAnimation();
            }

            this.reset('leave');
            this.flip('enter');
        },
        leave() {
            if (this.animating) {
                this.cancelAnimation();
            }

            this.reset('enter');
            this.flip('leave');
        },
        cancelAnimation() {
            if (this.currentAnimation.delayTimeoutId !== undefined) {
                clearTimeout(this.currentAnimation.delayTimeoutId);

                // Test for this.animating again in case final callback is called first
            } else if (this.animating) {
                this.$el.removeEventListener(
                    'animationend',
                    this.currentAnimation.animationListener
                );
                this.$el.removeEventListener(
                    'transitionend',
                    this.currentAnimation.transitionListener
                );
            }

            this.reset('enter');
            this.reset('leave');
        },
        flip(action) {
            this.animating = true;
            this.$el.classList.add(`${this.$props.name}-${action}`);

            const start = () => {
                this.currentAnimation.delayTimeoutId = undefined;

                this.$el.classList.add(`${this.$props.name}-${action}-active`);

                requestAnimationFrame(() => {
                    this.$el.classList.remove(`${this.$props.name}-${action}`);
                    this.$el.classList.add(`${this.$props.name}-${action}-to`);
                });

                this.onAnimationEnd(() => {
                    this.$el.classList.remove(
                        `${this.$props.name}-${action}-active`
                    );

                    this.animating = false;
                });
            };

            if (this.$props.delay) {
                this.currentAnimation.delayTimeoutId = setTimeout(
                    start,
                    this.$props.delay
                );
            } else {
                this.currentAnimation.delayTimeoutId = setTimeout(start, 0);
            }
        },
        reset(action) {
            this.$el.classList.remove(`${this.$props.name}-${action}`);
            this.$el.classList.remove(`${this.$props.name}-${action}-active`);
            this.$el.classList.remove(`${this.$props.name}-${action}-to`);
        },
        onAnimationEnd(callback) {
            if (this.$props.duration) {
                setTimeout(callback, this.$props.duration);
            } else {
                // Listen for either transitionend or animationend and remove the other
                this.currentAnimation.transitionListener = this.$el.addEventListener(
                    'transitionend',
                    () => {
                        this.$el.removeEventListener(
                            'animationend',
                            this.currentAnimation.animationListener
                        );
                        callback();
                    },
                    { once: true }
                );
                this.currentAnimation.animationListener = this.$el.addEventListener(
                    'animationend',
                    () => {
                        this.$el.removeEventListener(
                            'transitionend',
                            this.currentAnimation.transitionListener
                        );
                        callback();
                    },
                    { once: true }
                );
            }
        }
    }
};
</script>

<style lang="scss" scoped>
@import '../scssUtils/transitions';
</style>
