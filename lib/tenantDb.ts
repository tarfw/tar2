import { init, i } from '@instantdb/react-native';

// Initialize a tenant database with the correct schema
export const initTenantDb = (appId: string) => {
  // Define the schema for tenant apps
  // This should match the schema used in instantAppCreation.ts
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
    }
  });

  return init({
    appId: appId,
    schema: schema,  // Provide the schema for tenant apps
  });
};