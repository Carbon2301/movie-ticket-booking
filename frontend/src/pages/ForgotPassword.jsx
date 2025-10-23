import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../lib/api";
import { toast, Toaster } from "react-hot-toast";

const ForgotPassword = () => {
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    email: "",
    otp: "",
    newPassword: "",
    confirmNewPassword: "",
  });

  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [resendTimer, setResendTimer] = useState(60);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setFieldErrors((prev) => ({ ...prev, [name]: "" }));
    setFormError("");
  };

  const handleSendOTP = async (e) => {
    e.preventDefault();

    if (!formData.email.trim()) {
      setFieldErrors({ email: "Email is required." });
      return toast.error("Please enter your email address.");
    }

    setLoading(true);
    setFormError("");
    setFieldErrors({});

    try {
      await api.post("/profiles/send-otp", {
        email: formData.email,
        type: "FORGOT_PASSWORD",
      });

      toast.success("OTP has been sent to your email!");
      setStep(2);
    } catch (error) {
      const errorData = error.response?.data;
      const fieldErrs = {};

      if (Array.isArray(errorData?.message)) {
        for (const entry of errorData.message) {
          if (entry.path || entry.field) {
            const field = entry.path || entry.field;
            const msg = entry.message || entry.error;
            fieldErrs[field] = msg;
          } else if (entry.message) {
            setFormError(entry.message);
          }
        }
        setFieldErrors(fieldErrs);
      } else if (typeof errorData?.message === "string") {
        setFormError(errorData.message);
      } else {
        setFormError("An unexpected error occurred.");
      }

      toast.error("Failed to send OTP.");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    setFormError("");
    setFieldErrors({});

    const { otp, newPassword, confirmNewPassword } = formData;

    if (!otp || !newPassword || !confirmNewPassword) {
      setFormError("Please fill in all the fields.");
      return toast.error("Please fill in all the fields.");
    }

    if (newPassword !== confirmNewPassword) {
      setFieldErrors({
        confirmNewPassword: "Password confirmation does not match.",
      });
      toast.error("Password confirmation does not match.");
      setLoading(false);
      return;
    }

    try {
      await api.post("/profiles/forgot-password", {
        email: formData.email,
        code: otp,
        newPassword,
        confirmNewPassword,
      });

      toast.success("Your password has been successfully reset!");
      setTimeout(() => navigate("/login"), 2000);
    } catch (error) {
      const errorData = error.response?.data;
      const fieldErrs = {};

      if (Array.isArray(errorData?.message)) {
        for (const entry of errorData.message) {
          if (entry.path || entry.field) {
            const field = entry.path || entry.field;
            const msg = entry.message || entry.error;
            fieldErrs[field] = msg;
          } else if (entry.message) {
            setFormError(entry.message);
          }
        }
        setFieldErrors(fieldErrs);
      } else if (typeof errorData?.message === "string") {
        setFormError(errorData.message);
      } else {
        setFormError("An unexpected error occurred.");
      }

      toast.error("Failed to reset password.");
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    let timer;
    if (step === 2 && resendTimer > 0) {
      timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [resendTimer, step]);

  const handleResendOTP = async () => {
    if (resendTimer > 0) return;

    setLoading(true);
    setFormError("");
    setFieldErrors({});

    try {
      await api.post("/profiles/send-otp", {
        email: formData.email,
        type: "FORGOT_PASSWORD",
      });

      toast.success("OTP resent to your email!");
      setResendTimer(60); // reset countdown
    } catch (error) {
      const data = error.response?.data;
      if (typeof data?.message === "string") {
        setFormError(data.message);
      }
      toast.error(data?.message || "Failed to resend OTP.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#09090b] px-4">
      <Toaster position="top-center" />
      <div className="bg-white p-8 rounded-2xl shadow-md w-full max-w-md relative">
        <button
          onClick={() => navigate("/")}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 text-xl font-bold"
        >
          ✕
        </button>

        <h2 className="text-gray-900 font-bold mb-6 text-center text-2xl">
          Forgot Password
        </h2>

        {formError && (
          <div className="text-red-500 text-sm mb-4 text-center">
            {formError}
          </div>
        )}

        {step === 1 && (
          <form onSubmit={handleSendOTP} className="space-y-4">
            <div>
              <label className="block text-gray-700 mb-1">Email address</label>
              <input
                type="email"
                name="email"
                placeholder="Enter your email address"
                className={`w-full px-4 py-2 border ${
                  fieldErrors.email ? "border-red-500" : "border-gray-300"
                } rounded-xl text-gray-900 placeholder:text-gray-400`}
                value={formData.email}
                onChange={handleChange}
                required
              />
              {fieldErrors.email && (
                <p className="text-sm text-red-600 mt-1">{fieldErrors.email}</p>
              )}
            </div>
            <button
              type="submit"
              disabled={loading}
              className={`w-full bg-primary text-white py-2 rounded-xl transition ${
                loading
                  ? "opacity-50 cursor-not-allowed"
                  : "hover:bg-primary-dull"
              }`}
            >
              {loading ? "Sending OTP..." : "Send OTP"}
            </button>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div>
              <label className="block text-gray-700 mb-1">OTP Code</label>
              <input
                type="text"
                name="otp"
                placeholder="Enter the OTP code"
                className={`w-full px-4 py-2 border ${
                  fieldErrors.code ? "border-red-500" : "border-gray-300"
                } rounded-xl text-gray-900 placeholder:text-gray-400`}
                value={formData.otp}
                onChange={handleChange}
                required
              />
              {fieldErrors.code && (
                <p className="text-sm text-red-600 mt-1">{fieldErrors.code}</p>
              )}
            </div>
            <div className="text-right">
              {resendTimer > 0 ? (
                <p className="text-sm text-gray-500">
                  You can resend OTP in {resendTimer}s
                </p>
              ) : (
                <button
                  type="button"
                  onClick={handleResendOTP}
                  disabled={loading}
                  className="text-sm text-primary hover:underline"
                >
                  Resend OTP
                </button>
              )}
            </div>
            <div>
              <label className="block text-gray-700 mb-1">New Password</label>
              <input
                type="password"
                name="newPassword"
                placeholder="Enter your new password"
                className={`w-full px-4 py-2 border ${
                  fieldErrors.newPassword ? "border-red-500" : "border-gray-300"
                } rounded-xl text-gray-900 placeholder:text-gray-400`}
                value={formData.newPassword}
                onChange={handleChange}
                required
              />
              {fieldErrors.newPassword && (
                <p className="text-sm text-red-600 mt-1">
                  {fieldErrors.newPassword}
                </p>
              )}
            </div>
            <div>
              <label className="block text-gray-700 mb-1">
                Confirm New Password
              </label>
              <input
                type="password"
                name="confirmNewPassword"
                placeholder="Re-enter your new password"
                className={`w-full px-4 py-2 border ${
                  fieldErrors.confirmNewPassword
                    ? "border-red-500"
                    : "border-gray-300"
                } rounded-xl text-gray-900 placeholder:text-gray-400`}
                value={formData.confirmNewPassword}
                onChange={handleChange}
                required
              />
              {fieldErrors.confirmNewPassword && (
                <p className="text-sm text-red-600 mt-1">
                  {fieldErrors.confirmNewPassword}
                </p>
              )}
            </div>
            <button
              type="submit"
              disabled={loading}
              className={`w-full bg-primary text-white py-2 rounded-xl transition ${
                loading
                  ? "opacity-50 cursor-not-allowed"
                  : "hover:bg-primary-dull"
              }`}
            >
              {loading ? "Resetting..." : "Reset Password"}
            </button>
          </form>
        )}

        <p className="text-sm text-center mt-4 text-gray-700">
          Remember your password?{" "}
          <a href="/login" className="text-primary hover:underline">
            Log in now
          </a>
        </p>
      </div>
    </div>
  );
};

export default ForgotPassword;
