<script>
export default {
    name: 'T',
    props: {
        t: {
            type: String,
            required: true
        },
        tag: {
            type: String,
            default: undefined
        },
        lang: {
            type: String,
            default: undefined
        }
    },
    render(h) {
        let origLang = this.getLang();

        if (this.lang) {
            this.setLang(this.lang);
        }

        const texts = this.$t(this.t, this.$store.state.lang).split('{{}}');
        let children = [texts[0]];
        for (let i = 1; i < texts.length; i++) {
            if (this.$slots.default[i - 1]) {
                children.push(this.$slots.default[i - 1]);
            }
            children.push(texts[i]);
        }

        if (this.lang) {
            this.setLang(origLang);
        }

        if (this.tag) {
            return h(this.tag, children);
        } else {
            return <span>{children}</span>;
        }
    }
};
</script>
