import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getTenantAppId, storeTenantAppId } from '../../lib/secureStorage';
import { db } from '../../lib/db'; // This will be used for auth check
import { initTenantDb } from '../../lib/tenantDb';
import { fetchProfileByUserId } from '../../lib/profile';

interface Product {
  id: string;
  title: string;
  description?: string;
  productType?: string;
  vendor?: string;
  tags?: any;
  status?: string;
  createdAt: string;
  updatedAt: string;
}

export default function ProductsScreen() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [tenantDb, setTenantDb] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Use the main db's auth state to check if user is authenticated
  const { user, isLoading: authLoading } = db.useAuth();

  useEffect(() => {
    if (!user) return;

    let subscription: any = null;

    const setupTenantConnectionAndSubscription = async () => {
      try {
        setLoading(true);
        
        // First, get tenant app ID from secure storage
        let tenantAppId = await getTenantAppId();
        
        // Always verify the tenant app ID from the user's profile in main app
        if (user.id) {
          const profile = await fetchProfileByUserId(user.id);
          if (profile?.instantapp) {
            // If profile has a different tenant app ID, update our stored value
            if (profile.instantapp !== tenantAppId) {
              tenantAppId = profile.instantapp;
              await storeTenantAppId(tenantAppId);
              console.log('Tenant app ID updated from profile');
            }
          } else if (!tenantAppId) {
            // If no tenant app ID in profile and none stored, user may need onboarding
            throw new Error('No tenant app found. Please complete onboarding.');
          }
        }
        
        if (!tenantAppId) {
          throw new Error('No tenant app ID found. Please contact support.');
        }
        
        // Initialize a new tenant db instance with proper schema
        const tenantDatabase = initTenantDb(tenantAppId);
        
        // Debug: log available methods to see what's available
        console.log('Tenant DB methods:', Object.keys(tenantDatabase || {}));
        console.log('Tenant DB has subscribeQuery:', typeof tenantDatabase.subscribeQuery === 'function');
        
        // Check for subscribeQuery in both the main instance and its core
        const hasSubscribeQuery = typeof tenantDatabase.subscribeQuery === 'function';
        const hasCoreSubscribeQuery = tenantDatabase._core && typeof tenantDatabase._core.subscribeQuery === 'function';
        
        // Use the available subscribeQuery method
        let subscribeMethod;
        if (hasSubscribeQuery) {
          subscribeMethod = tenantDatabase.subscribeQuery.bind(tenantDatabase);
        } else if (hasCoreSubscribeQuery) {
          subscribeMethod = tenantDatabase._core.subscribeQuery.bind(tenantDatabase._core);
        }
        
        // Verify that the tenantDb has the required methods before setting state
        if (!tenantDatabase || (!hasSubscribeQuery && !hasCoreSubscribeQuery)) {
          console.error('Tenant DB does not have required methods:', {
            hasSubscribeQuery,
            hasCoreSubscribeQuery,
            tenantDatabase: !!tenantDatabase
          });
          throw new Error('Invalid database connection - missing subscribeQuery method');
        }
        
        setTenantDb(tenantDatabase);
        setError(null);

        // Set up real-time subscription to products using available method
        subscription = subscribeMethod({ 
          products: {} 
        }, (resp) => {
          if (resp?.error) {
            console.error('Subscription error:', resp.error);
            setError('Error loading products');
            return;
          }
          setProducts(resp.data?.products || []);
        });
      } catch (err: any) {
        console.error('Error setting up tenant connection:', err);
        setError(err.message || 'Failed to connect to your data');
      } finally {
        setLoading(false);
      }
    };

    setupTenantConnectionAndSubscription();

    // Cleanup function
    return () => {
      if (subscription && typeof subscription.unsubscribe === 'function') {
        subscription.unsubscribe();
      }
    };
  }, [user]);

  const renderProduct = ({ item }: { item: Product }) => (
    <View style={styles.productItem}>
      <Text style={styles.productTitle}>{item.title}</Text>
      <Text style={styles.productDescription} numberOfLines={2}>
        {item.description || 'No description'}
      </Text>
      <Text style={styles.productType}>Type: {item.productType || 'N/A'}</Text>
      <Text style={styles.productStatus}>Status: {item.status || 'N/A'}</Text>
    </View>
  );

  if (authLoading || (user && loading && !tenantDb)) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Setting up connection...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Connection Error</Text>
          <Text style={styles.errorSubtext}>{error}</Text>
          <TouchableOpacity 
            style={[styles.addButton, { marginTop: 20 }]} 
            onPress={() => window.location.reload()} // Simple refresh approach
          >
            <Text style={styles.addButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Authentication Required</Text>
          <Text style={styles.errorSubtext}>Please sign in to access your products</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!tenantDb) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>No Tenant Connection</Text>
          <Text style={styles.errorSubtext}>Unable to connect to your private app</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Products</Text>
        <Text style={styles.headerSubtitle}>{products.length} products</Text>
      </View>

      <FlatList
        data={products}
        renderItem={renderProduct}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>No products yet</Text>
            <Text style={styles.emptySubtitle}>Add your first product to get started</Text>
          </View>
        }
      />

      <TouchableOpacity style={styles.addButton} onPress={() => Alert.alert('Add Product', 'Product creation functionality would go here')}>
        <Text style={styles.addButtonText}>+ Add Product</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ff4444',
    marginBottom: 5,
  },
  errorSubtext: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 4,
  },
  listContent: {
    padding: 20,
  },
  productItem: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  productTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 5,
  },
  productDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  productType: {
    fontSize: 12,
    color: '#888',
    marginBottom: 3,
  },
  productStatus: {
    fontSize: 12,
    color: '#888',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 50,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
    marginBottom: 10,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  addButton: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});