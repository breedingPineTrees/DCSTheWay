import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  module: null, lat: null, long: null, elev: null,
  trueHdg: null, magHdg: null, baroAlt: null, ias: null, tas: null,
};

const dcsPointSlice = createSlice({
  name: "dcsPoint",
  initialState,
  reducers: {
    changeCoords(state, action) {
      state.module = action.payload.model;
      state.lat = Number(action.payload.coords.lat);
      state.long = Number(action.payload.coords.long);
      state.elev = Number(action.payload.elev);
      state.trueHdg = action.payload.trueHdg ?? null;
      state.magHdg = action.payload.magHdg ?? null;
      state.baroAlt = action.payload.baroAlt ?? null;
      state.ias = action.payload.ias ?? null;
      state.tas = action.payload.tas ?? null;
    },
  },
});

export const dcsPointActions = dcsPointSlice.actions;
export default dcsPointSlice.reducer;
