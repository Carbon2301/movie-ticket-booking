import { useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import api from "../lib/api";
import { toast } from "react-hot-toast";

// Validation utilities
const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const validateUsername = (username) => {
  if (!username || username.length < 3) return false;
  if (username.length > 20) return false;
  const usernameRegex = /^[a-zA-Z0-9_]+$/;
  return usernameRegex.test(username);
};

const validatePassword = (password) => {
  if (!password || password.length < 8) return false;
  if (password.length > 50) return false;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecialChar = /[^a-zA-Z0-9]/.test(password);
  return hasUpperCase && hasLowerCase && hasNumber && hasSpecialChar;
};

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

const Register = () => {
  const navigate = useNavigate();
  const nameInputRef = useRef(null);
  const emailInputRef = useRef(null);
  const passwordInputRef = useRef(null);
  const confirmPasswordInputRef = useRef(null);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState({ strength: 0, message: "", color: "" });
  const [usernameValid, setUsernameValid] = useState(true);
  const [emailValid, setEmailValid] = useState(true);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  // Auto-focus on mount
  useEffect(() => {
    if (nameInputRef.current) {
      nameInputRef.current.focus();
    }
  }, []);

  // Real-time validation
  useEffect(() => {
    if (formData.name) {
      const isValid = validateUsername(formData.name);
      setUsernameValid(isValid);
      if (!isValid) {
        setFieldErrors((prev) => ({
          ...prev,
          name: "Username must be 3-20 characters and contain only letters, numbers, and underscores",
        }));
      }
    }
  }, [formData.name]);

  useEffect(() => {
    if (formData.email) {
      const isValid = validateEmail(formData.email);
      setEmailValid(isValid);
      if (!isValid) {
        setFieldErrors((prev) => ({
          ...prev,
          email: "Please enter a valid email address",
        }));
      }
    }
  }, [formData.email]);

  useEffect(() => {
    if (formData.password) {
      const strength = getPasswordStrength(formData.password);
      setPasswordStrength(strength);
      if (!validatePassword(formData.password)) {
        setFieldErrors((prev) => ({
          ...prev,
          password: "Password must be at least 8 characters with uppercase, lowercase, number, and special character",
        }));
      }
    }
  }, [formData.password]);

  useEffect(() => {
    if (formData.confirmPassword && formData.password) {
      if (formData.confirmPassword !== formData.password) {
        setFieldErrors((prev) => ({
          ...prev,
          confirmPassword: "Passwords do not match",
        }));
      }
    }
  }, [formData.confirmPassword, formData.password]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError("");
    setFieldErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const togglePasswordVisibility = () => {
    setShowPassword((prev) => !prev);
  };

  const toggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword((prev) => !prev);
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !loading && agreedToTerms) {
      handleRegister(e);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();

    // Client-side validation
    if (!validateUsername(formData.name)) {
      setFieldErrors({ name: "Invalid username format" });
      nameInputRef.current?.focus();
      return;
    }

    if (!validateEmail(formData.email)) {
      setFieldErrors({ email: "Invalid email format" });
      emailInputRef.current?.focus();
      return;
    }

    if (!validatePassword(formData.password)) {
      setFieldErrors({
        password: "Password must be at least 8 characters with uppercase, lowercase, number, and special character",
      });
      passwordInputRef.current?.focus();
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setFieldErrors({
        confirmPassword: "Passwords do not match",
      });
      confirmPasswordInputRef.current?.focus();
      return;
    }

    if (!agreedToTerms) {
      setError("Please agree to the Terms of Service and Privacy Policy");
      return;
    }

    setLoading(true);
    setError("");
    setFieldErrors({});

    try {
      await api.post("/auth/register", {
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        confirmPassword: formData.password,
      });

      toast.success("Registration successful! Redirecting to login...");
      setTimeout(() => {
        navigate("/login", { state: { email: formData.email } });
      }, 1500);
    } catch (err) {
      const errorData = err.response?.data;
      const msg = errorData?.message;
      const fieldErrs = {};

      if (Array.isArray(msg)) {
        for (const entry of msg) {
          const field = entry.field || entry.path;
          const message = entry.error || entry.message;
          if (field) {
            fieldErrs[field] = message;
          } else {
            setError(message);
          }
        }
        setFieldErrors(fieldErrs);
      } else if (typeof msg === "string") {
        setError(msg);
      } else {
        setError("Registration failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pt-[80px] min-h-screen flex items-center justify-center bg-[#09090b] px-4">
      <div className="bg-white p-8 rounded-2xl shadow-md w-full max-w-md relative">
        <button
          onClick={() => navigate("/")}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 text-xl font-bold"
        >
          ✕
        </button>

        <h2 className="text-gray-900 font-bold mb-6 text-center text-2xl">
          Sign up for QuickShow
        </h2>

        {error && (
          <div className="text-red-500 text-sm text-center mb-4">{error}</div>
        )}

        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="block text-gray-700 mb-1">
              Username <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                ref={nameInputRef}
                type="text"
                name="name"
                placeholder="Enter your username (3-20 characters)"
                className={`w-full px-4 py-2 border ${
                  fieldErrors.name || !usernameValid
                    ? "border-red-500"
                    : usernameValid && formData.name
                    ? "border-green-500"
                    : "border-gray-300"
                } text-gray-900 placeholder:text-gray-400 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary`}
                value={formData.name}
                onChange={handleChange}
                onKeyPress={handleKeyPress}
                minLength={3}
                maxLength={20}
                required
              />
              {usernameValid && formData.name && (
                <span className="absolute right-3 top-2.5 text-green-500">✓</span>
              )}
            </div>
            {fieldErrors.name && (
              <p className="text-red-500 text-sm mt-1">{fieldErrors.name}</p>
            )}
            {formData.name && !fieldErrors.name && (
              <p className="text-green-500 text-xs mt-1">Username is available</p>
            )}
          </div>

          <div>
            <label className="block text-gray-700 mb-1">
              Email address <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                ref={emailInputRef}
                type="email"
                name="email"
                placeholder="Enter your email"
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
            <label className="block text-gray-700 mb-1">
              Password <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                ref={passwordInputRef}
                type={showPassword ? "text" : "password"}
                name="password"
                placeholder="Create a strong password"
                className={`w-full px-4 py-2 pr-10 border ${
                  fieldErrors.password ? "border-red-500" : "border-gray-300"
                } text-gray-900 placeholder:text-gray-400 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary`}
                value={formData.password}
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
            {fieldErrors.password && (
              <p className="text-red-500 text-sm mt-1">
                {fieldErrors.password}
              </p>
            )}
            {formData.password && passwordStrength.strength > 0 && (
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
                <ul className="text-xs text-gray-600 mt-1 ml-4 list-disc">
                  <li className={formData.password.length >= 8 ? "text-green-600" : ""}>
                    At least 8 characters
                  </li>
                  <li className={/[A-Z]/.test(formData.password) ? "text-green-600" : ""}>
                    One uppercase letter
                  </li>
                  <li className={/[a-z]/.test(formData.password) ? "text-green-600" : ""}>
                    One lowercase letter
                  </li>
                  <li className={/[0-9]/.test(formData.password) ? "text-green-600" : ""}>
                    One number
                  </li>
                  <li className={/[^a-zA-Z0-9]/.test(formData.password) ? "text-green-600" : ""}>
                    One special character
                  </li>
                </ul>
              </div>
            )}
          </div>

          <div>
            <label className="block text-gray-700 mb-1">
              Confirm Password <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                ref={confirmPasswordInputRef}
                type={showConfirmPassword ? "text" : "password"}
                name="confirmPassword"
                placeholder="Re-enter your password"
                className={`w-full px-4 py-2 pr-10 border ${
                  fieldErrors.confirmPassword
                    ? "border-red-500"
                    : formData.confirmPassword && formData.confirmPassword === formData.password
                    ? "border-green-500"
                    : "border-gray-300"
                } text-gray-900 placeholder:text-gray-400 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary`}
                value={formData.confirmPassword}
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
            {fieldErrors.confirmPassword && (
              <p className="text-red-500 text-sm mt-1">
                {fieldErrors.confirmPassword}
              </p>
            )}
            {formData.confirmPassword &&
              formData.confirmPassword === formData.password &&
              !fieldErrors.confirmPassword && (
                <p className="text-green-500 text-xs mt-1">Passwords match ✓</p>
              )}
          </div>

          <div className="flex items-start gap-2">
            <input
              type="checkbox"
              id="terms"
              checked={agreedToTerms}
              onChange={(e) => setAgreedToTerms(e.target.checked)}
              className="mt-1 w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
            />
            <label htmlFor="terms" className="text-sm text-gray-700 cursor-pointer">
              I agree to the{" "}
              <a href="/terms" className="text-primary hover:underline">
                Terms of Service
              </a>{" "}
              and{" "}
              <a href="/privacy" className="text-primary hover:underline">
                Privacy Policy
              </a>
            </label>
          </div>

          <button
            type="submit"
            disabled={loading || !agreedToTerms}
            className={`w-full bg-primary text-white py-2 rounded-xl transition ${
              loading || !agreedToTerms
                ? "opacity-50 cursor-not-allowed"
                : "hover:bg-primary-dull transform hover:scale-[1.02]"
            }`}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="animate-spin">⏳</span>
                Registering...
              </span>
            ) : (
              "Create Account"
            )}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-gray-200">
          <p className="text-sm text-center text-gray-800">
            Already have an account?{" "}
            <a href="/login" className="text-primary hover:underline font-medium">
              Log in
            </a>
          </p>
          <div className="mt-4 text-center">
            <p className="text-xs text-gray-500">
              By creating an account, you agree to receive emails from QuickShow regarding your account and our services.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
