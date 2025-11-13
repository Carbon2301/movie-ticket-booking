import React, { useState, useEffect } from 'react';
import { 
  Users, 
  PlusIcon, 
  EditIcon, 
  TrashIcon, 
  SearchIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  XIcon,
  SaveIcon,
  ShieldCheckIcon,
  SettingsIcon
} from 'lucide-react';
import { toast } from 'react-toastify';
import api from '../../lib/api';

// Role API service
const roleAPI = {
  getAll: (params = {}) => api.get('/role', { params }),
  getById: (id) => api.get(`/role/${id}`),
  create: (data) => api.post('/role', data),
  update: (id, data) => api.put(`/role/${id}`, data),
  delete: (id) => api.delete(`/role/${id}`),
};

// Permission API service
const permissionAPI = {
  getAll: (params = {}) => api.get('/permissions', { params }),
};

const ManageRoles = () => {
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    totalPages: 1,
    totalItems: 0
  });
  
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [modalType, setModalType] = useState('create'); 
  const [selectedRole, setSelectedRole] = useState(null);
  const [permissions, setPermissions] = useState([]);
  const [selectedPermissions, setSelectedPermissions] = useState([]);
  const [loadingPermissions, setLoadingPermissions] = useState(false);
  const [permissionSearch, setPermissionSearch] = useState('');
  const [selectedMethod, setSelectedMethod] = useState('all');
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    isActive: true,
    permissionIds: []
  });

  useEffect(() => {
    fetchRoles();
    fetchPermissions(); // Load permissions on component mount
  }, [pagination.page, pagination.limit]);

  const fetchRoles = async () => {
    try {
      setLoading(true);
      console.log('Fetching roles with pagination:', { page: pagination.page, limit: pagination.limit });
      
      const response = await roleAPI.getAll({
        page: pagination.page,
        limit: pagination.limit
      });
      
      console.log('API Response:', response.data);
      
      setRoles(response.data.roles || []);
      setPagination(prev => ({
        ...prev,
        totalPages: response.data.totalPages || 1,
        totalItems: response.data.totalItems || 0
      }));
    } catch (error) {
      console.error('Error fetching roles:', error);
      toast.error('Không thể tải danh sách vai trò');
      setRoles([]);
      setPagination(prev => ({ ...prev, totalPages: 1, totalItems: 0 }));
    } finally {
      setLoading(false);
    }
  };

  // Fetch all permissions for selection
  const fetchPermissions = async () => {
    try {
      // Check if user is authenticated
      const token = localStorage.getItem('accessToken');
      if (!token) {
        toast.error('Vui lòng đăng nhập để truy cập');
        return;
      }

      // Fetch first page to get total count
      const firstResponse = await permissionAPI.getAll({ 
        page: 1, 
        limit: 100
      }); 
      
      console.log('Permissions response:', firstResponse.data);
      
      let allPermissions = [];
      const totalPages = firstResponse.data.totalPages || 1;
      
      // If there are multiple pages, fetch all of them
      for (let page = 1; page <= Math.min(totalPages, 10); page++) { // Limit to 10 pages max
        const response = await permissionAPI.getAll({ 
          page, 
          limit: 100
        });
        
        const pagePermissions = response.data.permissions || response.data.data || [];
        allPermissions = [...allPermissions, ...pagePermissions];
      }
      
      setPermissions(allPermissions);
      console.log('Total permissions loaded:', allPermissions.length);
    } catch (error) {
      console.error('Error fetching permissions:', error);
      console.error('Error response:', error.response?.data);
      
      if (error.response?.status === 401) {
        toast.error('Phiên đăng nhập đã hết hạn');
      } else if (error.response?.status === 422) {
        toast.error('Dữ liệu không hợp lệ khi tải quyền');
      } else {
        toast.error('Không thể tải danh sách quyền');
      }
    }
  };

  // Open permission management modal
  const openPermissionModal = async (role) => {
    setSelectedRole(role);
    setLoadingPermissions(true);
    setShowPermissionModal(true);
    
    try {
      // Fetch role details with current permissions
      const roleResponse = await roleAPI.getById(role.id);
      const currentPermissions = roleResponse.data.permissions || [];
      setSelectedPermissions(currentPermissions.map(p => p.id));
      
      // Fetch all permissions if not already loaded
      if (permissions.length === 0) {
        await fetchPermissions();
      }
    } catch (error) {
      console.error('Error fetching role permissions:', error);
      toast.error('Không thể tải thông tin quyền');
    } finally {
      setLoadingPermissions(false);
    }
  };

  // Save permission changes
  const savePermissions = async () => {
    try {
      await roleAPI.update(selectedRole.id, {
        name: selectedRole.name,
        description: selectedRole.description,
        isActive: selectedRole.isActive,
        permissionIds: selectedPermissions
      });
      
      toast.success('Cập nhật quyền thành công!');
      setShowPermissionModal(false);
      fetchRoles(); // Refresh roles list
    } catch (error) {
      console.error('Error saving permissions:', error);
      toast.error('Không thể cập nhật quyền');
    }
  };

  // Toggle permission selection
  const togglePermission = (permissionId) => {
    setSelectedPermissions(prev => 
      prev.includes(permissionId)
        ? prev.filter(id => id !== permissionId)
        : [...prev, permissionId]
    );
  };

  // Filter permissions based on search and method
  const filteredPermissions = permissions.filter(permission => {
    const matchesSearch = permission.name.toLowerCase().includes(permissionSearch.toLowerCase()) ||
                         permission.path.toLowerCase().includes(permissionSearch.toLowerCase()) ||
                         (permission.description && permission.description.toLowerCase().includes(permissionSearch.toLowerCase()));
    
    const matchesMethod = selectedMethod === 'all' || permission.method === selectedMethod;
    
    return matchesSearch && matchesMethod;
  });

  // Get unique methods from all permissions
  const availableMethods = [...new Set(permissions.map(p => p.method))].sort();

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const openModal = (type, role = null) => {
    setModalType(type);
    setSelectedRole(role);
    
    if (type === 'create') {
      setFormData({ name: '', description: '', isActive: true, permissionIds: [] });
    } else if (type === 'edit' && role) {
      setFormData({
        name: role.name,
        description: role.description || '',
        isActive: role.isActive !== undefined ? role.isActive : true,
        permissionIds: role.permissionIds || []
      });
    }
    
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedRole(null);
    setFormData({ name: '', description: '', isActive: true, permissionIds: [] });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      if (modalType === 'create') {
        // For create, don't send permissionIds
        const createData = {
          name: formData.name,
          description: formData.description,
          isActive: formData.isActive
        };
        await roleAPI.create(createData);
        toast.success('Tạo vai trò thành công!');
      } else if (modalType === 'edit' && selectedRole) {
        // For update, include permissionIds
        await roleAPI.update(selectedRole.id, formData);
        toast.success('Cập nhật vai trò thành công!');
      }
      
      closeModal();
      fetchRoles();
    } catch (error) {
      console.error('Error saving role:', error);
      console.error('Error response:', error.response?.data);
      
      // Show detailed error message
      const errorMessage = error.response?.data?.message || 
                          (modalType === 'create' ? 'Không thể tạo vai trò' : 'Không thể cập nhật vai trò');
      toast.error(errorMessage);
    }
  };

  const handleDelete = async () => {
    if (!selectedRole) return;
    
    try {
      await roleAPI.delete(selectedRole.id);
      toast.success('Xóa vai trò thành công!');
      closeModal();
      fetchRoles();
    } catch (error) {
      console.error('Error deleting role:', error);
      toast.error('Không thể xóa vai trò');
    }
  };

  const filteredRoles = roles.filter(role =>
    role.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (role.description && role.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      setPagination(prev => ({ ...prev, page: newPage }));
    }
  };

  if (loading && roles.length === 0) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto"></div>
          <p className="mt-4 text-gray-400">Loading roles...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">
            Manage <span className="text-red-500 bg-red-500/20 px-2 py-1 rounded">Roles</span>
          </h1>
          <p className="text-gray-400 mt-2">Control user roles and system access levels</p>
        </div>

        {/* Search and Add Button */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search roles..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-red-500 focus:border-transparent"
            />
          </div>
          <button
            onClick={() => openModal('create')}
            className="flex items-center gap-2 px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
          >
            <PlusIcon className="w-5 h-5" />
            Add Role
          </button>
        </div>

        {/* Roles Table */}
        <div className="bg-gray-900/50 border border-gray-700 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-800">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Role Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Created At
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {filteredRoles.map((role) => (
                  <tr key={role.id} className="hover:bg-gray-800/50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Users className="w-5 h-5 text-red-500 mr-3" />
                        <span className="text-white font-medium">{role.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-gray-300 text-sm">
                        {role.description || 'No description'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full border ${
                        role.isActive 
                          ? 'bg-green-600/20 text-green-400 border-green-600/30' 
                          : 'bg-red-600/20 text-red-400 border-red-600/30'
                      }`}>
                        {role.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-300 text-sm">
                      {formatDate(role.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => openPermissionModal(role)}
                          className="p-2 text-green-400 hover:text-green-300 hover:bg-green-400/10 rounded-lg transition-colors"
                          title="Manage Permissions"
                        >
                          <SettingsIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openModal('edit', role)}
                          className="p-2 text-blue-400 hover:text-blue-300 hover:bg-blue-400/10 rounded-lg transition-colors"
                          title="Edit Role"
                        >
                          <EditIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openModal('delete', role)}
                          className="p-2 text-red-400 hover:text-red-300 hover:bg-red-400/10 rounded-lg transition-colors"
                          title="Delete Role"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredRoles.length === 0 && (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-400 text-lg">No roles found</p>
              <p className="text-gray-500 mt-2">
                {searchTerm ? 'Try adjusting your search terms' : 'Add some roles to get started'}
              </p>
            </div>
          )}
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between mt-6">
            <div className="text-sm text-gray-400">
              Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
              {Math.min(pagination.page * pagination.limit, pagination.totalItems)} of{' '}
              {pagination.totalItems} roles
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page === 1}
                className="p-2 text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeftIcon className="w-5 h-5" />
              </button>
              
              <div className="flex gap-1">
                {[...Array(pagination.totalPages)].map((_, index) => (
                  <button
                    key={index + 1}
                    onClick={() => handlePageChange(index + 1)}
                    className={`px-3 py-1 text-sm rounded ${
                      pagination.page === index + 1
                        ? 'bg-red-600 text-white'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    {index + 1}
                  </button>
                ))}
              </div>
              
              <button
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page === pagination.totalPages}
                className="p-2 text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRightIcon className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-lg w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-gray-700">
              <h3 className="text-lg font-semibold text-white">
                {modalType === 'create' && 'Add New Role'}
                {modalType === 'edit' && 'Edit Role'}
                {modalType === 'delete' && 'Delete Role'}
              </h3>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-white"
              >
                <XIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6">
              {modalType === 'delete' ? (
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-red-600/20 flex items-center justify-center">
                      <TrashIcon className="w-5 h-5 text-red-400" />
                    </div>
                    <div>
                      <p className="text-white font-medium">Delete Role</p>
                      <p className="text-gray-400 text-sm">This action cannot be undone</p>
                    </div>
                  </div>
                  <p className="text-gray-300 mb-6">
                    Are you sure you want to delete the role "{selectedRole?.name}"?
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={handleDelete}
                      className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                    >
                      Delete
                    </button>
                    <button
                      onClick={closeModal}
                      className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Role Name *
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      required
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      placeholder="Enter role name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Description
                    </label>
                    <textarea
                      name="description"
                      value={formData.description}
                      onChange={handleInputChange}
                      rows={3}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      placeholder="Enter role description"
                    />
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      name="isActive"
                      id="isActive"
                      checked={formData.isActive}
                      onChange={handleInputChange}
                      className="w-4 h-4 text-red-600 bg-gray-800 border-gray-600 rounded focus:ring-red-500"
                    />
                    <label htmlFor="isActive" className="ml-2 text-sm text-gray-300">
                      Active Role
                    </label>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button
                      type="submit"
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                    >
                      <SaveIcon className="w-4 h-4" />
                      {modalType === 'create' ? 'Create Role' : 'Update Role'}
                    </button>
                    <button
                      type="button"
                      onClick={closeModal}
                      className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Permission Management Modal */}
      {showPermissionModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-lg w-full max-w-2xl max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-gray-700">
              <h3 className="text-lg font-semibold text-white">
                Manage Permissions: {selectedRole?.name}
              </h3>
              <button
                onClick={() => setShowPermissionModal(false)}
                className="text-gray-400 hover:text-white"
              >
                <XIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[60vh]">
              {loadingPermissions ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500 mx-auto"></div>
                  <p className="mt-4 text-gray-400">Loading permissions...</p>
                </div>
              ) : (
                <div>
                  <div className="mb-4">
                    <p className="text-gray-300 text-sm mb-4">
                      Select permissions for this role. These permissions will determine what actions users with this role can perform.
                    </p>
                    
                    {/* Search and Filter Controls */}
                    <div className="flex flex-col sm:flex-row gap-3 mb-4">
                      <div className="relative flex-1">
                        <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <input
                          type="text"
                          placeholder="Search permissions..."
                          value={permissionSearch}
                          onChange={(e) => setPermissionSearch(e.target.value)}
                          className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent"
                        />
                      </div>
                      
                      <select
                        value={selectedMethod}
                        onChange={(e) => setSelectedMethod(e.target.value)}
                        className="px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      >
                        <option value="all">All Methods</option>
                        {availableMethods.map(method => (
                          <option key={method} value={method}>{method}</option>
                        ))}
                      </select>
                    </div>

                    {/* Filter Summary */}
                    <div className="flex items-center justify-between text-sm text-gray-400 mb-3">
                      <span>
                        Showing {filteredPermissions.length} of {permissions.length} permissions
                      </span>
                      {(permissionSearch || selectedMethod !== 'all') && (
                        <button
                          onClick={() => {
                            setPermissionSearch('');
                            setSelectedMethod('all');
                          }}
                          className="text-red-400 hover:text-red-300"
                        >
                          Clear filters
                        </button>
                      )}
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    {filteredPermissions.map((permission) => (
                      <div
                        key={permission.id}
                        className="flex items-center space-x-3 p-3 bg-gray-800/50 rounded-lg hover:bg-gray-800 transition-colors"
                      >
                        <input
                          type="checkbox"
                          id={`permission-${permission.id}`}
                          checked={selectedPermissions.includes(permission.id)}
                          onChange={() => togglePermission(permission.id)}
                          className="w-4 h-4 text-red-600 bg-gray-700 border-gray-600 rounded focus:ring-red-500"
                        />
                        <div className="flex-1 min-w-0">
                          <label
                            htmlFor={`permission-${permission.id}`}
                            className="flex items-center justify-between cursor-pointer"
                          >
                            <div className="flex items-center space-x-3">
                              <ShieldCheckIcon className="w-4 h-4 text-red-500 flex-shrink-0" />
                              <div>
                                <p className="text-white font-medium">{permission.name}</p>
                                <p className="text-gray-400 text-sm truncate">
                                  {permission.description || 'No description'}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2 text-xs">
                              <span className={`px-2 py-1 rounded-full border ${
                                permission.method === 'GET' ? 'bg-green-600/20 text-green-400 border-green-600/30' :
                                permission.method === 'POST' ? 'bg-blue-600/20 text-blue-400 border-blue-600/30' :
                                permission.method === 'PUT' ? 'bg-yellow-600/20 text-yellow-400 border-yellow-600/30' :
                                permission.method === 'DELETE' ? 'bg-red-600/20 text-red-400 border-red-600/30' :
                                'bg-gray-600/20 text-gray-400 border-gray-600/30'
                              }`}>
                                {permission.method}
                              </span>
                              <code className="text-gray-400 bg-gray-800 px-2 py-1 rounded text-xs">
                                {permission.path}
                              </code>
                            </div>
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>

                  {permissions.length === 0 && (
                    <div className="text-center py-8">
                      <ShieldCheckIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-400">No permissions available</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex justify-between items-center p-6 border-t border-gray-700 bg-gray-900/50">
              <div className="text-sm text-gray-400">
                {selectedPermissions.length} permissions selected
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowPermissionModal(false)}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={savePermissions}
                  disabled={loadingPermissions}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-lg transition-colors"
                >
                  <SaveIcon className="w-4 h-4" />
                  Save Permissions
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageRoles;
