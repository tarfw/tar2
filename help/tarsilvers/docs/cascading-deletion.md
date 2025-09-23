# Cascading Product Deletion

## Overview

When a product is deleted in TAR POS, all associated data is automatically deleted to maintain database integrity and prevent orphaned records.

## What Gets Deleted

When you delete a product, the system automatically deletes:

1. **Product Record** - The main product entry
2. **Associated Items** - All product variants/items linked to the product
3. **Cart Entries** - Any shopping cart items referencing the product

## What Doesn't Get Deleted

The following records are preserved for historical/business reasons:

- **Order Items** (`orderitems`) - Historical order data is maintained for reporting and compliance
- **Inventory Adjustments** (`iadjust`) - Historical inventory movements are preserved
- **Location Inventory** (`ilocations`) - Location-specific inventory records

## Implementation

### Single Product Deletion

```typescript
// Delete a single product and all associated data
const result = await productService.deleteProduct('product-123');
```

### Bulk Product Deletion

```typescript
// Delete multiple products and all their associated data
const result = await productService.bulkDeleteProducts(['product-1', 'product-2', 'product-3']);
```

## Database Schema Relationships

The cascading deletion handles these relationships:

```
products (1) → items (many)
  ↓ productId field

products (1) → cart (many)  
  ↓ productId field
```

## Logging

The system logs detailed information about cascading deletions:

- Number of associated items found and deleted
- Number of cart entries found and deleted
- Product IDs and item IDs being deleted
- Performance metrics for bulk operations

## Error Handling

If any part of the cascading deletion fails:

- The entire transaction is rolled back
- No partial deletions occur
- Detailed error information is logged
- The operation returns `{ success: false, error: "..." }`

## Performance Considerations

- Bulk deletions are optimized to query all associated data in parallel
- All deletions happen in a single database transaction
- Large numbers of associated items may take longer to process

## Testing

The cascading deletion functionality is thoroughly tested:

- Unit tests verify correct database queries
- Mock tests ensure proper transaction handling
- Integration tests validate end-to-end behavior

## Usage in Components

The cascading deletion is automatically handled when using:

- Product deletion buttons in the products list
- Bulk delete operations
- Product service methods
- CRUD utility functions

No additional code is needed in UI components - the cascading behavior is built into the service layer.