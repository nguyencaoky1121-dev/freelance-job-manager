const fs = require('fs');
const path = require('path');

/**
 * Generate design based on category and requirements
 */
async function generateDesign(jobId, category, requirements = {}) {
  try {
    const {
      width = 1200,
      height = 800,
      title = 'Design',
      colors = ['#667eea', '#764ba2'],
      style = 'modern',
    } = requirements;

    let svg = '';

    switch (category) {
      case 'logo':
        svg = generateLogo(title, colors);
        break;
      case 'banner':
      case 'social_media':
        svg = generateBanner(title, colors, width, height);
        break;
      case 'web_design':
        svg = generateWebMockup(title, colors);
        break;
      case 'flyer':
      case 'print':
        svg = generateFlyer(title, colors);
        break;
      case 'business_card':
        svg = generateBusinessCard(title, colors);
        break;
      case 'email':
        svg = generateEmailTemplate(title, colors);
        break;
      case 'social_media_post':
        svg = generateSocialPost(title, colors, 1080, 1080);
        break;
      case 'thumbnail':
        svg = generateThumbnail(title, colors);
        break;
      default:
        svg = generateGenericDesign(title, colors);
    }

    // Create output directory
    const outputDir = path.join(__dirname, '..', 'designs', jobId);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Save SVG
    const svgPath = path.join(outputDir, 'design.svg');
    fs.writeFileSync(svgPath, svg);

    // Generate PNG version (placeholder - in real scenario use sharp or imagemagick)
    const pngPath = path.join(outputDir, 'design.png');

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

// ============ LOGO GENERATOR ============

function generateLogo(title, colors) {
  const [color1, color2] = colors;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="400" height="400" viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${color1};stop-opacity:1" />
      <stop offset="100%" style="stop-color:${color2};stop-opacity:1" />
    </linearGradient>
  </defs>

  <!-- Background circle -->
  <circle cx="200" cy="200" r="180" fill="url(#grad1)" opacity="0.9"/>

  <!-- Inner circle -->
  <circle cx="200" cy="200" r="150" fill="white" opacity="0.1"/>

  <!-- Geometric shapes -->
  <path d="M 200 100 L 280 220 L 200 280 L 120 220 Z" fill="white" opacity="0.8"/>

  <!-- Text -->
  <text x="200" y="340" font-size="28" font-weight="bold" text-anchor="middle" fill="${color1}" font-family="Arial">
    ${title.toUpperCase().substring(0, 10)}
  </text>

  <!-- Decorative elements -->
  <circle cx="200" cy="200" r="160" fill="none" stroke="white" stroke-width="2" opacity="0.3"/>
  <circle cx="200" cy="200" r="140" fill="none" stroke="white" stroke-width="1" opacity="0.2"/>
</svg>`;
}

// ============ BANNER GENERATOR ============

function generateBanner(title, colors, width = 1200, height = 600) {
  const [color1, color2] = colors;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bannerGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${color1};stop-opacity:1" />
      <stop offset="100%" style="stop-color:${color2};stop-opacity:1" />
    </linearGradient>
  </defs>

  <!-- Background -->
  <rect width="${width}" height="${height}" fill="url(#bannerGrad)"/>

  <!-- Decorative shapes -->
  <circle cx="${width * 0.2}" cy="${height * 0.3}" r="120" fill="white" opacity="0.1"/>
  <circle cx="${width * 0.8}" cy="${height * 0.7}" r="150" fill="white" opacity="0.08"/>

  <!-- Main text -->
  <text x="${width / 2}" y="${height / 2 - 40}" font-size="64" font-weight="bold" text-anchor="middle" fill="white" font-family="Arial">
    ${title.substring(0, 20)}
  </text>

  <!-- Subtitle -->
  <text x="${width / 2}" y="${height / 2 + 40}" font-size="32" text-anchor="middle" fill="white" opacity="0.9" font-family="Arial">
    Professional Design
  </text>

  <!-- Bottom accent bar -->
  <rect x="0" y="${height - 20}" width="${width}" height="20" fill="white" opacity="0.2"/>
</svg>`;
}

// ============ WEB MOCKUP GENERATOR ============

function generateWebMockup(title, colors, width = 1200, height = 800) {
  const [color1, color2] = colors;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="webGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${color1};stop-opacity:1" />
      <stop offset="50%" style="stop-color:#ffffff;stop-opacity:1" />
      <stop offset="100%" style="stop-color:${color2};stop-opacity:1" />
    </linearGradient>
  </defs>

  <!-- Browser frame -->
  <rect x="20" y="20" width="${width - 40}" height="${height - 40}" fill="white" stroke="#ccc" stroke-width="2"/>

  <!-- Title bar -->
  <rect x="20" y="20" width="${width - 40}" height="50" fill="url(#webGrad)"/>
  <text x="40" y="55" font-size="24" font-weight="bold" fill="white" font-family="Arial">${title}</text>

  <!-- Content area -->
  <rect x="40" y="90" width="${width - 80}" height="200" fill="${color1}" opacity="0.1"/>
  <text x="${width / 2}" y="200" font-size="32" text-anchor="middle" fill="${color1}" font-weight="bold" font-family="Arial">Hero Section</text>

  <!-- Feature boxes -->
  <rect x="40" y="320" width="150" height="150" fill="${color1}" opacity="0.15" rx="8"/>
  <text x="115" y="410" font-size="16" text-anchor="middle" fill="${color1}" font-family="Arial">Feature 1</text>

  <rect x="${(width - 80 - 150) / 2 + 40}" y="320" width="150" height="150" fill="${color2}" opacity="0.15" rx="8"/>
  <text x="${(width - 80) / 2 + 40 + 75}" y="410" font-size="16" text-anchor="middle" fill="${color2}" font-family="Arial">Feature 2</text>

  <rect x="${width - 40 - 150}" y="320" width="150" height="150" fill="${color1}" opacity="0.15" rx="8"/>
  <text x="${width - 40 - 75}" y="410" font-size="16" text-anchor="middle" fill="${color1}" font-family="Arial">Feature 3</text>
</svg>`;
}

// ============ FLYER GENERATOR ============

function generateFlyer(title, colors, width = 800, height = 1000) {
  const [color1, color2] = colors;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="flyerGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${color1};stop-opacity:1" />
      <stop offset="100%" style="stop-color:${color2};stop-opacity:1" />
    </linearGradient>
  </defs>

  <!-- Background -->
  <rect width="${width}" height="${height}" fill="url(#flyerGrad)"/>

  <!-- Header -->
  <text x="${width / 2}" y="150" font-size="56" font-weight="bold" text-anchor="middle" fill="white" font-family="Arial">
    ${title.substring(0, 15)}
  </text>

  <!-- Subtitle -->
  <text x="${width / 2}" y="220" font-size="28" text-anchor="middle" fill="white" opacity="0.9" font-family="Arial">
    Your Amazing Offer
  </text>

  <!-- Content box -->
  <rect x="40" y="280" width="${width - 80}" height="400" fill="white" opacity="0.95" rx="10"/>

  <!-- Content text -->
  <text x="${width / 2}" y="350" font-size="20" text-anchor="middle" fill="${color1}" font-weight="bold" font-family="Arial">
    Limited Time Offer
  </text>

  <text x="${width / 2}" y="420" font-size="24" text-anchor="middle" fill="${color2}" font-family="Arial">
    UP TO 50% OFF
  </text>

  <text x="${width / 2}" y="500" font-size="16" text-anchor="middle" fill="#333" font-family="Arial">
    Professional design solutions
  </text>

  <!-- CTA Button -->
  <rect x="${width / 2 - 100}" y="560" width="200" height="50" fill="${color1}" rx="25"/>
  <text x="${width / 2}" y="595" font-size="18" text-anchor="middle" fill="white" font-weight="bold" font-family="Arial">
    LEARN MORE
  </text>

  <!-- Footer -->
  <text x="${width / 2}" y="${height - 80}" font-size="14" text-anchor="middle" fill="white" opacity="0.8" font-family="Arial">
    Contact: info@example.com | www.example.com
  </text>
</svg>`;
}

// ============ SOCIAL MEDIA POST GENERATOR ============

function generateSocialPost(title, colors, width = 1080, height = 1080) {
  const [color1, color2] = colors;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="socialGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${color1};stop-opacity:1" />
      <stop offset="100%" style="stop-color:${color2};stop-opacity:1" />
    </linearGradient>
  </defs>

  <!-- Background -->
  <rect width="${width}" height="${height}" fill="url(#socialGrad)"/>

  <!-- Geometric elements -->
  <circle cx="${width * 0.2}" cy="${height * 0.3}" r="150" fill="white" opacity="0.1"/>
  <circle cx="${width * 0.85}" cy="${height * 0.75}" r="200" fill="white" opacity="0.08"/>

  <!-- Main title -->
  <text x="${width / 2}" y="${height / 2 - 100}" font-size="72" font-weight="bold" text-anchor="middle" fill="white" font-family="Arial">
    ${title.substring(0, 12)}
  </text>

  <!-- Tagline -->
  <text x="${width / 2}" y="${height / 2 + 50}" font-size="36" text-anchor="middle" fill="white" opacity="0.9" font-family="Arial">
    Follow Us
  </text>

  <!-- Hashtag -->
  <text x="${width / 2}" y="${height - 100}" font-size="28" text-anchor="middle" fill="white" opacity="0.8" font-family="Arial">
    #Design #Creative
  </text>
</svg>`;
}

// ============ GENERIC DESIGN ============

function generateGenericDesign(title, colors, width = 1200, height = 800) {
  const [color1, color2] = colors;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="genericGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${color1};stop-opacity:1" />
      <stop offset="100%" style="stop-color:${color2};stop-opacity:1" />
    </linearGradient>
  </defs>

  <rect width="${width}" height="${height}" fill="url(#genericGrad)"/>

  <text x="${width / 2}" y="${height / 2}" font-size="48" font-weight="bold" text-anchor="middle" fill="white" font-family="Arial">
    ${title}
  </text>

  <text x="${width / 2}" y="${height / 2 + 80}" font-size="24" text-anchor="middle" fill="white" opacity="0.8" font-family="Arial">
    Professional Design
  </text>
</svg>`;
}

// ============ BUSINESS CARD GENERATOR ============

function generateBusinessCard(title, colors, width = 1000, height = 600) {
  const [color1, color2] = colors;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <!-- Front side -->
  <rect x="50" y="50" width="400" height="250" fill="white" stroke="${color1}" stroke-width="2"/>
  <rect x="50" y="50" width="400" height="60" fill="${color1}"/>

  <text x="70" y="95" font-size="20" font-weight="bold" fill="white" font-family="Arial">${title.substring(0, 20)}</text>
  <text x="70" y="160" font-size="14" fill="#333" font-family="Arial">Professional Designer</text>
  <text x="70" y="190" font-size="12" fill="#666" font-family="Arial">Email: designer@example.com</text>
  <text x="70" y="215" font-size="12" fill="#666" font-family="Arial">Phone: +1-234-567-8900</text>

  <!-- Back side -->
  <rect x="550" y="50" width="400" height="250" fill="${color2}" opacity="0.9"/>
  <text x="570" y="180" font-size="16" fill="white" font-family="Arial">Your company tagline goes here</text>
</svg>`;
}

// ============ EMAIL TEMPLATE GENERATOR ============

function generateEmailTemplate(title, colors, width = 600, height = 800) {
  const [color1, color2] = colors;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <!-- Header -->
  <rect width="${width}" height="150" fill="${color1}"/>
  <text x="${width / 2}" y="100" font-size="32" font-weight="bold" text-anchor="middle" fill="white" font-family="Arial">
    ${title.substring(0, 15)}
  </text>

  <!-- Content area -->
  <rect y="150" width="${width}" height="450" fill="white"/>
  <text x="40" y="200" font-size="18" font-weight="bold" fill="#333" font-family="Arial">Hello,</text>
  <text x="40" y="250" font-size="14" fill="#666" font-family="Arial">This is your professional email template.</text>
  <text x="40" y="280" font-size="14" fill="#666" font-family="Arial">Feel free to customize with your content.</text>

  <!-- CTA Button -->
  <rect x="150" y="350" width="300" height="50" fill="${color2}" rx="5"/>
  <text x="${width / 2}" y="385" font-size="16" text-anchor="middle" fill="white" font-weight="bold" font-family="Arial">
    CLICK HERE
  </text>

  <!-- Footer -->
  <rect y="${height - 150}" width="${width}" height="150" fill="#f5f5f5"/>
  <text x="40" y="${height - 100}" font-size="12" fill="#999" font-family="Arial">
    © 2026 Your Company. All rights reserved.
  </text>
</svg>`;
}

// ============ THUMBNAIL GENERATOR ============

function generateThumbnail(title, colors, width = 1280, height = 720) {
  const [color1, color2] = colors;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="thumbGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${color1};stop-opacity:1" />
      <stop offset="100%" style="stop-color:${color2};stop-opacity:1" />
    </linearGradient>
  </defs>

  <!-- Background -->
  <rect width="${width}" height="${height}" fill="url(#thumbGrad)"/>

  <!-- Bold title -->
  <text x="${width / 2}" y="${height / 2 + 50}" font-size="96" font-weight="900" text-anchor="middle" fill="white" font-family="Arial" stroke="black" stroke-width="2">
    ${title.substring(0, 8)}
  </text>

  <!-- Subtitle -->
  <text x="${width / 2}" y="${height - 80}" font-size="48" text-anchor="middle" fill="white" font-family="Arial">
    CLICK HERE
  </text>
</svg>`;
}

// ============ DESIGN DESCRIPTION ============

function generateDesignDescription(category, requirements) {
  const descriptions = {
    logo: 'Professional logo design with modern aesthetics and brand identity elements.',
    banner: 'Eye-catching banner design optimized for web and social media platforms.',
    social_media: 'Engaging social media post design tailored for maximum platform engagement.',
    web_design: 'Responsive web design mockup showcasing professional layout and UX.',
    flyer: 'Print-ready flyer design with compelling call-to-action and messaging.',
    print: 'High-quality print design suitable for professional distribution.',
    email: 'Professional email template with branded header and CTA buttons.',
    business_card: 'Clean business card design with contact information and branding.',
    thumbnail: 'Eye-catching video thumbnail design optimized for YouTube and streaming platforms.',
  };

  return descriptions[category] || 'Professional design created based on your specifications.';
}

module.exports = {
  generateDesign,
  generateLogo,
  generateBanner,
  generateWebMockup,
  generateFlyer,
  generateSocialPost,
};
