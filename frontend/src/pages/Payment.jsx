import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { paymentAPI } from "../lib/api";
import { toast } from "react-hot-toast";
import {
  Wallet,
  CreditCard,
  Banknote,
  Coins,
  ArrowLeft,
  Clock,
  MapPin,
  Shield,
  Check,
} from "lucide-react";
import { dateFormat } from "../lib/dateFormat";

const paymentMethods = [
  {
    value: "CASH",
    label: "Cash at counter",
    icon: <Coins size={20} />,
    description: "Pay directly at the cinema counter",
    fee: "Free",
  },
  {
    value: "CREDIT_CARD",
    label: "Credit/Debit Card",
    icon: <CreditCard size={20} />,
    description: "Secure online payment",
    fee: "Free",
  },
  {
    value: "BANK_TRANSFER",
    label: "Bank Transfer",
    icon: <Banknote size={20} />,
    description: "Transfer directly from your bank",
    fee: "Free",
  },
  {
    value: "E_WALLET",
    label: "E-Wallet",
    icon: <Wallet size={20} />,
    description: "MoMo, ZaloPay, VNPay",
    fee: "Free",
  },
];

const PaymentPage = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const { seatCodes, totalPrice, ticketIds, movie, room, showTime } =
    location.state || {};

  const [paymentMethod, setPaymentMethod] = useState(paymentMethods[0].value);
  const [isLoading, setIsLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(null);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!showTime) return;
    const showDateTime = new Date(showTime);
    const timer = setInterval(() => {
      const timeDiff = showDateTime.getTime() - Date.now();
      if (timeDiff <= 0) {
        setTimeLeft(null);
        clearInterval(timer);
      } else {
        setTimeLeft({
          hours: Math.floor(timeDiff / 3600000),
          minutes: Math.floor((timeDiff % 3600000) / 60000),
        });
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [showTime]);

  const handlePay = async () => {
    setErrors({});
    if (!paymentMethod) {
      toast.error("Please select a payment method");
      return;
    }
    if (!ticketIds?.length) {
      toast.error("No tickets found!");
      return;
    }
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
      if (paymentMethod === "E_WALLET" && response.data.paymentUrl) {
        toast.success("Redirecting to VNPay...");
        window.location.href = response.data.paymentUrl;
        return;
      }
      toast.success("Payment successful!");
      navigate("/payment-success", {
        state: {
          ...response.data,
          movie,
          room,
          showTime,
          seatCodes,
          totalPrice,
        },
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
    <div className="relative flex flex-col md:flex-row min-h-screen items-center justify-center py-8 mt-20 px-4 md:px-0 background-color gap-4 md:gap-0">
      <button
        onClick={() => navigate(-1)}
        className="absolute top-20 left-4 md:left-20 flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-5 h-5" /> Back
      </button>
      <div className="w-full max-w-sm bg-primary/8 border border-primary/20 rounded-2xl shadow-xl p-4 md:p-6 md:mr-8 flex flex-col gap-3 backdrop-blur-lg">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-extrabold text-white drop-shadow">
             Booking Details
          </h2>
          {timeLeft && (
            <div className="flex items-center gap-1 bg-red-500/20 text-red-300 px-3 py-1 rounded-full text-sm">
              <Clock size={16} /> {timeLeft.hours}h {timeLeft.minutes}m
            </div>
          )}
        </div>
        <div className="flex items-center gap-4">
          <img
            src={movie?.posterUrl}
            alt={movie?.title}
            className="w-24 h-36 object-cover rounded-xl shadow-lg border-2 border-primary/40"
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
        <div className="mt-4 flex items-center justify-between">
          <span className="text-xl text-white font-bold">Total Amount</span>
          <span className="text-3xl font-extrabold drop-shadow-glow">
            {totalPrice?.toLocaleString()}₫
          </span>
        </div>
      </div>

      <div className="w-full max-w-sm bg-primary/8 border border-primary/20 rounded-2xl shadow-xl p-4 md:p-6 flex flex-col gap-3 backdrop-blur-lg">
        <h2 className="text-2xl font-extrabold text-white drop-shadow">
           Payment
        </h2>
        <label className="block text-base font-semibold mb-2 text-white">
          Select your payment method:
        </label>
        <div className="flex flex-col gap-2">
          {paymentMethods.map((pm) => {
            const isSelected = paymentMethod === pm.value;
            return (
              <label
                key={pm.value}
                className={`flex flex-col gap-2 px-3 py-2 rounded-lg font-semibold cursor-pointer border-2 transition shadow-md backdrop-blur ${
                  isSelected
                    ? "bg-gradient-to-r from-[#f84565] to-[#d63854] text-white border-primary/20 scale-105"
                    : "bg-primary/8 border-primary/20 text-white hover:bg-primary/50"
                } ${errors.paymentMethod ? "border-red-500/50" : ""}`}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    className="accent-primary scale-125"
                    name="paymentMethod"
                    value={pm.value}
                    checked={isSelected}
                    onChange={() => setPaymentMethod(pm.value)}
                  />
                  <span className="flex items-center gap-2">
                    {pm.icon} {pm.label}
                  </span>
                  <span className="ml-auto text-green-300 text-sm">
                    {pm.fee}
                  </span>
                </div>
                <div className="text-sm text-gray-300 ml-8">
                  {pm.description}
                </div>
              </label>
            );
          })}
        </div>
        {errors.general && (
          <div className="bg-red-500/20 border border-red-500/30 text-red-300 px-3 py-2 rounded-lg text-sm">
            {errors.general}
          </div>
        )}
        <div className="flex items-center gap-2 text-sm text-gray-300">
          <Shield size={16} className="text-green-400" />
          <span>Secure payment protected by 256-bit SSL encryption</span>
        </div>
        <button
          onClick={handlePay}
          disabled={isLoading || !ticketIds?.length}
          className={`w-full py-3 rounded-lg font-extrabold text-xl shadow-lg bg-gradient-to-r from-[#f84565] via-[#ff5e62] to-[#d63854] text-white hover:brightness-110 active:scale-95 transition border-2 border-[#f84565]/50 flex items-center justify-center gap-2 ${
            isLoading ? "opacity-60 pointer-events-none" : ""
          }`}
        >
          {isLoading ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              Processing payment...
            </>
          ) : (
            <>
              <Check size={20} /> Pay Now
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default PaymentPage;
