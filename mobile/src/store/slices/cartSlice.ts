/**
 * Cart Redux slice — P5-13
 * Mirrors backend cart; local optimistic state.
 */
import {createSlice, PayloadAction} from '@reduxjs/toolkit';

export interface CartItem {
  id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  price_snapshot: number; // paise
  gst_rate: number;
}

interface CartState {
  items: CartItem[];
  movValid: boolean;
  shortfallAmount: number;
}

const initialState: CartState = {
  items: [],
  movValid: true,
  shortfallAmount: 0,
};

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    setCart(state, action: PayloadAction<CartItem[]>) {
      state.items = action.payload;
    },
    setMovValidation(state, action: PayloadAction<{valid: boolean; shortfall_amount: number}>) {
      state.movValid = action.payload.valid;
      state.shortfallAmount = action.payload.shortfall_amount;
    },
    clearCart(state) {
      state.items = [];
      state.movValid = true;
      state.shortfallAmount = 0;
    },
  },
});

export const {setCart, setMovValidation, clearCart} = cartSlice.actions;
export default cartSlice.reducer;
