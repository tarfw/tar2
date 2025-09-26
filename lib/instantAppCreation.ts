import { PlatformApi, i } from '@instantdb/platform';

// Platform API will be initialized when needed to avoid early environment variable checks
let platformApi: PlatformApi | null = null;

function getPlatformApi(): PlatformApi {
  if (!platformApi) {
    const PLATFORM_TOKEN = process.env.EXPO_PUBLIC_INSTANT_PLATFORM_TOKEN;
    
    if (!PLATFORM_TOKEN) {
      throw new Error('EXPO_PUBLIC_INSTANT_PLATFORM_TOKEN is not set in environment variables');
    }

    // Initialize the Platform API
    platformApi = new PlatformApi({ 
      auth: { 
        token: PLATFORM_TOKEN 
      } 
    });
  }
  
  return platformApi;
}

/**
 * Creates a new Instant app with the given username as the title and predefined schema and permissions
 * @param username - The username to use as the app title
 * @returns The created app ID, or null if creation failed
 */
export async function createInstantApp(username: string): Promise<string | null> {
  try {
    console.log(`Creating Instant app for username: ${username}`);
    
    // Define schema with e-commerce entities
    const schema = i.schema({
      entities: {
    stores: i.entity({
      name: i.string(),
      currency: i.string(),
      timeZone: i.string(),
      address: i.json(),
      createdAt: i.date().indexed()
    }),

    products: i.entity({
      title: i.string(),
      description: i.string().optional(),
      productType: i.string().optional(),
      vendor: i.string().optional(),
      tags: i.json(),
      status: i.string(),
      createdAt: i.date().indexed(),
      updatedAt: i.date()
    }),

    productVariants: i.entity({
      sku: i.string().unique(),
      title: i.string(),
      price: i.number(),
      compareAtPrice: i.number().optional(),
      cost: i.number().optional(),
      barcode: i.string().optional(),
      weight: i.number().optional(),
      inventoryQuantity: i.number(),
      createdAt: i.date(),
      updatedAt: i.date()
    }),

    collections: i.entity({
      title: i.string(),
      handle: i.string().unique(),
      description: i.string().optional(),
      sortOrder: i.string(),
      seoTitle: i.string().optional(),
      seoDescription: i.string().optional(),
      publishedAt: i.date().optional().indexed(),
      createdAt: i.date(),
      updatedAt: i.date()
    }),

    customers: i.entity({
      email: i.string().unique().indexed(),
      phone: i.string().optional(),
      firstName: i.string(),
      lastName: i.string(),
      acceptsMarketing: i.boolean(),
      createdAt: i.date().indexed()
    }),

    orders: i.entity({
      name: i.string(),
      totalPrice: i.number(),
      subtotal: i.number(),
      tax: i.number(),
      currency: i.string(),
      financialStatus: i.string(),
      fulfillmentStatus: i.string(),
      channel: i.string(),
      createdAt: i.date().indexed(),
      updatedAt: i.date()
    }),

    lineItems: i.entity({
      title: i.string(),
      quantity: i.number(),
      price: i.number(),
      totalDiscount: i.number(),
      createdAt: i.date()
    }),

    payments: i.entity({
      gateway: i.string(),
      amount: i.number(),
      currency: i.string(),
      status: i.string(),
      processedAt: i.date().optional(),
      createdAt: i.date()
    }),

    inventoryMovements: i.entity({
      quantity: i.number(),
      reason: i.string(),
      description: i.string().optional(),
      occurredAt: i.date()
    }),

    locations: i.entity({
      name: i.string(),
      address: i.json(),
      isActive: i.boolean()
    }),

    staff: i.entity({
      email: i.string().unique(),
      firstName: i.string(),
      lastName: i.string(),
      role: i.string(),
      pin: i.string().optional(),
      createdAt: i.date()
    })
  },

  links: {
    productVariants: {
      forward: { on: 'products', has: 'many', label: 'variants' },
      reverse: { on: 'productVariants', has: 'one', label: 'product' }
    },
    variantInventory: {
      forward: { on: 'productVariants', has: 'many', label: 'movements' },
      reverse: { on: 'inventoryMovements', has: 'one', label: 'variant' }
    },
    locationMovements: {
      forward: { on: 'locations', has: 'many', label: 'movements' },
      reverse: { on: 'inventoryMovements', has: 'one', label: 'location' }
    },
    staffMovements: {
      forward: { on: 'staff', has: 'many', label: 'movements' },
      reverse: { on: 'inventoryMovements', has: 'one', label: 'staff' }
    },
    orderLineItems: {
      forward: { on: 'orders', has: 'many', label: 'lineItems' },
      reverse: { on: 'lineItems', has: 'one', label: 'order' }
    },
    lineItemVariant: {
      forward: { on: 'lineItems', has: 'one', label: 'variant' },
      reverse: { on: 'productVariants', has: 'many', label: 'lineItems' }
    },
    orderCustomer: {
      forward: { on: 'orders', has: 'one', label: 'customer' },
      reverse: { on: 'customers', has: 'many', label: 'orders' }
    },
    orderPayments: {
      forward: { on: 'orders', has: 'many', label: 'payments' },
      reverse: { on: 'payments', has: 'one', label: 'order' }
    },
    storeProducts: {
      forward: { on: 'stores', has: 'many', label: 'products' },
      reverse: { on: 'products', has: 'one', label: 'store' }
    },
    storeOrders: {
      forward: { on: 'stores', has: 'many', label: 'orders' },
      reverse: { on: 'orders', has: 'one', label: 'store' }
    },
    storeLocations: {
      forward: { on: 'stores', has: 'many', label: 'locations' },
      reverse: { on: 'locations', has: 'one', label: 'store' }
    },
    storeStaff: {
      forward: { on: 'stores', has: 'many', label: 'staff' },
      reverse: { on: 'staff', has: 'one', label: 'store' }
    },
    collectionProducts: {
      forward: { on: 'collections', has: 'many', label: 'products' },
      reverse: { on: 'products', has: 'many', label: 'collections' }
    }
  }
    });

    // Define permissions for the e-commerce entities
    const perms = {
      $default: {
        allow: {
          $default: false,
        },
      },
      stores: {
        allow: {
          view: 'true',
          create: 'isOwner',
          update: 'isOwner',
          delete: 'isOwner',
        },
        bind: ['isOwner', 'auth.id != null && auth.id == data.creatorId'],
      },
      products: {
        allow: {
          view: 'true',
          create: 'isOwner',
          update: 'isOwner',
          delete: 'isOwner',
        },
        bind: ['isOwner', 'auth.id != null && auth.id == data.creatorId'],
      },
      productVariants: {
        allow: {
          view: 'true',
          create: 'isOwner',
          update: 'isOwner',
          delete: 'isOwner',
        },
        bind: ['isOwner', 'auth.id != null && auth.id == data.creatorId'],
      },
      collections: {
        allow: {
          view: 'true',
          create: 'isOwner',
          update: 'isOwner',
          delete: 'isOwner',
        },
        bind: ['isOwner', 'auth.id != null && auth.id == data.creatorId'],
      },
      customers: {
        allow: {
          view: 'true',
          create: 'isOwner',
          update: 'isOwner',
          delete: 'isOwner',
        },
        bind: ['isOwner', 'auth.id != null && auth.id == data.creatorId'],
      },
      orders: {
        allow: {
          view: 'true',
          create: 'isOwner',
          update: 'isOwner',
          delete: 'isOwner',
        },
        bind: ['isOwner', 'auth.id != null && auth.id == data.creatorId'],
      },
      lineItems: {
        allow: {
          view: 'true',
          create: 'isOwner',
          update: 'isOwner',
          delete: 'isOwner',
        },
        bind: ['isOwner', 'auth.id != null && auth.id == data.creatorId'],
      },
      payments: {
        allow: {
          view: 'true',
          create: 'isOwner',
          update: 'isOwner',
          delete: 'isOwner',
        },
        bind: ['isOwner', 'auth.id != null && auth.id == data.creatorId'],
      },
      inventoryMovements: {
        allow: {
          view: 'true',
          create: 'isOwner',
          update: 'isOwner',
          delete: 'isOwner',
        },
        bind: ['isOwner', 'auth.id != null && auth.id == data.creatorId'],
      },
      locations: {
        allow: {
          view: 'true',
          create: 'isOwner',
          update: 'isOwner',
          delete: 'isOwner',
        },
        bind: ['isOwner', 'auth.id != null && auth.id == data.creatorId'],
      },
      staff: {
        allow: {
          view: 'true',
          create: 'isOwner',
          update: 'isOwner',
          delete: 'isOwner',
        },
        bind: ['isOwner', 'auth.id != null && auth.id == data.creatorId'],
      }
    };

    const appResponse = await getPlatformApi().createApp({ 
      title: username,
      schema: schema,
      perms: perms
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