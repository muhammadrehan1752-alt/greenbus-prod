export enum BusType { GREEN = 'green', PINK = 'pink' }
export enum TicketStatus { VALID = 'valid', USED = 'used', EXPIRED = 'expired' }
export enum Gender { MALE = 'male', FEMALE = 'female', OTHER = 'other', PREFER_NOT_TO_SAY = 'prefer_not_to_say' }
export enum UserRole { USER = 'user', ADMIN = 'admin', DRIVER = 'driver' }
export enum AlertType { DELAY = 'delay', DISRUPTION = 'disruption', INFO = 'info' }
export enum BusStatus { ACTIVE = 'active', MAINTENANCE = 'maintenance', INACTIVE = 'inactive' }

export interface User {
  id: string;
  email: string;
  display_name: string;
  photo_url?: string;
  wallet_balance: number;
  gender?: Gender;
  reward_points: number;
  carbon_saved: number;
  role: UserRole;
  assigned_bus_id?: string;
  created_at: string;
  updated_at: string;
}

export interface Stop {
  stop_id?: string;
  id?: string;
  name: string;
  latitude: number;
  longitude: number;
  stop_order?: number;
}

export interface Route {
  id: string;
  name: string;
  type: BusType;
  fare: number;
  is_tourist: boolean;
  stops: Stop[];
}

export interface Bus {
  id: string;
  route_id: string;
  type: BusType;
  latitude: number;
  longitude: number;
  capacity: number;
  occupied_seats: number;
  status: BusStatus;
  driver_id?: string;
  last_updated: string;
  route_name?: string;
  driver_name?: string;
}

export interface Ticket {
  id: string;
  user_id: string;
  route_id: string;
  status: TicketStatus;
  fare: number;
  qr_code?: string;
  created_at: string;
  used_at?: string;
  expires_at: string;
  route_name?: string;
  route_type?: BusType;
}

export interface WalletTransaction {
  id: string;
  amount: number;
  type: 'topup' | 'purchase' | 'refund';
  reference?: string;
  balance_after: number;
  created_at: string;
}

export interface Feedback {
  id: string;
  user_id: string;
  bus_id?: string;
  rating: number;
  comment?: string;
  display_name?: string;
  photo_url?: string;
  created_at: string;
}

export interface Alert {
  id: string;
  type: AlertType;
  message: string;
  route_id?: string;
  route_name?: string;
  is_active: boolean;
  created_at: string;
}

export interface News {
  id: string;
  title: string;
  content: string;
  created_at: string;
}

export interface AuthState {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
}

export interface SocketBusUpdate {
  bus_id: string;
  latitude: number;
  longitude: number;
  occupied_seats?: number;
  last_updated: string;
}
