import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { paymentAPI } from "../lib/api";
import { toast } from "react-hot-toast";
import { Wallet, CreditCard, Banknote, Coins, ArrowLeft, Clock, MapPin, Shield, Check } from "lucide-react";
import { dateFormat } from "../lib/dateFormat";

const paymentMethods = [
  { 
    value: "CASH", 
    label: "Cash at counter", 
    icon: <Coins size={22} />,
    description: "Pay directly at the cinema counter",
    fee: "Free"
  },
  {
    value: "CREDIT_CARD",
    label: "Credit/Debit Card",
    icon: <CreditCard size={22} />,
    description: "Secure online payment",
    fee: "Free"
  },
  {
    value: "BANK_TRANSFER",
    label: "Bank Transfer",
    icon: <Banknote size={22} />,
    description: "Transfer directly from your bank",
    fee: "Free"
  },
  { 
    value: "E_WALLET", 
    label: "E-Wallet", 
    icon: <Wallet size={22} />,
    description: "MoMo, ZaloPay, VNPay",
    fee: "Free"
  },
];

const PaymentPage = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const {
    scheduleId,
    seatCodes,
    totalPrice,
    ticketIds,
    movie,
    room,
    showTime,
  } = location.state || {};

  const [paymentMethod, setPaymentMethod] = useState(paymentMethods[0].value);
  const [isLoading, setIsLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(null);
  const [errors, setErrors] = useState({});

  // Timer để đếm ngược thời gian thanh toán
  useEffect(() => {
    if (showTime) {
      const showDateTime = new Date(showTime);
      const timer = setInterval(() => {
        const now = new Date();
        const timeDiff = showDateTime.getTime() - now.getTime();
        
        if (timeDiff <= 0) {
          setTimeLeft(null);
          clearInterval(timer);
        } else {
          const hours = Math.floor(timeDiff / (1000 * 60 * 60));
          const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
          setTimeLeft({ hours, minutes });
        }
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [showTime]);

  const handlePay = async () => {
    setErrors({});
    
    // Validation
    if (!paymentMethod) {
      setErrors({ paymentMethod: "Please select a payment method" });
      toast.error("Please select a payment method");
      return;
    }
    
    if (!ticketIds?.length) {
      toast.error("No tickets found to proceed payment!");
      return;
    }

    // Check if show time has passed
    if (showTime && new Date() >= new Date(showTime)) {
      toast.error("Cannot pay for expired show times");
      return;
    }
    
    setIsLoading(true);
    
    try {
      const response = await paymentAPI.create({
        ticketIds,
        method: paymentMethod,
      });
      
      // If E_WALLET payment, redirect to VNPay
      if (paymentMethod === "E_WALLET" && response.data.paymentUrl) {
        toast.success("Redirecting to VNPay...");
        window.location.href = response.data.paymentUrl;
        return;
      }
      
      toast.success("Payment successful!");
      
      // Navigate to confirmation page with payment details
      navigate("/payment-success", {
        state: {
          paymentId: response.data.paymentId,
          bookingId: response.data.bookingId,
          amount: response.data.amount,
          method: response.data.method,
          movie,
          room,
          showTime,
          seatCodes,
          totalPrice
        }
      });
      
    } catch (err) {
      const errorMessage = err?.response?.data?.message || "Payment failed!";
      toast.error(errorMessage);
      setErrors({ general: errorMessage });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center py-12 mt-20 background-color">
      <button
        onClick={() => navigate(-1)}
        className="absolute flex top-20 left-20 ml-4 mt-4 items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors"
      >
        <ArrowLeft className="w-5 h-5" />
        Back
      </button>
      <div className="w-full max-w-md bg-primary/8 border border-primary/20 rounded-3xl shadow-2xl p-8 mr-12 flex flex-col gap-4 backdrop-blur-lg">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-2xl font-extrabold text-white drop-shadow tracking-wide">
            🎫 Booking Details
          </h2>
          {timeLeft && (
            <div className="flex items-center gap-1 bg-red-500/20 text-red-300 px-3 py-1 rounded-full text-sm">
              <Clock size={16} />
              <span>{timeLeft.hours}h {timeLeft.minutes}m</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-5 mb-4">
          <img
            src={movie?.posterUrl}
            alt={movie?.title}
            className="w-28 h-40 object-cover rounded-2xl shadow-lg border-2 border-primary/40"
          />
          <div>
            <div className="font-bold text-xl mb-1">
              {movie?.title || "Movie Title"}
            </div>
            <div className="text-base text-[#bbb9e6]">{room?.name}</div>
            <div className="text-sm text-gray-300 mt-2">
              <span className="text-gray-400">Showtime:</span>{" "}
              <b>{dateFormat(showTime)}</b>
            </div>
            <div className="text-sm text-gray-300 mt-1">
              <span className="text-gray-400">Seats:</span>{" "}
              <b>{seatCodes?.join(", ")}</b>
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-2 text-sm text-[#e2deff]">
          <div className="flex items-center gap-2">
            <MapPin size={16} className="text-gray-400" />
            <span>
              <span className="text-gray-400">Cinema:</span>{" "}
              <span className="font-semibold">{room?.cinema?.name}</span>
            </span>
          </div>
          <div className="flex items-start gap-2">
            <MapPin size={16} className="text-gray-400 mt-0.5" />
            <span>
              <span className="text-gray-400">Address:</span>{" "}
              <span className="font-semibold text-white">
                {room?.cinema?.location}
              </span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Shield size={16} className="text-green-400" />
            <span className="text-green-300 text-xs">
              Your booking is protected
            </span>
          </div>
        </div>
        <div className="mt-6 flex items-center justify-between">
          <span className="text-xl text-white font-bold">Total Amount</span>
          <span className="text-3xl font-extrabold drop-shadow-glow">
            {totalPrice?.toLocaleString()}₫
          </span>
        </div>
      </div>

      <div className="w-full max-w-md bg-primary/8 border border-primary/20 rounded-3xl shadow-2xl p-8 flex flex-col gap-5 backdrop-blur-lg">
        <h2 className="text-2xl font-extrabold mb-2 text-white tracking-wide drop-shadow">
          💳 Payment
        </h2>
        <label className="block text-base font-semibold mb-3 text-white">
          Select your payment method:
        </label>
        <div className="flex flex-col gap-4 mb-4">
          {paymentMethods.map((pm) => (
            <label
              key={pm.value}
              className={`
                flex flex-col gap-2 px-5 py-4 rounded-xl font-semibold cursor-pointer border-2 transition
                shadow-lg backdrop-blur
                ${
                  paymentMethod === pm.value
                    ? "bg-gradient-to-r from-[#f84565] to-[#d63854] text-white border-primary/20 scale-105"
                    : "bg-primary/8 border-primary/20 text-white hover:bg-primary/50"
                }
                ${errors.paymentMethod ? "border-red-500/50" : ""}
              `}
            >
              <div className="flex items-center gap-3">
                <input
                  type="radio"
                  className="accent-primary scale-125"
                  name="paymentMethod"
                  value={pm.value}
                  checked={paymentMethod === pm.value}
                  onChange={() => setPaymentMethod(pm.value)}
                />
                <span className="flex items-center gap-2">
                  {pm.icon}
                  {pm.label}
                </span>
                <span className="ml-auto text-green-300 text-sm">{pm.fee}</span>
              </div>
              <div className="text-sm text-gray-300 ml-8">
                {pm.description}
              </div>
            </label>
          ))}
        </div>
        
        {errors.general && (
          <div className="bg-red-500/20 border border-red-500/30 text-red-300 px-4 py-3 rounded-xl text-sm">
            {errors.general}
          </div>
        )}
        
        <div className="flex items-center gap-2 text-sm text-gray-300 mb-4">
          <Shield size={16} className="text-green-400" />
          <span>Secure payment protected by 256-bit SSL encryption</span>
        </div>
        
        <button
          onClick={handlePay}
          disabled={isLoading || !ticketIds?.length}
          className={`
            w-full py-4 mt-3 rounded-xl font-extrabold text-xl shadow-xl
            bg-gradient-to-r from-[#f84565] via-[#ff5e62] to-[#d63854]
            text-white hover:brightness-110 active:scale-95 transition
            border-2 border-[#f84565]/50 flex items-center justify-center gap-2
            ${isLoading ? "opacity-60 pointer-events-none" : ""}
          `}
        >
          {isLoading ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              Processing payment...
            </>
          ) : (
            <>
              <Check size={20} />
              Pay Now
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default PaymentPage;
