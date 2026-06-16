/**
 * Settings slice — persisted app-level preferences.
 * Currently handles: selected UI language.
 */
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export type AppLanguage = 'en' | 'hi' | 'mr' | 'gu' | 'ta' | 'te';

interface SettingsState {
  language: AppLanguage;
}

const initialState: SettingsState = {
  language: 'en',
};

const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    setLanguage(state, action: PayloadAction<AppLanguage>) {
      state.language = action.payload;
    },
  },
});

export const { setLanguage } = settingsSlice.actions;
export default settingsSlice.reducer;
