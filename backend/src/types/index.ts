// ─── Enums ────────────────────────────────────────────────────────────────────

export enum BusType {
  GREEN = 'green',
  PINK = 'pink',
}

export enum TicketStatus {
  VALID = 'valid',
  USED = 'used',
  EXPIRED = 'expired',
}

export enum Gender {
  MALE = 'male',
  FEMALE = 'female',
  OTHER = 'other',
  PREFER_NOT_TO_SAY = 'prefer_not_to_say',
}

export enum UserRole {
  USER = 'user',
  ADMIN = 'admin',
  DRIVER = 'driver',
}

export enum AlertType {
  DELAY = 'delay',
  DISRUPTION = 'disruption',
  INFO = 'info',
}

export enum BusStatus {
  ACTIVE = 'active',
  MAINTENANCE = 'maintenance',
  INACTIVE = 'inactive',
}

// ─── Core Domain ──────────────────────────────────────────────────────────────

export interface LatLng {
  latitude: number;
  longitude: number;
}

export interface User {
  id: string;
  email: string;
  display_name: string;
  password_hash: string;
  photo_url?: string;
  wallet_balance: number;
  gender?: Gender;
  reward_points: number;
  carbon_saved: number;
  role: UserRole;
  assigned_bus_id?: string;
  created_at: Date;
  updated_at: Date;
}

export interface UserPublic extends Omit<User, 'password_hash'> {}

export interface Stop {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  created_at: Date;
}

export interface Route {
  id: string;
  name: string;
  type: BusType;
  fare: number;
  is_tourist: boolean;
  stops?: RouteStop[];
  created_at: Date;
}

export interface RouteStop {
  stop_id: string;
  stop_order: number;
  stop?: Stop;
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
  last_updated: Date;
  route?: Route;
}

export interface Ticket {
  id: string;
  user_id: string;
  route_id: string;
  status: TicketStatus;
  fare: number;
  qr_code?: string;
  created_at: Date;
  used_at?: Date;
  expires_at: Date;
}

export interface Feedback {
  id: string;
  user_id: string;
  bus_id?: string;
  rating: number;
  comment?: string;
  created_at: Date;
  user?: Pick<User, 'display_name' | 'photo_url'>;
}

export interface Alert {
  id: string;
  type: AlertType;
  message: string;
  route_id?: string;
  created_by: string;
  is_active: boolean;
  created_at: Date;
}

export interface News {
  id: string;
  title: string;
  content: string;
  created_at: Date;
}

// ─── Request / Response DTOs ─────────────────────────────────────────────────

export interface RegisterDto {
  email: string;
  password: string;
  display_name: string;
  gender?: Gender;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: UserPublic;
}

export interface BusLocationUpdate {
  bus_id: string;
  latitude: number;
  longitude: number;
  occupied_seats?: number;
}

export interface TopUpDto {
  amount: number;
}

export interface BuyTicketDto {
  route_id: string;
}

export interface CreateAlertDto {
  type: AlertType;
  message: string;
  route_id?: string;
}

export interface CreateFeedbackDto {
  bus_id?: string;
  rating: number;
  comment?: string;
}

// ─── Socket Events ─────────────────────────────────────────────────────────────

export interface ServerToClientEvents {
  'bus:location_updated': (data: BusLocationUpdate & { last_updated: string }) => void;
  'bus:status_changed': (data: { bus_id: string; status: BusStatus }) => void;
  'alert:new': (alert: Alert) => void;
  'ticket:validated': (data: { ticket_id: string; bus_id: string }) => void;
}

export interface ClientToServerEvents {
  'driver:update_location': (data: BusLocationUpdate) => void;
  'subscribe:route': (route_id: string) => void;
  'unsubscribe:route': (route_id: string) => void;
}

export interface JwtPayload {
  userId: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}
