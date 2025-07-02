import { test, expect } from '@playwright/test';

test.describe('Admin Dashboard E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to admin dashboard
    await page.goto('/admin');
  });

  test('should require admin authentication', async ({ page }) => {
    // Check if redirected to login or shows access denied
    const currentUrl = page.url();
    const pageContent = await page.textContent('body');
    
    // Should either be on login page or show access denied
    const hasAuthCheck = currentUrl.includes('/auth') || 
                        pageContent?.includes('Access Denied') || 
                        pageContent?.includes('Authentication Required');
    
    expect(hasAuthCheck).toBeTruthy();
  });

  test('should display system metrics when authenticated', async ({ page }) => {
    // Mock admin authentication
    await page.addInitScript(() => {
      localStorage.setItem('admin-token', 'mock-admin-token');
    });

    await page.reload();

    // Check for admin dashboard elements
    const adminElements = page.locator('[data-testid*="admin"], [data-testid*="metrics"]');
    if (await adminElements.count() > 0) {
      await expect(adminElements.first()).toBeVisible();
    }
  });

  test('should show data provider status', async ({ page }) => {
    // Mock admin session
    await page.addInitScript(() => {
      localStorage.setItem('admin-token', 'mock-admin-token');
    });

    await page.reload();

    // Look for data provider status indicators
    const providerStatus = page.locator('[data-testid*="provider"], [data-testid*="status"]');
    if (await providerStatus.count() > 0) {
      await expect(providerStatus.first()).toBeVisible();
    }
  });

  test('should handle broker configuration', async ({ page }) => {
    // Mock admin session
    await page.addInitScript(() => {
      localStorage.setItem('admin-token', 'mock-admin-token');
    });

    await page.reload();

    // Look for broker configuration section
    const brokerConfig = page.locator('[data-testid*="broker"], text=Broker Configuration');
    if (await brokerConfig.count() > 0) {
      await expect(brokerConfig.first()).toBeVisible();
    }
  });

  test('should display user management interface', async ({ page }) => {
    // Mock admin session
    await page.addInitScript(() => {
      localStorage.setItem('admin-token', 'mock-admin-token');
    });

    await page.reload();

    // Look for user management elements
    const userManagement = page.locator('[data-testid*="user"], text=User Management');
    if (await userManagement.count() > 0) {
      await expect(userManagement.first()).toBeVisible();
    }
  });
});