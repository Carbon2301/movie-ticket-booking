import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-hot-toast';
import { useEffect } from 'react';

const ProtectedAdminRoute = ({ children }) => {
  const { auth } = useAuth();

  useEffect(() => {
    // Hiển thị thông báo khi user không phải admin cố truy cập
    if (auth.isLoggedIn && auth.user?.roleId !== 1) {
      toast.error('Bạn không có quyền truy cập trang quản trị!');
    }
  }, [auth.isLoggedIn, auth.user?.roleId]);

  // Kiểm tra nếu user chưa đăng nhập
  if (!auth.isLoggedIn) {
    return <Navigate to="/login" replace />;
  }

  // Kiểm tra nếu user không phải admin (roleId !== 1)
  if (auth.user?.roleId !== 1) {
    return <Navigate to="/" replace />;
  }

  return children;
};

export default ProtectedAdminRoute;
