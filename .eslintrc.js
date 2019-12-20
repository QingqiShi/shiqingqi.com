module.exports = {
    env: {
        es6: true,
        browser: true,
        node: true
    },
    rules: {
        'prettier/prettier': [
            'error',
            {
                singleQuote: true,
                tabWidth: 4
            }
        ],
        'vue/max-attributes-per-line': [
            2,
            {
                singleline: 3,
                multiline: {
                    max: 1,
                    allowFirstLine: true
                }
            }
        ],
        'vue/html-indent': ['error', 4]
    },
    root: true,
    extends: ['plugin:vue/recommended', '@vue/prettier']
};
