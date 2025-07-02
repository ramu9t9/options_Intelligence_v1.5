#!/usr/bin/env tsx

import { execSync } from 'child_process';
import { writeFileSync } from 'fs';

interface TestResult {
  suite: string;
  passed: number;
  failed: number;
  duration: number;
  coverage?: {
    lines: number;
    branches: number;
    functions: number;
    statements: number;
  };
}

interface TestSummary {
  totalTests: number;
  totalPassed: number;
  totalFailed: number;
  totalDuration: number;
  results: TestResult[];
  timestamp: string;
}

class ComprehensiveTestRunner {
  private results: TestResult[] = [];

  constructor() {
    console.log('🧪 Starting Comprehensive Test Suite for Options Intelligence Platform');
    console.log('=' .repeat(80));
  }

  private log(message: string, color: 'green' | 'red' | 'yellow' | 'blue' = 'blue') {
    const colors = {
      green: '\x1b[32m',
      red: '\x1b[31m',
      yellow: '\x1b[33m',
      blue: '\x1b[34m',
      reset: '\x1b[0m'
    };
    console.log(`${colors[color]}${message}${colors.reset}`);
  }

  private async runTestSuite(name: string, command: string): Promise<TestResult> {
    this.log(`\n📋 Running ${name}...`, 'blue');
    const startTime = Date.now();

    try {
      const output = execSync(command, { 
        encoding: 'utf-8',
        stdio: 'pipe',
        maxBuffer: 1024 * 1024 * 10 // 10MB buffer
      });

      const duration = Date.now() - startTime;
      
      // Parse test results from output
      const passed = (output.match(/✓|passed/gi) || []).length;
      const failed = (output.match(/✗|failed|error/gi) || []).length;

      // Extract coverage if available
      let coverage;
      const coverageMatch = output.match(/Lines\s*:\s*([\d.]+)%.*Branches\s*:\s*([\d.]+)%.*Functions\s*:\s*([\d.]+)%.*Statements\s*:\s*([\d.]+)%/s);
      if (coverageMatch) {
        coverage = {
          lines: parseFloat(coverageMatch[1]),
          branches: parseFloat(coverageMatch[2]),
          functions: parseFloat(coverageMatch[3]),
          statements: parseFloat(coverageMatch[4])
        };
      }

      const result: TestResult = {
        suite: name,
        passed: passed || 1, // Default to 1 if no specific count found
        failed: failed || 0,
        duration,
        coverage
      };

      this.log(`✅ ${name} completed: ${result.passed} passed, ${result.failed} failed (${duration}ms)`, 'green');
      return result;

    } catch (error: any) {
      const duration = Date.now() - startTime;
      const result: TestResult = {
        suite: name,
        passed: 0,
        failed: 1,
        duration
      };

      this.log(`❌ ${name} failed: ${error.message}`, 'red');
      return result;
    }
  }

  async runAllTests(): Promise<void> {
    const testSuites = [
      {
        name: 'Unit Tests (Vitest)',
        command: 'npx vitest run --reporter=verbose'
      },
      {
        name: 'API Integration Tests',
        command: 'npx vitest run tests/api/ --reporter=verbose'
      },
      {
        name: 'UI Component Tests',
        command: 'npx vitest run tests/ui/ --reporter=verbose'
      },
      {
        name: 'Integration Flow Tests',
        command: 'npx vitest run tests/integration/ --reporter=verbose'
      },
      {
        name: 'E2E Tests (Playwright)',
        command: 'npx playwright test --reporter=list'
      }
    ];

    // Run test suites sequentially
    for (const suite of testSuites) {
      const result = await this.runTestSuite(suite.name, suite.command);
      this.results.push(result);
    }

    // Run coverage report
    await this.generateCoverageReport();
    
    // Generate summary
    this.generateSummary();
  }

  private async generateCoverageReport(): Promise<void> {
    this.log('\n📊 Generating Coverage Report...', 'blue');
    
    try {
      execSync('npx vitest run --coverage', { 
        encoding: 'utf-8',
        stdio: 'inherit'
      });
      this.log('✅ Coverage report generated', 'green');
    } catch (error) {
      this.log('⚠️ Coverage report generation failed', 'yellow');
    }
  }

  private generateSummary(): void {
    const totalPassed = this.results.reduce((sum, result) => sum + result.passed, 0);
    const totalFailed = this.results.reduce((sum, result) => sum + result.failed, 0);
    const totalDuration = this.results.reduce((sum, result) => sum + result.duration, 0);

    const summary: TestSummary = {
      totalTests: totalPassed + totalFailed,
      totalPassed,
      totalFailed,
      totalDuration,
      results: this.results,
      timestamp: new Date().toISOString()
    };

    // Console summary
    this.log('\n' + '='.repeat(80), 'blue');
    this.log('📋 TEST SUMMARY', 'blue');
    this.log('='.repeat(80), 'blue');
    
    this.results.forEach(result => {
      const status = result.failed === 0 ? '✅' : '❌';
      const coverage = result.coverage 
        ? ` (Coverage: ${result.coverage.lines}% lines, ${result.coverage.statements}% statements)`
        : '';
      
      console.log(`${status} ${result.suite}: ${result.passed} passed, ${result.failed} failed${coverage}`);
    });

    console.log('\n📊 OVERALL RESULTS:');
    console.log(`Total Tests: ${summary.totalTests}`);
    this.log(`Passed: ${summary.totalPassed}`, summary.totalPassed > 0 ? 'green' : 'red');
    this.log(`Failed: ${summary.totalFailed}`, summary.totalFailed === 0 ? 'green' : 'red');
    console.log(`Duration: ${(summary.totalDuration / 1000).toFixed(2)}s`);

    // Success rate
    const successRate = summary.totalTests > 0 ? (summary.totalPassed / summary.totalTests * 100).toFixed(1) : '0';
    this.log(`Success Rate: ${successRate}%`, parseFloat(successRate) >= 80 ? 'green' : 'red');

    // Save detailed results to file
    writeFileSync('test-results/test-summary.json', JSON.stringify(summary, null, 2));
    this.log('\n💾 Detailed results saved to test-results/test-summary.json', 'blue');

    // Exit with appropriate code
    if (summary.totalFailed > 0) {
      this.log('\n❌ Some tests failed', 'red');
      process.exit(1);
    } else {
      this.log('\n✅ All tests passed!', 'green');
      process.exit(0);
    }
  }

  async validateEndpoints(): Promise<void> {
    this.log('\n🔍 Validating API Endpoints...', 'blue');
    
    const criticalEndpoints = [
      { url: 'http://localhost:5000/api/database/status', name: 'Database Status' },
      { url: 'http://localhost:5000/api/market-data/NIFTY', name: 'Market Data' },
      { url: 'http://localhost:5000/api/admin/health', name: 'Admin Health' },
      { url: 'http://localhost:5000/api/auth/verify', name: 'Auth Verify' }
    ];

    for (const endpoint of criticalEndpoints) {
      try {
        const response = await fetch(endpoint.url);
        const status = response.status;
        
        if ([200, 304, 401].includes(status)) {
          this.log(`✅ ${endpoint.name}: ${status}`, 'green');
        } else {
          this.log(`⚠️ ${endpoint.name}: ${status}`, 'yellow');
        }
      } catch (error) {
        this.log(`❌ ${endpoint.name}: Connection failed`, 'red');
      }
    }
  }
}

// Main execution
async function main() {
  const runner = new ComprehensiveTestRunner();
  
  try {
    // Validate server is running
    await runner.validateEndpoints();
    
    // Run all test suites
    await runner.runAllTests();
    
  } catch (error: any) {
    console.error('❌ Test runner failed:', error.message);
    process.exit(1);
  }
}

// Handle process termination gracefully
process.on('SIGINT', () => {
  console.log('\n⏹️ Test runner interrupted');
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught exception:', error);
  process.exit(1);
});

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export default ComprehensiveTestRunner;