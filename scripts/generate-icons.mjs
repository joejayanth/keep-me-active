import sharp from 'sharp'

// Indigo background (#6366f1) with a simple dumbbell SVG
const svgIcon = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="112" fill="#6366f1"/>
  <!-- Dumbbell bar -->
  <rect x="96" y="236" width="320" height="40" rx="8" fill="white"/>
  <!-- Left weight plate outer -->
  <rect x="80" y="176" width="72" height="160" rx="14" fill="white"/>
  <!-- Left weight plate inner -->
  <rect x="96" y="196" width="40" height="120" rx="8" fill="#6366f1"/>
  <!-- Right weight plate outer -->
  <rect x="360" y="176" width="72" height="160" rx="14" fill="white"/>
  <!-- Right weight plate inner -->
  <rect x="376" y="196" width="40" height="120" rx="8" fill="#6366f1"/>
</svg>
`

const svgBuffer = Buffer.from(svgIcon)

await sharp(svgBuffer).resize(192, 192).png().toFile('public/icon-192.png')
console.log('✓ Generated icon-192.png')

await sharp(svgBuffer).resize(512, 512).png().toFile('public/icon-512.png')
console.log('✓ Generated icon-512.png')
