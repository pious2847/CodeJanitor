/**
 * Tests for SSO Service
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { SSOService, SAMLConfig, OAuthConfig } from '../SSOService';

describe('SSOService', () => {
  let ssoService: SSOService;

  beforeEach(() => {
    ssoService = new SSOService();
  });

  describe('Configuration', () => {
    it('should configure SAML', () => {
      const samlConfig: SAMLConfig = {
        idpEntityId: 'https://idp.example.com',
        idpSsoUrl: 'https://idp.example.com/sso',
        idpCertificate: 'cert',
        spEntityId: 'https://sp.example.com',
        spAcsUrl: 'https://sp.example.com/acs',
        signRequests: true,
        encryptAssertions: true,
      };

      ssoService.configureSAML(samlConfig);
      const config = ssoService.getSAMLConfig();
      expect(config).toEqual(samlConfig);
    });

    it('should configure OAuth', () => {
      const oauthConfig: OAuthConfig = {
        provider: 'google',
        clientId: 'client-id',
        clientSecret: 'client-secret',
        authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
        tokenUrl: 'https://oauth2.googleapis.com/token',
        userInfoUrl: 'https://www.googleapis.com/oauth2/v1/userinfo',
        redirectUri: 'https://app.example.com/callback',
        scopes: ['openid', 'email', 'profile'],
      };

      ssoService.configureOAuth('google', oauthConfig);
      const config = ssoService.getOAuthConfig('google');
      expect(config).toEqual(oauthConfig);
    });

    it('should have default MFA configuration', () => {
      const mfaConfig = ssoService.getMFAConfig();
      expect(mfaConfig.required).toBe(false);
      expect(mfaConfig.allowedMethods).toContain('totp');
    });

    it('should update MFA configuration', () => {
      ssoService.updateMFAConfig({
        required: true,
        gracePeriodDays: 7,
      });

      const mfaConfig = ssoService.getMFAConfig();
      expect(mfaConfig.required).toBe(true);
      expect(mfaConfig.gracePeriodDays).toBe(7);
    });

    it('should have default provisioning configuration', () => {
      const provisioningConfig = ssoService.getProvisioningConfig();
      expect(provisioningConfig.autoProvision).toBe(true);
      expect(provisioningConfig.defaultRole).toBe('developer');
    });

    it('should update provisioning configuration', () => {
      ssoService.updateProvisioningConfig({
        autoProvision: false,
        defaultRole: 'viewer',
      });

      const provisioningConfig = ssoService.getProvisioningConfig();
      expect(provisioningConfig.autoProvision).toBe(false);
      expect(provisioningConfig.defaultRole).toBe('viewer');
    });
  });

  describe('SAML Authentication', () => {
    beforeEach(() => {
      const samlConfig: SAMLConfig = {
        idpEntityId: 'https://idp.example.com',
        idpSsoUrl: 'https://idp.example.com/sso',
        idpCertificate: 'cert',
        spEntityId: 'https://sp.example.com',
        spAcsUrl: 'https://sp.example.com/acs',
        signRequests: true,
        encryptAssertions: true,
      };
      ssoService.configureSAML(samlConfig);
    });

    it('should authenticate user with SAML', async () => {
      const result = await ssoService.authenticateSAML('saml-response');
      
      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();
      expect(result.session).toBeDefined();
    });

    it('should fail authentication without SAML configuration', async () => {
      const service = new SSOService();
      const result = await service.authenticateSAML('saml-response');
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('SAML not configured');
    });

    it('should provision new user on SAML authentication', async () => {
      const result = await ssoService.authenticateSAML('saml-response');
      
      expect(result.success).toBe(true);
      expect(result.user?.email).toBe('user@example.com');
    });

    it('should require MFA when configured', async () => {
      ssoService.updateMFAConfig({ required: true });
      const result = await ssoService.authenticateSAML('saml-response');
      
      expect(result.success).toBe(false);
      expect(result.mfaRequired).toBe(true);
      expect(result.mfaToken).toBeDefined();
    });
  });

  describe('OAuth Authentication', () => {
    beforeEach(() => {
      const oauthConfig: OAuthConfig = {
        provider: 'google',
        clientId: 'client-id',
        clientSecret: 'client-secret',
        authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
        tokenUrl: 'https://oauth2.googleapis.com/token',
        userInfoUrl: 'https://www.googleapis.com/oauth2/v1/userinfo',
        redirectUri: 'https://app.example.com/callback',
        scopes: ['openid', 'email', 'profile'],
      };
      ssoService.configureOAuth('google', oauthConfig);
    });

    it('should authenticate user with OAuth', async () => {
      const result = await ssoService.authenticateOAuth('google', 'auth-code');
      
      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();
      expect(result.session).toBeDefined();
    });

    it('should fail authentication without OAuth configuration', async () => {
      const result = await ssoService.authenticateOAuth('github', 'auth-code');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('not configured');
    });

    it('should provision new user on OAuth authentication', async () => {
      const result = await ssoService.authenticateOAuth('google', 'auth-code');
      
      expect(result.success).toBe(true);
      expect(result.user?.email).toContain('google.com');
    });

    it('should require MFA when configured', async () => {
      ssoService.updateMFAConfig({ required: true });
      const result = await ssoService.authenticateOAuth('google', 'auth-code');
      
      expect(result.success).toBe(false);
      expect(result.mfaRequired).toBe(true);
      expect(result.mfaToken).toBeDefined();
    });
  });

  describe('Multi-Factor Authentication', () => {
    it('should verify valid MFA code', async () => {
      ssoService.updateMFAConfig({ required: true });
      
      // First authenticate to get MFA token
      const samlConfig: SAMLConfig = {
        idpEntityId: 'https://idp.example.com',
        idpSsoUrl: 'https://idp.example.com/sso',
        idpCertificate: 'cert',
        spEntityId: 'https://sp.example.com',
        spAcsUrl: 'https://sp.example.com/acs',
        signRequests: true,
        encryptAssertions: true,
      };
      ssoService.configureSAML(samlConfig);
      
      const authResult = await ssoService.authenticateSAML('saml-response');
      expect(authResult.mfaToken).toBeDefined();
      
      // Get the challenge to extract the code (for testing)
      const mfaToken = authResult.mfaToken!;
      const challenge = (ssoService as any).mfaChallenges.get(mfaToken);
      
      // Verify MFA
      const mfaResult = ssoService.verifyMFA(mfaToken, challenge.code);
      
      expect(mfaResult.success).toBe(true);
      expect(mfaResult.user).toBeDefined();
      expect(mfaResult.session?.mfaCompleted).toBe(true);
    });

    it('should reject invalid MFA code', async () => {
      ssoService.updateMFAConfig({ required: true });
      
      const samlConfig: SAMLConfig = {
        idpEntityId: 'https://idp.example.com',
        idpSsoUrl: 'https://idp.example.com/sso',
        idpCertificate: 'cert',
        spEntityId: 'https://sp.example.com',
        spAcsUrl: 'https://sp.example.com/acs',
        signRequests: true,
        encryptAssertions: true,
      };
      ssoService.configureSAML(samlConfig);
      
      const authResult = await ssoService.authenticateSAML('saml-response');
      const mfaToken = authResult.mfaToken!;
      
      const mfaResult = ssoService.verifyMFA(mfaToken, 'wrong-code');
      
      expect(mfaResult.success).toBe(false);
      expect(mfaResult.error).toBe('Invalid MFA code');
    });

    it('should reject expired MFA token', () => {
      const result = ssoService.verifyMFA('invalid-token', '123456');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid or expired');
    });
  });

  describe('User Provisioning', () => {
    it('should provision new user', async () => {
      const attributes = {
        email: 'newuser@example.com',
        displayName: 'New User',
        role: 'developer',
      };
      
      const result = await ssoService.provisionUser(attributes, 'saml');
      
      expect(result.success).toBe(true);
      expect(result.isNewUser).toBe(true);
      expect(result.user?.email).toBe('newuser@example.com');
    });

    it('should update existing user on sync', async () => {
      // First provision
      await ssoService.provisionUser({
        email: 'user@example.com',
        displayName: 'Old Name',
        role: 'developer',
      }, 'saml');
      
      // Update with sync enabled
      const result = await ssoService.provisionUser({
        email: 'user@example.com',
        displayName: 'New Name',
        role: 'manager',
      }, 'saml');
      
      expect(result.success).toBe(true);
      expect(result.isNewUser).toBe(false);
      expect(result.user?.name).toBe('New Name');
      expect(result.user?.role).toBe('manager');
    });

    it('should fail provisioning without email', async () => {
      const result = await ssoService.provisionUser({
        displayName: 'No Email User',
      }, 'saml');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Email is required');
    });

    it('should respect auto-provision setting', async () => {
      ssoService.updateProvisioningConfig({ autoProvision: false });
      
      const result = await ssoService.provisionUser({
        email: 'user@example.com',
        displayName: 'User',
      }, 'saml');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('disabled');
    });

    it('should use default role when not specified', async () => {
      const result = await ssoService.provisionUser({
        email: 'user@example.com',
        displayName: 'User',
      }, 'saml');
      
      expect(result.success).toBe(true);
      expect(result.user?.role).toBe('developer');
    });
  });

  describe('User De-provisioning', () => {
    it('should de-provision user', async () => {
      // First provision a user
      const provisionResult = await ssoService.provisionUser({
        email: 'user@example.com',
        displayName: 'User',
      }, 'saml');
      
      const userId = provisionResult.user!.id;
      
      // Enable auto-deprovision
      ssoService.updateProvisioningConfig({ autoDeprovision: true });
      
      // De-provision
      const result = await ssoService.deprovisionUser(userId);
      expect(result).toBe(true);
    });

    it('should respect auto-deprovision setting', async () => {
      ssoService.updateProvisioningConfig({ autoDeprovision: false });
      
      const result = await ssoService.deprovisionUser('user-id');
      expect(result).toBe(false);
    });
  });

  describe('Session Management', () => {
    it('should create session on successful authentication', async () => {
      const samlConfig: SAMLConfig = {
        idpEntityId: 'https://idp.example.com',
        idpSsoUrl: 'https://idp.example.com/sso',
        idpCertificate: 'cert',
        spEntityId: 'https://sp.example.com',
        spAcsUrl: 'https://sp.example.com/acs',
        signRequests: true,
        encryptAssertions: true,
      };
      ssoService.configureSAML(samlConfig);
      
      const result = await ssoService.authenticateSAML('saml-response');
      
      expect(result.session).toBeDefined();
      expect(result.session?.userId).toBe(result.user?.id);
    });

    it('should validate active session', async () => {
      const samlConfig: SAMLConfig = {
        idpEntityId: 'https://idp.example.com',
        idpSsoUrl: 'https://idp.example.com/sso',
        idpCertificate: 'cert',
        spEntityId: 'https://sp.example.com',
        spAcsUrl: 'https://sp.example.com/acs',
        signRequests: true,
        encryptAssertions: true,
      };
      ssoService.configureSAML(samlConfig);
      
      const result = await ssoService.authenticateSAML('saml-response');
      const sessionId = result.session!.id;
      
      const isValid = ssoService.validateSession(sessionId);
      expect(isValid).toBe(true);
    });

    it('should reject invalid session', () => {
      const isValid = ssoService.validateSession('invalid-session');
      expect(isValid).toBe(false);
    });

    it('should revoke session', async () => {
      const samlConfig: SAMLConfig = {
        idpEntityId: 'https://idp.example.com',
        idpSsoUrl: 'https://idp.example.com/sso',
        idpCertificate: 'cert',
        spEntityId: 'https://sp.example.com',
        spAcsUrl: 'https://sp.example.com/acs',
        signRequests: true,
        encryptAssertions: true,
      };
      ssoService.configureSAML(samlConfig);
      
      const result = await ssoService.authenticateSAML('saml-response');
      const sessionId = result.session!.id;
      
      const revoked = ssoService.revokeSession(sessionId);
      expect(revoked).toBe(true);
      
      const isValid = ssoService.validateSession(sessionId);
      expect(isValid).toBe(false);
    });

    it('should get user sessions', async () => {
      const samlConfig: SAMLConfig = {
        idpEntityId: 'https://idp.example.com',
        idpSsoUrl: 'https://idp.example.com/sso',
        idpCertificate: 'cert',
        spEntityId: 'https://sp.example.com',
        spAcsUrl: 'https://sp.example.com/acs',
        signRequests: true,
        encryptAssertions: true,
      };
      ssoService.configureSAML(samlConfig);
      
      const result = await ssoService.authenticateSAML('saml-response');
      const userId = result.user!.id;
      
      const sessions = ssoService.getUserSessions(userId);
      expect(sessions).toHaveLength(1);
      expect(sessions[0]?.userId).toBe(userId);
    });
  });
});
