export const MIN_SUPER_ADMIN_PASSWORD_LENGTH = 12;

export const validateSuperAdminBootstrapPassword = (password: string, nodeEnv: string | undefined): string | null => {
  if (nodeEnv === 'production' && password.length < MIN_SUPER_ADMIN_PASSWORD_LENGTH) {
    return `SUPER_ADMIN_PASSWORD must be at least ${MIN_SUPER_ADMIN_PASSWORD_LENGTH} characters in production.`;
  }
  return null;
};