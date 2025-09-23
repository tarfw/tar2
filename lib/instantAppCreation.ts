import { PlatformApi } from '@instantdb/platform';

// Platform API token for creating apps
const PLATFORM_TOKEN = 'per_1210397abc5137e5936615f0d5cfb6556b7900e06715cfb053b3f241561ac89f';

// Initialize the Platform API
const platformApi = new PlatformApi({ 
  auth: { 
    token: PLATFORM_TOKEN 
  } 
});

/**
 * Creates a new Instant app with the given username as the title
 * @param username - The username to use as the app title
 * @returns The created app ID, or null if creation failed
 */
export async function createInstantApp(username: string): Promise<string | null> {
  try {
    console.log(`Creating Instant app for username: ${username}`);
    
    const appResponse = await platformApi.createApp({ 
      title: username 
    });
    
    const appId = appResponse.app.id;
    console.log(`Successfully created Instant app with ID: ${appId}`);
    
    return appId;
  } catch (error: any) {
    console.error('Error creating Instant app:', error);
    // Return null instead of throwing to allow the calling function to handle the error gracefully
    return null;
  }
}