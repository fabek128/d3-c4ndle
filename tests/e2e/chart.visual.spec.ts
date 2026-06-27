import { test, expect } from '@playwright/test';

test.describe('Chart rendering', () => {
  test('renders SVG chart with candles and volume', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('svg.chart-svg');

    const svg = page.locator('svg.chart-svg');
    await expect(svg).toBeVisible();

    const stems = svg.locator('line.stem');
    const bodies = svg.locator('rect.candle-body');
    const volumeBars = svg.locator('rect.volume-bar');

    expect(await stems.count()).toBeGreaterThan(0);
    expect(await bodies.count()).toBeGreaterThan(0);
    expect(await volumeBars.count()).toBeGreaterThan(0);
  });

  test('crosshair and tooltip appear on mouse move', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('svg.chart-svg');

    // Get SVG bounding box for coordinate calculation
    const svgBox = await page.locator('svg.chart-svg').boundingBox();
    if (!svgBox) throw new Error('SVG bounding box not found');

    const targetX = svgBox.x + svgBox.width / 2;
    const targetY = svgBox.y + svgBox.height / 2;

    // Use real mouse movement instead of dispatchEvent
    await page.mouse.move(targetX, targetY);
    await page.waitForTimeout(500);

    // Check tooltip is visible
    const tooltip = page.locator('.tooltip');
    await expect(tooltip).toBeVisible({ timeout: 3000 });
    const text = await tooltip.textContent();
    expect(text).toContain('Apertura');
    expect(text).toContain('Cierre');
  });

  test('hides crosshair on mouse leave', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('svg.chart-svg');

    // First activate crosshair
    const svgBox = await page.locator('svg.chart-svg').boundingBox();
    if (!svgBox) throw new Error('SVG bounding box not found');

    await page.mouse.move(svgBox.x + svgBox.width / 2, svgBox.y + svgBox.height / 2);
    await page.waitForTimeout(300);

    // Move mouse far away
    await page.mouse.move(0, 0);
    await page.waitForTimeout(300);

    const tooltip = page.locator('.tooltip');
    await expect(tooltip).not.toBeVisible();
  });
});
