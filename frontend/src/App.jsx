import React, { useState } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import Navbar from "./components/Navbar";
import Home from "./pages/Home";
import Movies from "./pages/Movies";
import MovieDetails from "./pages/MovieDetails";
import SeatLayout from "./pages/SeatLayout";
import MyBookings from "./pages/MyBookings";
import Favorite from "./pages/Favorite";
import Footer from "./components/Footer";
import { Toaster } from "react-hot-toast";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import { AuthProvider } from "./contexts/AuthContext";
import Profile from "./pages/Profile";
import AdminLayout from "./pages/admin/Layout";
import Dashboard from "./pages/admin/Dashboard";
import ManagePermissions from "./pages/admin/ManagePermissions";
import ProtectedAdminRoute from "./components/ProtectedAdminRoute";
import ManageMovies from "./pages/admin/ManageMovies";
import ManageCinemas from "./pages/admin/ManageCinemas";
import ManageSchedules from "./pages/admin/ManageSchedules";
import ManageRoles from "./pages/admin/ManageRoles";
import OauthGoogleCallback from "./pages/authGoogleCallback ";
import ManageUsers from "./pages/admin/ManageUsers";
import Payment from "./pages/Payment";
import PaymentSuccess from "./pages/PaymentSuccess";
import VNPayReturn from "./pages/VNPayReturn";
import Releases from "./pages/Releases";
import Cinemas from "./pages/Cinemas";
import CinemaDetails from "./pages/CinemaDetails";
import Snowfall from "./components/Snowfall";
import ManageTicketRefund from "./pages/admin/ManageTicketRefund";

const App = () => {
  const isAdminRoute = useLocation().pathname.startsWith("/admin");
  return (
    <>
      <AuthProvider>
        <Snowfall />
        <div className="app-shell">
          <Toaster />
          {!isAdminRoute && <Navbar />}
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/oauth-google-callback" element={<OauthGoogleCallback />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/movies" element={<Movies />} />
            <Route path="/movies/:id" element={<MovieDetails />} />
            <Route path="/movies/:id/:date" element={<SeatLayout />} />
            <Route path="/cinemas" element={<Cinemas />} />
            <Route path="/cinemas/:id" element={<CinemaDetails />} />
            <Route path="/my-bookings" element={<MyBookings />} />
            <Route path="/favorites" element={<Favorite />} />
            <Route path="/releases" element={<Releases />} />
            <Route path="/payment" element={<Payment />} />
            <Route path="/payment-success" element={<PaymentSuccess />} />
            <Route path="/payment/vnpay-return" element={<VNPayReturn />} />
            <Route path="/admin/*" element={
              <ProtectedAdminRoute>
                <AdminLayout />
              </ProtectedAdminRoute>
            } >
              <Route index element={<Dashboard />} />
              <Route path="manage-movies" element={<ManageMovies />} />
              <Route path="manage-permissions" element={<ManagePermissions />} />
              <Route path="manage-cinemas" element={<ManageCinemas />} />
              <Route path="manage-schedules" element={<ManageSchedules />} />
              <Route path="manage-roles" element={<ManageRoles />} />
              <Route path="manage-users" element={<ManageUsers />} />
              <Route path="manage-ticket-refund" element={<ManageTicketRefund />} />
            </Route>
          </Routes>
          {!isAdminRoute && <Footer />}
        </div>
      </AuthProvider>
    </>
  );
};

export default App;
