import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import api from "../lib/api";
import { toast, Toaster } from "react-hot-toast";
import { useNavigate } from "react-router-dom";

const Profile = () => {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();

  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(user?.avatar || ""); // Tách avatar preview riêng

  const [formData, setFormData] = useState({
    name: "",
    phoneNumber: "",
  });

  const [passwordData, setPasswordData] = useState({
    password: "",
    newPassword: "",
    confirmNewPassword: "",
  });

  const [editProfile, setEditProfile] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});

  // Khởi tạo dữ liệu khi component mount hoặc user thay đổi
  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || "",
        phoneNumber: user.phoneNumber || "",
      });
      setAvatarPreview(user.avatar || "https://cdn2.fptshop.com.vn/small/avatar_trang_1_cd729c335b.jpg");
    }
  }, [user]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setFieldErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData((prev) => ({ ...prev, [name]: value }));
    setFieldErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    setFieldErrors({});

    const form = new FormData();

    // Chỉ gửi các field có thay đổi
    if (formData.phoneNumber !== user?.phoneNumber) {
      form.append("phoneNumber", formData.phoneNumber);
    }
    if (formData.name !== user?.name) {
      form.append("name", formData.name);
    }

    // Nếu có file avatar mới
    if (avatarFile) {
      form.append("avatar", avatarFile);
    }

    if ([...form.entries()].length === 0) {
      toast("No changes to update.");
      setLoading(false);
      setEditProfile(false);
      return;
    }

    try {
      const res = await api.put("/profiles/update-profile", form, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      // Cập nhật user trong context (res.data là object user)
      updateUser(res.data);

      // Cập nhật avatar preview nếu có avatar mới
      if (res.data.avatar) {
        setAvatarPreview(res.data.avatar);
      }

      toast.success("Profile updated successfully!");

      // Reset states
      setEditProfile(false);
      setAvatarFile(null);

      // Giải phóng URL tạm thời nếu có
      if (avatarFile) {
        URL.revokeObjectURL(avatarPreview);
      }
    } catch (err) {
      const data = err.response?.data;
      const errs = {};
      if (Array.isArray(data?.message)) {
        data.message.forEach((entry) => {
          if (entry.field) errs[entry.field] = entry.error;
        });
      } else {
        toast.error(data?.message || "Update failed.");
      }
      setFieldErrors(errs);
    } finally {
      setLoading(false);
    }

  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAvatarFile(file);
      // Tạo preview tạm thời
      const previewUrl = URL.createObjectURL(file);
      setAvatarPreview(previewUrl);
    }
  };

  const handleCancelEdit = () => {
    // Reset về giá trị ban đầu từ user
    setFormData({
      name: user?.name || "",
      phoneNumber: user?.phoneNumber || "",
    });
    setAvatarPreview(user?.avatar || "https://cdn2.fptshop.com.vn/small/avatar_trang_1_cd729c335b.jpg");
    setAvatarFile(null);
    setEditProfile(false);
    setFieldErrors({});

    // Giải phóng URL tạm thời nếu có
    if (avatarFile) {
      URL.revokeObjectURL(avatarPreview);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    setFieldErrors({});

    const { password, newPassword, confirmNewPassword } = passwordData;

    if (newPassword !== confirmNewPassword) {
      setFieldErrors({
        confirmNewPassword: "Confirmation password does not match.",
      });
      toast.error("Confirmation password does not match.");
      setLoading(false);
      return;
    }

    try {
      await api.put("/profiles/change-password", {
        password,
        newPassword,
        confirmNewPassword,
      });

      toast.success("Password changed successfully!");
      setPasswordData({
        password: "",
        newPassword: "",
        confirmNewPassword: "",
      });
      setShowPasswordModal(false);
    } catch (err) {
      const data = err.response?.data;
      const errs = {};
      if (Array.isArray(data?.message)) {
        data.message.forEach((entry) => {
          if (entry.field) errs[entry.field] = entry.error;
        });
      } else {
        toast.error(data?.message || "Password change failed.");
      }
      setFieldErrors(errs);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen pt-[120px] pb-12 px-4 background-color">
      <Toaster position="top-center" />
      <div className="max-w-5xl mx-auto bg-white p-6 rounded-xl shadow-md relative">
        <button
          onClick={() => navigate("/")}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 text-xl font-bold"
        >
          ✕
        </button>
        <h2 className="text-2xl font-bold mb-6 text-gray-800">Profile</h2>
        <div className="flex flex-col md:flex-row gap-8">
          <div className="w-full md:w-3/8 flex flex-col items-center py-6">
            <img
              src={avatarPreview}
              alt="Avatar"
              onClick={() => editProfile && document.getElementById("avatarInput").click()}
              title={editProfile ? "Click to update avatar" : ""}
              className={`w-48 h-48 rounded-full object-cover border border-gray-300 shadow-md transition cursor-pointer ${editProfile ? "hover:opacity-80 hover:scale-105" : ""
                }`}
            />
            {editProfile && (
              <input
                id="avatarInput"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarChange}
              />
            )}
          </div>

          <div className="w-full md:w-5/8">
            {!editProfile ? (
              <div className="space-y-5 text-gray-800 mb-1">
                <p>
                  <strong>Name:</strong> {user?.name || "—"}
                </p>
                <p>
                  <strong>Email:</strong> {user?.email || "—"}
                </p>
                <p>
                  <strong>Phone Number:</strong> {user?.phoneNumber || "—"}
                </p>
                <div className="mt-8 flex gap-4 justify-end">
                  <button
                    onClick={() => setShowPasswordModal(true)}
                    className="bg-primary-dull hover:bg-primary-dull text-white px-4 py-2 rounded-xl transition"
                  >
                    Reset Password
                  </button>
                  <button
                    onClick={() => setEditProfile(true)}
                    className="bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-xl transition"
                  >
                    Update Profile
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleUpdateProfile} className="space-y-4">
                <div>
                  <label className="block mb-1 text-gray-800">Name</label>
                  <input
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className="w-full border px-4 py-2 border-gray-300 text-gray-800 rounded-xl"
                  />
                  {fieldErrors.name && (
                    <p className="text-sm text-red-600 mt-1">
                      {fieldErrors.name}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block mb-1 text-gray-800">
                    Phone Number
                  </label>
                  <input
                    name="phoneNumber"
                    value={formData.phoneNumber}
                    onChange={handleChange}
                    className="w-full border px-4 py-2 border-gray-300 text-gray-800 rounded-xl"
                  />
                  {fieldErrors.phoneNumber && (
                    <p className="text-sm text-red-600 mt-1">
                      {fieldErrors.phoneNumber}
                    </p>
                  )}
                </div>

                <div className="mt-8 flex gap-4 justify-end">
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="text-gray-700 hover:underline px-4 py-2"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="bg-primary text-white px-4 py-2 rounded-xl disabled:opacity-50"
                  >
                    {loading ? "Saving..." : "Save"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

        {/* Password Modal */}
        {showPasswordModal && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50">
            <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md relative">
              <button
                onClick={() => setShowPasswordModal(false)}
                className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 text-xl font-bold"
              >
                ✕
              </button>
              <h3 className="text-xl text-gray-800 font-semibold mb-4">
                Reset Password
              </h3>
              <form onSubmit={handleChangePassword} className="space-y-4">
                <div>
                  <label className="block mb-1 text-gray-800">
                    Current Password
                  </label>
                  <input
                    type="password"
                    name="password"
                    value={passwordData.password}
                    onChange={handlePasswordChange}
                    className="w-full border px-4 py-2 placeholder:text-gray-400 text-gray-800 border-gray-300 rounded-xl"
                  />
                  {fieldErrors.password && (
                    <p className="text-sm text-red-600 ">
                      {fieldErrors.password}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block mb-1 text-gray-900">
                    New Password
                  </label>
                  <input
                    type="password"
                    name="newPassword"
                    value={passwordData.newPassword}
                    onChange={handlePasswordChange}
                    className="w-full border px-4 py-2 placeholder:text-gray-400 border-gray-300 text-gray-800 rounded-xl"
                  />
                  {fieldErrors.newPassword && (
                    <p className="text-sm text-red-600">
                      {fieldErrors.newPassword}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block mb-1 text-gray-900">
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    name="confirmNewPassword"
                    value={passwordData.confirmNewPassword}
                    onChange={handlePasswordChange}
                    className="w-full border px-4 py-2 placeholder:text-gray-400 border-gray-300 text-gray-800 rounded-xl"
                  />
                  {fieldErrors.confirmNewPassword && (
                    <p className="text-sm text-red-600">
                      {fieldErrors.confirmNewPassword}
                    </p>
                  )}
                </div>

                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowPasswordModal(false)}
                    className="text-gray-800 hover:underline px-4 py-2"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="bg-primary text-white px-4 py-2 rounded-xl disabled:opacity-50"
                  >
                    {loading ? "Changing..." : "Submit"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Profile;
