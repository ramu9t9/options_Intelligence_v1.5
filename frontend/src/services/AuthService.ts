import { DatabaseService } from '../lib/database';

interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: 'USER' | 'ADMIN' | 'SUPER_ADMIN';
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'PENDING_VERIFICATION';
  emailVerified: boolean;
  twoFactorEnabled: boolean;
  lastLogin: string;
  createdAt: string;
}

interface AuthResponse {
  success: boolean;
  user?: User;
  accessToken?: string;
  expiresIn?: number;
  message?: string;
  error?: string;
  code?: string;
}

export class AuthService {
  private static instance: AuthService;
  private baseUrl: string;
  private currentUser: User | null = null;
  private accessToken: string | null = null;

  private constructor() {
    this.baseUrl = import.meta.env.VITE_API_URL || '/api';
    this.loadFromStorage();
  }

  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  private loadFromStorage(): void {
    try {
      const storedToken = localStorage.getItem('accessToken');
      const storedUser = localStorage.getItem('user');

      if (storedToken && storedUser) {
        this.accessToken = storedToken;
        this.currentUser = JSON.parse(storedUser);
      }
    } catch (error) {
      console.error('Error loading auth data from storage:', error);
      this.clearStorage();
    }
  }

  private clearStorage(): void {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('user');
    this.accessToken = null;
    this.currentUser = null;
  }

  // Validate password format
  private isValidPassword(password: string): boolean {
    return password && password.length >= 8;
  }

  // Register new user
  async register(userData: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phone?: string;
  }): Promise<AuthResponse> {
    try {
      if (!this.isValidPassword(userData.password)) {
        throw new Error('Password must be at least 8 characters');
      }

      const response = await fetch(`${this.baseUrl}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(userData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Registration failed');
      }

      return { success: true, ...data };
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  }

  // Login user
  async login(email: string, password: string): Promise<AuthResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }

      // Store access token and user data
      if (data.accessToken && data.user) {
        this.accessToken = data.accessToken;
        this.currentUser = data.user;

        localStorage.setItem('accessToken', data.accessToken);
        localStorage.setItem('user', JSON.stringify(data.user));
      }

      return { success: true, ...data };
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  // Logout user
  async logout(): Promise<void> {
    try {
      await fetch(`${this.baseUrl}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
        headers: this.getAuthHeaders(),
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      this.clearStorage();
    }
  }

  // Check current authentication status
  async checkAuth(): Promise<User | null> {
    try {
      if (!this.accessToken) {
        return null;
      }

      // For now, just return the stored user if we have a token
      // In production, you'd verify with the server
      return this.currentUser;
    } catch (error) {
      console.error('Auth check error:', error);
      this.clearStorage();
      return null;
    }
  }

  // Helper methods
  private getAuthHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }
    
    return headers;
  }

  // Get current user
  getCurrentUser(): User | null {
    return this.currentUser;
  }

  // Check if user is authenticated
  isAuthenticated(): boolean {
    return !!this.currentUser && !!this.accessToken;
  }

  // Check if user has specific role
  hasRole(role: string): boolean {
    return this.currentUser?.role === role;
  }

  // Check if user has any of the specified roles
  hasAnyRole(roles: string[]): boolean {
    return !!this.currentUser?.role && roles.includes(this.currentUser.role);
  }

  // Get access token for API calls
  getAccessToken(): string | null {
    return this.accessToken;
  }

  // Update profile (placeholder)
  async updateProfile(profileData: any): Promise<AuthResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/auth/profile`, {
        method: 'PUT',
        headers: this.getAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify(profileData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Profile update failed');
      }

      if (data.user) {
        this.currentUser = data.user;
        localStorage.setItem('user', JSON.stringify(data.user));
      }

      return { success: true, ...data };
    } catch (error) {
      console.error('Profile update error:', error);
      throw error;
    }
  }

  // Change password (placeholder)
  async changePassword(currentPassword: string, newPassword: string): Promise<AuthResponse> {
    try {
      if (!this.isValidPassword(newPassword)) {
        throw new Error('Password must be at least 8 characters');
      }
      
      const response = await fetch(`${this.baseUrl}/auth/change-password`, {
        method: 'PUT',
        headers: this.getAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Password change failed');
      }

      return { success: true, ...data };
    } catch (error) {
      console.error('Password change error:', error);
      throw error;
    }
  }

  // Forgot password (placeholder)
  async forgotPassword(email: string): Promise<AuthResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/auth/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Password reset request failed');
      }

      return { success: true, ...data };
    } catch (error) {
      console.error('Password reset request error:', error);
      throw error;
    }
  }
}

export default AuthService;