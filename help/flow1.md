Complete App Flow

  1. Authentication Flow
   - User opens the app and is presented with the magic code authentication screen
   - User enters their email address
   - App sends a magic code to the user's email via InstantDB's sendMagicCode method
   - User receives the code and enters it in the app
   - App verifies the code using signInWithMagicCode method

  2. Profile Check After Authentication
   - After successful authentication, the app checks if the user has an existing profile
   - Queries the main InstantDB app to see if a profile exists for the authenticated user ID
   - If profile exists → user is a returning user, proceed to main app
   - If no profile exists → user needs to go through onboarding

  3. Onboarding Flow (For New Users)
   - User is redirected to the onboarding screen (/onboard)
   - User enters their desired username
   - App creates a new tenant Instant app through the Platform API using:
     - The username as the app title
     - Predefined e-commerce schema with entities: stores, products, variants, customers, orders, payments, etc.
     - Appropriate permissions ensuring each user can only access their own data
   - App creates a profile record in the main app linking:
     - User's authentication ID
     - User's email
     - User's chosen username
     - The newly created tenant app ID
   - Tenant app ID is securely stored in the user's profile in the main app
   - Tenant app ID is also stored securely on the device using Expo SecureStore

  4. Returning User Flow
   - For returning users, tenant app ID is retrieved from their profile in the main app
   - Tenant app ID is securely stored in device storage for future sessions

  5. Main App Navigation
   - User is redirected to the main tabs interface (/(tabs))
   - The app is now connected to the main app (for ongoing auth operations)

  6. Navigation to Products Agent
   - When user selects "Products" agent, they are navigated to the dedicated products screen (/(tabs)/products)
   - The products screen handles connecting to the appropriate tenant app

  7. Tenant App Connection in Products Screen
   - Products screen checks if user is authenticated using main app's useAuth hook
   - Retrieves tenant app ID from secure device storage
   - If not in secure storage, retrieves from user's profile in main app
   - Creates a new database instance with tenant app ID and proper e-commerce schema
   - Establishes connection to tenant app for data operations
   - Sets up real-time subscription to products data using subscribeQuery

  8. Products Data Operations
   - Products are fetched from tenant app's products entity
   - Real-time updates are provided through subscription
   - All CRUD operations happen within the user's tenant app
   - Each user can only access their own products due to tenant isolation

  9. Secure Storage Management
   - Tenant app ID is securely stored using Expo SecureStore
   - The ID is retrieved when needed to connect to the proper tenant app
   - This provides a seamless experience where users don't need to manage app connections manually

  10. Multi-Tenant Architecture Benefits
   - Complete data isolation between users
   - Each user has their own Instant app instance with full e-commerce schema
   - Proper authentication and authorization through InstantDB's permission system
   - Secure handling of sensitive tenant app IDs
   - Real-time sync for all data operations within the user's tenant app

  This flow ensures that users authenticate against a central app, but all their data operations happen in their own
  isolated tenant app instance, providing both security and scalability.