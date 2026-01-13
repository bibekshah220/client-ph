export type UserRole = 'admin' | 'manager' | 'pharmacist' | 'cashier';

export interface User {
  id: string;
  name: string;
  email: string;
  mobile: string;
  role: UserRole;
  isMobileVerified?: boolean;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Profile {
  id: string;
  name: string;
  email: string;
  mobile?: string;
  role: UserRole;
}

export interface MedicineCategory {
  value: string;
  label: string;
}

export interface Medicine {
  _id: string;
  id?: string; // For compatibility
  name: string;
  genericName?: string;
  manufacturer?: string;
  category: 'tablet' | 'capsule' | 'syrup' | 'injection' | 'ointment' | 'drops' | 'other';
  dosageForm?: string;
  strength?: string;
  barcode?: string;
  prescriptionRequired: boolean;
  description?: string;
  sideEffects?: string;
  status: 'active' | 'inactive';
  createdBy?: {
    _id: string;
    name: string;
    email: string;
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface Inventory {
  _id?: string;
  id?: string;
  medicine: string | Medicine;
  batchNumber: string;
  manufacturingDate: string;
  expiryDate: string;
  quantity: number;
  purchasePrice: number;
  sellingPrice: number;
  supplier?: string;
  purchaseDate: string;
  status: 'available' | 'expired' | 'damaged' | 'sold-out';
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Supplier {
  _id?: string;
  id?: string;
  name: string;
  contactPerson: string;
  email?: string;
  mobile: string;
  phone?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    country?: string;
    postalCode?: string;
  };
  taxId?: string;
  paymentTerms?: 'cash' | 'credit-7' | 'credit-15' | 'credit-30' | 'credit-60';
  creditLimit?: number;
  status: 'active' | 'inactive';
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Sale {
  _id?: string;
  id?: string;
  invoiceNumber: string;
  pharmacyName?: string;
  pharmacyPAN?: string;
  pharmacyAddress?: string;
  pharmacyPhone?: string;
  customerName?: string;
  customerMobile?: string;
  customerAddress?: string;
  items: SaleItem[];
  subtotal: number;
  discount: number;
  discountPercentage: number;
  vatRate: number;
  vatAmount: number;
  totalAmount: number;
  paymentMethod: 'cash' | 'card' | 'esewa' | 'khalti' | 'mobile-payment' | 'credit';
  paymentStatus: 'paid' | 'partial' | 'pending';
  amountPaid: number;
  amountDue: number;
  prescription?: string;
  cashier: string | { _id: string; name: string; email: string };
  status: 'completed' | 'refunded' | 'partially-refunded';
  refundAmount?: number;
  refundReason?: string;
  refundDate?: string;
  notes?: string;
  saleDate: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface SaleItem {
  medicine: string | Medicine;
  inventory: string;
  batchNumber: string;
  manufacturingDate?: string;
  expiryDate?: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface AuditLog {
  id: string;
  user_id?: string;
  action: string;
  table_name?: string;
  record_id?: string;
  old_data?: Record<string, unknown>;
  new_data?: Record<string, unknown>;
  ip_address?: string;
  created_at: string;
}

export interface CartItem {
  medicine: Medicine;
  inventory: Inventory;
  quantity: number;
  discount_percent: number;
}

export interface DashboardStats {
  totalSalesToday: number;
  totalSalesMonth: number;
  lowStockCount: number;
  expiringSoonCount: number;
  totalMedicines: number;
  recentSales: Sale[];
}
