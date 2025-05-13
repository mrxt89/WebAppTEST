import { createSlice } from '@reduxjs/toolkit';

const notificationSettingsSlice = createSlice({
  name: 'notificationSettings',
  initialState: {
    notificationsEnabled: true,
    soundEnabled: true,
    webNotificationsEnabled: false,
    webNotificationsPermission: 'default'
  },
  reducers: {
    setNotificationsEnabled: (state, action) => {
      state.notificationsEnabled = action.payload;
    },
    setSoundEnabled: (state, action) => {
      state.soundEnabled = action.payload;
    },
    setWebNotificationsEnabled: (state, action) => {
      state.webNotificationsEnabled = action.payload;
    },
    setWebNotificationsPermission: (state, action) => {
      state.webNotificationsPermission = action.payload;
    }
  }
});

export const { 
  setNotificationsEnabled,
  setSoundEnabled,
  setWebNotificationsEnabled,
  setWebNotificationsPermission
} = notificationSettingsSlice.actions;

export default notificationSettingsSlice.reducer; 