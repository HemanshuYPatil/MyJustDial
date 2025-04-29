// store.js
import { createStore, combineReducers, applyMiddleware } from 'redux';
import thunk from 'redux-thunk';

// Example reducers (modify according to your needs)
const initialState = {
  user: {
    name: 'Pushpendu Sir',
    location: 'Kolkata',
  },
  cars: [],
  bookings: [],
};

const appReducer = (state = initialState, action) => {
  switch (action.type) {
    case 'SET_USER':
      return { ...state, user: action.payload };
    case 'SET_CARS':
      return { ...state, cars: action.payload };
    case 'ADD_BOOKING':
      return { ...state, bookings: [...state.bookings, action.payload] };
    default:
      return state;
  }
};

const rootReducer = combineReducers({
  app: appReducer,
  // Add more reducers here if needed
});

const store = createStore(rootReducer, applyMiddleware(thunk));

export default store;