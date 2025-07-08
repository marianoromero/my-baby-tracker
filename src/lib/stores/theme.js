// src/lib/stores/theme.js
import { writable } from 'svelte/store'
import { browser } from '$app/environment'

// Definición de las paletas de colores
export const colorPalettes = {
  'cloud-soft': {
    name: 'Cloud Soft',
    description: 'Pasteles suaves, ideal para primeros meses',
    colors: {
      background: '#F8FAFC',
      surface: '#FFFFFF',
      primary: '#A8D8F8',
      'primary-dark': '#8BC5E8',
      weight: '#FFDC9B',
      poop: '#F4C99C',
      bottle: '#C7EBD8',
      sleep: '#D6C7F7',
      text: '#1E293B',
      'text-light': '#64748B',
      'text-muted': '#94A3B8',
      border: '#E2E8F0',
      'border-light': '#F1F5F9'
    }
  },
  'bubble-pop': {
    name: 'Bubble Pop',
    description: 'Pasteles más vivos y alegres',
    colors: {
      background: '#FFFFFF',
      surface: '#FAFAFA',
      primary: '#58D1F2',
      'primary-dark': '#3FB8DC',
      weight: '#FFD56B',
      poop: '#FFA07E',
      bottle: '#9BE7C4',
      sleep: '#9CA6F7',
      text: '#1F2937',
      'text-light': '#6B7280',
      'text-muted': '#9CA3AF',
      border: '#E5E7EB',
      'border-light': '#F3F4F6'
    }
  },
  'night-light': {
    name: 'Night Light',
    description: 'Modo oscuro para uso nocturno',
    colors: {
      background: '#111827',
      surface: '#1F2937',
      primary: '#3B82F6',
      'primary-dark': '#2563EB',
      weight: '#FACC15',
      poop: '#F97316',
      bottle: '#22C55E',
      sleep: '#8B5CF6',
      text: '#F9FAFB',
      'text-light': '#D1D5DB',
      'text-muted': '#9CA3AF',
      border: '#374151',
      'border-light': '#4B5563'
    }
  }
}

// Store para la paleta actual
function createThemeStore() {
  const defaultPalette = 'cloud-soft'
  
  // Obtener valor inicial del localStorage en el cliente
  const initialValue = browser 
    ? localStorage.getItem('baby-tracker-theme') || defaultPalette
    : defaultPalette
  
  const { subscribe, set, update } = writable(initialValue)
  
  return {
    subscribe,
    setTheme: (paletteId) => {
      if (colorPalettes[paletteId]) {
        set(paletteId)
        if (browser) {
          localStorage.setItem('baby-tracker-theme', paletteId)
          // La aplicación de colores se maneja en el layout
        }
      }
    },
    reset: () => {
      set(defaultPalette)
      if (browser) {
        localStorage.removeItem('baby-tracker-theme')
        // La aplicación de colores se maneja en el layout
      }
    }
  }
}

export const currentTheme = createThemeStore()

// Función para obtener los colores de la paleta actual
export function getCurrentColors(themeId) {
  return colorPalettes[themeId]?.colors || colorPalettes['cloud-soft'].colors
}