/**
 * Author: DeepSeek V3.1, updated from Claude Code using Sonnet 4
 * Date: 2025-09-28 12:07:50
 * PURPOSE: Client-side dynamic favicon generator that creates a unique 2x2 grid
 * of wildly colored shapes with varied silhouettes, bringing neo-aesthetic vibrance.
 * Each session loads a fully randomized visual signature in the browser.
 * SRP/DRY check: Pass — single responsibility for generating flamboyant dynamic favicons.
 * shadcn/ui: Pass — no UI dependencies, pure canvas action.
 */

type ShapeType = 'circle' | 'hexagon' | 'triangle' | 'star' | 'heart' | 'spiral' | 'gear' | 'kaleidoscope' | 'burst';

/**
 * Generate a bright, high-saturation hex color with HUE shifts
 */
function getRandomColor(): string {
  const hue = Math.floor(Math.random() * 360);
  const saturation = 95 + Math.floor(Math.random() * 5); // 95–100%
  const lightness = 45 + Math.floor(Math.random() * 15); // 45–60%
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

/**
 * Get a wild and varied shape type
 */
function getRandomShape(): ShapeType {
  const shapes: ShapeType[] = [
    'circle', 'hexagon', 'triangle', 
    'star', 'heart', 'spiral', 
    'gear', 'kaleidoscope', 'burst'
  ];
  return shapes[Math.floor(Math.random() * shapes.length)];
}

/**
 * Draw a circle mask — crisp and pixel-perfect
 */
function drawCircleMask(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = Math.min(width, height) / 2 - 1;

  ctx.globalCompositeOperation = 'destination-in';
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
  ctx.fill();
}

/**
 * Draw a hexagon mask — geometric and sharp
 */
function drawHexagonMask(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = Math.min(width, height) / 2 - 1;

  ctx.globalCompositeOperation = 'destination-in';
  ctx.beginPath();

  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i;
    const x = centerX + radius * Math.cos(angle);
    const y = centerY + radius * Math.sin(angle);

    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }

  ctx.closePath();
  ctx.fill();
}

/**
 * Draw a triangle mask — dynamic and pointed
 */
function drawTriangleMask(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = Math.min(width, height) / 2 - 1;

  ctx.globalCompositeOperation = 'destination-in';
  ctx.beginPath();

  const angle1 = -Math.PI / 2;
  const angle2 = angle1 + (2 * Math.PI) / 3;
  const angle3 = angle2 + (2 * Math.PI) / 3;

  const x1 = centerX + radius * Math.cos(angle1);
  const y1 = centerY + radius * Math.sin(angle1);
  const x2 = centerX + radius * Math.cos(angle2);
  const y2 = centerY + radius * Math.sin(angle2);
  const x3 = centerX + radius * Math.cos(angle3);
  const y3 = centerY + radius * Math.sin(angle3);

  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.lineTo(x3, y3);
  ctx.closePath();
  ctx.fill();
}

/**
 * Draw a 5-point star mask — iconic and energetic
 */
function drawStarMask(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  const centerX = width / 2;
  const centerY = height / 2;
  const outerRadius = Math.min(width, height) / 2 - 1;
  const innerRadius = outerRadius * 0.4;

  ctx.globalCompositeOperation = 'destination-in';
  ctx.beginPath();

  for (let i = 0; i < 10; i++) {
    const angle = (Math.PI / 5) * i;
    const radius = i % 2 === 0 ? outerRadius : innerRadius;
    const x = centerX + radius * Math.cos(angle);
    const y = centerY + radius * Math.sin(angle);

    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }

  ctx.closePath();
  ctx.fill();
}

/**
 * Draw a heart mask — playful and bold
 */
function drawHeartMask(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  const centerX = width / 2;
  const centerY = height / 2;
  const size = Math.min(width, height) / 2 - 1;

  ctx.globalCompositeOperation = 'destination-in';
  ctx.beginPath();

  // Draw using two Bézier curves
  ctx.moveTo(centerX, centerY + size / 2);
  ctx.bezierCurveTo(
    centerX - size, centerY - size,
    centerX - size, centerY - size / 2,
    centerX, centerY - size
  );
  ctx.bezierCurveTo(
    centerX + size, centerY - size / 2,
    centerX + size, centerY - size,
    centerX, centerY + size / 2
  );

  ctx.closePath();
  ctx.fill();
}

/**
 * Draw a spiral mask — hypnotic and neo-futuristic
 */
function drawSpiralMask(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  const centerX = width / 2;
  const centerY = height / 2;
  const maxRadius = Math.min(width, height) / 2 - 1;

  ctx.globalCompositeOperation = 'destination-in';
  ctx.beginPath();
  ctx.moveTo(centerX, centerY);

  let radius = 1;
  for (let theta = 0; radius <= maxRadius; theta += 0.1) {
    radius += 0.3;
    const x = centerX + radius * Math.cos(theta);
    const y = centerY + radius * Math.sin(theta);
    ctx.lineTo(x, y);
  }

  ctx.fill();
}

/**
 * Draw a gear mask — mechanical and intricate
 */
function drawGearMask(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  const centerX = width / 2;
  const centerY = height / 2;
  const outerRadius = Math.min(width, height) / 2 - 1;
  const innerRadius = outerRadius * 0.6;
  const toothLength = outerRadius * 0.15;

  ctx.globalCompositeOperation = 'destination-in';
  ctx.beginPath();

  for (let i = 0; i < 12; i++) {
    const angle1 = (Math.PI / 6) * i;
    const angle2 = angle1 + Math.PI / 12;

    const outerX1 = centerX + outerRadius * Math.cos(angle1);
    const outerY1 = centerY + outerRadius * Math.sin(angle1);
    const toothX = centerX + (outerRadius + toothLength) * Math.cos(angle2);
    const toothY = centerY + (outerRadius + toothLength) * Math.sin(angle2);
    const outerX2 = centerX + outerRadius * Math.cos(angle1 + Math.PI / 6);
    const outerY2 = centerY + outerRadius * Math.sin(angle1 + Math.PI / 6);

    if (i === 0) ctx.moveTo(outerX1, outerY1);
    else ctx.lineTo(outerX1, outerY1);

    ctx.lineTo(toothX, toothY);
    ctx.lineTo(outerX2, outerY2);
  }

  ctx.closePath();
  ctx.fill();
}

/**
 * Draw a kaleidoscope mask — fractal and visually intense
 */
function drawKaleidoscopeMask(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = Math.min(width, height) / 2 - 1;

  ctx.globalCompositeOperation = 'destination-in';
  ctx.beginPath();

  // Layered petal-like structure
  for (let i = 0; i < 8; i++) {
    const angle = (Math.PI / 4) * i;
    const x1 = centerX + radius * Math.cos(angle);
    const y1 = centerY + radius * Math.sin(angle);
    const x2 = centerX + radius * 0.4 * Math.cos(angle + Math.PI / 8);
    const y2 = centerY + radius * 0.4 * Math.sin(angle + Math.PI / 8);

    if (i === 0) ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.lineTo(x1, y1);
  }

  ctx.closePath();
  ctx.fill();
}

/**
 * Draw a burst mask — explosive and high-energy
 */
function drawBurstMask(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = Math.min(width, height) / 2 - 1;

  ctx.globalCompositeOperation = 'destination-in';
  ctx.beginPath();

  // Burst with jagged rays
  for (let i = 0; i < 16; i++) {
    const angle = (Math.PI / 8) * i;
    const rayLength = radius * (0.7 + Math.random() * 0.3);

    const x = centerX + rayLength * Math.cos(angle);
    const y = centerY + rayLength * Math.sin(angle);

    if (i === 0) ctx.moveTo(centerX, centerY);
    ctx.lineTo(x, y);
    ctx.lineTo(centerX, centerY);
  }

  ctx.closePath();
  ctx.fill();
}

/**
 * Apply the chosen wild shape mask
 */
function applyShapeMask(ctx: CanvasRenderingContext2D, shape: ShapeType, width: number, height: number): void {
  switch (shape) {
    case 'circle':
      drawCircleMask(ctx, width, height);
      break;
    case 'hexagon':
      drawHexagonMask(ctx, width, height);
      break;
    case 'triangle':
      drawTriangleMask(ctx, width, height);
      break;
    case 'star':
      drawStarMask(ctx, width, height);
      break;
    case 'heart':
      drawHeartMask(ctx, width, height);
      break;
    case 'spiral':
      drawSpiralMask(ctx, width, height);
      break;
    case 'gear':
      drawGearMask(ctx, width, height);
      break;
    case 'kaleidoscope':
      drawKaleidoscopeMask(ctx, width, height);
      break;
    case 'burst':
      drawBurstMask(ctx, width, height);
      break;
  }
}

/**
 * Generate a neo-aesthetic favicon: 2x2 high-contrast grid in a wild random shape
 */
export function generateDynamicFavicon(): string {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) throw new Error('Failed to initialize canvas context');

  canvas.width = 48; // Slightly larger for crisper shapes
  canvas.height = 48;
  const GRID_SIZE = 2;
  const squareSize = canvas.width / GRID_SIZE;
  const shape = getRandomShape();

  // Pure black background for maximum contrast - slightly larger than canvas
  ctx.fillStyle = '#000000';
  const padding = 2; // Extra pixels to ensure full coverage
  ctx.fillRect(-padding, -padding, canvas.width + padding * 2, canvas.height + padding * 2);

  // Draw the 2x2 grid with electric colors
  for (let row = 0; row < GRID_SIZE; row++) {
    for (let col = 0; col < GRID_SIZE; col++) {
      ctx.fillStyle = getRandomColor();
      ctx.fillRect(
        col * squareSize,
        row * squareSize,
        squareSize,
        squareSize
      );
    }
  }

  applyShapeMask(ctx, shape, canvas.width, canvas.height);
  return canvas.toDataURL('image/png');
}

/**
 * Update the favicon link in the DOM with new wild graphic
 */
export function updateFaviconInDOM(faviconDataUrl: string): void {
  let faviconLink = document.querySelector('link[rel="icon"]') as HTMLLinkElement;

  if (!faviconLink) {
    faviconLink = document.createElement('link');
    faviconLink.rel = 'icon';
    faviconLink.type = 'image/png';
    document.head.appendChild(faviconLink);
  }

  faviconLink.href = faviconDataUrl;

  const shortcutLink = document.querySelector('link[rel="shortcut icon"]') as HTMLLinkElement;
  if (shortcutLink) {
    shortcutLink.href = faviconDataUrl;
  }
}

/**
 * One-shot: generate and apply a neo-vibrant favicon
 */
export function applyDynamicFavicon(): void {
  try {
    const faviconDataUrl = generateDynamicFavicon();
    updateFaviconInDOM(faviconDataUrl);
    console.log('🎨 NEON-INFUSED dynamic favicon applied with 2x2 chaos grid!');
  } catch (error) {
    console.error('Failed to generate neo-aesthetic favicon:', error);
  }
}