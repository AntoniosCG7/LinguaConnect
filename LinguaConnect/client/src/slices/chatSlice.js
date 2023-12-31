import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";

const initialChatState = {
  chats: {},
  unreadCounts: {},
  currentChat: null,
  otherUser: null,
  loading: false,
  error: null,
};

// Fetch all chats for a specific user
export const fetchChatsForUser = createAsyncThunk(
  "chat/fetchChatsForUser",
  async (userId, { rejectWithValue }) => {
    try {
      const response = await axios.get(
        `http://localhost:3000/api/v1/chats/${userId}`,
        { withCredentials: true }
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch chats for user."
      );
    }
  }
);

// Fetch user details for a specific user
export const fetchUserDetails = createAsyncThunk(
  "chat/fetchUserDetails",
  async (userId, { rejectWithValue }) => {
    try {
      const response = await axios.get(
        `http://localhost:3000/api/v1/users/${userId}`,
        { withCredentials: true }
      );
      return response.data.data.user;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch user details."
      );
    }
  }
);

const chatSlice = createSlice({
  name: "chat",
  initialState: initialChatState,
  reducers: {
    // Action to add a new chat
    addChat: (state, action) => {
      const chat = action.payload;
      state.chats.unshift(chat); // Adds chat at the start of the array
    },

    // Action to delete a chat
    deleteChat: (state, action) => {
      const chatId = action.payload;
      const chatIndex = state.chats.findIndex((chat) => chat._id === chatId);

      // If chat is found, remove it from the array
      if (chatIndex > -1) {
        state.chats.splice(chatIndex, 1);
      }
    },

    // Action to set all chats
    setChats: (state, action) => {
      state.chats = action.payload;
      state.unreadCounts = action.payload.reduce((acc, chat) => {
        acc[chat._id] = chat.unreadCount;
        return acc;
      }, {});
    },

    // Action to increment unread message count for a specific chat
    incrementUnreadCount: (state, action) => {
      const chatId = action.payload;
      const chatToUpdate = state.chats.find((chat) => chat._id === chatId);
      if (chatToUpdate) {
        if (chatToUpdate.unreadCount) {
          chatToUpdate.unreadCount += 1;
        } else {
          chatToUpdate.unreadCount = 1;
        }
      }
    },

    // Action to set the current chat and other user
    setCurrentChat: (state, action) => {
      const { currentChat, currentUserId } = action.payload;
      state.currentChat = currentChat;
      if (currentChat.user1._id === currentUserId) {
        state.otherUser = currentChat.user2;
      } else if (currentChat.user2._id === currentUserId) {
        state.otherUser = currentChat.user1;
      } else {
        state.otherUser = null;
      }

      // Reset unread count for the selected chat
      const chatToUpdate = state.chats.find(
        (chat) => chat._id === currentChat._id
      );
      if (chatToUpdate) {
        chatToUpdate.unreadCount = 0;
      }
    },

    // Action to clear the current chat and other user
    clearCurrentChat: (state) => {
      state.currentChat = null;
      state.otherUser = null;
    },

    // Action to move a chat to the top of the list
    moveChatToTop: (state, action) => {
      const chatId = action.payload;
      const chatIndex = state.chats.findIndex((chat) => chat._id === chatId);

      // If chat is found, remove it from its current position and add it to the top
      if (chatIndex > -1) {
        const [chat] = state.chats.splice(chatIndex, 1);
        state.chats.unshift(chat);
      }
    },

    // Action to update the most recent message for a chat
    updateRecentMessage: (state, action) => {
      const { chatId, message, currentUserId } = action.payload;
      const chatToUpdate = state.chats.find((chat) => chat._id === chatId);

      if (chatToUpdate) {
        // Check if the message is sent by the current user
        if (message.sender._id === currentUserId) {
          // If the message has an imageUrl, it's an image message
          if (message.imageUrl) {
            chatToUpdate.recentMessage = {
              ...message,
              content: "You: Sent a Photo.",
            };
          } else {
            // Otherwise, it's a text message
            chatToUpdate.recentMessage = {
              ...message,
              content: "You: " + message.content,
            };
          }
        } else {
          chatToUpdate.recentMessage = message;
        }
      }
    },

    // Action to set the loading state
    setLoading: (state, action) => {
      state.loading = action.payload;
    },

    // Action to set the error state
    setError: (state, action) => {
      state.error = action.payload;
    },

    // Reset chat state
    resetChatState: (state) => {
      return initialChatState;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchUserDetails.fulfilled, (state, action) => {
        state.otherUser = action.payload;
      })
      .addCase(fetchChatsForUser.fulfilled, (state, action) => {
        state.chats = action.payload;
        state.loading = false;
      })
      .addCase(fetchChatsForUser.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchChatsForUser.rejected, (state, action) => {
        state.error = action.payload;
        state.loading = false;
      });
  },
});

export const {
  addChat,
  deleteChat,
  setChats,
  incrementUnreadCount,
  setCurrentChat,
  clearCurrentChat,
  moveChatToTop,
  updateRecentMessage,
  setLoading,
  setError,
  resetChatState,
} = chatSlice.actions;

export default chatSlice.reducer;
