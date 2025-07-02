/// <reference types="cypress" />

// Custom commands for Options Intelligence Platform testing

declare global {
  namespace Cypress {
    interface Chainable {
      loginAsTestUser(): Chainable<void>
      waitForMarketData(): Chainable<void>
      selectInstrument(symbol: string): Chainable<void>
      checkOptionChainLoaded(): Chainable<void>
      setupAlert(symbol: string, alertType: string, value: number): Chainable<void>
    }
  }
}

Cypress.Commands.add('loginAsTestUser', () => {
  // For now, the platform doesn't require login but we'll check for landing page
  cy.visit('/')
  cy.contains('Options Intelligence Platform').should('be.visible')
})

Cypress.Commands.add('waitForMarketData', () => {
  // Wait for real-time market data to load
  cy.get('[data-testid="market-data"]', { timeout: 15000 }).should('be.visible')
  cy.get('[data-testid="market-data"]').should('contain.text', '₹')
})

Cypress.Commands.add('selectInstrument', (symbol: string) => {
  cy.get('[data-testid="instrument-selector"]').click()
  cy.get(`[data-testid="instrument-${symbol}"]`).click()
  cy.get('[data-testid="selected-instrument"]').should('contain.text', symbol)
})

Cypress.Commands.add('checkOptionChainLoaded', () => {
  // Verify option chain table is loaded with data
  cy.get('[data-testid="option-chain-table"]', { timeout: 10000 }).should('be.visible')
  cy.get('[data-testid="option-chain-row"]').should('have.length.greaterThan', 0)
  cy.get('[data-testid="call-oi"]').should('be.visible')
  cy.get('[data-testid="put-oi"]').should('be.visible')
})

Cypress.Commands.add('setupAlert', (symbol: string, alertType: string, value: number) => {
  cy.get('[data-testid="alerts-button"]').click()
  cy.get('[data-testid="create-alert-button"]').click()
  cy.get('[data-testid="alert-symbol"]').select(symbol)
  cy.get('[data-testid="alert-type"]').select(alertType)
  cy.get('[data-testid="alert-value"]').type(value.toString())
  cy.get('[data-testid="save-alert-button"]').click()
  cy.get('[data-testid="alert-success"]').should('be.visible')
})