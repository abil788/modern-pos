export interface CashierSession {
  userId: string;
  fullName: string;
  role: string;
  timestamp: number;
}

export interface OwnerSession {
  authenticated: boolean;
  timestamp: number;
}

const CASHIER_SESSION_KEY = 'cashier_session';
const OWNER_SESSION_KEY = 'owner_session';
const SESSION_DURATION = 8 * 60 * 60 * 1000; // 8 jam

// Cashier Session
export function getCashierSession(): CashierSession | null {
  if (typeof window === 'undefined') return null;
  
  const data = localStorage.getItem(CASHIER_SESSION_KEY);
  if (!data) return null;

  try {
    const session: CashierSession = JSON.parse(data);
    
    // Cek expiry
    if (Date.now() - session.timestamp > SESSION_DURATION) {
      clearCashierSession();
      return null;
    }

    return session;
  } catch {
    return null;
  }
}

export function saveCashierSession(session: CashierSession): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(CASHIER_SESSION_KEY, JSON.stringify(session));
}

export function clearCashierSession(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(CASHIER_SESSION_KEY);
}

// Owner Session
export function getOwnerSession(): OwnerSession | null {
  if (typeof window === 'undefined') return null;
  
  const data = localStorage.getItem(OWNER_SESSION_KEY);
  if (!data) return null;

  try {
    const session: OwnerSession = JSON.parse(data);
    
    // Cek expiry
    if (Date.now() - session.timestamp > SESSION_DURATION) {
      clearOwnerSession();
      return null;
    }

    return session;
  } catch {
    return null;
  }
}

export function saveOwnerSession(session: OwnerSession): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(OWNER_SESSION_KEY, JSON.stringify(session));
}

export function clearOwnerSession(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(OWNER_SESSION_KEY);
}

// Logout all
export function logoutAll(): void {
  clearCashierSession();
  clearOwnerSession();
}

// Check any active session
export function hasActiveSession(): boolean {
  return getCashierSession() !== null || getOwnerSession() !== null;
}
