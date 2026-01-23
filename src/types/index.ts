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
  role: 'CASHIER' | 'OWNER' | 'ADMIN';
  fullName: string;
  isLocked: boolean;
  lockedUntil?: Date;
  failedAttempts: number;
  lastLogin?: Date;
  storeId: string;
}

export interface Category {
  id: string;
  name: string;
  icon?: string;
  color?: string;
  storeId: string;
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
  category?: Category;
  storeId: string;
  isActive: boolean;
  variations?: ProductVariation[];
}

export interface ProductVariation {
  id: string;
  productId: string;
  name: string;
  price: number;
  stock: number;
  sku?: string;
}

export interface CartItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  discount: number;
  subtotal: number;
  image?: string;
  maxStock?: number; // Added for stock validation
}

export interface Transaction {
  id: string;
  invoiceNumber: string;
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  paymentMethod: 'CASH' | 'CARD' | 'QRIS' | 'TRANSFER';
  amountPaid: number;
  change: number;
  customerName?: string;
  customerPhone?: string;
  notes?: string;
  cashierId: string;
  storeId: string;
  items: TransactionItem[];
  promoCode?: string;
  promoDiscount: number;
  createdAt: Date;
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
}

export interface Expense {
  id: string;
  category: string;
  amount: number;
  description?: string;
  date: Date;
  storeId: string;
}

export interface Promo {
  id: string;
  name: string;
  type: 'PERCENTAGE' | 'FIXED';
  value: number;
  minPurchase: number;
  startDate: Date;
  endDate: Date;
  isActive: boolean;
  productId?: string;
}

export interface DashboardStats {
  todayRevenue: number;
  todayTransactions: number;
  todayProfit: number;
  monthRevenue: number;
  monthTransactions: number;
  monthProfit: number;
  lowStockProducts: number;
  topProducts: {
    id: string;
    name: string;
    totalSold: number;
    revenue: number;
  }[];
  revenueChart: {
    date: string;
    revenue: number;
    transactions: number;
  }[];
}

export interface ReportFilter {
  startDate: Date;
  endDate: Date;
  type: 'daily' | 'monthly' | 'custom';
}

export interface ActivityLog {
  id: string;
  userId: string;
  action: string;
  details?: string;
  createdAt: Date;
}

export interface Promo {
  id: string;
  code: string;
  name: string;
  description?: string;
  type: 'PERCENTAGE' | 'FIXED' | 'BUY_X_GET_Y';
  value: number;
  
  // Conditions
  minPurchase: number;
  maxDiscount?: number;
  applicableCategories: string[];
  applicableProducts: string[];
  
  // Date & Time
  startDate: Date;
  endDate: Date;
  validDays: string[];
  validHours?: string;
  
  // Usage
  usageLimit?: number;
  usageCount: number;
  perCustomerLimit?: number;
  
  // Buy X Get Y
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

export interface PromoValidationResult {
  valid: boolean;
  promo?: {
    id: string;
    code: string;
    name: string;
    type: string;
    value: number;
  };
  discount: number;
  error?: string;
  message?: string;
}

export interface KitchenOrder {
  id: string;
  transactionId: string;
  invoiceNumber: string;
  items: KitchenOrderItem[];
  status: 'pending' | 'preparing' | 'ready' | 'completed';
  priority: 'normal' | 'urgent';
  station: string; // e.g., 'grill', 'fryer', 'salad', 'drinks'
  tableNumber?: string;
  customerName?: string;
  orderType: 'dine-in' | 'takeaway' | 'delivery';
  notes?: string;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  estimatedTime: number; // in minutes
}

export interface KitchenOrderItem {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  notes?: string;
  modifiers?: string[];
  station: string;
  status: 'pending' | 'preparing' | 'ready';
  prepTime: number; // in minutes
}

export interface KitchenStation {
  id: string;
  name: string;
  displayName: string;
  color: string;
  icon: string;
  orders: KitchenOrder[];
  isActive: boolean;
}

export interface KDSSettings {
  storeId: string;
  enableSound: boolean;
  soundVolume: number;
  autoCompleteTime: number; // seconds
  showCustomerName: boolean;
  colorCodingEnabled: boolean;
  urgentThreshold: number; // minutes
  stations: KitchenStation[];
}
