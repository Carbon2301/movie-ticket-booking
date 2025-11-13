import React, { useState, useEffect } from 'react';
import { 
  ShieldIcon, 
  PlusIcon, 
  EditIcon, 
  TrashIcon, 
  SearchIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  XIcon,
  SaveIcon
} from 'lucide-react';
import { permissionAPI } from '../../lib/api';
import { toast } from 'react-toastify';

const ManagePermissions = () => {
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    totalPages: 1,
    totalItems: 0
  });
  
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('create'); 
  const [selectedPermission, setSelectedPermission] = useState(null);
  
  const [formData, setFormData] = useState({
    name: '',
    path: '',
    method: 'GET'
  });

  const httpMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];

  useEffect(() => {
    fetchPermissions();
  }, [pagination.page, pagination.limit]);

  const fetchPermissions = async () => {
    try {
      setLoading(true);
      console.log('Fetching permissions with pagination:', { page: pagination.page, limit: pagination.limit });
      
      const response = await permissionAPI.getAll({
        page: pagination.page,
        limit: pagination.limit
      });
      
      console.log('API Response:', response.data);
      
      setPermissions(response.data.permissions || []);
      setPagination(prev => ({
        ...prev,
        totalPages: response.data.totalPages || 1,
        totalItems: response.data.totalItems || 0
      }));
    } catch (error) {
      console.error('Error fetching permissions:', error);
      // Don't use mock data - show empty state instead
      setPermissions([]);
      setPagination(prev => ({ ...prev, totalPages: 1, totalItems: 0 }));
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const openModal = (type, permission = null) => {
    setModalType(type);
    setSelectedPermission(permission);
    
    if (type === 'create') {
      setFormData({ name: '', path: '', method: 'GET' });
    } else if (type === 'edit' && permission) {
      setFormData({
        name: permission.name,
        path: permission.path,
        method: permission.method
      });
    }
    
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedPermission(null);
    setFormData({ name: '', path: '', method: 'GET' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (modalType === 'create') {
        await permissionAPI.create(formData);
      } else if (modalType === 'edit') {
        await permissionAPI.update(selectedPermission.id, formData);
      }
      
      await fetchPermissions();
      closeModal();
      toast.success(`Permission ${modalType === 'create' ? 'created' : 'updated'} successfully!`);
    } catch (error) {
      console.error(`Error ${modalType}ing permission:`, error);
      toast.error(`Error ${modalType}ing permission`);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedPermission) return;
    
    setLoading(true);
    try {
      await permissionAPI.delete(selectedPermission.id);
      
      const currentPageItems = permissions.length;
      const isLastItemOnPage = currentPageItems === 1;
      const isNotFirstPage = pagination.page > 1;
      
      if (isLastItemOnPage && isNotFirstPage) {
        
        setPagination(prev => ({ ...prev, page: prev.page - 1 }));
      } else {
        
        await fetchPermissions();
      }
      
      closeModal();
      toast.success('Permission deleted successfully!');
    } catch (error) {
      console.error('Error deleting permission:', error);
      toast.error('Error deleting permission');
    } finally {
      setLoading(false);
    }
  };

  const filteredPermissions = permissions.filter(permission =>
    permission.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    permission.path.toLowerCase().includes(searchTerm.toLowerCase()) ||
    permission.method.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getMethodColor = (method) => {
    switch (method) {
      case 'GET': return 'bg-green-600/20 text-green-400 border-green-600/30';
      case 'POST': return 'bg-blue-600/20 text-blue-400 border-blue-600/30';
      case 'PUT': return 'bg-yellow-600/20 text-yellow-400 border-yellow-600/30';
      case 'DELETE': return 'bg-red-600/20 text-red-400 border-red-600/30';
      case 'PATCH': return 'bg-purple-600/20 text-purple-400 border-purple-600/30';
      default: return 'bg-gray-600/20 text-gray-400 border-gray-600/30';
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading && permissions.length === 0) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto"></div>
          <p className="mt-4 text-gray-400">Loading permissions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-7xl mx-auto">
        {}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">
            Manage <span className="text-red-500 bg-red-500/20 px-2 py-1 rounded">Permissions</span>
          </h1>
          <p className="text-gray-400 mt-2">Control user access and system permissions</p>
        </div>

        {}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search permissions..."
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
            Add Permission
          </button>
        </div>

        {}
        <div className="bg-gray-900/50 border border-gray-700 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-800">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Permission Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Path
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Method
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
                {filteredPermissions.map((permission) => (
                  <tr key={permission.id} className="hover:bg-gray-800/50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <ShieldIcon className="w-5 h-5 text-red-500 mr-3" />
                        <span className="text-white font-medium">{permission.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <code className="text-gray-300 bg-gray-800 px-2 py-1 rounded text-sm">
                        {permission.path}
                      </code>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full border ${getMethodColor(permission.method)}`}>
                        {permission.method}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-300 text-sm">
                      {formatDate(permission.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => openModal('edit', permission)}
                          className="p-2 text-blue-400 hover:text-blue-300 hover:bg-blue-400/10 rounded-lg transition-colors"
                        >
                          <EditIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openModal('delete', permission)}
                          className="p-2 text-red-400 hover:text-red-300 hover:bg-red-400/10 rounded-lg transition-colors"
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

          {filteredPermissions.length === 0 && (
            <div className="text-center py-12">
              <ShieldIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-400 text-lg">No permissions found</p>
              <p className="text-gray-500 mt-2">
                {searchTerm ? 'Try adjusting your search terms' : 'Add some permissions to get started'}
              </p>
            </div>
          )}
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between mt-6">
            <div className="text-sm text-gray-400">
              Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.totalItems)} of {pagination.totalItems} results
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPagination(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
                disabled={pagination.page === 1}
                className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeftIcon className="w-5 h-5" />
              </button>
              
              {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                let pageNum;
                if (pagination.totalPages <= 5) {
                  pageNum = i + 1;
                } else if (pagination.page <= 3) {
                  pageNum = i + 1;
                } else if (pagination.page >= pagination.totalPages - 2) {
                  pageNum = pagination.totalPages - 4 + i;
                } else {
                  pageNum = pagination.page - 2 + i;
                }
                
                return (
                  <button
                    key={pageNum}
                    onClick={() => setPagination(prev => ({ ...prev, page: pageNum }))}
                    className={`px-3 py-2 rounded-lg transition-colors ${
                      pageNum === pagination.page
                        ? 'bg-red-600 text-white'
                        : 'text-gray-400 hover:text-white hover:bg-gray-800'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
              
              <button
                onClick={() => setPagination(prev => ({ ...prev, page: Math.min(pagination.totalPages, prev.page + 1) }))}
                disabled={pagination.page === pagination.totalPages}
                className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRightIcon className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-gray-900 border border-gray-700 rounded-lg w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-gray-700">
              <h3 className="text-lg font-semibold text-white">
                {modalType === 'create' && 'Add New Permission'}
                {modalType === 'edit' && 'Edit Permission'}
                {modalType === 'delete' && 'Delete Permission'}
              </h3>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-white"
              >
                <XIcon className="w-5 h-5" />
              </button>
            </div>

            {modalType === 'delete' ? (
              <div className="p-6">
                <p className="text-gray-300 mb-6">
                  Are you sure you want to delete the permission "{selectedPermission?.name}"? This action cannot be undone.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={handleDelete}
                    disabled={loading}
                    className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-600/50 text-white rounded-lg transition-colors"
                  >
                    {loading ? 'Deleting...' : 'Delete'}
                  </button>
                  <button
                    onClick={closeModal}
                    className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="p-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Permission Name
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      placeholder="e.g., Create Movie"
                      required
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      API Path
                    </label>
                    <input
                      type="text"
                      name="path"
                      value={formData.path}
                      onChange={handleInputChange}
                      placeholder="e.g., /movies or /movies/*"
                      required
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      HTTP Method
                    </label>
                    <select
                      name="method"
                      value={formData.method}
                      onChange={handleInputChange}
                      required
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    >
                      {httpMethods.map(method => (
                        <option key={method} value={method}>{method}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-600/50 text-white rounded-lg transition-colors"
                  >
                    <SaveIcon className="w-4 h-4" />
                    {loading ? 'Saving...' : (modalType === 'create' ? 'Create' : 'Update')}
                  </button>
                  <button
                    type="button"
                    onClick={closeModal}
                    className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ManagePermissions;
