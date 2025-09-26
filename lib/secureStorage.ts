import * as SecureStore from 'expo-secure-store';

const TENANT_APP_ID_KEY = 'tenant_app_id';

/**
 * Store the tenant app ID securely
 */
export const storeTenantAppId = async (tenantAppId: string): Promise<void> => {
  try {
    await SecureStore.setItemAsync(TENANT_APP_ID_KEY, tenantAppId);
    console.log('Tenant app ID stored successfully');
  } catch (error) {
    console.error('Error storing tenant app ID:', error);
    throw error;
  }
};

/**
 * Retrieve the tenant app ID from secure storage
 */
export const getTenantAppId = async (): Promise<string | null> => {
  try {
    const tenantAppId = await SecureStore.getItemAsync(TENANT_APP_ID_KEY);
    console.log('Tenant app ID retrieved:', tenantAppId ? 'found' : 'not found');
    return tenantAppId;
  } catch (error) {
    console.error('Error retrieving tenant app ID:', error);
    throw error;
  }
};

/**
 * Remove the tenant app ID from secure storage
 */
export const removeTenantAppId = async (): Promise<void> => {
  try {
    await SecureStore.deleteItemAsync(TENANT_APP_ID_KEY);
    console.log('Tenant app ID removed successfully');
  } catch (error) {
    console.error('Error removing tenant app ID:', error);
    throw error;
  }
};