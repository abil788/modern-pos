import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const storeId = searchParams.get('storeId');

    if (!storeId) {
      return NextResponse.json({ error: 'Store ID required' }, { status: 400 });
    }

    console.log('📦 Creating backup for store:', storeId);

    // Get all data for backup in parallel
    const [store, products, categories, transactions, expenses, settings, users, promos] = await Promise.all([
      // Store data
      prisma.store.findUnique({ 
        where: { id: storeId }
      }),
      
      // Products with variations
      prisma.product.findMany({ 
        where: { storeId },
        include: {
          variations: true
        }
      }),
      
      // Categories
      prisma.category.findMany({ 
        where: { storeId }
      }),
      
      // Transactions with items (limit for performance)
      prisma.transaction.findMany({ 
        where: { storeId },
        include: {
          items: true
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: 1000
      }),
      
      // Expenses
      prisma.expense.findMany({ 
        where: { storeId },
        orderBy: {
          date: 'desc'
        },
        take: 1000
      }),
      
      // Settings
      prisma.setting.findMany({ 
        where: { storeId }
      }),

      // Users (exclude sensitive data)
      prisma.user.findMany({
        where: { storeId },
        select: {
          id: true,
          username: true,
          role: true,
          fullName: true,
          photo: true,
          isActive: true,
          pin: true,
          createdAt: true,
          updatedAt: true,
          // Password excluded for security
        }
      }),

      // Promos with all fields
      prisma.promo.findMany({
        where: { storeId },
        include: {
          logs: {
            take: 100, // Include recent usage logs
            orderBy: { createdAt: 'desc' }
          }
        }
      })
    ]);

    const summary = {
      productsCount: products.length,
      categoriesCount: categories.length,
      transactionsCount: transactions.length,
      expensesCount: expenses.length,
      settingsCount: settings.length,
      usersCount: users.length,
      promosCount: promos.length,
    };

    console.log('✅ Backup summary:', summary);

    const backup = {
      version: '2.0', // Updated version for new promo fields
      timestamp: new Date().toISOString(),
      store,
      products,
      categories,
      transactions,
      expenses,
      settings,
      users,
      promos,
      summary
    };

    return NextResponse.json(backup);
  } catch (error) {
    console.error('❌ Error creating backup:', error);
    return NextResponse.json({ 
      error: 'Failed to create backup',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const backup = await request.json();
    const storeId = backup.store?.id;

    if (!storeId) {
      return NextResponse.json({ error: 'Invalid backup data' }, { status: 400 });
    }

    console.log('🔄 Restoring backup for store:', storeId);
    console.log('📋 Backup version:', backup.version || '1.0');

    let restored = {
      categories: 0,
      products: 0,
      variations: 0,
      settings: 0,
      users: 0,
      promos: 0,
    };

    if (backup.categories && Array.isArray(backup.categories)) {
      console.log('📂 Restoring categories...');
      
      for (const category of backup.categories) {
        try {
          await prisma.category.upsert({
            where: { id: category.id },
            update: {
              name: category.name,
              icon: category.icon,
              color: category.color,
            },
            create: {
              id: category.id,
              name: category.name,
              icon: category.icon,
              color: category.color,
              storeId: category.storeId,
            },
          });
          restored.categories++;
        } catch (error) {
          console.error('Error restoring category:', category.id, error);
        }
      }
    }

    if (backup.products && Array.isArray(backup.products)) {
      console.log('📦 Restoring products...');
      
      for (const product of backup.products) {
        try {
          const { variations, ...productData } = product;
          
          await prisma.product.upsert({
            where: { id: product.id },
            update: {
              name: productData.name,
              sku: productData.sku,
              barcode: productData.barcode,
              description: productData.description,
              price: productData.price,
              cost: productData.cost,
              stock: productData.stock,
              minStock: productData.minStock,
              image: productData.image,
              categoryId: productData.categoryId,
              isActive: productData.isActive,
            },
            create: {
              id: productData.id,
              name: productData.name,
              sku: productData.sku,
              barcode: productData.barcode,
              description: productData.description,
              price: productData.price,
              cost: productData.cost,
              stock: productData.stock,
              minStock: productData.minStock,
              image: productData.image,
              categoryId: productData.categoryId,
              storeId: productData.storeId,
              isActive: productData.isActive,
            },
          });
          restored.products++;

          // Restore product variations
          if (variations && Array.isArray(variations)) {
            for (const variation of variations) {
              try {
                await prisma.productVariation.upsert({
                  where: { id: variation.id },
                  update: {
                    name: variation.name,
                    price: variation.price,
                    stock: variation.stock,
                    sku: variation.sku,
                  },
                  create: {
                    id: variation.id,
                    name: variation.name,
                    price: variation.price,
                    stock: variation.stock,
                    sku: variation.sku,
                    productId: variation.productId,
                  },
                });
                restored.variations++;
              } catch (error) {
                console.error('Error restoring variation:', variation.id, error);
              }
            }
          }
        } catch (error) {
          console.error('Error restoring product:', product.id, error);
        }
      }
    }

    if (backup.settings && Array.isArray(backup.settings)) {
      console.log('⚙️ Restoring settings...');
      
      for (const setting of backup.settings) {
        try {
          await prisma.setting.upsert({
            where: { id: setting.id },
            update: {
              value: setting.value,
            },
            create: {
              id: setting.id,
              key: setting.key,
              value: setting.value,
              storeId: setting.storeId,
            },
          });
          restored.settings++;
        } catch (error) {
          console.error('Error restoring setting:', setting.id, error);
        }
      }
    }

    if (backup.users && Array.isArray(backup.users)) {
      console.log('👥 Restoring users...');
      
      for (const user of backup.users) {
        try {
          await prisma.user.upsert({
            where: { id: user.id },
            update: {
              username: user.username,
              fullName: user.fullName,
              photo: user.photo,
              pin: user.pin,
              role: user.role,
              isActive: user.isActive,
            },
            create: {
              id: user.id,
              username: user.username,
              fullName: user.fullName,
              photo: user.photo,
              pin: user.pin,
              role: user.role,
              isActive: user.isActive,
              storeId: user.storeId,
              password: '', // Empty password for security
            },
          });
          restored.users++;
        } catch (error) {
          console.error('Error restoring user:', user.id, error);
        }
      }
    }

    if (backup.promos && Array.isArray(backup.promos)) {
      console.log('🎁 Restoring promos...');
      
      for (const promo of backup.promos) {
        try {
          // Handle both old and new backup formats
          const promoData: any = {
            code: promo.code || `PROMO-${Date.now()}`, // Generate code if missing (old backup)
            name: promo.name,
            description: promo.description || null,
            type: promo.type,
            value: promo.value,
            minPurchase: promo.minPurchase || 0,
            maxDiscount: promo.maxDiscount || null,
            applicableCategories: promo.applicableCategories || [],
            applicableProducts: promo.applicableProducts || [],
            startDate: new Date(promo.startDate),
            endDate: new Date(promo.endDate),
            validDays: promo.validDays || [],
            validHours: promo.validHours || null,
            usageLimit: promo.usageLimit || null,
            usageCount: promo.usageCount || 0,
            perCustomerLimit: promo.perCustomerLimit || null,
            buyQuantity: promo.buyQuantity || null,
            getQuantity: promo.getQuantity || null,
            getProductId: promo.getProductId || null,
            isActive: promo.isActive,
            productId: promo.productId || null,
          };

          await prisma.promo.upsert({
            where: { id: promo.id },
            update: {
              code: promoData.code,
              name: promoData.name,
              description: promoData.description,
              type: promoData.type,
              value: promoData.value,
              minPurchase: promoData.minPurchase,
              maxDiscount: promoData.maxDiscount,
              applicableCategories: promoData.applicableCategories,
              applicableProducts: promoData.applicableProducts,
              startDate: promoData.startDate,
              endDate: promoData.endDate,
              validDays: promoData.validDays,
              validHours: promoData.validHours,
              usageLimit: promoData.usageLimit,
              usageCount: promoData.usageCount,
              perCustomerLimit: promoData.perCustomerLimit,
              buyQuantity: promoData.buyQuantity,
              getQuantity: promoData.getQuantity,
              getProductId: promoData.getProductId,
              isActive: promoData.isActive,
              productId: promoData.productId,
            },
            create: {
              id: promo.id,
              code: promoData.code,
              name: promoData.name,
              description: promoData.description,
              type: promoData.type,
              value: promoData.value,
              minPurchase: promoData.minPurchase,
              maxDiscount: promoData.maxDiscount,
              applicableCategories: promoData.applicableCategories,
              applicableProducts: promoData.applicableProducts,
              startDate: promoData.startDate,
              endDate: promoData.endDate,
              validDays: promoData.validDays,
              validHours: promoData.validHours,
              usageLimit: promoData.usageLimit,
              usageCount: promoData.usageCount,
              perCustomerLimit: promoData.perCustomerLimit,
              buyQuantity: promoData.buyQuantity,
              getQuantity: promoData.getQuantity,
              getProductId: promoData.getProductId,
              isActive: promoData.isActive,
              productId: promoData.productId,
              storeId: promo.storeId,
            },
          });
          restored.promos++;
        } catch (error) {
          console.error('Error restoring promo:', promo.id, error);
        }
      }
    }

    console.log('✅ Backup restored successfully:', restored);

    return NextResponse.json({ 
      success: true, 
      message: 'Backup restored successfully',
      restored,
      version: backup.version || '1.0'
    });
  } catch (error) {
    console.error('❌ Error restoring backup:', error);
    return NextResponse.json({ 
      error: 'Failed to restore backup',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}