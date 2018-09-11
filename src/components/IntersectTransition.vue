<script>
export default {
    name: 'IntersectTransition',
    render() {
        return this.$slots.default[0];
    },
    props: ['name', 'duration', 'delay'],
    data() {
        return {
            intersecting: true,
            showing: false,
            animating: false,
            animationQueue: []
        };
    },
    mounted() {
        if ('IntersectionObserver' in window) {
            // Use IntersectionObserver if available
            new IntersectionObserver(
                entries => {
                    this.intersectCallback();
                },
                {
                    threshold: [0, 0.2, 0.4, 0.6, 0.8, 1]
                }
            ).observe(this.$el);
        } else {
            // Use scroll event as fallback
            window.addEventListener('scroll', () => {
                this.intersectCallback();
            });
            this.intersectCallback();
        }
    },
    methods: {
        intersectCallback() {
            const rect = this.$el.getBoundingClientRect();
            const top = rect.top;
            const height = rect.height;
            const windowHeight = window.innerHeight;

            // Entire element below screen
            if (top > windowHeight && this.intersecting) {
                this.intersecting = false;
                if (this.showing) {
                    this.leave();
                }
                this.showing = false;
            }

            // Element intersecting with bottom screen edge
            if (
                top < windowHeight &&
                top + height > windowHeight &&
                !this.intersecting
            ) {
                this.intersecting = true;

                if (!this.showing) {
                    this.enter();
                    this.showing = true;
                } else {
                    this.leave();
                    this.showing = false;
                }
            }

            // Entire element above bottom screen edge
            if (top + height < windowHeight && this.intersecting) {
                this.intersecting = false;
                if (!this.showing) {
                    this.enter();
                }
                this.showing = true;
            }
        },
        enter() {
            this.animationQueue.push(() => {
                this.reset('leave');
                this.flip('enter');
            });

            if (!this.animating) {
                this.playAnimation();
            }
        },
        leave() {
            this.animationQueue.push(() => {
                this.reset('enter');
                this.flip('leave');
            });

            if (!this.animating) {
                this.playAnimation();
            }
        },
        playAnimation() {
            this.animationQueue.shift()();
        },
        flip(action) {
            this.animating = true;
            this.$el.classList.add(`${this.$props.name}-${action}`);

            const start = () => {
                this.$el.classList.add(`${this.$props.name}-${action}-active`);

                requestAnimationFrame(() => {
                    this.$el.classList.remove(`${this.$props.name}-${action}`);
                    this.$el.classList.add(`${this.$props.name}-${action}-to`);
                });

                this.onAnimationEnd(() => {
                    this.$el.classList.remove(
                        `${this.$props.name}-${action}-active`
                    );

                    if (this.animationQueue.length == 0) {
                        this.animating = false;
                    } else {
                        this.playAnimation();
                    }
                });
            };

            if (this.$props.delay) {
                setTimeout(start, this.$props.delay);
            } else {
                setTimeout(start, 10);
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
                const transitionListener = this.$el.addEventListener(
                    'transitionend',
                    () => {
                        this.$el.removeEventListener(
                            'animationend',
                            animationListener
                        );
                        callback();
                    },
                    { once: true }
                );
                const animationListener = this.$el.addEventListener(
                    'animationend',
                    () => {
                        this.$el.removeEventListener(
                            'transitionend',
                            transitionListener
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
