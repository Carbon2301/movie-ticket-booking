import { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { assets } from "../assets/assets";
import { MenuIcon, SearchIcon, XIcon, User, LogOut, LayoutDashboard } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { toast } from "react-hot-toast";

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const navigate = useNavigate();
  const { auth, logout } = useAuth();
  const defaultAvatar =
    "https://cdn2.fptshop.com.vn/small/avatar_trang_1_cd729c335b.jpg";

  const handleLogout = () => {
    logout();
    setUserMenuOpen(false);
    toast.success("Logged out successfully!");
    navigate("/");
  };

  const navLinkClass = ({ isActive }) =>
    `border-b-2 border-transparent pb-1 transition-colors hover:border-primary hover:text-primary ${
      isActive ? "border-primary text-primary font-semibold" : ""
    }`;

  return (
    <div
      className="fixed top-0 left-0 z-50 w-full flex items-center 
        justify-between px-6 md:px-16 lg:px-36 py-5"
    >
      <Link to="/" className="max-md:flex-1">
        <img src={assets.logo} alt="Logo" className="w-36 h-auto" />
      </Link>

      <div
        className={`max-md:absolute max-md:top-0 max-md:left-0 max-md:font-medium
        max-md:text-lg z-50 flex flex-col md:flex-row items-center
        max-md:justify-center gap-8 min-md:px-8 py-3 max-md:h-screen
        min-md:rounded-full backdrop-blur bg-black/70 md:bg-white/10 md:border
        border-gray-300/20 overflow-hidden transition-[width] duration-300 ${
          isOpen ? "max-md:w-full" : "max-md:w-0"
        }`}
      >
        <XIcon
          className="md:hidden absolute top-6 right-6 w-6 h-6 cursor-pointer"
          onClick={() => setIsOpen(!isOpen)}
        />

        <NavLink
          onClick={() => {
            scrollTo(0, 0);
            setIsOpen(false);
          }}
          to="/"
          className={navLinkClass}
        >
          Home
        </NavLink>
        <NavLink
          onClick={() => {
            scrollTo(0, 0);
            setIsOpen(false);
          }}
          to="/movies"
          className={navLinkClass}
        >
          Movies
        </NavLink>
        <NavLink
          onClick={() => {
            scrollTo(0, 0);
            setIsOpen(false);
          }}
          to="/cinemas"
          className={navLinkClass}
        >
          Cinemas
        </NavLink>
        <NavLink
          onClick={() => {
            scrollTo(0, 0);
            setIsOpen(false);
          }}
          to="/releases"
          className={navLinkClass}
        >
          Releases
        </NavLink>
        <NavLink
          onClick={() => {
            scrollTo(0, 0);
            setIsOpen(false);
          }}
          to="/favorites"
          className={navLinkClass}
        >
          Favorites
        </NavLink>
        {/* Dashboard link cho admin trong mobile menu */}
        {auth.isLoggedIn && auth.user?.roleId === 1 && (
          <Link
            onClick={() => {
              scrollTo(0, 0);
              setIsOpen(false);
            }}
            to="/admin"
            className="text-primary font-semibold"
          >
            Admin Dashboard
          </Link>
        )}
      </div>

      <div className="flex items-center gap-8">
        {auth.isLoggedIn ? (
          <div className="relative">
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center justify-center w-10 h-10 rounded-full border-2 border-white overflow-hidden bg-white hover:ring-2 ring-primary transition"
            >
              <img
                src={auth.user?.avatar || defaultAvatar}
                alt="avatar"
                className="w-full h-full object-cover"
              />
            </button>

            {userMenuOpen && (
              <div className="absolute top-full right-0 mt-2 w-48 bg-white rounded-lg shadow-lg py-2 z-50">
                <div className="px-4 py-2 border-b border-gray-200">
                  <p className="text-sm font-medium text-gray-900">Welcome!</p>
                  <p className="text-xs text-gray-500">
                    {auth.user?.email || "user@example.com"}
                  </p>
                </div>
                <Link
                  to="/profile"
                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  onClick={() => setUserMenuOpen(false)}
                >
                  Manage Account
                </Link>
                {/* Dashboard link cho admin (roleId = 1) */}
                {auth.user?.roleId === 1 && (
                  <Link
                    to="/admin"
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    onClick={() => setUserMenuOpen(false)}
                  >
                    <div className="flex items-center gap-2">
                      
                      Admin Dashboard
                    </div>
                  </Link>
                )}
                <Link
                  to="/my-bookings"
                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  onClick={() => setUserMenuOpen(false)}
                >
                  My Bookings
                </Link>
                <Link
                  to="/favorites"
                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  onClick={() => setUserMenuOpen(false)}
                >
                  Favorites
                </Link>
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100 flex items-center gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </button>
              </div>
            )}
          </div>
        ) : (
          <button
            onClick={() => {
              scrollTo(0, 0);
              navigate("/login");
            }}
            className="px-4 py-1 sm:px-7 sm:py-2 bg-primary
              hover:bg-primary-dull transition rounded-full font-medium
              cursor-pointer text-white"
          >
            Login
          </button>
        )}
      </div>

      <MenuIcon
        className="max-md:ml-4 md:hidden w-8 h-8 cursor-pointer"
        onClick={() => setIsOpen(!isOpen)}
      />
    </div>
  );
};

export default Navbar;
