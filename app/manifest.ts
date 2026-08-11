import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'wellnest — Personal wellness dashboard',
    short_name: 'wellnest',
    description: 'A calm personal activity and wellness dashboard.',
    start_url: '/',
    display: 'standalone',
    background_color: '#f5f6f3',
    theme_color: '#f5f6f3',
    icons: [{ src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' }],
  }
}
