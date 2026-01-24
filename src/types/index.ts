// src/types/index.ts

export interface Store {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  logo?: string;
  currency: string;
  taxRate: number;
  receiptFooter?: string;
  primaryColor: string;
  licenseKey?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface User {
  id: string;
  username: string;
  password: string;
  pin?: string;
  role: string;
  fullName: string;
  photo?: string;
  isActive: boolean;
  isLocked: boolean;
  lockedUntil?: Date;
  failedAttempts: number;
  lastLogin?: Date;
  storeId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Category {
  id: string;
  name: string;
  icon?: string;
  color?: string;
  storeId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Product {
  id: string;
  name: string;
  sku?: string;
  barcode?: string;
  description?: string;
  price: number;
  cost: number;
  stock: number;
  minStock: number;
  image?: string;
  categoryId?: string;
  storeId: string;
  isActive: boolean;
  // ✅ KDS Fields
  prepTime?: number;
  kitchenStation?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductVariation {
  id: string;
  productId: string;
  name: string;
  price: number;
  stock: number;
  sku?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TransactionItem {
  id: string;
  transactionId: string;
  productId: string;
  productName: string;
  quantity: number;
  price: number;
  subtotal: number;
  discount: number;
  notes?: string; // ✅ Item notes for customization
  // ✅ KDS Fields
  kitchenStation?: string;
  kitchenStatus?: string;
  prepTime?: number;
  modifiers?: string[];
  createdAt: Date;
}

export interface Transaction {
  id: string;
  invoiceNumber: string;
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  paymentMethod: string;
  paymentChannel?: string;
  paymentReference?: string;
  amountPaid: number;
  change: number;
  customerName?: string;
  customerPhone?: string;
  notes?: string;
  promoCode?: string;
  promoDiscount: number;
  
  // ✅ KDS Fields
  orderType?: 'dine-in' | 'takeaway' | 'delivery';
  tableNumber?: string;
  kitchenStatus?: string;
  sentToKitchenAt?: Date;
  kitchenStartedAt?: Date;
  kitchenCompletedAt?: Date;
  
  cashierId: string;
  storeId: string;
  isSynced: boolean;
  isReconciled: boolean;
  reconciledAt?: Date;
  reconciledBy?: string;
  createdAt: Date;
  updatedAt: Date;
  items: TransactionItem[];
  cashier?: {
    id: string;
    fullName: string;
    username: string;
    role: string;
  };
}

export interface CashDrawer {
  id: string;
  storeId: string;
  cashierId: string;
  openingBalance: number;
  closingBalance?: number;
  expectedBalance?: number;
  actualBalance?: number;
  difference?: number;
  notes?: string;
  openedAt: Date;
  closedAt?: Date;
  status: string;
}

export interface Expense {
  id: string;
  category: string;
  amount: number;
  description?: string;
  date: Date;
  storeId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Promo {
  id: string;
  code: string;
  name: string;
  description?: string;
  type: string;
  value: number;
  minPurchase: number;
  maxDiscount?: number;
  applicableCategories: string[];
  applicableProducts: string[];
  startDate: Date;
  endDate: Date;
  validDays: string[];
  validHours?: string;
  usageLimit?: number;
  usageCount: number;
  perCustomerLimit?: number;
  buyQuantity?: number;
  getQuantity?: number;
  getProductId?: string;
  isActive: boolean;
  productId?: string;
  storeId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PromoUsageLog {
  id: string;
  promoId: string;
  promoCode: string;
  customerPhone?: string;
  transactionId?: string;
  invoiceNumber?: string;
  discountAmount: number;
  cashierId: string;
  storeId: string;
  createdAt: Date;
}

export interface Setting {
  id: string;
  key: string;
  value: string;
  storeId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ActivityLog {
  id: string;
  userId: string;
  action: string;
  details?: string;
  storeId: string;
  createdAt: Date;
}

// ✅ KDS Types
export interface KitchenOrder {
  id: string;
  transactionId: string;
  invoiceNumber: string;
  status: 'pending' | 'preparing' | 'ready' | 'completed';
  tableNumber?: string;
  customerName?: string;
  orderType: 'dine-in' | 'takeaway' | 'delivery';
  notes?: string;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  items: KitchenOrderItem[];
}

export interface KitchenOrderItem {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  notes?: string;
  station: string;
  status: 'pending' | 'preparing' | 'ready';
  prepTime: number;
  modifiers?: string[];
}

// Cart Store Types
export interface CartItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  subtotal: number;
  discount: number;
  image?: string;
  maxStock?: number;
}

// Payment Types
export interface PaymentChannel {
  id: string;
  name: string;
  icon?: string;
}

export interface PaymentMethod {
  id: string;
  name: string;
  icon: any;
  bgColor: string;
  channels: PaymentChannel[];
}

// Report Types
export interface DailySummary {
  date: string;
  totalTransactions: number;
  totalRevenue: number;
  totalTax: number;
  totalDiscount: number;
  avgTransaction: number;
  topProducts: {
    productId: string;
    productName: string;
    quantity: number;
    revenue: number;
  }[];
  paymentMethods: {
    method: string;
    count: number;
    total: number;
  }[];
}

// Filter Types
export interface DateRange {
  startDate: Date;
  endDate: Date;
}

export interface TransactionFilters {
  storeId: string;
  startDate?: string;
  endDate?: string;
  cashierId?: string;
  paymentMethod?: string;
  search?: string;
  page?: number;
  limit?: number;
}