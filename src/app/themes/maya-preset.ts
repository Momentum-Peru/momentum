import { definePreset } from '@primeuix/themes';
import Aura from '@primeuix/themes/aura';

/**
 * Preset personalizado de Momentum
 * Basado en el tema Aura de PrimeNG con color primario negro
 */
const MayaPreset = definePreset(Aura, {
    semantic: {
        primary: {
            50: '#f9fafb',
            100: '#f3f4f6',
            200: '#e5e7eb',
            300: '#d1d5db',
            400: '#9ca3af',
            500: '#6b7280',
            600: '#4b5563',
            700: '#374151',
            800: '#1f2937',
            900: '#111827',
            950: '#000000' // Negro como color primario principal
        },
        colorScheme: {
            light: {
                primary: {
                    color: '#000000', // Negro como color primario
                    inverseColor: '#ffffff', // Blanco para texto en elementos primarios
                    hoverColor: '#1f2937', // Gris muy oscuro para hover
                    activeColor: '#374151' // Gris oscuro para estado activo
                },
                surface: {
                    0: '#ffffff',
                    50: '#f9fafb',
                    100: '#f3f4f6',
                    200: '#e5e7eb',
                    300: '#d1d5db',
                    400: '#9ca3af',
                    500: '#6b7280',
                    600: '#4b5563',
                    700: '#374151',
                    800: '#1f2937',
                    900: '#111827',
                    950: '#000000'
                },
                text: {
                    primary: '#000000', // Texto negro por defecto
                    secondary: '#6b7280', // Texto secundario gris
                    muted: '#9ca3af' // Texto atenuado
                },
                // Configuración para botón secundario
                secondary: {
                    color: '#000000', // Texto negro
                    inverseColor: '#000000', // Texto negro
                    hoverColor: '#000000', // Texto negro en hover
                    activeColor: '#000000' // Texto negro en activo
                }
            }
        }
    },
    // Configuración de fuente
    fontFamily: "'Alan Sans', sans-serif",

    // Configuración de espaciado
    borderRadius: '0.5rem',

    // Configuración de sombras
    shadow: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
});

export default MayaPreset;
