/**
 * Author: Claude Code using Sonnet 4
 * Date: 2025-09-27
 * PURPOSE: Client-side dynamic favicon generator that creates a unique 2x2 grid
 * of random colors in a random shape (circle, hexagon, triangle) for each user session.
 * This runs in the browser on every page load, giving each tab a unique visual identity.
 * SRP/DRY check: Pass - Single responsibility of generating and applying dynamic favicons
 * shadcn/ui: Pass - This is a utility function, UI components not applicable
 */

type ShapeType = 'circle' | 'hexagon' | 'triangle';

/**
 * Generate a random hex color
 */
function getRandomColor(): string {
  return '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
}

/**
 * Get a random shape type
 */
function getRandomShape(): ShapeType {
  const shapes: ShapeType[] = ['circle', 'hexagon', 'triangle'];
  return shapes[Math.floor(Math.random() * shapes.length)];
}

/**
 * Draw a circle mask on the canvas context
 */
function drawCircleMask(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = Math.min(width, height) / 2 - 2; // 2px margin

  ctx.globalCompositeOperation = 'destination-in';
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
  ctx.fill();
}

/**
 * Draw a hexagon mask on the canvas context
 */
function drawHexagonMask(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = Math.min(width, height) / 2 - 2; // 2px margin

  ctx.globalCompositeOperation = 'destination-in';
  ctx.beginPath();

  // Create hexagon path
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i;
    const x = centerX + radius * Math.cos(angle);
    const y = centerY + radius * Math.sin(angle);

    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  }

  ctx.closePath();
  ctx.fill();
}

/**
 * Draw a triangle mask on the canvas context
 */
function drawTriangleMask(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = Math.min(width, height) / 2 - 2; // 2px margin

  ctx.globalCompositeOperation = 'destination-in';
  ctx.beginPath();

  // Create equilateral triangle path (pointing up)
  const angle1 = -Math.PI / 2; // Top point
  const angle2 = angle1 + (2 * Math.PI) / 3; // Bottom right
  const angle3 = angle2 + (2 * Math.PI) / 3; // Bottom left

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
 * Apply the selected shape mask to the canvas
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
  }
}

/**
 * Generate a dynamic favicon with 2x2 random colored grid in a random shape
 * @returns Data URL string for the generated favicon
 */
export function generateDynamicFavicon(): string {
  // Create canvas
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Could not get canvas context for favicon generation');
  }

  // Set canvas size
  canvas.width = 32;
  canvas.height = 32;

  // Configuration
  const GRID_SIZE = 2; // 2x2 grid as requested
  const squareSize = canvas.width / GRID_SIZE;
  const shape = getRandomShape();

  // Draw white background
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Draw 2x2 grid of colored squares
  for (let row = 0; row < GRID_SIZE; row++) {
    for (let col = 0; col < GRID_SIZE; col++) {
      const color = getRandomColor();
      ctx.fillStyle = color;
      ctx.fillRect(
        col * squareSize,
        row * squareSize,
        squareSize,
        squareSize
      );
    }
  }

  // Apply random shape mask
  applyShapeMask(ctx, shape, canvas.width, canvas.height);

  // Convert to data URL
  return canvas.toDataURL('image/png');
}

/**
 * Update the favicon in the DOM with the generated data URL
 * @param faviconDataUrl Data URL of the generated favicon
 */
export function updateFaviconInDOM(faviconDataUrl: string): void {
  // Find existing favicon link or create new one
  let faviconLink = document.querySelector('link[rel="icon"]') as HTMLLinkElement;

  if (!faviconLink) {
    faviconLink = document.createElement('link');
    faviconLink.rel = 'icon';
    faviconLink.type = 'image/png';
    document.head.appendChild(faviconLink);
  }

  // Update the href to the new favicon
  faviconLink.href = faviconDataUrl;

  // Also update shortcut icon if it exists
  const shortcutLink = document.querySelector('link[rel="shortcut icon"]') as HTMLLinkElement;
  if (shortcutLink) {
    shortcutLink.href = faviconDataUrl;
  }
}

/**
 * Generate and apply a dynamic favicon to the current page
 * This function combines generation and DOM update for convenience
 */
export function applyDynamicFavicon(): void {
  try {
    const faviconDataUrl = generateDynamicFavicon();
    updateFaviconInDOM(faviconDataUrl);
    console.log('✨ Dynamic favicon applied with unique 2x2 grid pattern');
  } catch (error) {
    console.error('Failed to generate dynamic favicon:', error);
  }
}