// 📁 src/app/api/promos/validate/route.ts - NEW FILE

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

interface ValidatePromoRequest {
  code: string;
  storeId: string;
  subtotal: number;
  items: {
    productId: string;
    categoryId?: string;
    quantity: number;
    price: number;
  }[];
  customerPhone?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: ValidatePromoRequest = await request.json();
    const { code, storeId, subtotal, items, customerPhone } = body;

    console.log('[PROMO VALIDATE] Request:', { code, storeId, subtotal, itemCount: items.length });

    if (!code || !storeId) {
      return NextResponse.json(
        { valid: false, discount: 0, error: 'Kode promo dan store ID harus diisi' },
        { status: 400 }
      );
    }

    // Find promo
    const promo = await prisma.promo.findFirst({
      where: {
        code: code.toUpperCase(),
        storeId,
        isActive: true,
      },
    });

    if (!promo) {
      return NextResponse.json({
        valid: false,
        discount: 0,
        error: 'Kode promo tidak ditemukan atau tidak aktif',
      });
    }

    // ===== VALIDATION CHECKS =====

    // 1. Check date validity
    const now = new Date();
    if (now < new Date(promo.startDate) || now > new Date(promo.endDate)) {
      const startStr = new Date(promo.startDate).toLocaleDateString('id-ID');
      const endStr = new Date(promo.endDate).toLocaleDateString('id-ID');
      return NextResponse.json({
        valid: false,
        discount: 0,
        error: `Promo berlaku ${startStr} - ${endStr}`,
      });
    }

    // 2. Check day validity
    if (promo.validDays && promo.validDays.length > 0) {
      const dayNames = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
      const currentDay = dayNames[now.getDay()];
      if (!promo.validDays.includes(currentDay)) {
        const validDaysIndo = promo.validDays.map(d => {
          const days: any = {
            'MONDAY': 'Senin', 'TUESDAY': 'Selasa', 'WEDNESDAY': 'Rabu',
            'THURSDAY': 'Kamis', 'FRIDAY': 'Jumat', 'SATURDAY': 'Sabtu', 'SUNDAY': 'Minggu'
          };
          return days[d];
        }).join(', ');
        return NextResponse.json({
          valid: false,
          discount: 0,
          error: `Promo hanya berlaku di hari: ${validDaysIndo}`,
        });
      }
    }

    // 3. Check time validity (Happy Hour)
    if (promo.validHours) {
      const [startHour, endHour] = promo.validHours.split('-');
      const currentTime = now.getHours() * 60 + now.getMinutes();
      const [startH, startM] = startHour.split(':').map(Number);
      const [endH, endM] = endHour.split(':').map(Number);
      const startMinutes = startH * 60 + startM;
      const endMinutes = endH * 60 + endM;

      if (currentTime < startMinutes || currentTime > endMinutes) {
        return NextResponse.json({
          valid: false,
          discount: 0,
          error: `Promo hanya berlaku jam ${promo.validHours}`,
        });
      }
    }

    // 4. Check usage limit
    if (promo.usageLimit && promo.usageCount >= promo.usageLimit) {
      return NextResponse.json({
        valid: false,
        discount: 0,
        error: 'Kuota promo sudah habis',
      });
    }

    // 5. Check per-customer limit
    if (promo.perCustomerLimit && customerPhone) {
      const customerUsage = await prisma.promoUsageLog.count({
        where: {
          promoCode: code.toUpperCase(),
          customerPhone,
        },
      });

      if (customerUsage >= promo.perCustomerLimit) {
        return NextResponse.json({
          valid: false,
          discount: 0,
          error: `Anda sudah menggunakan promo ini ${promo.perCustomerLimit}x (maksimal)`,
        });
      }
    }

    // 6. Check minimum purchase
    if (subtotal < promo.minPurchase) {
      return NextResponse.json({
        valid: false,
        discount: 0,
        error: `Belanja minimal ${formatCurrency(promo.minPurchase)} untuk promo ini`,
      });
    }

    // 7. Check applicable categories
    if (promo.applicableCategories && promo.applicableCategories.length > 0) {
      const hasValidCategory = items.some(item =>
        item.categoryId && promo.applicableCategories.includes(item.categoryId)
      );
      if (!hasValidCategory) {
        return NextResponse.json({
          valid: false,
          discount: 0,
          error: 'Promo tidak berlaku untuk produk yang Anda pilih',
        });
      }
    }

    // 8. Check applicable products
    if (promo.applicableProducts && promo.applicableProducts.length > 0) {
      const hasValidProduct = items.some(item =>
        promo.applicableProducts.includes(item.productId)
      );
      if (!hasValidProduct) {
        return NextResponse.json({
          valid: false,
          discount: 0,
          error: 'Promo tidak berlaku untuk produk yang Anda pilih',
        });
      }
    }

    // ===== CALCULATE DISCOUNT =====
    let discount = 0;

    if (promo.type === 'PERCENTAGE') {
      discount = (subtotal * promo.value) / 100;
      if (promo.maxDiscount && discount > promo.maxDiscount) {
        discount = promo.maxDiscount;
      }
    } else if (promo.type === 'FIXED') {
      discount = promo.value;
    } else if (promo.type === 'BUY_X_GET_Y') {
      // For Buy X Get Y, discount = price of free items
      if (promo.getProductId && promo.getQuantity) {
        const getProduct = items.find(item => item.productId === promo.getProductId);
        if (getProduct) {
          // Check if customer bought enough items
          const totalBuyItems = items
            .filter(item => promo.applicableProducts.length === 0 || promo.applicableProducts.includes(item.productId))
            .reduce((sum, item) => sum + item.quantity, 0);
          
          if (totalBuyItems >= (promo.buyQuantity || 1)) {
            discount = getProduct.price * (promo.getQuantity || 1);
          }
        }
      }
    }

    // Ensure discount doesn't exceed subtotal
    if (discount > subtotal) {
      discount = subtotal;
    }

    console.log('[PROMO VALIDATE] Success:', { code, discount });

    return NextResponse.json({
      valid: true,
      promo: {
        id: promo.id,
        code: promo.code,
        name: promo.name,
        type: promo.type,
        value: promo.value,
      },
      discount: Math.round(discount),
      message: `Promo "${promo.name}" berhasil diterapkan! Hemat ${formatCurrency(discount)}`,
    });
  } catch (error) {
    console.error('[PROMO VALIDATE] Error:', error);
    return NextResponse.json(
      { valid: false, discount: 0, error: 'Terjadi kesalahan saat validasi promo' },
      { status: 500 }
    );
  }
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(amount);
}