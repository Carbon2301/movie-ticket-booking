import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "../lib/api";
import { toast, Toaster } from "react-hot-toast";

// Email validation utility
const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Password validation utility
const validatePassword = (password) => {
  if (!password || password.length < 8) return false;
  if (password.length > 50) return false;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecialChar = /[^a-zA-Z0-9]/.test(password);
  return hasUpperCase && hasLowerCase && hasNumber && hasSpecialChar;
};

// OTP validation utility
const validateOTP = (otp) => {
  return /^\d{6}$/.test(otp);
};

// Password strength checker
const getPasswordStrength = (password) => {
  if (!password) return { strength: 0, message: "", color: "" };
  let strength = 0;
  if (password.length >= 8) strength++;
  if (/[a-z]/.test(password)) strength++;
  if (/[A-Z]/.test(password)) strength++;
  if (/[0-9]/.test(password)) strength++;
  if (/[^a-zA-Z0-9]/.test(password)) strength++;
  
  const levels = [
    { strength: 0, message: "", color: "" },
    { strength: 1, message: "Very Weak", color: "red" },
    { strength: 2, message: "Weak", color: "orange" },
    { strength: 3, message: "Fair", color: "yellow" },
    { strength: 4, message: "Good", color: "lightgreen" },
    { strength: 5, message: "Strong", color: "green" },
  ];
  return levels[strength] || levels[0];
};

const ForgotPassword = () => {
  const navigate = useNavigate();
  const emailInputRef = useRef(null);
  const otpInputRef = useRef(null);
  const passwordInputRef = useRef(null);
  const confirmPasswordInputRef = useRef(null);

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
  const [emailValid, setEmailValid] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState({ strength: 0, message: "", color: "" });
  const [otpAttempts, setOtpAttempts] = useState(0);
  const [maxOtpAttempts] = useState(3);

  // Auto-focus on mount
  useEffect(() => {
    if (emailInputRef.current && step === 1) {
      emailInputRef.current.focus();
    }
    if (otpInputRef.current && step === 2) {
      otpInputRef.current.focus();
    }
  }, [step]);

  // Email validation
  useEffect(() => {
    if (formData.email && step === 1) {
      const isValid = validateEmail(formData.email);
      setEmailValid(isValid);
    }
  }, [formData.email, step]);

  // Password strength check
  useEffect(() => {
    if (formData.newPassword && step === 2) {
      const strength = getPasswordStrength(formData.newPassword);
      setPasswordStrength(strength);
    }
  }, [formData.newPassword, step]);

  // Password match check
  useEffect(() => {
    if (formData.confirmNewPassword && formData.newPassword && step === 2) {
      if (formData.confirmNewPassword !== formData.newPassword) {
        setFieldErrors((prev) => ({
          ...prev,
          confirmNewPassword: "Passwords do not match",
        }));
      }
    }
  }, [formData.confirmNewPassword, formData.newPassword, step]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // Format OTP input (only numbers, max 6 digits)
    if (name === "otp") {
      const numericValue = value.replace(/\D/g, "").slice(0, 6);
      setFormData((prev) => ({ ...prev, [name]: numericValue }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
    
    setFieldErrors((prev) => ({ ...prev, [name]: "" }));
    setFormError("");
  };

  const togglePasswordVisibility = () => {
    setShowPassword((prev) => !prev);
  };

  const toggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword((prev) => !prev);
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !loading) {
      if (step === 1) {
        handleSendOTP(e);
      } else if (step === 2) {
        handleResetPassword(e);
      }
    }
  };

  const handleSendOTP = async (e) => {
    e.preventDefault();

    // Client-side validation
    if (!formData.email.trim()) {
      setFieldErrors({ email: "Email is required." });
      emailInputRef.current?.focus();
      return toast.error("Please enter your email address.");
    }

    if (!validateEmail(formData.email)) {
      setFieldErrors({ email: "Please enter a valid email address." });
      setEmailValid(false);
      emailInputRef.current?.focus();
      return toast.error("Invalid email format.");
    }

    setLoading(true);
    setFormError("");
    setFieldErrors({});

    try {
      await api.post("/profiles/send-otp", {
        email: formData.email.trim().toLowerCase(),
        type: "FORGOT_PASSWORD",
      });

      toast.success("OTP has been sent to your email! Please check your inbox.");
      setStep(2);
      setResendTimer(60);
      setOtpAttempts(0);
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
        setFormError("An unexpected error occurred. Please try again.");
      }

      toast.error("Failed to send OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    
    // Check OTP attempts
    if (otpAttempts >= maxOtpAttempts) {
      setFormError("Too many failed attempts. Please request a new OTP.");
      return toast.error("Too many failed attempts. Please request a new OTP.");
    }

    // Client-side validation
    if (!formData.otp) {
      setFieldErrors({ otp: "OTP is required." });
      otpInputRef.current?.focus();
      return toast.error("Please enter the OTP code.");
    }

    if (!validateOTP(formData.otp)) {
      setFieldErrors({ otp: "OTP must be 6 digits." });
      otpInputRef.current?.focus();
      return toast.error("Invalid OTP format.");
    }

    if (!formData.newPassword) {
      setFieldErrors({ newPassword: "New password is required." });
      passwordInputRef.current?.focus();
      return toast.error("Please enter a new password.");
    }

    if (!validatePassword(formData.newPassword)) {
      setFieldErrors({
        newPassword: "Password must be at least 8 characters with uppercase, lowercase, number, and special character.",
      });
      passwordInputRef.current?.focus();
      return toast.error("Password does not meet requirements.");
    }

    if (!formData.confirmNewPassword) {
      setFieldErrors({ confirmNewPassword: "Please confirm your password." });
      confirmPasswordInputRef.current?.focus();
      return toast.error("Please confirm your password.");
    }

    if (newPassword !== confirmNewPassword) {
      setFieldErrors({
        confirmNewPassword: "Password confirmation does not match.",
      });
      confirmPasswordInputRef.current?.focus();
      toast.error("Password confirmation does not match.");
      return;
    }

    setLoading(true);
    setFormError("");
    setFieldErrors({});

    try {
      await api.post("/profiles/forgot-password", {
        email: formData.email,
        code: formData.otp,
        newPassword: formData.newPassword,
        confirmNewPassword: formData.confirmNewPassword,
      });

      toast.success("Your password has been successfully reset! Redirecting to login...");
      setTimeout(() => navigate("/login", { state: { email: formData.email } }), 2000);
    } catch (error) {
      const errorData = error.response?.data;
      const fieldErrs = {};
      const newAttempts = otpAttempts + 1;
      setOtpAttempts(newAttempts);

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
        setFormError("An unexpected error occurred. Please try again.");
      }

      if (newAttempts >= maxOtpAttempts) {
        toast.error("Too many failed attempts. Please request a new OTP.");
        setStep(1);
        setFormData((prev) => ({ ...prev, otp: "", newPassword: "", confirmNewPassword: "" }));
      } else {
        toast.error(`Failed to reset password. ${maxOtpAttempts - newAttempts} attempts remaining.`);
      }
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
              <label className="block text-gray-700 mb-1">
                Email address <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  ref={emailInputRef}
                  type="email"
                  name="email"
                  placeholder="Enter your email address"
                  className={`w-full px-4 py-2 border ${
                    fieldErrors.email || !emailValid
                      ? "border-red-500"
                      : emailValid && formData.email
                      ? "border-green-500"
                      : "border-gray-300"
                  } rounded-xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary`}
                  value={formData.email}
                  onChange={handleChange}
                  onKeyPress={handleKeyPress}
                  required
                />
                {emailValid && formData.email && (
                  <span className="absolute right-3 top-2.5 text-green-500">✓</span>
                )}
              </div>
              {fieldErrors.email && (
                <p className="text-sm text-red-600 mt-1">{fieldErrors.email}</p>
              )}
              <p className="text-xs text-gray-500 mt-1">
                We'll send a 6-digit OTP code to your email address.
              </p>
            </div>
            <button
              type="submit"
              disabled={loading}
              className={`w-full bg-primary text-white py-2 rounded-xl transition ${
                loading
                  ? "opacity-50 cursor-not-allowed"
                  : "hover:bg-primary-dull transform hover:scale-[1.02]"
              }`}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="animate-spin">⏳</span>
                  Sending OTP...
                </span>
              ) : (
                "Send OTP"
              )}
            </button>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 mb-4">
              <p className="text-sm text-blue-800">
                <strong>OTP sent to:</strong> {formData.email}
              </p>
              <p className="text-xs text-blue-600 mt-1">
                Please check your email inbox and spam folder.
              </p>
            </div>
            <div>
              <label className="block text-gray-700 mb-1">
                OTP Code <span className="text-red-500">*</span>
              </label>
              <input
                ref={otpInputRef}
                type="text"
                name="otp"
                placeholder="Enter 6-digit OTP"
                maxLength={6}
                className={`w-full px-4 py-2 border ${
                  fieldErrors.otp || fieldErrors.code ? "border-red-500" : "border-gray-300"
                } rounded-xl text-gray-900 placeholder:text-gray-400 text-center text-2xl tracking-widest focus:outline-none focus:ring-2 focus:ring-primary`}
                value={formData.otp}
                onChange={handleChange}
                onKeyPress={handleKeyPress}
                required
              />
              {(fieldErrors.otp || fieldErrors.code) && (
                <p className="text-sm text-red-600 mt-1">
                  {fieldErrors.otp || fieldErrors.code}
                </p>
              )}
              {otpAttempts > 0 && otpAttempts < maxOtpAttempts && (
                <p className="text-xs text-orange-600 mt-1">
                  {maxOtpAttempts - otpAttempts} attempts remaining
                </p>
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
              <label className="block text-gray-700 mb-1">
                New Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  ref={passwordInputRef}
                  type={showPassword ? "text" : "password"}
                  name="newPassword"
                  placeholder="Enter your new password"
                  className={`w-full px-4 py-2 pr-10 border ${
                    fieldErrors.newPassword ? "border-red-500" : "border-gray-300"
                  } rounded-xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary`}
                  value={formData.newPassword}
                  onChange={handleChange}
                  onKeyPress={handleKeyPress}
                  minLength={8}
                  required
                />
                <button
                  type="button"
                  onClick={togglePasswordVisibility}
                  className="absolute right-3 top-2.5 text-gray-500 hover:text-gray-700"
                  tabIndex={-1}
                >
                  {showPassword ? "👁️" : "👁️‍🗨️"}
                </button>
              </div>
              {fieldErrors.newPassword && (
                <p className="text-sm text-red-600 mt-1">
                  {fieldErrors.newPassword}
                </p>
              )}
              {formData.newPassword && passwordStrength.strength > 0 && (
                <div className="mt-2">
                  <div className="flex gap-1 mb-1">
                    {[1, 2, 3, 4, 5].map((level) => (
                      <div
                        key={level}
                        className={`h-1.5 flex-1 rounded ${
                          level <= passwordStrength.strength
                            ? passwordStrength.color === "red"
                              ? "bg-red-500"
                              : passwordStrength.color === "orange"
                              ? "bg-orange-500"
                              : passwordStrength.color === "yellow"
                              ? "bg-yellow-500"
                              : passwordStrength.color === "lightgreen"
                              ? "bg-green-400"
                              : "bg-green-500"
                            : "bg-gray-200"
                        }`}
                      />
                    ))}
                  </div>
                  <p className={`text-xs ${
                    passwordStrength.color === "green" || passwordStrength.color === "lightgreen"
                      ? "text-green-600"
                      : passwordStrength.color === "yellow"
                      ? "text-yellow-600"
                      : passwordStrength.color === "orange"
                      ? "text-orange-600"
                      : "text-red-600"
                  }`}>
                    Password strength: {passwordStrength.message}
                  </p>
                </div>
              )}
            </div>
            <div>
              <label className="block text-gray-700 mb-1">
                Confirm New Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  ref={confirmPasswordInputRef}
                  type={showConfirmPassword ? "text" : "password"}
                  name="confirmNewPassword"
                  placeholder="Re-enter your new password"
                  className={`w-full px-4 py-2 pr-10 border ${
                    fieldErrors.confirmNewPassword
                      ? "border-red-500"
                      : formData.confirmNewPassword && formData.confirmNewPassword === formData.newPassword
                      ? "border-green-500"
                      : "border-gray-300"
                  } rounded-xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary`}
                  value={formData.confirmNewPassword}
                  onChange={handleChange}
                  onKeyPress={handleKeyPress}
                  required
                />
                <button
                  type="button"
                  onClick={toggleConfirmPasswordVisibility}
                  className="absolute right-3 top-2.5 text-gray-500 hover:text-gray-700"
                  tabIndex={-1}
                >
                  {showConfirmPassword ? "👁️" : "👁️‍🗨️"}
                </button>
              </div>
              {fieldErrors.confirmNewPassword && (
                <p className="text-sm text-red-600 mt-1">
                  {fieldErrors.confirmNewPassword}
                </p>
              )}
              {formData.confirmNewPassword &&
                formData.confirmNewPassword === formData.newPassword &&
                !fieldErrors.confirmNewPassword && (
                  <p className="text-green-500 text-xs mt-1">Passwords match ✓</p>
                )}
            </div>
            <button
              type="submit"
              disabled={loading || otpAttempts >= maxOtpAttempts}
              className={`w-full bg-primary text-white py-2 rounded-xl transition ${
                loading || otpAttempts >= maxOtpAttempts
                  ? "opacity-50 cursor-not-allowed"
                  : "hover:bg-primary-dull transform hover:scale-[1.02]"
              }`}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="animate-spin">⏳</span>
                  Resetting...
                </span>
              ) : otpAttempts >= maxOtpAttempts ? (
                "Too Many Attempts"
              ) : (
                "Reset Password"
              )}
            </button>
            <button
              type="button"
              onClick={() => {
                setStep(1);
                setFormData((prev) => ({ ...prev, otp: "", newPassword: "", confirmNewPassword: "" }));
                setOtpAttempts(0);
                setFieldErrors({});
                setFormError("");
              }}
              className="w-full text-sm text-gray-600 hover:text-gray-800 underline"
            >
              ← Back to email step
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
