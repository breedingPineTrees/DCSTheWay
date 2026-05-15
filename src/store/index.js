import { configureStore } from "@reduxjs/toolkit";
import dcsReducer from "./dcsPoint";
import uiReducer from "./ui";
import waypointsReducer from "./waypoints";
import airportsReducer from "./airports";

const index = configureStore({
  reducer: {
    dcsPoint: dcsReducer,
    ui: uiReducer,
    waypoints: waypointsReducer,
    airports: airportsReducer,
  },
});

export default index;
