import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import fs from 'fs'

// Funzione per caricare le variabili di configurazione host
function loadHostConfig(env) {
  // Valori predefiniti se non disponibili nell'ambiente
  const defaults = {
    HOST_IP: '10.0.0.129',
    HOST_DOMAIN: 'localhost',
    USE_HTTPS: true,
    HTTPS_PORT: 5173,
    HTTP_PORT: 5174,
    API_HTTPS_PORT: 3443,
    API_HTTP_PORT: 3001
  }

  // Estrai valori dall'ambiente o usa i valori predefiniti
  return {
    hostIp: env.VITE_HOST_IP || defaults.HOST_IP,
    hostDomain: env.VITE_HOST_DOMAIN || defaults.HOST_DOMAIN,
    useHttps: env.VITE_USE_HTTPS === 'true' || defaults.USE_HTTPS,
    httpsPort: parseInt(env.VITE_HTTPS_PORT || defaults.HTTPS_PORT.toString()),
    httpPort: parseInt(env.VITE_HTTP_PORT || defaults.HTTP_PORT.toString()),
    apiHttpsPort: parseInt(env.VITE_API_HTTPS_PORT || defaults.API_HTTPS_PORT.toString()),
    apiHttpPort: parseInt(env.VITE_API_HTTP_PORT || defaults.API_HTTP_PORT.toString())
  }
}

export default defineConfig(({ mode }) => {
  // Carica variabili d'ambiente
  const env = loadEnv(mode, process.cwd(), '')
  const isProduction = mode === 'production'
  
  // Carica configurazione host
  const hostConfig = loadHostConfig(env)
  const { hostIp, useHttps, httpsPort, httpPort, apiHttpsPort, apiHttpPort } = hostConfig
  
  // Certificati SSL
  let httpsConfig = {}
  if (useHttps) {
    try {
      httpsConfig = {
        https: {
          key: fs.readFileSync(path.resolve(__dirname, 'ssl/key.pem')),
          cert: fs.readFileSync(path.resolve(__dirname, 'ssl/cert.pem')),
        }
      }
      console.log('SSL certificates loaded successfully')
    } catch (error) {
      console.error('Error loading SSL certificates:', error.message)
      console.log('HTTPS will not be enabled')
    }
  }

  return {
    plugins: [react()],
    
    server: {
      host: true,
      port: useHttps ? httpsPort : httpPort,
      ...httpsConfig,
      watch: !isProduction ? {
        usePolling: true,
        interval: 1000
      } : {},
      hmr: !isProduction ? {
        host: hostIp,
        port: useHttps ? httpsPort : httpPort,
        protocol: useHttps ? 'wss' : 'ws',
      } : false,
      // Proxy solo in sviluppo
      ...(isProduction ? {} : {
        proxy: {
          '/api': {
            target: useHttps 
              ? `https://${hostIp}:${apiHttpsPort}` 
              : `http://${hostIp}:${apiHttpPort}`,
            changeOrigin: true,
            secure: useHttps,
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