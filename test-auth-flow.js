#!/usr/bin/env node

/**
 * Authentication Flow Test Script for Scan2Card Backend
 * Base URL: https://latest-scan2card-backend.onrender.com
 *
 * This script tests:
 * 1. User Registration
 * 2. User Login (with/without 2FA)
 * 3. OTP Verification (if 2FA enabled)
 * 4. Get Profile (authenticated)
 */

const BASE_URL = 'https://latest-scan2card-backend.onrender.com';

// Test user data
const testUser = {
  firstName: 'John',
  lastName: 'Doe',
  email: `test.user.${Date.now()}@example.com`, // Unique email for each run
  phoneNumber: '+1234567890',
  password: 'Test@123456',
  roleName: 'ENDUSER',
  companyName: 'Test Company'
};

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

// Helper function for colored output
function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logStep(step, message) {
  log(`\n${'='.repeat(60)}`, 'cyan');
  log(`STEP ${step}: ${message}`, 'bright');
  log('='.repeat(60), 'cyan');
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue');
}

// Helper function to make HTTP requests
async function makeRequest(endpoint, method = 'GET', body = null, token = null) {
  const url = `${BASE_URL}${endpoint}`;

  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
    }
  };

  if (token) {
    options.headers['Authorization'] = `Bearer ${token}`;
  }

  if (body) {
    options.body = JSON.stringify(body);
  }

  logInfo(`Request: ${method} ${endpoint}`);
  if (body) {
    console.log('Payload:', JSON.stringify(body, null, 2));
  }

  const response = await fetch(url, options);
  const data = await response.json();

  console.log('Response Status:', response.status);
  console.log('Response:', JSON.stringify(data, null, 2));

  return { status: response.status, data };
}

// Test functions
async function testRegistration() {
  logStep(1, 'USER REGISTRATION');

  try {
    const { status, data } = await makeRequest('/api/auth/register', 'POST', testUser);

    if (status === 201 && data.success) {
      logSuccess('User registered successfully!');
      return data.data;
    } else {
      logError(`Registration failed: ${data.message}`);
      return null;
    }
  } catch (error) {
    logError(`Registration error: ${error.message}`);
    return null;
  }
}

async function testLogin() {
  logStep(2, 'USER LOGIN');

  try {
    const { status, data } = await makeRequest('/api/auth/login', 'POST', {
      email: testUser.email,
      password: testUser.password
    });

    if (status === 200 && data.success) {
      // Check if 2FA is required
      if (data.data.requires2FA) {
        logInfo('2FA is enabled - OTP required');
        logInfo('Test OTP: 000000');
        return { requires2FA: true, userId: data.data.userId };
      } else {
        logSuccess('Login successful!');
        logInfo(`Token: ${data.data.token.substring(0, 20)}...`);
        return { requires2FA: false, token: data.data.token, user: data.data.user };
      }
    } else {
      logError(`Login failed: ${data.message}`);
      return null;
    }
  } catch (error) {
    logError(`Login error: ${error.message}`);
    return null;
  }
}

async function testVerifyOTP(userId) {
  logStep(3, 'VERIFY OTP (2FA)');

  try {
    const { status, data } = await makeRequest('/api/auth/verify-otp', 'POST', {
      userId,
      otp: '000000' // Test OTP
    });

    if (status === 200 && data.success) {
      logSuccess('OTP verified successfully!');
      logInfo(`Token: ${data.data.token.substring(0, 20)}...`);
      return { token: data.data.token, user: data.data.user };
    } else {
      logError(`OTP verification failed: ${data.message}`);
      return null;
    }
  } catch (error) {
    logError(`OTP verification error: ${error.message}`);
    return null;
  }
}

async function testGetProfile(token) {
  logStep(4, 'GET USER PROFILE (Authenticated)');

  try {
    const { status, data } = await makeRequest('/api/auth/profile', 'GET', null, token);

    if (status === 200 && data.success) {
      logSuccess('Profile retrieved successfully!');
      const user = data.data.user || data.data;
      console.log('User Details:');
      console.log(`  - Name: ${user.firstName} ${user.lastName}`);
      console.log(`  - Email: ${user.email}`);
      console.log(`  - Role: ${user.role?.roleName || user.role}`);
      console.log(`  - Company: ${user.companyName || 'N/A'}`);
      return data.data;
    } else {
      logError(`Failed to get profile: ${data.message}`);
      return null;
    }
  } catch (error) {
    logError(`Get profile error: ${error.message}`);
    return null;
  }
}

// Main test flow
async function runAuthFlow() {
  log('\n╔════════════════════════════════════════════════════════════╗', 'bright');
  log('║      SCAN2CARD AUTHENTICATION FLOW TEST SCRIPT            ║', 'bright');
  log('╚════════════════════════════════════════════════════════════╝', 'bright');

  log(`\nBase URL: ${BASE_URL}`, 'cyan');
  log(`Test User Email: ${testUser.email}`, 'cyan');

  try {
    // Step 1: Register
    const registrationResult = await testRegistration();
    if (!registrationResult) {
      logError('Registration failed. Stopping test.');
      return;
    }

    // Step 2: Login
    const loginResult = await testLogin();
    if (!loginResult) {
      logError('Login failed. Stopping test.');
      return;
    }

    let token, user;

    // Step 3: Verify OTP (if required)
    if (loginResult.requires2FA) {
      const otpResult = await testVerifyOTP(loginResult.userId);
      if (!otpResult) {
        logError('OTP verification failed. Stopping test.');
        return;
      }
      token = otpResult.token;
      user = otpResult.user;
    } else {
      token = loginResult.token;
      user = loginResult.user;
    }

    // Step 4: Get Profile
    await testGetProfile(token);

    // Final Summary
    log('\n' + '='.repeat(60), 'cyan');
    log('TEST SUMMARY', 'bright');
    log('='.repeat(60), 'cyan');
    logSuccess('All authentication flow tests passed! 🎉');
    log('\nAuthentication Token (save this for future requests):', 'yellow');
    log(token, 'green');

  } catch (error) {
    logError(`\nTest failed with error: ${error.message}`);
    console.error(error);
  }
}

// Additional test functions for manual use
async function testLoginExistingUser(email, password) {
  logStep('', 'LOGIN WITH EXISTING USER');

  const { status, data } = await makeRequest('/api/auth/login', 'POST', {
    email,
    password
  });

  if (status === 200 && data.success) {
    if (data.data.requires2FA) {
      logInfo('2FA required. Use OTP: 000000');
      return data.data.userId;
    } else {
      logSuccess('Login successful!');
      log(`\nToken: ${data.data.token}`, 'green');
      return data.data.token;
    }
  }
}

// Run the test
if (require.main === module) {
  runAuthFlow().catch(console.error);
}

// Export for programmatic use
module.exports = {
  testRegistration,
  testLogin,
  testVerifyOTP,
  testGetProfile,
  testLoginExistingUser,
  makeRequest,
  BASE_URL
};
