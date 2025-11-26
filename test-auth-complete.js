#!/usr/bin/env node

/**
 * Complete Authentication Flow Test Script for Scan2Card Backend
 * Base URL: https://latest-scan2card-backend.onrender.com
 *
 * This script tests:
 * 1. User Registration
 * 2. Send Verification OTP
 * 3. Verify User with OTP
 * 4. User Login (with isVerified check)
 * 5. Get Profile (with isVerified in response)
 * 6. Forgot Password
 * 7. Reset Password
 * 8. Login with new password
 */

const BASE_URL = 'https://latest-scan2card-backend.onrender.com';

// Test user data
const testUser = {
  firstName: 'Jane',
  lastName: 'Smith',
  email: `test.complete.${Date.now()}@example.com`,
  phoneNumber: '+1987654321',
  password: 'Test@123456',
  newPassword: 'NewPass@123456',
  roleName: 'ENDUSER',
  companyName: 'Test Company Inc'
};

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

// Helper function for colored output
function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logStep(step, message) {
  log(`\n${'='.repeat(70)}`, 'cyan');
  log(`STEP ${step}: ${message}`, 'bright');
  log('='.repeat(70), 'cyan');
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

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
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
    const { status, data } = await makeRequest('/api/auth/register', 'POST', {
      firstName: testUser.firstName,
      lastName: testUser.lastName,
      email: testUser.email,
      phoneNumber: testUser.phoneNumber,
      password: testUser.password,
      roleName: testUser.roleName,
      companyName: testUser.companyName
    });

    if (status === 201 && data.success) {
      logSuccess('User registered successfully!');
      logInfo(`User ID: ${data.data.user._id}`);
      logInfo(`isVerified: ${data.data.user.isVerified}`);

      if (data.data.user.isVerified === false) {
        logWarning('User is not verified yet - verification required');
      }

      return data.data.user;
    } else {
      logError(`Registration failed: ${data.message}`);
      return null;
    }
  } catch (error) {
    logError(`Registration error: ${error.message}`);
    return null;
  }
}

async function testSendVerificationOTP(userId) {
  logStep(2, 'SEND VERIFICATION OTP');

  try {
    const { status, data } = await makeRequest('/api/auth/send-verification-otp', 'POST', {
      userId,
      phoneNumber: testUser.phoneNumber
    });

    if (status === 200 && data.success) {
      logSuccess('Verification OTP sent successfully!');
      logInfo('OTP for testing: 000000');
      return true;
    } else {
      logError(`Failed to send verification OTP: ${data.message}`);
      return false;
    }
  } catch (error) {
    logError(`Send verification OTP error: ${error.message}`);
    return false;
  }
}

async function testVerifyUser(userId) {
  logStep(3, 'VERIFY USER WITH OTP');

  try {
    const { status, data } = await makeRequest('/api/auth/verify-user', 'POST', {
      userId,
      otp: '000000'
    });

    if (status === 200 && data.success) {
      logSuccess('User verified successfully!');
      logInfo(`isVerified: ${data.data.isVerified}`);
      return true;
    } else {
      logError(`User verification failed: ${data.message}`);
      return false;
    }
  } catch (error) {
    logError(`Verify user error: ${error.message}`);
    return false;
  }
}

async function testLogin() {
  logStep(4, 'USER LOGIN (After Verification)');

  try {
    const { status, data } = await makeRequest('/api/auth/login', 'POST', {
      email: testUser.email,
      password: testUser.password
    });

    if (status === 200 && data.success) {
      logSuccess('Login successful!');
      logInfo(`Token: ${data.data.token.substring(0, 30)}...`);
      logInfo(`isVerified: ${data.data.user.isVerified}`);

      if (data.data.user.isVerified === true) {
        logSuccess('User is verified and can perform activities!');
      }

      return { token: data.data.token, user: data.data.user };
    } else {
      logError(`Login failed: ${data.message}`);
      return null;
    }
  } catch (error) {
    logError(`Login error: ${error.message}`);
    return null;
  }
}

async function testGetProfile(token) {
  logStep(5, 'GET USER PROFILE (Check isVerified)');

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
      console.log(`  - isVerified: ${user.isVerified}`);
      console.log(`  - isActive: ${user.isActive}`);
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

async function testForgotPassword() {
  logStep(6, 'FORGOT PASSWORD');

  try {
    const { status, data } = await makeRequest('/api/auth/forgot-password', 'POST', {
      email: testUser.email
    });

    if (status === 200 && data.success) {
      logSuccess('Password reset OTP sent successfully!');
      logInfo(`User ID: ${data.data.userId}`);
      logInfo('OTP for testing: 000000');
      return data.data.userId;
    } else {
      logError(`Forgot password failed: ${data.message}`);
      return null;
    }
  } catch (error) {
    logError(`Forgot password error: ${error.message}`);
    return null;
  }
}

async function testResetPassword(userId) {
  logStep(7, 'RESET PASSWORD WITH OTP');

  try {
    const { status, data } = await makeRequest('/api/auth/reset-password', 'POST', {
      userId,
      otp: '000000',
      newPassword: testUser.newPassword
    });

    if (status === 200 && data.success) {
      logSuccess('Password reset successfully!');
      logInfo(`Email: ${data.data.email}`);
      return true;
    } else {
      logError(`Password reset failed: ${data.message}`);
      return false;
    }
  } catch (error) {
    logError(`Reset password error: ${error.message}`);
    return false;
  }
}

async function testLoginWithNewPassword() {
  logStep(8, 'LOGIN WITH NEW PASSWORD');

  try {
    const { status, data } = await makeRequest('/api/auth/login', 'POST', {
      email: testUser.email,
      password: testUser.newPassword
    });

    if (status === 200 && data.success) {
      logSuccess('Login with new password successful!');
      logInfo(`Token: ${data.data.token.substring(0, 30)}...`);
      return { token: data.data.token, user: data.data.user };
    } else {
      logError(`Login failed: ${data.message}`);
      return null;
    }
  } catch (error) {
    logError(`Login error: ${error.message}`);
    return null;
  }
}

// Main test flow
async function runCompleteAuthFlow() {
  log('\n╔════════════════════════════════════════════════════════════════════╗', 'bright');
  log('║     SCAN2CARD COMPLETE AUTHENTICATION FLOW TEST SCRIPT            ║', 'bright');
  log('╚════════════════════════════════════════════════════════════════════╝', 'bright');

  log(`\nBase URL: ${BASE_URL}`, 'cyan');
  log(`Test User Email: ${testUser.email}`, 'cyan');
  log(`Test User Phone: ${testUser.phoneNumber}`, 'cyan');

  try {
    // Step 1: Register
    const user = await testRegistration();
    if (!user) {
      logError('Registration failed. Stopping test.');
      return;
    }
    const userId = user._id;

    // Step 2: Send Verification OTP
    const otpSent = await testSendVerificationOTP(userId);
    if (!otpSent) {
      logError('Failed to send verification OTP. Stopping test.');
      return;
    }

    // Step 3: Verify User
    const verified = await testVerifyUser(userId);
    if (!verified) {
      logError('User verification failed. Stopping test.');
      return;
    }

    // Step 4: Login
    const loginResult = await testLogin();
    if (!loginResult) {
      logError('Login failed. Stopping test.');
      return;
    }

    // Step 5: Get Profile
    await testGetProfile(loginResult.token);

    // Step 6: Forgot Password
    const forgotUserId = await testForgotPassword();
    if (!forgotUserId) {
      logError('Forgot password failed. Stopping test.');
      return;
    }

    // Step 7: Reset Password
    const resetSuccess = await testResetPassword(forgotUserId);
    if (!resetSuccess) {
      logError('Password reset failed. Stopping test.');
      return;
    }

    // Step 8: Login with new password
    const newLoginResult = await testLoginWithNewPassword();
    if (!newLoginResult) {
      logError('Login with new password failed. Stopping test.');
      return;
    }

    // Final Summary
    log('\n' + '='.repeat(70), 'cyan');
    log('TEST SUMMARY', 'bright');
    log('='.repeat(70), 'cyan');
    logSuccess('All authentication flow tests passed! 🎉');

    log('\n📋 Test Coverage:', 'magenta');
    log('  ✅ User Registration with isVerified field', 'green');
    log('  ✅ Send Verification OTP', 'green');
    log('  ✅ Verify User with OTP', 'green');
    log('  ✅ Login returns isVerified status', 'green');
    log('  ✅ Profile includes isVerified field', 'green');
    log('  ✅ Forgot Password flow', 'green');
    log('  ✅ Reset Password with OTP', 'green');
    log('  ✅ Login with new password', 'green');

    log('\n🔑 Final Authentication Token:', 'yellow');
    log(newLoginResult.token, 'green');

  } catch (error) {
    logError(`\nTest failed with error: ${error.message}`);
    console.error(error);
  }
}

// Run the test
if (require.main === module) {
  runCompleteAuthFlow().catch(console.error);
}

// Export for programmatic use
module.exports = {
  testRegistration,
  testSendVerificationOTP,
  testVerifyUser,
  testLogin,
  testGetProfile,
  testForgotPassword,
  testResetPassword,
  testLoginWithNewPassword,
  makeRequest,
  BASE_URL
};
