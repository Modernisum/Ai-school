const http = require('http');
const https = require('https');

const baseUrl = 'http://localhost:8080';

function testEndpoint(endpoint) {
  return new Promise((resolve, reject) => {
    const url = `${baseUrl}${endpoint}`;
    const req = http.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const jsonData = data ? JSON.parse(data) : data;
          resolve({
            endpoint,
            status: res.statusCode,
            success: res.statusCode >= 200 && res.statusCode < 300,
            data: jsonData,
            headers: res.headers
          });
        } catch (e) {
          resolve({
            endpoint,
            status: res.statusCode,
            success: res.statusCode >= 200 && res.statusCode < 300,
            data: data,
            error: e.message
          });
        }
      });
    });

    req.on('error', (err) => {
      reject({
        endpoint,
        error: err.message
      });
    });

    req.setTimeout(5000, () => {
      req.destroy();
      reject({
        endpoint,
        error: 'Timeout after 5 seconds'
      });
    });
  });
}

async function runHealthTests() {
  console.log('=== Running Unified Health Check API Tests ===');
  console.log(`Base URL: ${baseUrl}\n`);

  const results = [];
  
  // Test the unified health endpoint
  try {
    console.log('Testing /health (unified)...');
    const result = await testEndpoint('/health');
    results.push(result);
    
    if (result.success) {
      console.log(`  ✅ /health: HTTP ${result.status}`);
      if (result.data && typeof result.data === 'object') {
        // Validate unified response structure
        const required = ['status', 'timestamp', 'version', 'service', 'uptime_seconds', 'uptime_human', 'dependencies', 'metrics', 'alerts'];
        const missing = required.filter(k => !(k in result.data));
        if (missing.length > 0) {
          console.log(`  ⚠️  Missing fields: ${missing.join(', ')}`);
        } else {
          console.log(`  ✅ All required fields present`);
        }
        
        // Validate dependencies structure
        if (result.data.dependencies) {
          const deps = result.data.dependencies;
          for (const [name, dep] of Object.entries(deps)) {
            const depRequired = ['status', 'latency_ms', 'detail'];
            const depMissing = depRequired.filter(k => !(k in dep));
            if (depMissing.length > 0) {
              console.log(`  ⚠️  Dependency "${name}" missing: ${depMissing.join(', ')}`);
            } else {
              console.log(`  ✅ ${name}: ${dep.status} (${dep.latency_ms}ms)`);
            }
          }
        }
        
        // Validate metrics structure
        if (result.data.metrics) {
          const m = result.data.metrics;
          console.log(`  ✅ DB Pool: ${m.db_pool_active}/${m.db_pool_size} active, Memory: ${m.memory_usage_human}, Check: ${m.total_check_duration_ms}ms`);
        }
        
        // Show alerts if any
        if (result.data.alerts && result.data.alerts.length > 0) {
          console.log(`  ⚠️  Active alerts: ${result.data.alerts.length}`);
          result.data.alerts.forEach(a => {
            console.log(`     - [${a.severity}] ${a.dependency}: ${a.message}`);
          });
        }
      }
    } else {
      console.log(`  ❌ /health: HTTP ${result.status}`);
      if (result.data && result.data.alerts) {
        console.log(`  Alerts: ${result.data.alerts.map(a => a.message).join(', ')}`);
      }
    }
  } catch (error) {
    console.log(`  ❌ /health: ERROR - ${error.error}`);
    results.push({
      endpoint: '/health',
      error: error.error,
      success: false
    });
  }

  // Verify old endpoints are removed
  const removedEndpoints = ['/health/detailed', '/health/ready', '/health/alive'];
  for (const endpoint of removedEndpoints) {
    try {
      console.log(`\nVerifying ${endpoint} is removed...`);
      const result = await testEndpoint(endpoint);
      if (result.status === 404) {
        console.log(`  ✅ ${endpoint}: Correctly returns 404 (removed)`);
        results.push({ endpoint, success: true, status: result.status });
      } else {
        console.log(`  ❌ ${endpoint}: Still returns HTTP ${result.status} (should be 404)`);
        results.push({ endpoint, success: false, status: result.status });
      }
    } catch (error) {
      console.log(`  ✅ ${endpoint}: Not reachable (correctly removed)`);
      results.push({ endpoint, success: true });
    }
  }

  // Summary
  console.log('\n=== Test Summary ===');
  const passed = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  
  console.log(`Total tests: ${results.length}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  
  if (failed > 0) {
    console.log('\nFailed tests:');
    results.filter(r => !r.success).forEach(r => {
      console.log(`  - ${r.endpoint}: ${r.error || `HTTP ${r.status}`}`);
    });
  }
  
  return results;
}

// Run tests
runHealthTests().then(results => {
  const allPassed = results.every(r => r.success);
  process.exit(allPassed ? 0 : 1);
}).catch(err => {
  console.error('Test runner error:', err);
  process.exit(1);
});
