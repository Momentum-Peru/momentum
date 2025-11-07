import { defineConfig } from 'vite';
import type { Plugin } from 'vite';
import { readFileSync } from 'fs';
import { join } from 'path';

function ignoreBinaryModels(): Plugin {
  const shardPattern = /-shard\d+$/;
  
  return {
    name: 'ignore-binary-models',
    enforce: 'pre', // Ejecutar ANTES de vite:import-analysis
    // Configurar el servidor para interceptar solicitudes HTTP
    configureServer(server) {
      // Interceptar solicitudes ANTES de que lleguen al transformador
      server.middlewares.use((req, res, next) => {
        // Verificar si es un archivo shard
        if (req.url && shardPattern.test(req.url)) {
          // Servir el archivo directamente como binario sin transformación
          try {
            const filePath = join(process.cwd(), 'public', req.url);
            const fileContent = readFileSync(filePath);
            res.setHeader('Content-Type', 'application/octet-stream');
            res.setHeader('Content-Length', fileContent.length.toString());
            res.end(fileContent);
            return; // No llamar next(), ya servimos el archivo
          } catch (error) {
            // Si hay error, continuar con el flujo normal
            console.warn(`Error serving shard file ${req.url}:`, error);
          }
        }
        next();
      });
    },
    // Interceptar en load - antes de que Vite intente leer el archivo
    load(id) {
      // Interceptar si el ID contiene el patrón directamente
      if (shardPattern.test(id) || (id.includes('models') && shardPattern.test(id))) {
        // Retornar código vacío para evitar análisis
        return '';
      }
      return null;
    },
    // Interceptar en transform - CRÍTICO: debe ejecutarse antes del análisis
    transform(code, id) {
      // Interceptar archivos shard antes de que Vite intente parsearlos
      if (shardPattern.test(id) || (id.includes('models') && shardPattern.test(id))) {
        // Retornar código vacío para evitar que Vite intente parsearlo
        return { code: '', map: null };
      }
      return null;
    },
  };
}

export default defineConfig({
  // Marcar archivos shard como assets estáticos - CRÍTICO
  assetsInclude: [
    '**/*.shard1',
    '**/*.shard2',
    '**/models/**/*-shard*',
    /\.shard\d+$/,
    /.*-shard\d+$/,
  ],
  optimizeDeps: {
    exclude: ['face-api.js'],
  },
  plugins: [ignoreBinaryModels()],
  server: {
    fs: {
      allow: ['..'],
    },
  },
});

