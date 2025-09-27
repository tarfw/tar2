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

      team: i.entity({
        email: i.string().unique(),
        firstName: i.string(),
        lastName: i.string(),
        role: i.string(),
        pin: i.string().optional(),
        createdAt: i.date()
      }),

      tasks: i.entity({
        title: i.string(),
        description: i.string().optional(),
        status: i.string(),
        priority: i.string(),
        dueDate: i.date().optional(),
        assignedTo: i.string().optional(),
        tags: i.json(),
        createdAt: i.date().indexed(),
        updatedAt: i.date(),
        completedAt: i.date().optional(),
        estimatedHours: i.number().optional(),
        actualHours: i.number().optional(),
        progress: i.number().optional()
      }),

      taskComments: i.entity({
        taskId: i.string(),
        authorId: i.string(),
        content: i.string(),
        createdAt: i.date().indexed(),
        updatedAt: i.date()
      }),

      taskCategories: i.entity({
        name: i.string(),
        color: i.string().optional(),
        createdAt: i.date().indexed(),
        updatedAt: i.date()
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
      teamMovements: {
        forward: { on: 'team', has: 'many', label: 'movements' },
        reverse: { on: 'inventoryMovements', has: 'one', label: 'team' }
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
      storeTeam: {
        forward: { on: 'stores', has: 'many', label: 'team' },
        reverse: { on: 'team', has: 'one', label: 'store' }
      },
      collectionProducts: {
        forward: { on: 'collections', has: 'many', label: 'products' },
        reverse: { on: 'products', has: 'many', label: 'collections' }
      },
      taskComments: {
        forward: { on: 'tasks', has: 'many', label: 'comments' },
        reverse: { on: 'taskComments', has: 'one', label: 'task' }
      },
      taskCategories: {
        forward: { on: 'tasks', has: 'many', label: 'categories' },
        reverse: { on: 'taskCategories', has: 'one', label: 'task' }
      },
      teamTasks: {
        forward: { on: 'team', has: 'many', label: 'tasks' },
        reverse: { on: 'tasks', has: 'one', label: 'teamMember' }
      },
      orderTasks: {
        forward: { on: 'orders', has: 'many', label: 'tasks' },
        reverse: { on: 'tasks', has: 'one', label: 'order' }
      },
      customerTasks: {
        forward: { on: 'customers', has: 'many', label: 'tasks' },
        reverse: { on: 'tasks', has: 'one', label: 'customer' }
      },
      productTasks: {
        forward: { on: 'products', has: 'many', label: 'tasks' },
        reverse: { on: 'tasks', has: 'one', label: 'product' }
      }
    }
  });

  return init({
    appId: appId,
    schema: schema,  // Provide the schema for tenant apps
  });
};