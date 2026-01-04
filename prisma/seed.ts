// 📁 prisma/seed.ts

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  // Create store
  const store = await prisma.store.upsert({
    where: { id: 'demo-store' },
    update: {},
    create: {
      id: 'demo-store',
      name: 'Toko Modern',
      address: 'Jl. Contoh No. 123, Jakarta',
      phone: '081234567890',
      email: 'toko@modern.com',
      currency: 'IDR',
      taxRate: 10,
      receiptFooter: 'Terima kasih atas kunjungan Anda!\nSelamat berbelanja kembali 😊',
      primaryColor: '#8B5CF6',
      isActive: true,
    },
  });

  console.log('✅ Store created:', store.name);

  // Create owner user
  const hashedPassword = await bcrypt.hash('admin123', 10);
  const owner = await prisma.user.upsert({
    where: { username: 'owner' },
    update: {},
    create: {
      username: 'owner',
      password: hashedPassword,
      role: 'OWNER',
      fullName: 'Store Owner',
      storeId: store.id,
      isActive: true,
    },
  });

  console.log('✅ Owner created:', owner.username);

  // Create cashiers with PIN and photos
  const cashiers = [
    {
      username: 'budi',
      fullName: 'Budi Santoso',
      pin: '1234',
      photo: 'https://i.pravatar.cc/150?img=12',
    },
    {
      username: 'siti',
      fullName: 'Siti Nurhaliza',
      pin: '5678',
      photo: 'https://i.pravatar.cc/150?img=5',
    },
    {
      username: 'ahmad',
      fullName: 'Ahmad Fauzi',
      pin: '9876',
      photo: 'https://i.pravatar.cc/150?img=33',
    },
    {
      username: 'dewi',
      fullName: 'Dewi Lestari',
      pin: '4321',
      photo: 'https://i.pravatar.cc/150?img=9',
    },
  ];

  for (const cashierData of cashiers) {
    const cashier = await prisma.user.upsert({
      where: { username: cashierData.username },
      update: {},
      create: {
        username: cashierData.username,
        password: '', // Kasir tidak perlu password
        pin: cashierData.pin,
        role: 'CASHIER',
        fullName: cashierData.fullName,
        photo: cashierData.photo,
        storeId: store.id,
        isActive: true,
      },
    });
    console.log(`✅ Cashier created: ${cashier.fullName} (PIN: ${cashierData.pin})`);
  }

  // Create categories
  const categories = [
    {
      name: 'Makanan',
      icon: '🍔',
      color: '#EF4444',
      storeId: store.id,
    },
    {
      name: 'Minuman',
      icon: '🥤',
      color: '#3B82F6',
      storeId: store.id,
    },
    {
      name: 'Snack',
      icon: '🍿',
      color: '#F59E0B',
      storeId: store.id,
    },
    {
      name: 'Alat Tulis',
      icon: '✏️',
      color: '#10B981',
      storeId: store.id,
    },
  ];

  const createdCategories = [];
  for (const cat of categories) {
    const category = await prisma.category.upsert({
      where: {
        storeId_name: {
          storeId: store.id,
          name: cat.name,
        },
      },
      update: {},
      create: cat,
    });
    createdCategories.push(category);
    console.log('✅ Category created:', category.name);
  }

  // Create products
  const products = [
    {
      name: 'Nasi Goreng Spesial',
      sku: 'NGS-001',
      barcode: '1234567890123',
      description: 'Nasi goreng dengan telur, ayam, dan sayuran',
      price: 25000,
      cost: 15000,
      stock: 100,
      minStock: 10,
      categoryId: createdCategories[0].id,
      storeId: store.id,
    },
    {
      name: 'Mie Goreng',
      sku: 'MG-001',
      barcode: '1234567890124',
      price: 20000,
      cost: 12000,
      stock: 80,
      minStock: 10,
      categoryId: createdCategories[0].id,
      storeId: store.id,
    },
    {
      name: 'Es Teh Manis',
      sku: 'ETM-001',
      barcode: '1234567890125',
      price: 5000,
      cost: 2000,
      stock: 200,
      minStock: 20,
      categoryId: createdCategories[1].id,
      storeId: store.id,
    },
    {
      name: 'Kopi Hitam',
      sku: 'KH-001',
      barcode: '1234567890126',
      price: 8000,
      cost: 3000,
      stock: 150,
      minStock: 20,
      categoryId: createdCategories[1].id,
      storeId: store.id,
    },
    {
      name: 'Jus Jeruk',
      sku: 'JJ-001',
      barcode: '1234567890127',
      price: 12000,
      cost: 6000,
      stock: 100,
      minStock: 15,
      categoryId: createdCategories[1].id,
      storeId: store.id,
    },
    {
      name: 'Keripik Kentang',
      sku: 'KK-001',
      barcode: '1234567890128',
      price: 10000,
      cost: 6000,
      stock: 50,
      minStock: 10,
      categoryId: createdCategories[2].id,
      storeId: store.id,
    },
    {
      name: 'Coklat Bar',
      sku: 'CB-001',
      barcode: '1234567890129',
      price: 15000,
      cost: 10000,
      stock: 60,
      minStock: 10,
      categoryId: createdCategories[2].id,
      storeId: store.id,
    },
    {
      name: 'Pulpen Biru',
      sku: 'PB-001',
      barcode: '1234567890130',
      price: 3000,
      cost: 1500,
      stock: 200,
      minStock: 50,
      categoryId: createdCategories[3].id,
      storeId: store.id,
    },
    {
      name: 'Buku Tulis',
      sku: 'BT-001',
      barcode: '1234567890131',
      price: 5000,
      cost: 3000,
      stock: 100,
      minStock: 20,
      categoryId: createdCategories[3].id,
      storeId: store.id,
    },
    {
      name: 'Penghapus',
      sku: 'PH-001',
      barcode: '1234567890132',
      price: 2000,
      cost: 1000,
      stock: 150,
      minStock: 30,
      categoryId: createdCategories[3].id,
      storeId: store.id,
    },
  ];

  for (const product of products) {
    await prisma.product.upsert({
      where: {
        sku: product.sku,
      },
      update: {},
      create: product,
    });
    console.log('✅ Product created:', product.name);
  }

  // Create sample expenses
  const expenses = [
    {
      category: 'Listrik',
      amount: 500000,
      description: 'Tagihan listrik bulan ini',
      date: new Date('2025-01-01'),
      storeId: store.id,
    },
    {
      category: 'Sewa',
      amount: 3000000,
      description: 'Sewa toko bulan Januari',
      date: new Date('2025-01-01'),
      storeId: store.id,
    },
    {
      category: 'Gaji',
      amount: 2500000,
      description: 'Gaji karyawan',
      date: new Date('2025-01-01'),
      storeId: store.id,
    },
  ];

  for (const expense of expenses) {
    await prisma.expense.create({
      data: expense,
    });
    console.log('✅ Expense created:', expense.category);
  }

  // Create sample settings
  const settings = [
    { key: 'receipt_paper_size', value: 'A4' },
    { key: 'auto_print', value: 'true' },
    { key: 'low_stock_alert', value: 'true' },
    { key: 'theme', value: 'light' },
  ];

  for (const setting of settings) {
    await prisma.setting.upsert({
      where: {
        storeId_key: {
          storeId: store.id,
          key: setting.key,
        },
      },
      update: { value: setting.value },
      create: {
        storeId: store.id,
        key: setting.key,
        value: setting.value,
      },
    });
    console.log('✅ Setting created:', setting.key);
  }

  console.log('\n🎉 Seed completed successfully!\n');
  console.log('📝 Login credentials:');
  console.log('   Owner - username: owner, password: admin123');
  console.log('\n👥 Kasir credentials (Login dengan PIN):');
  console.log('   1. Budi Santoso - PIN: 1234');
  console.log('   2. Siti Nurhaliza - PIN: 5678');
  console.log('   3. Ahmad Fauzi - PIN: 9876');
  console.log('   4. Dewi Lestari - PIN: 4321');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('❌ Seed failed:', e);
    await prisma.$disconnect();
    process.exit(1);
  });