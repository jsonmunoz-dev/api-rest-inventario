const { z } = require('zod');

const id = z.coerce.number().int().positive();

const idParams = z.object({ id });

const pagination = {
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
};

const categoryInput = z.object({
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().max(500).nullish(),
});

const productBase = z.object({
  sku: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9-]{3,40}$/, 'Solo letras, números y guiones (3 a 40)'),
  name: z.string().trim().min(2).max(150),
  description: z.string().trim().max(2000).nullish(),
  price: z.number().nonnegative().multipleOf(0.01),
  minStock: z.number().int().nonnegative().default(0),
  categoryId: id,
});

// El stock no se edita directamente: cambia solo mediante movimientos.
const productCreate = productBase.extend({
  initialStock: z.number().int().nonnegative().default(0),
});

const productUpdate = productBase
  .partial()
  .refine((d) => Object.keys(d).length > 0, 'Debe enviar al menos un campo');

const productQuery = z
  .object({
    ...pagination,
    q: z.string().trim().min(1).optional(),
    categoryId: id.optional(),
    minPrice: z.coerce.number().nonnegative().optional(),
    maxPrice: z.coerce.number().nonnegative().optional(),
    lowStock: z
      .enum(['true', 'false'])
      .transform((v) => v === 'true')
      .optional(),
    sort: z.enum(['name', 'price', 'stock', 'createdAt']).default('name'),
    order: z.enum(['asc', 'desc']).default('asc'),
  })
  .refine((d) => d.minPrice === undefined || d.maxPrice === undefined || d.minPrice <= d.maxPrice, {
    message: 'minPrice no puede ser mayor que maxPrice',
    path: ['minPrice'],
  });

const movementInput = z.object({
  type: z.enum(['in', 'out']),
  quantity: z.number().int().positive(),
  note: z.string().trim().max(500).nullish(),
});

const listQuery = z.object(pagination);

module.exports = {
  idParams,
  categoryInput,
  productCreate,
  productUpdate,
  productQuery,
  movementInput,
  listQuery,
};
