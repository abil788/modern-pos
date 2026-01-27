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
      username: 'na Xi han',
      fullName: 'naXihuy',
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
      pin: '1111',
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
      name: 'Mie',
      icon: '🍜',
      color: '#10B981',
      storeId: store.id,
    },
    {
      name: 'Pizza',
      icon: '🍕',
      color: '#8B5CF6',
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
  // Create products
  const products = [
    // 🍕 PIZZA
    {
      name: 'Thailand Pizza',
      sku: 'TP-247',
      barcode: 'TP-247',
      description: 'Pizza dengan saus khas Thailand dan topping eksotis',
      price: 45000,
      cost: 28000,
      stock: 40,
      minStock: 5,
      categoryId: createdCategories[4].id,
      storeId: store.id,
    },
    {
      name: 'Cheese Pizza',
      sku: 'CP-381',
      barcode: 'CP-381',
      description: 'Pizza keju meleleh dengan adonan lembut',
      price: 42000,
      cost: 26000,
      stock: 35,
      minStock: 5,
      categoryId: createdCategories[4].id,
      storeId: store.id,
    },
    {
      name: 'Meat Lover Pizza',
      sku: 'MLP-519',
      barcode: 'MLP-519',
      description: 'Pizza dengan berbagai daging premium',
      price: 52000,
      cost: 34000,
      stock: 30,
      minStock: 5,
      categoryId: createdCategories[4].id,
      storeId: store.id,
    },

    // 🍜 MIE
    {
      name: 'Ramen',
      sku: 'R-102',
      barcode: 'R-102',
      description: 'Ramen kuah kaldu gurih khas Jepang',
      price: 30000,
      cost: 18000,
      stock: 50,
      minStock: 10,
      categoryId: createdCategories[3].id,
      storeId: store.id,
    },
    {
      name: 'Signature Ramen',
      sku: 'SR-221',
      barcode: 'SR-221',
      description: 'Ramen spesial dengan topping lengkap',
      price: 38000,
      cost: 24000,
      stock: 40,
      minStock: 8,
      categoryId: createdCategories[3].id,
      storeId: store.id,
    },
    {
      name: 'Indomie Goreng',
      sku: 'IG-777',
      barcode: 'IG-777',
      description: 'Indomie goreng favorit semua orang',
      price: 12000,
      cost: 7000,
      stock: 100,
      minStock: 20,
      categoryId: createdCategories[3].id,
      storeId: store.id,
    },
    {
      name: 'Indomie Kuah',
      sku: 'IK-778',
      barcode: 'IK-778',
      description: 'Indomie kuah hangat dan nikmat',
      price: 12000,
      cost: 7000,
      stock: 100,
      minStock: 20,
      categoryId: createdCategories[3].id,
      storeId: store.id,
    },
    {
      name: 'Fried Kwetiau',
      sku: 'FK-334',
      barcode: 'FK-334',
      description: 'Kwetiau goreng dengan bumbu oriental',
      price: 28000,
      cost: 17000,
      stock: 60,
      minStock: 10,
      categoryId: createdCategories[3].id,
      storeId: store.id,
    },

    // 🍽️ MAKANAN
    {
      name: 'Healthy Breakfast',
      sku: 'HB-901',
      barcode: 'HB-901',
      description: 'Sarapan sehat penuh nutrisi',
      price: 25000,
      cost: 15000,
      stock: 40,
      minStock: 8,
      categoryId: createdCategories[0].id,
      storeId: store.id,
    },
    {
      name: 'Chicken Smackdown',
      sku: 'CS-666',
      barcode: 'CS-666',
      description: 'Ayam crispy pedas menggugah selera',
      price: 32000,
      cost: 20000,
      stock: 50,
      minStock: 10,
      categoryId: createdCategories[0].id,
      storeId: store.id,
    },
    {
      name: 'Chicken Nugget',
      sku: 'CN-118',
      barcode: 'CN-118',
      description: 'Nugget ayam renyah dan lezat',
      price: 20000,
      cost: 13000,
      stock: 80,
      minStock: 15,
      categoryId: createdCategories[0].id,
      storeId: store.id,
    },
    {
      name: 'Tahu Sumedang',
      sku: 'TS-909',
      barcode: 'TS-909',
      description: 'Tahu goreng khas Sumedang',
      price: 15000,
      cost: 9000,
      stock: 70,
      minStock: 15,
      categoryId: createdCategories[0].id,
      storeId: store.id,
    },

    // 🥤 MINUMAN
    {
      name: 'Caffe Latte',
      sku: 'CL-501',
      barcode: 'CL-501',
      description: 'Kopi latte creamy dan lembut',
      price: 22000,
      cost: 12000,
      stock: 100,
      minStock: 20,
      categoryId: createdCategories[1].id,
      storeId: store.id,
    },
    {
      name: 'Chocolate Latte',
      sku: 'CHL-502',
      barcode: 'CHL-502',
      description: 'Latte coklat manis dan hangat',
      price: 23000,
      cost: 13000,
      stock: 90,
      minStock: 20,
      categoryId: createdCategories[1].id,
      storeId: store.id,
    },
    {
      name: 'Matcha Latte',
      sku: 'ML-503',
      barcode: 'ML-503',
      description: 'Matcha latte autentik Jepang',
      price: 24000,
      cost: 14000,
      stock: 80,
      minStock: 15,
      categoryId: createdCategories[1].id,
      storeId: store.id,
    },
    {
      name: 'Butterscotch Coffee',
      sku: 'BC-504',
      barcode: 'BC-504',
      description: 'Kopi dengan rasa karamel lembut',
      price: 25000,
      cost: 15000,
      stock: 70,
      minStock: 15,
      categoryId: createdCategories[1].id,
      storeId: store.id,
    },
    {
      name: 'Americano',
      sku: 'A-505',
      barcode: 'A-505',
      description: 'Kopi hitam klasik',
      price: 18000,
      cost: 9000,
      stock: 100,
      minStock: 20,
      categoryId: createdCategories[1].id,
      storeId: store.id,
    },
    {
      name: 'Ice Tea',
      sku: 'IT-506',
      barcode: 'IT-506',
      description: 'Teh dingin menyegarkan',
      price: 8000,
      cost: 3000,
      stock: 150,
      minStock: 30,
      categoryId: createdCategories[1].id,
      storeId: store.id,
    },

    // 🍿 SNACK
    {
      name: 'Potato Chips',
      sku: 'PC-701',
      barcode: 'PC-701',
      description: 'Keripik kentang renyah',
      price: 12000,
      cost: 7000,
      stock: 90,
      minStock: 20,
      categoryId: createdCategories[2].id,
      storeId: store.id,
    },
    {
      name: 'Potato Wedges',
      sku: 'PW-702',
      barcode: 'PW-702',
      description: 'Kentang wedges goreng gurih',
      price: 18000,
      cost: 11000,
      stock: 60,
      minStock: 15,
      categoryId: createdCategories[2].id,
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
  console.log('   1. na Xi han - PIN: 1234');
  console.log('   2. Siti Nurhaliza - PIN: 5678');
  console.log('   3. Ahmad Fauzi - PIN: 1111');
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