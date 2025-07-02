// ***********************************************************
// This example support/e2e.ts is processed and
// loaded automatically before your test files.
//
// This is a great place to put global configuration and
// behavior that modifies Cypress.
// ***********************************************************

import './commands'

// Alternatively you can use CommonJS syntax:
// require('./commands')

// Global configuration
Cypress.config('defaultCommandTimeout', 10000)
Cypress.config('requestTimeout', 10000)

// Prevent Cypress from failing on uncaught exceptions
Cypress.on('uncaught:exception', (err, runnable) => {
  // We expect application to handle Redis connection errors gracefully
  if (err.message.includes('Redis connection') || err.message.includes('ECONNREFUSED')) {
    return false
  }
  // Don't fail on WebSocket connection issues during testing
  if (err.message.includes('WebSocket') || err.message.includes('socket.io')) {
    return false
  }
  // Allow the test to fail for other exceptions
  return true
})