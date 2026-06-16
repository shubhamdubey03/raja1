/**
 * Auth Redux slice — P5-03/P5-04
 * Tokens stored in redux-persist → Keychain (not AsyncStorage).
 */
import {createSlice, PayloadAction} from '@reduxjs/toolkit';

export type UserRole = 'vendor' | 'retailer' | 'admin' | 'super_admin';

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: {
    id: string;
    full_name: string;
    mobile: string;
    role: UserRole;
    status: string;
    avatar_url?: string | null;
    is_verified?: boolean;
    retailer_profile?: {
      id: string;
      business_name: string;
      owner_name: string;
      business_type?: string;
      gst_number?: string;
      address?: string;
      city?: string;
      state?: string;
      pincode?: string;
      credit_limit: number;
    } | null;
    vendor_profile?: {
      id: string;
      business_name: string;
      gst_number?: string;
      pan_number?: string;
      address?: string;
      city?: string;
      state?: string;
      pincode?: string;
    } | null;
  } | null;
  isAuthenticated: boolean;
}

const initialState: AuthState = {
  accessToken: null,
  refreshToken: null,
  user: null,
  isAuthenticated: false,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials(state, action: PayloadAction<{accessToken: string; refreshToken: string; user: AuthState['user']}>) {
      state.accessToken = action.payload.accessToken;
      state.refreshToken = action.payload.refreshToken;
      state.user = action.payload.user;
      state.isAuthenticated = true;
    },
    setTokens(state, action: PayloadAction<{accessToken: string; refreshToken: string}>) {
      state.accessToken = action.payload.accessToken;
      state.refreshToken = action.payload.refreshToken;
    },
    logout(state) {
      state.accessToken = null;
      state.refreshToken = null;
      state.user = null;
      state.isAuthenticated = false;
    },
    updateProfile(state, action: PayloadAction<Partial<AuthState['user']>>) {
      if (state.user) {
        state.user = {...state.user, ...action.payload};
      }
    },
  },
});

export const {setCredentials, setTokens, logout, updateProfile} = authSlice.actions;
export default authSlice.reducer;
