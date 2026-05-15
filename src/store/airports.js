import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  coalitions: {},
  selectedAirport: null,
};

const airportsSlice = createSlice({
  name: "airports",
  initialState,
  reducers: {
    setCoalition(state, action) {
      const { theater, name, coalition } = action.payload;
      if (!state.coalitions[theater]) state.coalitions[theater] = {};
      state.coalitions[theater][name] = coalition;
    },
    setSelectedAirport(state, action) {
      state.selectedAirport = action.payload;
    },
    setAllCoalitions(state, action) {
      state.coalitions = action.payload ?? {};
    },
  },
});

export const airportsActions = airportsSlice.actions;
export default airportsSlice.reducer;
