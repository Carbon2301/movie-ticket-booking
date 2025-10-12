import { useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import api from "../lib/api";
import { useAuth } from "../contexts/AuthContext";
import { toast, Toaster } from "react-hot-toast";

// Email validation utility function
const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Password strength checker utility
const checkPasswordStrength = (password) => {
  if (!password) return { strength: 0, message: "" };
  let strength = 0;
  if (password.length >= 8) strength++;
  if (/[a-z]/.test(password)) strength++;
  if (/[A-Z]/.test(password)) strength++;
  if (/[0-9]/.test(password)) strength++;
  if (/[^a-zA-Z0-9]/.test(password)) strength++;
  
  const messages = ["", "Very Weak", "Weak", "Fair", "Good", "Strong"];
  return { strength, message: messages[strength] };
};

// Rate limiting helper
const rateLimitCheck = (() => {
  let attempts = 0;
  let resetTime = Date.now();
  return {
    check: () => {
      const now = Date.now();
      if (now > resetTime) {
        attempts = 0;
        resetTime = now + 15 * 60 * 1000; // 15 minutes
      }
      attempts++;
      return attempts <= 5;
    },
    reset: () => {
      attempts = 0;
      resetTime = Date.now();
    }
  };
})();

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const location = useLocation();
  const emailInputRef = useRef(null);
  const passwordInputRef = useRef(null);
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [lockoutTime, setLockoutTime] = useState(0);

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [emailValid, setEmailValid] = useState(true);
  const [passwordStrength, setPasswordStrength] = useState({ strength: 0, message: "" });

  // Auto-focus email input on mount
  useEffect(() => {
    if (emailInputRef.current) {
      emailInputRef.current.focus();
    }
  }, []);

  // Lockout countdown timer
  useEffect(() => {
    if (isLocked && lockoutTime > 0) {
      const timer = setInterval(() => {
        setLockoutTime((prev) => {
          if (prev <= 1) {
            setIsLocked(false);
            rateLimitCheck.reset();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [isLocked, lockoutTime]);

  // Email validation on change
  useEffect(() => {
    if (formData.email) {
      const isValid = validateEmail(formData.email);
      setEmailValid(isValid);
      if (!isValid && formData.email.length > 0) {
        setFieldErrors((prev) => ({
          ...prev,
          email: "Please enter a valid email address",
        }));
      }
    }
  }, [formData.email]);

  // Password strength check
  useEffect(() => {
    if (formData.password) {
      const strength = checkPasswordStrength(formData.password);
      setPasswordStrength(strength);
    } else {
      setPasswordStrength({ strength: 0, message: "" });
    }
  }, [formData.password]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setFieldErrors((prev) => ({ ...prev, [name]: "" }));
    setFormError("");
    
    // Real-time validation
    if (name === "email" && value) {
      const isValid = validateEmail(value);
      setEmailValid(isValid);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !loading) {
      handleLogin(e);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword((prev) => !prev);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    
    // Check if account is locked
    if (isLocked) {
      toast.error(`Account temporarily locked. Please try again in ${lockoutTime} seconds.`);
      return;
    }

    // Rate limiting check
    if (!rateLimitCheck.check()) {
      setIsLocked(true);
      setLockoutTime(900); // 15 minutes
      toast.error("Too many login attempts. Please try again in 15 minutes.");
      return;
    }

    // Client-side validation
    if (!formData.email.trim()) {
      setFieldErrors({ email: "Email is required" });
      emailInputRef.current?.focus();
      return;
    }

    if (!validateEmail(formData.email)) {
      setFieldErrors({ email: "Please enter a valid email address" });
      setEmailValid(false);
      emailInputRef.current?.focus();
      return;
    }

    if (!formData.password) {
      setFieldErrors({ password: "Password is required" });
      passwordInputRef.current?.focus();
      return;
    }

    setLoading(true);
    setFormError("");
    setFieldErrors({});

    try {
      const res = await api.post("/auth/login", {
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
      });

      const { accessToken, refreshToken, user } = res.data;

      // Store remember me preference
      if (rememberMe) {
        localStorage.setItem("rememberEmail", formData.email);
      } else {
        localStorage.removeItem("rememberEmail");
      }

      login({ user, accessToken, refreshToken });
      rateLimitCheck.reset();
      setLoginAttempts(0);
      toast.success("Đăng nhập thành công!");

      // Điều hướng theo roleId
      // Ưu tiên quay lại trang gốc nếu có (ví dụ từ trang chọn ghế)
      if (location.state?.from) {
        navigate(location.state.from, {
          state: { selectedSeats: location.state.selectedSeats },
          replace: true,
        });
      } else {
        // Tất cả user (bao gồm admin) đều về trang chủ
        navigate("/");
      }
    } catch (err) {
      const errorData = err.response?.data;
      const fieldErrs = {};
      const newAttempts = loginAttempts + 1;
      setLoginAttempts(newAttempts);

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

      // Show remaining attempts
      if (newAttempts >= 3) {
        toast.error(`Login failed. ${5 - newAttempts} attempts remaining.`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center background-color">
      <Toaster position="top-center" />
      <div className="bg-white p-8 rounded-2xl shadow-md w-full max-w-md relative">
        <button
          onClick={() => navigate("/")}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 text-xl font-bold"
        >
          ✕
        </button>

        <h2 className="text-gray-900 font-bold mb-6 text-center text-2xl">
          Log in to QuickShow
        </h2>

        {formError && (
          <div className="text-red-500 text-sm mb-4 text-center">
            {formError}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-gray-700 mb-1">Email address</label>
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
                } text-gray-900 placeholder:text-gray-400 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary`}
                value={formData.email}
                onChange={handleChange}
                onKeyPress={handleKeyPress}
                required
                disabled={isLocked}
              />
              {emailValid && formData.email && (
                <span className="absolute right-3 top-2.5 text-green-500">✓</span>
              )}
            </div>
            {fieldErrors.email && (
              <p className="text-red-500 text-sm mt-1">{fieldErrors.email}</p>
            )}
          </div>

          <div>
            <label className="block text-gray-700 mb-1">Password</label>
            <div className="relative">
              <input
                ref={passwordInputRef}
                type={showPassword ? "text" : "password"}
                name="password"
                placeholder="Enter your password"
                className={`w-full px-4 py-2 pr-10 border ${
                  fieldErrors.password ? "border-red-500" : "border-gray-300"
                } text-gray-900 placeholder:text-gray-400 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary`}
                value={formData.password}
                onChange={handleChange}
                onKeyPress={handleKeyPress}
                required
                disabled={isLocked}
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
            {fieldErrors.password && (
              <p className="text-red-500 text-sm mt-1">
                {fieldErrors.password}
              </p>
            )}
            {passwordStrength.strength > 0 && formData.password && (
              <div className="mt-1">
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((level) => (
                    <div
                      key={level}
                      className={`h-1 flex-1 rounded ${
                        level <= passwordStrength.strength
                          ? level <= 2
                            ? "bg-red-500"
                            : level <= 3
                            ? "bg-yellow-500"
                            : "bg-green-500"
                          : "bg-gray-200"
                      }`}
                    />
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Password strength: {passwordStrength.message}
                </p>
              </div>
            )}
            <div className="flex items-center justify-between mt-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                />
                <span className="text-sm text-gray-700">Remember me</span>
              </label>
              <a
                href="/forgot-password"
                className="text-sm text-primary hover:underline"
              >
                Forgot password?
              </a>
            </div>
          </div>

          {isLocked && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4">
              <p className="text-sm text-red-700 text-center">
                Account temporarily locked. Please try again in {Math.floor(lockoutTime / 60)}:
                {String(lockoutTime % 60).padStart(2, "0")} minutes.
              </p>
            </div>
          )}
          <button
            type="submit"
            disabled={loading || isLocked}
            className={`w-full bg-primary text-white py-2 rounded-xl transition ${
              loading || isLocked
                ? "opacity-50 cursor-not-allowed"
                : "hover:bg-primary-dull transform hover:scale-[1.02]"
            }`}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="animate-spin">⏳</span>
                Logging in...
              </span>
            ) : isLocked ? (
              "Account Locked"
            ) : (
              "Log in"
            )}
          </button>

          <div className="mt-4">
            <button
              type="button"
              onClick={async () => {
                try {
                  // Gọi backend để lấy URL Google OAuth
                  const res = await api.get("/auth/google-link");
                  const { url } = res.data;
                  window.location.href = url; // Redirect sang Google
                } catch (error) {
                  toast.error("Không thể kết nối Google Login!");
                }
              }}
              className="w-full border border-gray-300 py-2 rounded-xl flex items-center justify-center gap-2 hover:bg-gray-100 transition"
            >
              <img
                src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
                alt="Google"
                className="w-5 h-5"
              />
              <span className="text-gray-700">Đăng nhập với Google</span>
            </button>
          </div>
        </form>

        <div className="mt-6 pt-6 border-t border-gray-200">
          <p className="text-sm text-center text-gray-800">
            Don't have an account?{" "}
            <a href="/register" className="text-primary hover:underline font-medium">
              Sign up
            </a>
          </p>
          <div className="mt-4 text-center">
            <p className="text-xs text-gray-500">
              By logging in, you agree to our{" "}
              <a href="/terms" className="text-primary hover:underline">
                Terms of Service
              </a>{" "}
              and{" "}
              <a href="/privacy" className="text-primary hover:underline">
                Privacy Policy
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
