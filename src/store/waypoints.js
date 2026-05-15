import { createSlice } from "@reduxjs/toolkit";
import { arrayMove } from "@dnd-kit/sortable";

const initialState = { dcsWaypoints: [], idCounter: 1 };

const waypointsSlice = createSlice({
  name: "waypoints",
  initialState,
  reducers: {
    addDcsWaypoint(state, action) {
      const payload = action.payload;

      state.dcsWaypoints.push({
        id: state.idCounter,
        name: `Waypoint ${state.idCounter}`,
        lat: payload.lat,
        long: payload.long,
        elev: payload.elev,
        isProtected: false,
      });
      state.idCounter++;
    },
    changeName(state, action) {
      const index = state.dcsWaypoints.findIndex(
        (i) => i.id === action.payload.id,
      );
      state.dcsWaypoints[index]["name"] = action.payload.name;
    },
    changeElevation(state, action) {
      const index = state.dcsWaypoints.findIndex(
        (i) => i.id === action.payload.id,
      );
      state.dcsWaypoints[index]["elev"] = action.payload.elev;
    },
    delete(state, action) {
      const index = state.dcsWaypoints.findIndex(
        (i) => i.id === action.payload,
      );
      state.dcsWaypoints.splice(index, 1);
      if (state.dcsWaypoints.length === 0) {
        state.idCounter = 1;
      }
    },
    deleteAll(state) {
      state.dcsWaypoints = state.dcsWaypoints.filter((wp) => wp.isProtected);
      if (state.dcsWaypoints.length === 0) {
        state.idCounter = 1;
      }
    },
    deleteLast(state) {
      state.dcsWaypoints.pop();
      if (state.dcsWaypoints.length === 0) {
        state.idCounter = 1;
      }
    },
    changeOrder(state, action) {
      const oldIndex = state.dcsWaypoints.findIndex(
        (i) => i.id === action.payload.over,
      );
      const newIndex = state.dcsWaypoints.findIndex(
        (i) => i.id === action.payload.active,
      );
      state.dcsWaypoints = arrayMove(state.dcsWaypoints, newIndex, oldIndex);
    },
    appendWaypoints(state, action) {
      for (const waypoint of action.payload) {
        state.dcsWaypoints.push({
          id: state.idCounter,
          name: waypoint.name,
          lat: waypoint.lat,
          long: waypoint.long,
          elev: waypoint.elev,
          isProtected: waypoint.isProtected || false,
        });
        state.idCounter++;
      }
    },
    renumber(state) {
      state.dcsWaypoints.forEach((wp, index) => {
        wp.name = `Waypoint ${index + 1}`;
      });
      state.idCounter = state.dcsWaypoints.length + 1;
    },
    toggleProtect(state, action) {
      const wp = state.dcsWaypoints.find((i) => i.id === action.payload);
      if (wp) {
        wp.isProtected = !wp.isProtected;
      }
    },
  },
});
export const waypointsActions = waypointsSlice.actions;
export default waypointsSlice.reducer;
