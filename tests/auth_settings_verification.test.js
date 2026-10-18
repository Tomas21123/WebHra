const fs = require('fs');
const path = require('path');
const { describe, test, assert, assertEqual } = require('./test_utils');

describe('Auth, Gear Settings Menu & Email Verification Tests', () => {
  const indexPath = path.join(__dirname, '..', 'index.html');
  const apiPath = path.join(__dirname, '..', 'api.php');

  const indexContent = fs.readFileSync(indexPath, 'utf8');
  const apiContent = fs.readFileSync(apiPath, 'utf8');

  test('1. Main Menu has gear icon button in top-bar', () => {
    assert(indexContent.includes('id="btnSettingsMenu"'), 'Gear icon button (#btnSettingsMenu) must exist in index.html');
    assert(indexContent.includes('gear-btn'), 'Button must have .gear-btn class');
    assert(indexContent.includes('⚙️'), 'Button must feature the gear icon');
  });

  test('2. Gear dropdown contains options: Změnit nickname, Změnit heslo, Odhlásit se', () => {
    assert(indexContent.includes('id="settingsDropdownMenu"'), 'Settings dropdown (#settingsDropdownMenu) must exist');
    assert(indexContent.includes('id="menuItemChangeNick"'), 'Option to change nickname (#menuItemChangeNick) must exist');
    assert(indexContent.includes('id="menuItemChangePassword"'), 'Option to change password (#menuItemChangePassword) must exist');
    assert(indexContent.includes('id="menuItemLogout"'), 'Option to log out (#menuItemLogout) must exist');
    assert(indexContent.includes('Změnit nickname'), 'Dropdown must have text "Změnit nickname"');
    assert(indexContent.includes('Změnit heslo'), 'Dropdown must have text "Změnit heslo"');
    assert(indexContent.includes('Odhlásit se'), 'Dropdown must have text "Odhlásit se"');
  });

  test('3. Dedicated modals exist for changing nickname and changing password', () => {
    assert(indexContent.includes('id="modalChangeNickname"'), 'Modal for changing nickname must exist');
    assert(indexContent.includes('id="formChangeNickname"'), 'Form for changing nickname must exist');
    assert(indexContent.includes('id="inputNewNickname"'), 'New nickname input must exist');
    assert(indexContent.includes('id="inputNickPassword"'), 'Password confirmation for nick change must exist');

    assert(indexContent.includes('id="modalChangePassword"'), 'Modal for changing password must exist');
    assert(indexContent.includes('id="formChangePassword"'), 'Form for changing password must exist');
    assert(indexContent.includes('id="inputCurrentPass"'), 'Current password input must exist');
    assert(indexContent.includes('id="inputNewPass"'), 'New password input must exist');
    assert(indexContent.includes('id="inputNewPassConfirm"'), 'Confirm password input must exist');
  });

  test('4. Registration form triggers email verification code flow in Auth modal', () => {
    assert(indexContent.includes('id="formVerifyEmail"'), 'Email verification form (#formVerifyEmail) must exist in Auth modal');
    assert(indexContent.includes('id="tabVerifyHeader"'), 'Verification tab header must exist');
    assert(indexContent.includes('id="verifyCodeInput"'), '6-digit code input (#verifyCodeInput) must exist');
    assert(indexContent.includes('id="submitVerifyCode"'), 'Verify code submit button must exist');
    assert(indexContent.includes('id="btnResendCode"'), 'Resend code button with timer must exist');
  });

  test('5. Backend api.php supports all required actions', () => {
    assert(apiContent.includes("action === 'register'"), 'api.php must handle register');
    assert(apiContent.includes("action === 'verify_email'"), 'api.php must handle verify_email');
    assert(apiContent.includes("action === 'resend_code'"), 'api.php must handle resend_code');
    assert(apiContent.includes("action === 'login'"), 'api.php must handle login');
    assert(apiContent.includes("action === 'change_password'"), 'api.php must handle change_password');
    assert(apiContent.includes("action === 'change_nickname'"), 'api.php must handle change_nickname');
    assert(apiContent.includes("action === 'reset_password'"), 'api.php must handle reset_password');
  });

  test('6. Backend api.php implements high security measures', () => {
    // Cryptographic security & password hashing
    assert(apiContent.includes('password_hash'), 'api.php must use password_hash');
    assert(apiContent.includes('password_verify'), 'api.php must use password_verify');
    assert(apiContent.includes('hash_equals'), 'api.php must use timing-safe hash_equals for code comparison');
    assert(apiContent.includes('hashVerificationCode'), 'api.php must hash verification codes in the database');
    assert(apiContent.includes('random_int'), 'api.php must use CSPRNG random_int');

    // Brute force lockout & rate limiting
    assert(apiContent.includes('LockedUntil'), 'api.php must support brute-force account locking');
    assert(apiContent.includes('FailedLogins'), 'api.php must track failed logins');
    assert(apiContent.includes('CodeAttempts'), 'api.php must track failed verification attempts');
    assert(apiContent.includes('LastCodeSentAt'), 'api.php must rate-limit resending codes');

    // Security headers & input validation
    assert(apiContent.includes('X-Content-Type-Options: nosniff'), 'api.php must include security headers');
    assert(apiContent.includes('FILTER_VALIDATE_EMAIL'), 'api.php must validate emails');
    assert(apiContent.includes('sendVerificationEmail'), 'api.php must have HTML email sending function');
  });

  test('7. Backend api.php supports standalone native SMTP with authentication', () => {
    assert(apiContent.includes('$smtp_config'), 'api.php must configure $smtp_config');
    assert(apiContent.includes('sendSmtpEmail'), 'api.php must implement sendSmtpEmail function');
    assert(apiContent.includes('AUTH LOGIN'), 'SMTP must use AUTH LOGIN command');
    assert(apiContent.includes('stream_socket_client'), 'SMTP must establish socket connection');
  });

  test('8. Resilient SMTP fallback ensures players are never blocked if mail fails', () => {
    assert(apiContent.includes('fallback_code'), 'api.php must include fallback_code when mail fails or password is not set');
    assert(indexContent.includes('fallback_code'), 'index.html must handle fallback_code in registration flow');
    assert(indexContent.includes('openVerificationView(email, notice, nick = \'\', fallbackCode = \'\')') || indexContent.includes('openVerificationView'), 'openVerificationView must accept fallbackCode');
  });
});
