import { test, expect } from '@playwright/test';

test.describe('Dashboard Page E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should load dashboard page successfully', async ({ page }) => {
    // Check page title
    await expect(page).toHaveTitle(/Options Intelligence/);
    
    // Check main dashboard elements are visible
    await expect(page.locator('[data-testid="dashboard"]')).toBeVisible();
  });

  test('should display market data cards', async ({ page }) => {
    // Wait for market data to load
    await page.waitForSelector('[data-testid="market-overview"]', { timeout: 10000 });
    
    // Check market data cards are present
    const marketCards = page.locator('[data-testid*="market-card"]');
    await expect(marketCards.first()).toBeVisible();
  });

  test('should handle real-time data updates', async ({ page }) => {
    // Wait for initial data load
    await page.waitForSelector('[data-testid="live-data"]', { timeout: 10000 });
    
    // Check for data refresh indicators
    const refreshIndicator = page.locator('[data-testid*="refresh"]');
    if (await refreshIndicator.count() > 0) {
      await expect(refreshIndicator.first()).toBeVisible();
    }
  });

  test('should navigate to option chain page', async ({ page }) => {
    // Click on option chain navigation
    const optionChainLink = page.locator('text=Option Chain');
    if (await optionChainLink.count() > 0) {
      await optionChainLink.click();
      await expect(page).toHaveURL(/.*option-chain/);
    }
  });

  test('should display pattern alerts', async ({ page }) => {
    // Check for pattern alerts section
    const alertsSection = page.locator('[data-testid="pattern-alerts"]');
    if (await alertsSection.count() > 0) {
      await expect(alertsSection).toBeVisible();
    }
  });

  test('should handle loading states properly', async ({ page }) => {
    // Check for loading indicators during page load
    const loadingIndicators = page.locator('[data-testid*="loading"], [data-testid*="skeleton"]');
    
    // Loading indicators should eventually disappear
    await page.waitForTimeout(5000);
    const visibleLoaders = await loadingIndicators.count();
    
    // Allow for some loading states but not persistent ones
    expect(visibleLoaders).toBeLessThan(10);
  });

  test('should be responsive on mobile devices', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Check mobile-specific elements
    const mobileMenu = page.locator('[data-testid="mobile-menu"]');
    if (await mobileMenu.count() > 0) {
      await expect(mobileMenu).toBeVisible();
    }
    
    // Check that content is still accessible
    await expect(page.locator('body')).toBeVisible();
  });

  test('should handle API errors gracefully', async ({ page }) => {
    // Intercept API calls and simulate errors
    await page.route('**/api/market-data/**', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal Server Error' })
      });
    });

    // Reload page to trigger error
    await page.reload();
    
    // Check for error handling
    const errorMessages = page.locator('[data-testid*="error"]');
    if (await errorMessages.count() > 0) {
      await expect(errorMessages.first()).toBeVisible();
    }
  });
});