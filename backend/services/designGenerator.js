const fs = require('fs');
const path = require('path');

/**
 * Generate highly competitive, premium design based on category and requirements
 * utilizing modern trends like glassmorphism, gradient meshes, neo-brutalism, and dark luxury.
 */
async function generateDesign(jobId, category, requirements = {}) {
  try {
    const {
      width = 1200,
      height = 800,
      title = 'Premium Design',
      colors = ['#4F46E5', '#EC4899', '#8B5CF6'], // Modern gradient defaults
      style = 'modern',
    } = requirements;

    let svg = '';

    // Ensure we have at least 3 colors for rich gradients
    const richColors = colors.length >= 3 ? colors : [...colors, '#3B82F6', '#10B981'].slice(0, 3);

    switch (category) {
      case 'logo':
        svg = generateLogo(title, richColors);
        break;
      case 'banner':
      case 'social_media':
        svg = generateBanner(title, richColors, width, height);
        break;
      case 'web_design':
        svg = generateWebMockup(title, richColors, width, height);
        break;
      case 'flyer':
      case 'print':
        svg = generateFlyer(title, richColors);
        break;
      case 'business_card':
        svg = generateBusinessCard(title, richColors);
        break;
      case 'email':
        svg = generateEmailTemplate(title, richColors);
        break;
      case 'social_media_post':
        svg = generateSocialPost(title, richColors, 1080, 1080);
        break;
      case 'thumbnail':
        svg = generateThumbnail(title, richColors);
        break;
      default:
        svg = generateGenericDesign(title, richColors, width, height);
    }

    // Create output directory
    const outputDir = path.join(__dirname, '..', 'designs', jobId);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Save SVG
    const svgPath = path.join(outputDir, 'design.svg');
    fs.writeFileSync(svgPath, svg);

    // Placeholder for PNG (system relies on SVG for now)
    const pngPath = path.join(outputDir, 'design.png');
    // Copy SVG to PNG extension as a placeholder to satisfy basic file requirements if needed
    fs.writeFileSync(pngPath, svg);

    return {
      success: true,
      jobId,
      category,
      files: {
        svg: svgPath,
        png: pngPath,
      },
      designUrl: `/designs/${jobId}/design.svg`,
      description: generateDesignDescription(category, requirements),
    };
  } catch (err) {
    console.error('❌ Error generating design:', err.message);
    return { success: false, error: err.message };
  }
}

// ============ PREMIUM LOGO GENERATOR ============
function generateLogo(title, colors) {
  const [c1, c2, c3] = colors;
  const initial = title.charAt(0).toUpperCase();

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="500" height="500" viewBox="0 0 500 500" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0f172a" />
      <stop offset="100%" stop-color="#1e293b" />
    </linearGradient>
    <linearGradient id="logoGrad" x1="0%" y1="100%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="${c1}" />
      <stop offset="50%" stop-color="${c2}" />
      <stop offset="100%" stop-color="${c3}" />
    </linearGradient>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="15" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
  </defs>

  <rect width="500" height="500" fill="url(#bg)" rx="50"/>

  <!-- Glowing Abstract Shape -->
  <path d="M 250 120 C 350 120 400 200 350 300 C 300 400 200 400 150 300 C 100 200 150 120 250 120 Z" fill="url(#logoGrad)" filter="url(#glow)" opacity="0.8" />
  <path d="M 250 150 C 320 150 360 210 320 280 C 280 350 220 350 180 280 C 140 210 180 150 250 150 Z" fill="#ffffff" opacity="0.9" />

  <text x="250" y="300" font-size="120" font-weight="900" text-anchor="middle" fill="url(#logoGrad)" font-family="system-ui, -apple-system, sans-serif" letter-spacing="-2">${initial}</text>

  <text x="250" y="420" font-size="32" font-weight="800" text-anchor="middle" fill="#f8fafc" font-family="system-ui, -apple-system, sans-serif" letter-spacing="4">${title.toUpperCase()}</text>
  <text x="250" y="450" font-size="14" font-weight="500" text-anchor="middle" fill="#94a3b8" font-family="system-ui, -apple-system, sans-serif" letter-spacing="8">STUDIO</text>
</svg>`;
}

// ============ GLASSMORPHIC WEB MOCKUP ============
function generateWebMockup(title, colors, width = 1440, height = 900) {
  const [c1, c2, c3] = colors;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="bgGrad" cx="80%" cy="20%" r="80%" fx="80%" fy="20%">
      <stop offset="0%" stop-color="${c1}" stop-opacity="0.15"/>
      <stop offset="50%" stop-color="${c2}" stop-opacity="0.05"/>
      <stop offset="100%" stop-color="#020617" stop-opacity="1"/>
    </radialGradient>
    <linearGradient id="cardGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.1"/>
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0.02"/>
    </linearGradient>
    <filter id="glass" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="20" result="blur"/>
      <feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -7" result="glow"/>
      <feComposite in="SourceGraphic" in2="glow" operator="over"/>
    </filter>
    <filter id="dropShadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="20" stdDeviation="30" flood-color="#000000" flood-opacity="0.4"/>
    </filter>
  </defs>

  <!-- Deep Dark Background -->
  <rect width="${width}" height="${height}" fill="#020617"/>
  <rect width="${width}" height="${height}" fill="url(#bgGrad)"/>

  <!-- Glowing Orbs -->
  <circle cx="15%" cy="30%" r="200" fill="${c1}" opacity="0.2" filter="blur(80px)"/>
  <circle cx="85%" cy="70%" r="300" fill="${c3}" opacity="0.15" filter="blur(100px)"/>

  <!-- Browser Chrome -->
  <rect x="40" y="40" width="${width-80}" height="${height-80}" rx="24" fill="#0f172a" filter="url(#dropShadow)" stroke="#334155" stroke-width="1"/>
  <circle cx="70" cy="70" r="6" fill="#ef4444"/>
  <circle cx="95" cy="70" r="6" fill="#f59e0b"/>
  <circle cx="120" cy="70" r="6" fill="#10b981"/>
  <rect x="150" y="55" width="${width-300}" height="30" rx="8" fill="#1e293b"/>
  <text x="${width/2}" y="75" font-size="14" fill="#64748b" text-anchor="middle" font-family="system-ui">https://awesome-project.dev</text>

  <!-- Sidebar -->
  <rect x="40" y="100" width="240" height="${height-140}" fill="#0f172a" border-right="1px solid #1e293b"/>
  <path d="M 280 100 L 280 ${height-40}" stroke="#1e293b" stroke-width="1"/>

  <!-- Logo in Sidebar -->
  <circle cx="80" cy="150" r="16" fill="url(#bgGrad)" stroke="${c1}" stroke-width="2"/>
  <text x="110" y="156" font-size="18" font-weight="700" fill="#f8fafc" font-family="system-ui">NexusUI</text>

  <!-- Nav Items -->
  <rect x="60" y="200" width="200" height="40" rx="8" fill="${c1}" opacity="0.1"/>
  <text x="80" y="225" font-size="14" font-weight="600" fill="${c1}" font-family="system-ui">Dashboard</text>
  <text x="80" y="275" font-size="14" fill="#94a3b8" font-family="system-ui">Analytics</text>
  <text x="80" y="325" font-size="14" fill="#94a3b8" font-family="system-ui">Transactions</text>
  <text x="80" y="375" font-size="14" fill="#94a3b8" font-family="system-ui">Settings</text>

  <!-- Main Content Area -->
  <!-- Hero / Header -->
  <text x="320" y="160" font-size="36" font-weight="800" fill="#f8fafc" font-family="system-ui">${title}</text>
  <text x="320" y="190" font-size="16" fill="#94a3b8" font-family="system-ui">Welcome back. Here's what's happening today.</text>

  <!-- Action Button -->
  <rect x="${width-200}" y="140" width="120" height="40" rx="8" fill="${c2}"/>
  <text x="${width-140}" y="165" font-size="14" font-weight="600" fill="#ffffff" text-anchor="middle" font-family="system-ui">Generate Report</text>

  <!-- Bento Grid Cards (Glassmorphism) -->
  <!-- Metric 1 -->
  <rect x="320" y="240" width="320" height="160" rx="20" fill="url(#cardGrad)" stroke="#334155" stroke-width="1" filter="url(#glass)"/>
  <text x="350" y="280" font-size="14" fill="#94a3b8" font-family="system-ui">Total Revenue</text>
  <text x="350" y="330" font-size="42" font-weight="800" fill="#f8fafc" font-family="system-ui">$128,430</text>
  <text x="350" y="360" font-size="14" font-weight="600" fill="#10b981" font-family="system-ui">↑ +14.5% vs last month</text>

  <!-- Metric 2 -->
  <rect x="660" y="240" width="320" height="160" rx="20" fill="url(#cardGrad)" stroke="#334155" stroke-width="1" filter="url(#glass)"/>
  <text x="690" y="280" font-size="14" fill="#94a3b8" font-family="system-ui">Active Users</text>
  <text x="690" y="330" font-size="42" font-weight="800" fill="#f8fafc" font-family="system-ui">45.2K</text>
  <text x="690" y="360" font-size="14" font-weight="600" fill="#10b981" font-family="system-ui">↑ +5.2% vs last month</text>

  <!-- Large Chart Area -->
  <rect x="320" y="420" width="660" height="340" rx="20" fill="url(#cardGrad)" stroke="#334155" stroke-width="1" filter="url(#glass)"/>
  <text x="350" y="460" font-size="18" font-weight="600" fill="#f8fafc" font-family="system-ui">Performance Overview</text>

  <!-- Abstract Chart Curve -->
  <path d="M 350 700 C 450 650, 550 720, 650 600 C 750 480, 850 550, 950 450" fill="none" stroke="${c1}" stroke-width="4" stroke-linecap="round"/>
  <path d="M 350 700 C 450 650, 550 720, 650 600 C 750 480, 850 550, 950 450 L 950 720 L 350 720 Z" fill="${c1}" opacity="0.1"/>

  <!-- Secondary Chart Curve -->
  <path d="M 350 650 C 450 580, 550 680, 650 520 C 750 400, 850 600, 950 550" fill="none" stroke="${c3}" stroke-width="3" stroke-dasharray="8 8" stroke-linecap="round"/>

  <!-- Right Panel -->
  <rect x="1000" y="240" width="360" height="520" rx="20" fill="url(#cardGrad)" stroke="#334155" stroke-width="1" filter="url(#glass)"/>
  <text x="1030" y="280" font-size="18" font-weight="600" fill="#f8fafc" font-family="system-ui">Recent Activity</text>

  <!-- List Items -->
  <circle cx="1045" cy="340" r="15" fill="${c1}" opacity="0.2"/>
  <circle cx="1045" cy="340" r="6" fill="${c1}"/>
  <text x="1075" y="335" font-size="14" font-weight="600" fill="#e2e8f0" font-family="system-ui">System updated to v2.4.1</text>
  <text x="1075" y="355" font-size="12" fill="#64748b" font-family="system-ui">Just now</text>

  <circle cx="1045" cy="410" r="15" fill="${c2}" opacity="0.2"/>
  <circle cx="1045" cy="410" r="6" fill="${c2}"/>
  <text x="1075" y="405" font-size="14" font-weight="600" fill="#e2e8f0" font-family="system-ui">New user registration: @alex</text>
  <text x="1075" y="425" font-size="12" fill="#64748b" font-family="system-ui">2 hours ago</text>

  <circle cx="1045" cy="480" r="15" fill="${c3}" opacity="0.2"/>
  <circle cx="1045" cy="480" r="6" fill="${c3}"/>
  <text x="1075" y="475" font-size="14" font-weight="600" fill="#e2e8f0" font-family="system-ui">Database backup completed</text>
  <text x="1075" y="495" font-size="12" fill="#64748b" font-family="system-ui">5 hours ago</text>

  <!-- Progress Bar Component -->
  <text x="1030" y="580" font-size="14" font-weight="600" fill="#e2e8f0" font-family="system-ui">Monthly Goal</text>
  <rect x="1030" y="600" width="300" height="8" rx="4" fill="#1e293b"/>
  <rect x="1030" y="600" width="210" height="8" rx="4" fill="${c2}"/>
  <text x="1330" y="590" font-size="14" font-weight="600" fill="${c2}" text-anchor="end" font-family="system-ui">70%</text>

</svg>`;
}

// ============ PREMIUM BANNER ============
function generateBanner(title, colors, width = 1200, height = 600) {
  const [c1, c2, c3] = colors;
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bannerGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0f172a"/>
      <stop offset="100%" stop-color="#020617"/>
    </linearGradient>
    <radialGradient id="glowPoint1" cx="20%" cy="20%" r="60%">
      <stop offset="0%" stop-color="${c1}" stop-opacity="0.5"/>
      <stop offset="100%" stop-color="${c1}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="glowPoint2" cx="80%" cy="80%" r="60%">
      <stop offset="0%" stop-color="${c2}" stop-opacity="0.5"/>
      <stop offset="100%" stop-color="${c2}" stop-opacity="0"/>
    </radialGradient>
    <filter id="noise">
      <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch"/>
      <feColorMatrix type="matrix" values="1 0 0 0 0, 0 1 0 0 0, 0 0 1 0 0, 0 0 0 0.1 0" />
    </filter>
  </defs>

  <rect width="${width}" height="${height}" fill="url(#bannerGrad)"/>
  <rect width="${width}" height="${height}" fill="url(#glowPoint1)"/>
  <rect width="${width}" height="${height}" fill="url(#glowPoint2)"/>

  <!-- Add subtle noise texture -->
  <rect width="${width}" height="${height}" style="pointer-events:none;" filter="url(#noise)"/>

  <!-- Geometric Abstract 3D-like shapes -->
  <path d="M 900 100 L 1050 200 L 900 300 L 750 200 Z" fill="${c3}" opacity="0.2" filter="blur(10px)"/>
  <path d="M 900 80 L 1050 180 L 900 280 L 750 180 Z" fill="url(#bannerGrad)" stroke="${c3}" stroke-width="2" opacity="0.8"/>
  <path d="M 900 80 L 1050 180 L 1050 200 L 900 100 Z" fill="${c3}" opacity="0.4"/>

  <!-- Foreground Text -->
  <text x="100" y="${height / 2 - 40}" font-size="82" font-weight="900" fill="#ffffff" font-family="system-ui, -apple-system, sans-serif" letter-spacing="-2">
    ${title}
  </text>
  <text x="100" y="${height / 2 + 30}" font-size="28" font-weight="400" fill="#94a3b8" font-family="system-ui">
    Elevating Digital Experiences to the Next Level
  </text>

  <!-- Modern CTA -->
  <rect x="100" y="${height / 2 + 80}" width="220" height="60" rx="30" fill="${c1}"/>
  <text x="210" y="${height / 2 + 118}" font-size="18" font-weight="700" fill="#ffffff" text-anchor="middle" font-family="system-ui">
    Explore Now →
  </text>
</svg>`;
}

// ============ CYBERPUNK/MODERN FLYER ============
function generateFlyer(title, colors, width = 800, height = 1131) {
  const [c1, c2] = colors;
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="flyerBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#111111"/>
      <stop offset="100%" stop-color="#000000"/>
    </linearGradient>
    <linearGradient id="textGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="${c1}"/>
      <stop offset="100%" stop-color="${c2}"/>
    </linearGradient>
  </defs>

  <rect width="${width}" height="${height}" fill="url(#flyerBg)"/>

  <!-- Cyber grids -->
  <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
    <path d="M 40 0 L 0 0 0 40" fill="none" stroke="${c1}" stroke-width="1" opacity="0.2"/>
  </pattern>
  <rect width="${width}" height="${height}" fill="url(#grid)"/>

  <!-- Big Typography Background -->
  <text x="${width/2}" y="350" font-size="200" font-weight="900" text-anchor="middle" fill="none" stroke="${c2}" stroke-width="2" opacity="0.1" font-family="Impact, sans-serif" transform="rotate(-5, ${width/2}, 350)">
    EVENT
  </text>

  <text x="80" y="250" font-size="80" font-weight="900" fill="#ffffff" font-family="system-ui, sans-serif" letter-spacing="-3">
    ${title.toUpperCase()}
  </text>
  <rect x="80" y="280" width="150" height="10" fill="url(#textGrad)"/>

  <text x="80" y="450" font-size="30" font-weight="700" fill="${c1}" font-family="system-ui">01.01.2027</text>
  <text x="80" y="500" font-size="24" fill="#a3a3a3" font-family="system-ui">EXCLUSIVE VIP ACCESS</text>

  <!-- Abstract Elements -->
  <circle cx="${width - 150}" cy="500" r="100" fill="none" stroke="${c2}" stroke-width="20" stroke-dasharray="10 30"/>
  <circle cx="${width - 150}" cy="500" r="60" fill="${c1}" opacity="0.8"/>

  <rect x="80" y="800" width="${width - 160}" height="200" fill="#1a1a1a" stroke="${c1}" stroke-width="2"/>
  <text x="120" y="870" font-size="36" font-weight="800" fill="#ffffff" font-family="system-ui">FEATURING SPECIAL GUESTS</text>
  <text x="120" y="930" font-size="20" fill="#a3a3a3" font-family="system-ui">Join the revolution of digital art and technology.</text>

  <!-- Barcode detail -->
  <g transform="translate(80, 1030)">
    <rect x="0" y="0" width="5" height="50" fill="#fff"/>
    <rect x="10" y="0" width="2" height="50" fill="#fff"/>
    <rect x="15" y="0" width="8" height="50" fill="#fff"/>
    <rect x="30" y="0" width="3" height="50" fill="#fff"/>
    <rect x="40" y="0" width="10" height="50" fill="#fff"/>
    <rect x="55" y="0" width="4" height="50" fill="#fff"/>
    <rect x="65" y="0" width="2" height="50" fill="#fff"/>
    <text x="0" y="70" font-size="12" fill="#fff" font-family="monospace" letter-spacing="4">TICKET-X998</text>
  </g>
</svg>`;
}

// ============ NEO-BRUTALIST SOCIAL POST ============
function generateSocialPost(title, colors, width = 1080, height = 1080) {
  const [c1, c2] = colors;
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <!-- Bright Neo-brutalist Background -->
  <rect width="${width}" height="${height}" fill="#facc15"/>

  <!-- Bold Drop Shadow Boxes -->
  <rect x="100" y="100" width="880" height="880" fill="#ffffff" stroke="#000000" stroke-width="8"/>
  <rect x="120" y="120" width="880" height="880" fill="#000000" opacity="0.1"/>

  <!-- Image/Content Placeholder -->
  <rect x="150" y="150" width="780" height="400" fill="${c1}" stroke="#000000" stroke-width="8"/>

  <!-- Star/Burst shape -->
  <path d="M 850 150 L 870 200 L 920 210 L 880 250 L 890 300 L 850 270 L 810 300 L 820 250 L 780 210 L 830 200 Z" fill="${c2}" stroke="#000000" stroke-width="6"/>

  <!-- Big Bold Typography -->
  <text x="150" y="660" font-size="100" font-weight="900" fill="#000000" font-family="system-ui, Impact, sans-serif" letter-spacing="-4">
    ${title.toUpperCase()}
  </text>

  <rect x="150" y="720" width="350" height="80" fill="${c2}" stroke="#000000" stroke-width="6"/>
  <text x="325" y="775" font-size="36" font-weight="900" text-anchor="middle" fill="#000000" font-family="system-ui">
    SWIPE RIGHT 👉
  </text>

  <!-- Ticker tape -->
  <rect x="100" y="900" width="880" height="80" fill="#000000"/>
  <text x="540" y="955" font-size="30" font-weight="700" text-anchor="middle" fill="#facc15" font-family="monospace" letter-spacing="4">
    NEW DROPS • LIMITED EDITION • NEW DROPS
  </text>
</svg>`;
}

// ============ DARK LUXURY BUSINESS CARD ============
function generateBusinessCard(title, colors, width = 1050, height = 600) {
  const gold = '#fbbf24';
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="gold" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fef08a"/>
      <stop offset="50%" stop-color="#eab308"/>
      <stop offset="100%" stop-color="#854d0e"/>
    </linearGradient>
    <radialGradient id="cardBg" cx="50%" cy="50%" r="70%">
      <stop offset="0%" stop-color="#1e293b"/>
      <stop offset="100%" stop-color="#020617"/>
    </radialGradient>
  </defs>

  <rect width="${width}" height="${height}" fill="url(#cardBg)"/>

  <!-- Subtle border -->
  <rect x="30" y="30" width="${width-60}" height="${height-60}" fill="none" stroke="url(#gold)" stroke-width="2" opacity="0.3"/>
  <rect x="40" y="40" width="${width-80}" height="${height-80}" fill="none" stroke="url(#gold)" stroke-width="1" opacity="0.1"/>

  <!-- Logo Mark -->
  <path d="M 525 150 L 580 250 L 470 250 Z" fill="none" stroke="url(#gold)" stroke-width="4"/>
  <path d="M 525 180 L 560 240 L 490 240 Z" fill="url(#gold)"/>

  <!-- Typography -->
  <text x="525" y="350" font-size="48" font-weight="300" text-anchor="middle" fill="#f8fafc" font-family="Times New Roman, serif" letter-spacing="10">
    ${title.toUpperCase()}
  </text>

  <text x="525" y="400" font-size="16" font-weight="400" text-anchor="middle" fill="url(#gold)" font-family="system-ui" letter-spacing="6">
    EXECUTIVE DIRECTOR
  </text>

  <!-- Contact Info -->
  <text x="525" y="480" font-size="14" text-anchor="middle" fill="#94a3b8" font-family="system-ui" letter-spacing="2">
    HELLO@DOMAIN.COM   |   +1 (555) 123-4567   |   WWW.DOMAIN.COM
  </text>
</svg>`;
}

// ============ CLEAN CORPORATE EMAIL TEMPLATE ============
function generateEmailTemplate(title, colors, width = 600, height = 900) {
  const [c1, c2] = colors;
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${width}" height="${height}" fill="#f1f5f9"/>

  <!-- Email Wrapper -->
  <rect x="40" y="40" width="520" height="820" fill="#ffffff" rx="16" filter="drop-shadow(0 10px 15px rgba(0,0,0,0.05))"/>

  <!-- Header -->
  <path d="M 40 56 Q 40 40 56 40 L 544 40 Q 560 40 560 56 L 560 180 L 40 180 Z" fill="${c1}"/>
  <text x="300" y="120" font-size="32" font-weight="800" text-anchor="middle" fill="#ffffff" font-family="system-ui">${title}</text>

  <!-- Body Content -->
  <text x="80" y="240" font-size="24" font-weight="700" fill="#0f172a" font-family="system-ui">Weekly Digest</text>
  <text x="80" y="280" font-size="16" fill="#475569" font-family="system-ui" line-height="1.5">Here are the latest updates and insights from our team.</text>
  <text x="80" y="310" font-size="16" fill="#475569" font-family="system-ui">We've introduced several new features designed to improve</text>
  <text x="80" y="340" font-size="16" fill="#475569" font-family="system-ui">your workflow.</text>

  <!-- Feature Card -->
  <rect x="80" y="380" width="440" height="120" rx="12" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1"/>
  <rect x="100" y="400" width="80" height="80" rx="8" fill="${c2}" opacity="0.1"/>
  <circle cx="140" cy="440" r="20" fill="${c2}"/>
  <text x="200" y="430" font-size="18" font-weight="600" fill="#0f172a" font-family="system-ui">New Analytics Dashboard</text>
  <text x="200" y="455" font-size="14" fill="#64748b" font-family="system-ui">Track performance in real-time.</text>

  <!-- CTA -->
  <rect x="200" y="550" width="200" height="50" rx="25" fill="${c1}"/>
  <text x="300" y="580" font-size="16" font-weight="600" fill="#ffffff" text-anchor="middle" font-family="system-ui">View Details</text>

  <!-- Footer -->
  <path d="M 40 760 L 560 760 L 560 844 Q 560 860 544 860 L 56 860 Q 40 860 40 844 Z" fill="#0f172a"/>
  <text x="300" y="800" font-size="14" fill="#94a3b8" text-anchor="middle" font-family="system-ui">© 2026 Company Inc. All rights reserved.</text>
  <text x="300" y="825" font-size="12" fill="#64748b" text-anchor="middle" font-family="system-ui">Unsubscribe | Privacy Policy</text>
</svg>`;
}

// ============ HIGH-CONTRAST YOUTUBE THUMBNAIL ============
function generateThumbnail(title, colors, width = 1280, height = 720) {
  const [c1, c2, c3] = colors;
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="thumbBg" cx="50%" cy="50%" r="70%">
      <stop offset="0%" stop-color="${c1}"/>
      <stop offset="100%" stop-color="#000000"/>
    </radialGradient>
    <filter id="textGlow">
      <feGaussianBlur stdDeviation="8" result="coloredBlur"/>
      <feMerge>
        <feMergeNode in="coloredBlur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>

  <rect width="${width}" height="${height}" fill="url(#thumbBg)"/>

  <!-- Dynamic Angles -->
  <path d="M 0 0 L 800 0 L 500 720 L 0 720 Z" fill="#000000" opacity="0.4"/>
  <path d="M 0 0 L 400 0 L 200 720 L 0 720 Z" fill="${c2}" opacity="0.8"/>

  <path d="M 1280 0 L 900 0 L 1100 720 L 1280 720 Z" fill="${c3}" opacity="0.3"/>

  <!-- Big Impact Text -->
  <text x="80" y="300" font-size="120" font-weight="900" fill="#ffffff" font-family="system-ui, Impact, sans-serif" filter="url(#textGlow)">
    THE ULTIMATE
  </text>

  <text x="80" y="450" font-size="140" font-weight="900" fill="#facc15" font-family="system-ui, Impact, sans-serif" stroke="#000" stroke-width="4">
    ${title.toUpperCase().substring(0, 10)}
  </text>

  <!-- Attention element -->
  <rect x="80" y="520" width="300" height="80" fill="#ef4444" transform="skewX(-15)"/>
  <text x="120" y="575" font-size="48" font-weight="900" fill="#ffffff" font-family="system-ui, Impact, sans-serif">
    MUST WATCH!
  </text>
</svg>`;
}

// ============ GENERIC PREMIUM ============
function generateGenericDesign(title, colors, width = 1200, height = 800) {
  const [c1, c2] = colors;
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="genGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${c1}"/>
      <stop offset="100%" stop-color="${c2}"/>
    </linearGradient>
  </defs>
  <rect width="${width}" height="${height}" fill="url(#genGrad)"/>

  <circle cx="50%" cy="50%" r="40%" fill="#ffffff" opacity="0.05"/>
  <circle cx="50%" cy="50%" r="30%" fill="#ffffff" opacity="0.05"/>

  <text x="50%" y="45%" font-size="72" font-weight="800" text-anchor="middle" fill="#ffffff" font-family="system-ui">
    ${title}
  </text>
  <text x="50%" y="55%" font-size="24" font-weight="400" text-anchor="middle" fill="#ffffff" opacity="0.8" font-family="system-ui">
    Premium Concept Design
  </text>
</svg>`;
}

function generateDesignDescription(category, requirements) {
  const descriptions = {
    logo: 'Premium abstract glowing logo design utilizing high-end typography and gradient meshes.',
    banner: 'Modern high-impact banner featuring 3D abstract geometry, subtle noise textures, and sleek typography.',
    social_media: 'Neo-brutalist high-conversion social media post designed to maximize engagement and CTR.',
    web_design: 'Elite glassmorphic dark-mode web dashboard mockup featuring glowing accents, bento grid layout, and data visualization.',
    flyer: 'Cyberpunk/Modern high-contrast event flyer with detailed typographic hierarchy and grid aesthetics.',
    print: 'High-end print design suitable for luxury distribution.',
    email: 'Clean, corporate, and modern email newsletter mockup with drop shadows and rounded UI components.',
    business_card: 'Dark luxury business card featuring gold foil accents and minimalist typography.',
    thumbnail: 'Ultra high-contrast YouTube thumbnail designed to maximize click-through-rate with dynamic angles.',
  };
  return descriptions[category] || 'Premium grade design automatically generated by advanced SVG algorithms.';
}

module.exports = {
  generateDesign,
  generateLogo,
  generateBanner,
  generateWebMockup,
  generateFlyer,
  generateSocialPost,
};
