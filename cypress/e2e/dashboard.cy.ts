describe('Options Intelligence Platform - Dashboard Workflow', () => {
  beforeEach(() => {
    cy.visit('/')
  })

  it('should load the main dashboard', () => {
    cy.contains('Options Intelligence Platform').should('be.visible')
    cy.get('[data-testid="dashboard"]').should('be.visible')
  })

  it('should display market data for default instruments', () => {
    cy.waitForMarketData()
    
    // Check for NIFTY data
    cy.get('[data-testid="market-card-NIFTY"]').should('be.visible')
    cy.get('[data-testid="market-card-NIFTY"]').should('contain.text', 'NIFTY')
    cy.get('[data-testid="market-card-NIFTY"]').should('contain.text', '₹')
    
    // Check for BANKNIFTY data
    cy.get('[data-testid="market-card-BANKNIFTY"]').should('be.visible')
    cy.get('[data-testid="market-card-BANKNIFTY"]').should('contain.text', 'BANKNIFTY')
    
    // Check for FINNIFTY data
    cy.get('[data-testid="market-card-FINNIFTY"]').should('be.visible')
    cy.get('[data-testid="market-card-FINNIFTY"]').should('contain.text', 'FINNIFTY')
  })

  it('should load option chain for selected instrument', () => {
    cy.waitForMarketData()
    cy.selectInstrument('NIFTY')
    cy.checkOptionChainLoaded()
    
    // Verify option chain structure
    cy.get('[data-testid="option-chain-header"]').should('contain.text', 'NIFTY')
    cy.get('[data-testid="strike-column"]').should('be.visible')
    cy.get('[data-testid="call-side"]').should('be.visible')
    cy.get('[data-testid="put-side"]').should('be.visible')
  })

  it('should display pattern analysis', () => {
    cy.waitForMarketData()
    cy.selectInstrument('NIFTY')
    
    // Wait for pattern analysis to load
    cy.get('[data-testid="pattern-analysis"]', { timeout: 15000 }).should('be.visible')
    cy.get('[data-testid="pattern-card"]').should('have.length.greaterThan', 0)
    
    // Check pattern details
    cy.get('[data-testid="pattern-card"]').first().within(() => {
      cy.get('[data-testid="pattern-type"]').should('be.visible')
      cy.get('[data-testid="pattern-confidence"]').should('be.visible')
      cy.get('[data-testid="pattern-signal"]').should('be.visible')
    })
  })

  it('should handle instrument switching', () => {
    cy.waitForMarketData()
    
    // Start with NIFTY
    cy.selectInstrument('NIFTY')
    cy.get('[data-testid="selected-instrument"]').should('contain.text', 'NIFTY')
    
    // Switch to BANKNIFTY
    cy.selectInstrument('BANKNIFTY')
    cy.get('[data-testid="selected-instrument"]').should('contain.text', 'BANKNIFTY')
    cy.checkOptionChainLoaded()
    
    // Switch to FINNIFTY
    cy.selectInstrument('FINNIFTY')
    cy.get('[data-testid="selected-instrument"]').should('contain.text', 'FINNIFTY')
    cy.checkOptionChainLoaded()
  })

  it('should display real-time updates', () => {
    cy.waitForMarketData()
    
    // Capture initial price
    cy.get('[data-testid="market-card-NIFTY"]')
      .find('[data-testid="price"]')
      .invoke('text')
      .as('initialPrice')
    
    // Wait for potential update (live data updates every ~5 seconds)
    cy.wait(8000)
    
    // Verify WebSocket connection is active
    cy.get('[data-testid="connection-status"]').should('contain.text', 'Connected')
  })

  it('should show market type selection', () => {
    cy.get('[data-testid="market-type-selector"]').should('be.visible')
    cy.get('[data-testid="market-type-equity"]').should('be.visible')
    cy.get('[data-testid="market-type-commodity"]').should('be.visible')
    
    // Test commodity market selection
    cy.get('[data-testid="market-type-commodity"]').click()
    cy.get('[data-testid="commodity-instruments"]').should('be.visible')
  })

  it('should handle errors gracefully', () => {
    // Test with invalid instrument
    cy.visit('/#/invalid-instrument')
    cy.get('[data-testid="error-message"]').should('be.visible')
    cy.get('[data-testid="back-to-dashboard"]').click()
    cy.url().should('eq', Cypress.config().baseUrl + '/')
  })
})

describe('Options Intelligence Platform - Alert System', () => {
  beforeEach(() => {
    cy.visit('/')
    cy.waitForMarketData()
  })

  it('should create price alerts', () => {
    cy.setupAlert('NIFTY', 'PRICE_ABOVE', 25000)
    cy.get('[data-testid="alerts-list"]').should('contain.text', 'NIFTY')
    cy.get('[data-testid="alerts-list"]').should('contain.text', '25000')
  })

  it('should create OI change alerts', () => {
    cy.setupAlert('BANKNIFTY', 'OI_CHANGE', 10000)
    cy.get('[data-testid="alerts-list"]').should('contain.text', 'BANKNIFTY')
    cy.get('[data-testid="alerts-list"]').should('contain.text', 'OI_CHANGE')
  })

  it('should display alert notifications', () => {
    cy.get('[data-testid="notification-center"]').should('be.visible')
    cy.get('[data-testid="notification-bell"]').click()
    cy.get('[data-testid="notification-panel"]').should('be.visible')
  })
})

describe('Options Intelligence Platform - Performance', () => {
  it('should load within acceptable time', () => {
    const startTime = Date.now()
    
    cy.visit('/')
    cy.waitForMarketData()
    
    cy.then(() => {
      const loadTime = Date.now() - startTime
      expect(loadTime).to.be.lessThan(10000) // 10 seconds max
    })
  })

  it('should handle concurrent operations', () => {
    cy.visit('/')
    cy.waitForMarketData()
    
    // Perform multiple operations simultaneously
    cy.selectInstrument('NIFTY')
    cy.get('[data-testid="pattern-analysis"]').should('be.visible')
    cy.get('[data-testid="alerts-button"]').click()
    cy.get('[data-testid="market-type-commodity"]').click()
    
    // All operations should complete successfully
    cy.get('[data-testid="option-chain-table"]').should('be.visible')
    cy.get('[data-testid="alerts-panel"]').should('be.visible')
    cy.get('[data-testid="commodity-instruments"]').should('be.visible')
  })

  it('should maintain responsiveness during real-time updates', () => {
    cy.visit('/')
    cy.waitForMarketData()
    
    // Start monitoring performance
    cy.window().then((win) => {
      const startTime = win.performance.now()
      
      // Perform actions during real-time updates
      cy.selectInstrument('NIFTY')
      cy.checkOptionChainLoaded()
      cy.selectInstrument('BANKNIFTY')
      cy.checkOptionChainLoaded()
      
      cy.window().then((win) => {
        const endTime = win.performance.now()
        const duration = endTime - startTime
        expect(duration).to.be.lessThan(5000) // 5 seconds max for operations
      })
    })
  })
})