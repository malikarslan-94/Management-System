import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import {
  getRooms as apiGetRooms,
  createRoom as apiCreateRoom,
  updateRoom as apiUpdateRoom,
  deleteRoom as apiDeleteRoom,
  Room
} from '@/services/RoomService';

// Room state type
export interface RoomState {
  rooms: Room[];
  loading: boolean;
  error: string | null;
}

const initialState: RoomState = {
  rooms: [],
  loading: false,
  error: null
};

export const fetchRooms = createAsyncThunk(
  'rooms/fetchAll',
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiGetRooms();
      return response;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'An unknown error occurred';
      return rejectWithValue(message);
    }
  }
);

export const addRoom = createAsyncThunk(
  'rooms/add',
  async (roomData: Omit<Room, 'id'>, { rejectWithValue }) => {
    try {
      const response = await apiCreateRoom(roomData);
      return response;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create room';
      return rejectWithValue(message);
    }
  }
);

export const updateRoom = createAsyncThunk(
  'rooms/update',
  async ({ id, ...roomData }: Partial<Room> & { id: string }, { rejectWithValue }) => {
    try {
      const response = await apiUpdateRoom(id, roomData);
      return response;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update room';
      return rejectWithValue(message);
    }
  }
);

export const removeRoom = createAsyncThunk(
  'rooms/delete',
  async (id: string, { rejectWithValue }) => {
    try {
      await apiDeleteRoom(id);
      return id;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete room';
      return rejectWithValue(message);
    }
  }
);



const roomSlice = createSlice({
  name: 'rooms',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      // Fetch Rooms
      .addCase(fetchRooms.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchRooms.fulfilled, (state, action) => {
        state.loading = false;
        state.rooms = action.payload;
      })
      .addCase(fetchRooms.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Add Room
      .addCase(addRoom.fulfilled, (state, action) => {
        state.rooms.push(action.payload);
      })
      // Update Room
      .addCase(updateRoom.fulfilled, (state, action) => {
        const index = state.rooms.findIndex(room => room.id === action.payload.id);
        if (index !== -1) {
          state.rooms[index] = action.payload;
        }
      })
      // Delete Room
      .addCase(removeRoom.fulfilled, (state, action) => {
        state.rooms = state.rooms.filter(room => room.id !== action.payload);
      });
  }
});

export default roomSlice.reducer;
