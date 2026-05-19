import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  // Relative URLs work on GitHub Pages (/Repo/), Render (site root), and Live Server on dist/.
  // A leading-path base like /ExamApp/ breaks Live Server and `vite preview` unless you open /ExamApp/.
  base: mode === 'production' ? './' : '/',
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/setupTests.js',
  },
}))
