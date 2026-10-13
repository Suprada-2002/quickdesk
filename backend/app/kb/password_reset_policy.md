# Password Reset & Account Security Policy

## Password Requirements
All employee accounts must adhere to strict security criteria:
- Minimum length of 12 characters.
- Must include at least one uppercase letter, one lowercase letter, one number, and one special symbol (`!@#$%^&*`).
- Cannot match any of your previous 5 passwords.
- Passwords expire automatically every 180 days.

## Self-Service Password Reset
Employees locked out of their Google Workspace, Slack, or GitHub accounts should use the Self-Service Password Reset (SSPR) portal:
1. Navigate to `https://auth.company.internal/reset`.
2. Authenticate using your secondary factor (YubiKey hardware key or Google Authenticator push notification).
3. Set your new password. All active login sessions across devices will be revoked within 10 minutes.

## Account Lockout Policy
Entering an incorrect password 5 consecutive times triggers an automatic 30-minute security lock. Agents cannot manually bypass this cooling period without identity verification via verified video call or manager approval.
