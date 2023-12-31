import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { SocketProvider } from "./contexts/SocketContext";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import ProtectedRoute from "./routing/ProtectedRoute";
import Alert from "./components/UIElements/Alert/Alert";
import { LoadingProvider } from "./contexts/LoadingContext";
import {
  Home,
  Login,
  Register,
  ForgotPassword,
  ResetPassword,
  ProfileCreation,
  PersonalProfile,
  EditProfile,
  PublicProfile,
  User,
  UserSettings,
  Chat,
  Map,
  Discover,
} from "./pages";

function App() {
  return (
    <>
      <LoadingProvider>
        <BrowserRouter>
          <Alert />
          <ToastContainer
            position="top-center"
            autoClose={2000}
            hideProgressBar={false}
            newestOnTop={false}
            closeOnClick
            rtl={false}
            pauseOnFocusLoss
            draggable
            pauseOnHover
            theme="colored"
            style={{ width: "350px", fontSize: "1rem" }}
          />
          <Routes>
            {/* Public routes */}
            <Route index element={<Home />} />
            <Route path="/home" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password/:token" element={<ResetPassword />} />

            {/* Protected Routes */}
            <Route
              path="/create-profile"
              element={<ProtectedRoute component={ProfileCreation} />}
            />
            <Route
              path="/profile"
              element={
                <SocketProvider>
                  <ProtectedRoute
                    component={PersonalProfile}
                    profileRequired={true}
                  />
                </SocketProvider>
              }
            />
            <Route
              path="/edit-profile"
              element={
                <SocketProvider>
                  <ProtectedRoute
                    component={EditProfile}
                    profileRequired={true}
                  />
                </SocketProvider>
              }
            />
            <Route
              path="/settings"
              element={
                <SocketProvider>
                  <ProtectedRoute
                    component={UserSettings}
                    profileRequired={true}
                  />
                </SocketProvider>
              }
            />
            <Route
              path="/profile/:userId"
              element={
                <SocketProvider>
                  <ProtectedRoute
                    component={PublicProfile}
                    profileRequired={true}
                  />
                </SocketProvider>
              }
            />
            <Route
              path="/discover"
              element={
                <SocketProvider>
                  <ProtectedRoute component={Discover} profileRequired={true} />
                </SocketProvider>
              }
            />
            <Route
              path="/user"
              element={
                <SocketProvider>
                  <ProtectedRoute component={User} profileRequired={true} />
                </SocketProvider>
              }
            />
            <Route
              path="/chat"
              element={
                <SocketProvider>
                  <ProtectedRoute component={Chat} profileRequired={true} />
                </SocketProvider>
              }
            />
            <Route
              path="/map"
              element={
                <SocketProvider>
                  <ProtectedRoute component={Map} profileRequired={true} />
                </SocketProvider>
              }
            />
          </Routes>
        </BrowserRouter>
      </LoadingProvider>
    </>
  );
}

export default App;
