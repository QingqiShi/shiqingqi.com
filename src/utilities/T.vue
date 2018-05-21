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

        // Explicit lang setting
        if (this.lang) {
            this.setLang(this.lang);
        }

        // Filter for slots
        const slots =
            this.$slots.default &&
            this.$slots.default.filter(slot => slot.tag !== undefined);
        let usedSlots = 0;

        // Translated text
        const rawText = this.$t(this.t, this.$store.state.lang);

        // Splitter line-break
        const lines = rawText.split('{{br}}');

        const children = lines.map(line => {
            // Splitter placeholder
            const pieces = line.split('{{}}');
            return pieces.map(piece => [piece, slots && slots[usedSlots++]]).filter(item => item != undefined).reduce((acc, val) => acc.concat(val));
        });

        // Restore lang
        if (this.lang) {
            this.setLang(origLang);
        }

        if (this.tag) {
            if (children.length == 1) {
                return h(this.tag, children[0]);
            } else {
                return <div>{children.map(child => h(this.tag, child))}</div>;
            }
        } else {
            if (children.length == 1) {
                return <span>{children[0]}</span>;
            } else {
                return <span>{children.map(child => <span>{child}</span>)}</span>;
            }
        }
    }
};
</script>
