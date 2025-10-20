import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { CheckCircle, XCircle, Loader, X } from "lucide-react";
import { toast } from "react-hot-toast";
import api from "../lib/api";

const VNPayReturn = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [status, setStatus] = useState("loading"); // loading, success, failed, cancelled
  const [paymentData, setPaymentData] = useState(null);

  useEffect(() => {
    const handleVNPayReturn = async () => {
      try {
        // Get query parameters from URL
        const urlParams = new URLSearchParams(location.search);
        const params = Object.fromEntries(urlParams.entries());

        // Call backend to verify VNPay response
        const response = await api.get("/payments/vnpay-return", { params });
        
        if (response.data.status === "success") {
          setStatus("success");
          setPaymentData(response.data);
          toast.success("Payment completed successfully!");
          
          // Redirect to success page after 3 seconds
          setTimeout(() => {
            navigate("/payment-success", {
              state: {
                paymentId: response.data.paymentId,
                amount: response.data.amount,
                method: "E_WALLET"
              }
            });
          }, 3000);
        } else if (response.data.status === "cancelled") {
          setStatus("cancelled");
          setPaymentData(response.data);
          toast.error("Payment was cancelled");
        } else {
          setStatus("failed");
          setPaymentData(response.data);
          toast.error("Payment failed!");
        }
      } catch (error) {
        console.error("VNPay return error:", error);
        setStatus("failed");
        toast.error("Error processing payment result");
      }
    };

    handleVNPayReturn();
  }, [location, navigate]);

  const handleBackToHome = () => {
    navigate("/");
  };

  const handleRetryPayment = () => {
    navigate(-1); // Go back to payment page
  };

  return (
    <div className="min-h-screen pt-[120px] pb-12 px-4 background-color flex items-center justify-center">
      <div className="max-w-md w-full bg-primary/8 border border-primary/20 rounded-3xl shadow-2xl p-8 backdrop-blur-lg text-center">
        {status === "loading" && (
          <>
            <div className="flex justify-center mb-4">
              <Loader size={60} className="text-blue-400 animate-spin" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-4">
              Processing Payment...
            </h1>
            <p className="text-gray-300">
              Please wait while we verify your payment with VNPay
            </p>
          </>
        )}

        {status === "success" && (
          <>
            <div className="flex justify-center mb-4">
              <CheckCircle size={60} className="text-green-400" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-4">
              Payment Successful!
            </h1>
            <p className="text-gray-300 mb-6">
              Your payment has been processed successfully. 
              You will be redirected to the confirmation page shortly.
            </p>
            {paymentData && (
              <div className="bg-primary/20 rounded-xl p-4 mb-6 text-left">
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Payment ID:</span>
                  <span className="text-white font-semibold">#{paymentData.paymentId}</span>
                </div>
                <div className="flex justify-between items-center mt-2">
                  <span className="text-gray-300">Amount:</span>
                  <span className="text-green-400 font-bold">{paymentData.amount?.toLocaleString()}₫</span>
                </div>
              </div>
            )}
            <button
              onClick={handleBackToHome}
              className="w-full bg-gradient-to-r from-[#f84565] to-[#d63854] hover:brightness-110 text-white px-6 py-3 rounded-xl transition"
            >
              Back to Home
            </button>
          </>
        )}

        {status === "cancelled" && (
          <>
            <div className="flex justify-center mb-4">
              <X size={60} className="text-yellow-400" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-4">
              Payment Cancelled
            </h1>
            <p className="text-gray-300 mb-6">
              You have cancelled the payment process. 
              Your booking has been cancelled and no charges were made.
            </p>
            {paymentData && (
              <div className="bg-yellow-500/20 border border-yellow-500/30 rounded-xl p-4 mb-6 text-left">
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Order ID:</span>
                  <span className="text-white font-semibold">#{paymentData.paymentId}</span>
                </div>
                {paymentData.amount && (
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-gray-300">Amount:</span>
                    <span className="text-yellow-400 font-bold">{paymentData.amount?.toLocaleString()}₫</span>
                  </div>
                )}
              </div>
            )}
            <div className="flex flex-col gap-3">
              <button
                onClick={handleBackToHome}
                className="w-full bg-gradient-to-r from-[#f84565] to-[#d63854] hover:brightness-110 text-white px-6 py-3 rounded-xl transition"
              >
                Back to Home
              </button>
              <button
                onClick={handleRetryPayment}
                className="w-full bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-xl transition"
              >
                Try Again
              </button>
            </div>
          </>
        )}

        {status === "failed" && (
          <>
            <div className="flex justify-center mb-4">
              <XCircle size={60} className="text-red-400" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-4">
              Payment Failed
            </h1>
            <p className="text-gray-300 mb-6">
              Unfortunately, your payment could not be processed. 
              Please try again or choose a different payment method.
            </p>
            {paymentData?.responseCode && (
              <div className="bg-red-500/20 border border-red-500/30 rounded-xl p-4 mb-6">
                <p className="text-red-300 text-sm">
                  Error Code: {paymentData.responseCode}
                </p>
              </div>
            )}
            <div className="flex flex-col gap-3">
              <button
                onClick={handleRetryPayment}
                className="w-full bg-gradient-to-r from-[#f84565] to-[#d63854] hover:brightness-110 text-white px-6 py-3 rounded-xl transition"
              >
                Try Again
              </button>
              <button
                onClick={handleBackToHome}
                className="w-full bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-xl transition"
              >
                Back to Home
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default VNPayReturn;
