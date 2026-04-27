export default {
    plugins: {
        '@tailwindcss/postcss': {},
        autoprefixer: {}, // Keeping autoprefixer is usually fine, but v4 manages it internally often. Let's keep it if installed.
    },
}
