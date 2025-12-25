import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  CheckCircle,
  Download,
  Home,
  Calendar,
  MapPin,
  Users,
  Clock,
  RefreshCw,
  Loader,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { dateFormat } from "../lib/dateFormat";
import { paymentAPI } from "../lib/api";

const PaymentSuccess = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const {
    paymentId: statePaymentId,
    bookingId: stateBookingId,
    amount: stateAmount,
    method: stateMethod,
    movie: stateMovie,
    room: stateRoom,
    showTime: stateShowTime,
    seatCodes: stateSeatCodes,
    totalPrice: stateTotalPrice,
  } = location.state || {};

  const [paymentId, setPaymentId] = useState(statePaymentId);
  const [bookingId, setBookingId] = useState(stateBookingId);
  const [amount, setAmount] = useState(stateAmount);
  const [method, setMethod] = useState(stateMethod);
  const [movie, setMovie] = useState(stateMovie);
  const [room, setRoom] = useState(stateRoom);
  const [showTime, setShowTime] = useState(stateShowTime);
  const [seatCodes, setSeatCodes] = useState(stateSeatCodes);
  const [totalPrice, setTotalPrice] = useState(stateTotalPrice);
  const [isLoading, setIsLoading] = useState(false);

  const [isRefunding, setIsRefunding] = useState(false);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [refundReason, setRefundReason] = useState("");

  useEffect(() => {
    const fetchPaymentData = async () => {
      // If we have paymentId but missing booking data (e.g., from VNpay redirect)
      if (paymentId && (!movie || !room || !showTime || !seatCodes)) {
        setIsLoading(true);
        try {
          const response = await paymentAPI.getById(paymentId);
          const paymentData = response.data;

          // Set payment info
          setAmount(paymentData.amount);
          setMethod(paymentData.method);

          // Extract booking data from payment
          if (paymentData.bookings && paymentData.bookings.length > 0) {
            const booking = paymentData.bookings[0];
            setBookingId(booking.id);
            setTotalPrice(booking.totalPrice);

            // Get data from first ticket (all tickets should have same schedule)
            if (booking.tickets && booking.tickets.length > 0) {
              const firstTicket = booking.tickets[0];
              const schedule = firstTicket.schedule;

              if (schedule) {
                setMovie(schedule.movie);
                setRoom(schedule.room);
                setShowTime(schedule.startTime);
                setSeatCodes(booking.tickets.map((t) => t.seatCode));
              }
            }
          }
        } catch (error) {
          console.error("Error fetching payment data:", error);
          toast.error("Failed to load payment details");
        } finally {
          setIsLoading(false);
        }
      }
    };

    if (!paymentId) {
      // Redirect if no payment data
      navigate("/", { replace: true });
    } else {
      fetchPaymentData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paymentId, navigate]);

  const handleDownloadTicket = () => {
    // In a real implementation, this would generate and download a PDF ticket
    toast.success("Ticket download will be implemented soon!");
  };

  const handleGoHome = () => {
    navigate("/");
  };

  const handleViewBookings = () => {
    navigate("/my-bookings");
  };

  const handleRefund = async () => {
    if (!refundReason.trim()) {
      toast.error("Please provide a reason for refund");
      return;
    }

    setIsRefunding(true);
    try {
      await paymentAPI.refund(paymentId, { reason: refundReason });
      toast.success("Refund request submitted successfully!");
      setShowRefundModal(false);
      // Redirect to bookings page
      setTimeout(() => navigate("/my-bookings"), 2000);
    } catch (error) {
      toast.error(error.response?.data?.message || "Refund request failed");
    } finally {
      setIsRefunding(false);
    }
  };

  // Check if refund is still available (2 hours before show time)
  const canRefund = () => {
    if (!showTime) return false;
    const showDateTime = new Date(showTime);
    const now = new Date();
    const hoursUntilShow =
      (showDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);
    return hoursUntilShow >= 2;
  };

  if (!paymentId) {
    return null;
  }

  const paymentMethodLabels = {
    CASH: "Cash at Counter",
    CREDIT_CARD: "Credit/Debit Card",
    BANK_TRANSFER: "Bank Transfer",
    E_WALLET: "E-Wallet",
  };

  // Show loading state while fetching data
  if (isLoading) {
    return (
      <div className="min-h-screen pt-[120px] pb-12 px-4 background-color flex items-center justify-center">
        <div className="text-center">
          <Loader
            size={60}
            className="text-blue-400 animate-spin mx-auto mb-4"
          />
          <h2 className="text-2xl font-bold text-white mb-2">
            Loading payment details...
          </h2>
          <p className="text-gray-300">
            Please wait while we fetch your booking information
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-[120px] pb-12 px-4 background-color">
      <div className="max-w-4xl mx-auto">
        {/* Success Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <CheckCircle size={80} className="text-green-400" />
          </div>
          <h1 className="text-4xl font-bold text-white mb-2">
            Payment Successful!
          </h1>
          <p className="text-xl text-gray-300">
            Your movie tickets have been confirmed
          </p>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Payment Details */}
          <div className="bg-primary/8 border border-primary/20 rounded-3xl shadow-2xl p-8 backdrop-blur-lg">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
              💳 Payment Details
            </h2>

            <div className="space-y-4">
              <div className="flex justify-between items-center py-3 border-b border-gray-600">
                <span className="text-gray-300">Payment ID</span>
                <span className="text-white font-semibold">#{paymentId}</span>
              </div>

              <div className="flex justify-between items-center py-3 border-b border-gray-600">
                <span className="text-gray-300">Booking ID</span>
                <span className="text-white font-semibold">#{bookingId}</span>
              </div>

              <div className="flex justify-between items-center py-3 border-b border-gray-600">
                <span className="text-gray-300">Payment Method</span>
                <span className="text-white font-semibold">
                  {paymentMethodLabels[method] || method}
                </span>
              </div>

              <div className="flex justify-between items-center py-3 border-b border-gray-600">
                <span className="text-gray-300">Total Amount</span>
                <span className="text-2xl font-bold text-green-400">
                  {amount?.toLocaleString()}₫
                </span>
              </div>

              <div className="flex justify-between items-center py-3">
                <span className="text-gray-300">Status</span>
                <span className="bg-green-500/20 text-green-300 px-3 py-1 rounded-full text-sm font-semibold">
                  Confirmed
                </span>
              </div>
            </div>
          </div>

          {/* Booking Summary */}
          <div className="bg-primary/8 border border-primary/20 rounded-3xl shadow-2xl p-8 backdrop-blur-lg">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
              🎫 Booking Summary
            </h2>

            <div className="flex gap-4 mb-6">
              <img
                src={movie?.posterUrl}
                alt={movie?.title}
                className="w-20 h-28 object-cover rounded-lg border-2 border-primary/40"
              />
              <div className="flex-1">
                <h3 className="text-xl font-bold text-white mb-2">
                  {movie?.title}
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-gray-300">
                    <Calendar size={16} />
                    <span>{showTime ? dateFormat(showTime) : "N/A"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-300">
                    <MapPin size={16} />
                    <span>{room?.cinema?.name || "N/A"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-300">
                    <Users size={16} />
                    <span>Room {room?.name || "N/A"}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-primary/20 rounded-xl p-4 mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-300">Selected Seats</span>
                <span className="text-white font-semibold">
                  {seatCodes?.length || 0} seats
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {seatCodes && seatCodes.length > 0 ? (
                  seatCodes.map((seat, index) => (
                    <span
                      key={index}
                      className="bg-primary/40 text-white px-3 py-1 rounded-lg text-sm font-semibold"
                    >
                      {seat}
                    </span>
                  ))
                ) : (
                  <span className="text-gray-400 text-sm">
                    No seats selected
                  </span>
                )}
              </div>
            </div>

            <div className="text-center text-gray-300 text-sm">
              <Clock size={16} className="inline mr-1" />
              Please arrive 15 minutes before showtime
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 mt-8 justify-center">
          <button
            onClick={handleDownloadTicket}
            className="flex items-center justify-center gap-2 bg-primary/20 hover:bg-primary/30 text-white px-8 py-3 rounded-xl transition border border-primary/30"
          >
            <Download size={20} />
            Download Ticket
          </button>

          <button
            onClick={handleViewBookings}
            className="flex items-center justify-center gap-2 bg-gray-800 hover:bg-gray-700 text-white px-8 py-3 rounded-xl transition"
          >
            <Calendar size={20} />
            View My Bookings
          </button>

          {canRefund() && (
            <button
              onClick={() => setShowRefundModal(true)}
              className="flex items-center justify-center gap-2 bg-orange-600 hover:bg-orange-700 text-white px-8 py-3 rounded-xl transition"
            >
              <RefreshCw size={20} />
              Request Refund
            </button>
          )}

          <button
            onClick={handleGoHome}
            className="flex items-center justify-center gap-2 bg-gradient-to-r from-[#f84565] to-[#d63854] hover:brightness-110 text-white px-8 py-3 rounded-xl transition"
          >
            <Home size={20} />
            Back to Home
          </button>
        </div>

        {/* Important Information */}
        <div className="mt-8 bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-6">
          <h3 className="text-yellow-300 font-bold mb-3 text-lg">
            Important Information:
          </h3>
          <ul className="text-yellow-200 space-y-2 text-sm">
            <li>• Please arrive at least 15 minutes before showtime</li>
            <li>• Bring a valid ID for ticket verification</li>
            <li>• Your booking reference is #{bookingId}</li>
            <li>• Screenshots of this confirmation are acceptable</li>
            <li>• Refunds are only available 2 hours before showtime</li>
          </ul>
        </div>

        {/* Refund Modal */}
        {showRefundModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-primary/10 border border-primary/20 rounded-xl p-6 w-full max-w-md mx-4 backdrop-blur-lg">
              <h3 className="text-xl font-bold text-white mb-4">
                Request Refund
              </h3>
              <p className="text-gray-300 mb-4">
                Please provide a reason for your refund request:
              </p>

              <textarea
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                className="w-full bg-primary/20 border border-primary/30 text-white p-3 rounded-lg mb-4 resize-none"
                placeholder="E.g., Unable to attend, emergency, etc."
                rows="3"
              />

              <div className="flex gap-3">
                <button
                  onClick={() => setShowRefundModal(false)}
                  className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 rounded-lg transition"
                  disabled={isRefunding}
                >
                  Cancel
                </button>
                <button
                  onClick={handleRefund}
                  disabled={isRefunding || !refundReason.trim()}
                  className="flex-1 bg-orange-600 hover:bg-orange-700 text-white py-2 rounded-lg transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isRefunding ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Processing...
                    </>
                  ) : (
                    "Submit Refund"
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentSuccess;
