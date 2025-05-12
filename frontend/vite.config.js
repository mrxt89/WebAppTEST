import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig(({ mode }) => {
  const isProduction = mode === 'production'

  return {
    plugins: [react()],
    
    server: {
      host: true,
      port: isProduction ? 80 : 5174,
      watch: !isProduction ? {
        usePolling: true,
        interval: 1000
      } : {},
      hmr: !isProduction ? {
        host: '10.0.0.129',
        port: 5174,
        protocol: 'ws',
      } : false,
      // Proxy solo in sviluppo
      ...(isProduction ? {} : {
        proxy: {
          '/api': {
            target: 'http://10.0.0.129:3000',
            changeOrigin: true,
            secure: false,
            ws: true
          }
        }
      })
    },
    
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      emptyOutDir: true,
      sourcemap: !isProduction,
      chunkSizeWarningLimit: 2000,
      minify: 'esbuild',
      rollupOptions: {
        output: {
          manualChunks: {
            'react-vendor': ['react', 'react-dom'],
            'ui-vendor': [
              '@radix-ui/react-accordion',
              '@radix-ui/react-alert-dialog',
              '@radix-ui/react-aspect-ratio',
              '@radix-ui/react-avatar',
            ],
            'chart-vendor': ['recharts'],
            'grid-vendor': ['ag-grid-react', 'ag-grid-community'],
          }
        }
      }
    },
    
    optimizeDeps: {
      include: ['react', 'react-dom'],
      exclude: ['@fortawesome/fontawesome-svg-core']
    },

    resolve: {
      alias: {
        '@': '/src',
        '@/components': '/src/components',
        '@/lib/utils': '/src/lib/utils'
      },
    },

    css: {
      modules: {
        generateScopedName: isProduction
          ? '[hash:base64:8]'
          : '[name]__[local]__[hash:base64:5]'
      },
      preprocessorOptions: {
        less: {
          javascriptEnabled: true,
        }
      }
    },

    // Configurazioni specifiche per la produzione
    ...(isProduction && {
      build: {
        cssMinify: true,
        modulePreload: {
          polyfill: true
        },
        reportCompressedSize: false,
        rollupOptions: {
          output: {
            // Strategia di chunking per produzione
            manualChunks: {
              'react-vendor': ['react', 'react-dom'],
              'ui-vendor': [
                '@radix-ui/react-accordion',
                '@radix-ui/react-alert-dialog',
                '@radix-ui/react-aspect-ratio',
                '@radix-ui/react-avatar',
              ],
              'chart-vendor': ['recharts'],
              'grid-vendor': ['ag-grid-react', 'ag-grid-community'],
              'utils': [
                'lodash',
                'axios',
                'date-fns'
              ],
              'ui-components': [
                '@/components/ui',
                '@/lib/utils'
              ]
            },
            // Naming pattern per i chunks
            chunkFileNames: 'assets/js/[name]-[hash].js',
            entryFileNames: 'assets/js/[name]-[hash].js',
            assetFileNames: 'assets/[ext]/[name]-[hash].[ext]'
          }
        }
      }
    }),

    // Configurazione environment
    define: {
      'process.env.NODE_ENV': JSON.stringify(mode),
      'import.meta.env.MODE': JSON.stringify(mode)
    }
  }
})