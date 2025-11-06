import React, { useState, useEffect } from 'react';
import {
  HomeIcon,
  PlusIcon,
  EditIcon,
  TrashIcon,
  SearchIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  XIcon,
  SaveIcon,
  AlertTriangleIcon,
  EyeIcon,
  UsersIcon,
  MapIcon
} from 'lucide-react';
import { roomAPI, cinemaAPI } from '../../lib/api';
import { toast } from 'react-hot-toast';

const ManageRooms = () => {
  const [rooms, setRooms] = useState([]);
  const [cinemas, setCinemas] = useState([]);
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
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [roomFormData, setRoomFormData] = useState({
    name: '',
    cinemaId: '',
    capacity: '',
    rowCount: '',
    columnCount: '',
    description: ''
  });

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [roomToDelete, setRoomToDelete] = useState(null);

  const [showViewModal, setShowViewModal] = useState(false);
  const [viewRoom, setViewRoom] = useState(null);

  // Fetch rooms
  const fetchRooms = async () => {
    try {
      setLoading(true);
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        ...(searchTerm && { search: searchTerm })
      };
      
      const response = await roomAPI.getAll(params);
      setRooms(response.data.data || []);
      setPagination(prev => ({
        ...prev,
        totalPages: response.data.totalPages || 1,
        totalItems: response.data.totalItems || 0
      }));
    } catch (error) {
      console.error('Error fetching rooms:', error);
      toast.error('Failed to fetch rooms');
    } finally {
      setLoading(false);
    }
  };

  // Fetch cinemas for dropdown
  const fetchCinemas = async () => {
    try {
      const response = await cinemaAPI.getAll();
      setCinemas(response.data.data || []);
    } catch (error) {
      console.error('Error fetching cinemas:', error);
    }
  };

  useEffect(() => {
    fetchRooms();
  }, [pagination.page, pagination.limit]);

  useEffect(() => {
    fetchCinemas();
  }, []);

  // Search handler with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      setPagination(prev => ({ ...prev, page: 1 }));
      fetchRooms();
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Modal handlers
  const openModal = (type, room = null) => {
    setModalType(type);
    setSelectedRoom(room);
    setShowModal(true);
    
    if (type === 'create') {
      setRoomFormData({
        name: '',
        cinemaId: '',
        capacity: '',
        rowCount: '',
        columnCount: '',
        description: ''
      });
    } else if (type === 'edit' && room) {
      setRoomFormData({
        name: room.name || '',
        cinemaId: room.cinemaId ? room.cinemaId.toString() : '',
        capacity: room.capacity ? room.capacity.toString() : '',
        rowCount: room.rowCount ? room.rowCount.toString() : '',
        columnCount: room.columnCount ? room.columnCount.toString() : '',
        description: room.description || ''
      });
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedRoom(null);
    setRoomFormData({
      name: '',
      cinemaId: '',
      capacity: '',
      rowCount: '',
      columnCount: '',
      description: ''
    });
  };

  // Form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const submitData = {
        name: roomFormData.name,
        cinemaId: parseInt(roomFormData.cinemaId),
        capacity: parseInt(roomFormData.capacity),
        rowCount: parseInt(roomFormData.rowCount),
        columnCount: parseInt(roomFormData.columnCount),
        description: roomFormData.description || null
      };

      if (modalType === 'create') {
        await roomAPI.create(submitData);
        toast.success('Room created successfully!');
      } else if (modalType === 'edit' && selectedRoom) {
        await roomAPI.update(selectedRoom.id, submitData);
        toast.success('Room updated successfully!');
      }
      
      closeModal();
      fetchRooms();
    } catch (error) {
      console.error('Error saving room:', error);
      const errorMessage = error.response?.data?.message || 
                          (modalType === 'create' ? 'Failed to create room' : 'Failed to update room');
      toast.error(errorMessage);
    }
  };

  // Delete handlers
  const handleDelete = (room) => {
    setRoomToDelete(room);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    try {
      await roomAPI.delete(roomToDelete.id);
      toast.success('Room deleted successfully!');
      setShowDeleteModal(false);
      setRoomToDelete(null);
      
      // Auto redirect if deleting last item on current page
      if (rooms.length === 1 && pagination.page > 1) {
        setPagination(prev => ({ ...prev, page: prev.page - 1 }));
      } else {
        fetchRooms();
      }
    } catch (error) {
      console.error('Error deleting room:', error);
      toast.error('Failed to delete room');
    }
  };

  const cancelDelete = () => {
    setShowDeleteModal(false);
    setRoomToDelete(null);
  };

  // View room details
  const handleViewRoom = async (room) => {
    try {
      const response = await roomAPI.getById(room.id);
      setViewRoom(response.data);
      setShowViewModal(true);
    } catch (error) {
      console.error('Error fetching room details:', error);
      toast.error('Failed to fetch room details');
    }
  };

  // Pagination handlers
  const handlePageChange = (newPage) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  const handleLimitChange = (newLimit) => {
    setPagination(prev => ({ ...prev, limit: newLimit, page: 1 }));
  };

  // Get cinema name from cinemas array
  const getCinemaName = (cinemaId) => {
    const cinema = cinemas.find(c => c.id === cinemaId);
    return cinema ? cinema.name : 'Unknown Cinema';
  };

  return (
    <div className="p-6 bg-black min-h-screen text-white">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <HomeIcon className="w-8 h-8 text-red-500" />
          <h1 className="text-2xl font-bold">Room Management</h1>
        </div>
        <button
          onClick={() => openModal('create')}
          className="flex items-center space-x-2 bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg transition-colors"
        >
          <PlusIcon className="w-5 h-5" />
          <span>Add Room</span>
        </button>
      </div>

      {/* Search and Filters */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search rooms..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
          />
        </div>
        <select
          value={pagination.limit}
          onChange={(e) => handleLimitChange(parseInt(e.target.value))}
          className="px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500"
        >
          <option value={5}>5 per page</option>
          <option value={10}>10 per page</option>
          <option value={20}>20 per page</option>
          <option value={50}>50 per page</option>
        </select>
      </div>

      {/* Rooms Table */}
      <div className="bg-black rounded-lg overflow-hidden border border-gray-700">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Room
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Cinema
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Capacity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Layout
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-black divide-y divide-gray-700">
              {loading ? (
                <tr>
                  <td colSpan="5" className="px-6 py-4 text-center text-gray-400">
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-red-500"></div>
                      <span className="ml-2">Loading rooms...</span>
                    </div>
                  </td>
                </tr>
              ) : rooms.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-4 text-center text-gray-400">
                    <div className="flex flex-col items-center space-y-2">
                      <HomeIcon className="w-12 h-12 text-gray-600" />
                      <span>No rooms found</span>
                    </div>
                  </td>
                </tr>
              ) : (
                rooms.map((room) => (
                  <tr key={room.id} className="hover:bg-gray-900 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-lg bg-red-600 flex items-center justify-center">
                            <HomeIcon className="w-6 h-6 text-white" />
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-white">{room.name}</div>
                          <div className="text-sm text-gray-300">{room.description || 'No description'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-white">{getCinemaName(room.cinemaId)}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        <UsersIcon className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-white">{room.capacity} seats</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        <MapIcon className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-white">{room.rowCount}x{room.columnCount}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleViewRoom(room)}
                          className="p-2 text-blue-400 hover:text-blue-300 hover:bg-blue-400/10 rounded transition-colors"
                          title="View Details"
                        >
                          <EyeIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openModal('edit', room)}
                          className="p-2 text-yellow-400 hover:text-yellow-300 hover:bg-yellow-400/10 rounded transition-colors"
                          title="Edit Room"
                        >
                          <EditIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(room)}
                          className="p-2 text-red-400 hover:text-red-300 hover:bg-red-400/10 rounded transition-colors"
                          title="Delete Room"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!loading && rooms.length > 0 && (
          <div className="bg-gray-700 px-6 py-3 flex items-center justify-between border-t border-gray-600">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page <= 1}
                className="relative inline-flex items-center px-4 py-2 border border-gray-600 text-sm font-medium rounded-md text-gray-300 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page >= pagination.totalPages}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-600 text-sm font-medium rounded-md text-gray-300 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-300">
                  Showing <span className="font-medium">{((pagination.page - 1) * pagination.limit) + 1}</span> to{' '}
                  <span className="font-medium">
                    {Math.min(pagination.page * pagination.limit, pagination.totalItems)}
                  </span> of{' '}
                  <span className="font-medium">{pagination.totalItems}</span> rooms
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                  <button
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={pagination.page <= 1}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-600 bg-gray-800 text-sm font-medium text-gray-300 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeftIcon className="h-5 w-5" />
                  </button>
                  
                  {[...Array(pagination.totalPages)].map((_, index) => {
                    const pageNumber = index + 1;
                    const isCurrentPage = pageNumber === pagination.page;
                    
                    if (
                      pageNumber === 1 ||
                      pageNumber === pagination.totalPages ||
                      (pageNumber >= pagination.page - 1 && pageNumber <= pagination.page + 1)
                    ) {
                      return (
                        <button
                          key={pageNumber}
                          onClick={() => handlePageChange(pageNumber)}
                          className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                            isCurrentPage
                              ? 'z-10 bg-red-600 border-red-600 text-white'
                              : 'bg-gray-800 border-gray-600 text-gray-300 hover:bg-gray-700'
                          }`}
                        >
                          {pageNumber}
                        </button>
                      );
                    } else if (
                      pageNumber === pagination.page - 2 ||
                      pageNumber === pagination.page + 2
                    ) {
                      return (
                        <span
                          key={pageNumber}
                          className="relative inline-flex items-center px-4 py-2 border border-gray-600 bg-gray-800 text-sm font-medium text-gray-300"
                        >
                          ...
                        </span>
                      );
                    }
                    return null;
                  })}
                  
                  <button
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={pagination.page >= pagination.totalPages}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-600 bg-gray-800 text-sm font-medium text-gray-300 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronRightIcon className="h-5 w-5" />
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-black rounded-lg max-w-md w-full border border-gray-700">
            <div className="flex items-center justify-between p-6 border-b border-gray-700">
              <h3 className="text-lg font-semibold text-white">
                {modalType === 'create' ? 'Add New Room' : 'Edit Room'}
              </h3>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <XIcon className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Room Name *
                </label>
                <input
                  type="text"
                  value={roomFormData.name}
                  onChange={(e) => setRoomFormData(prev => ({ ...prev, name: e.target.value }))}
                  required
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  placeholder="Enter room name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Cinema *
                </label>
                <select
                  value={roomFormData.cinemaId}
                  onChange={(e) => setRoomFormData(prev => ({ ...prev, cinemaId: e.target.value }))}
                  required
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                >
                  <option value="">Select a cinema</option>
                  {cinemas.map((cinema) => (
                    <option key={cinema.id} value={cinema.id}>
                      {cinema.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Rows *
                  </label>
                  <input
                    type="number"
                    value={roomFormData.rowCount}
                    onChange={(e) => {
                      const rows = e.target.value;
                      const cols = roomFormData.columnCount;
                      setRoomFormData(prev => ({ 
                        ...prev, 
                        rowCount: rows,
                        capacity: rows && cols ? (parseInt(rows) * parseInt(cols)).toString() : ''
                      }));
                    }}
                    required
                    min="1"
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    placeholder="Rows"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Columns *
                  </label>
                  <input
                    type="number"
                    value={roomFormData.columnCount}
                    onChange={(e) => {
                      const cols = e.target.value;
                      const rows = roomFormData.rowCount;
                      setRoomFormData(prev => ({ 
                        ...prev, 
                        columnCount: cols,
                        capacity: rows && cols ? (parseInt(rows) * parseInt(cols)).toString() : ''
                      }));
                    }}
                    required
                    min="1"
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    placeholder="Columns"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Total Capacity
                </label>
                <input
                  type="number"
                  value={roomFormData.capacity}
                  readOnly
                  className="w-full px-3 py-2 bg-gray-600 border border-gray-600 rounded-lg text-gray-300 cursor-not-allowed"
                  placeholder="Auto-calculated"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Description
                </label>
                <textarea
                  value={roomFormData.description}
                  onChange={(e) => setRoomFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows="3"
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  placeholder="Enter room description"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors flex items-center space-x-2"
                >
                  <SaveIcon className="w-4 h-4" />
                  <span>{modalType === 'create' ? 'Create Room' : 'Update Room'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-black rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center space-x-3 mb-4">
              <div className="flex-shrink-0">
                <AlertTriangleIcon className="w-8 h-8 text-red-500" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Delete Room Confirmation</h3>
                <p className="text-gray-400 mt-1">
                  Are you sure you want to delete room "{roomToDelete?.name}"?
                </p>
              </div>
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={cancelDelete}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Room Modal */}
      {showViewModal && viewRoom && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-black rounded-lg max-w-lg w-full border border-gray-700">
            <div className="flex items-center justify-between p-6 border-b border-gray-700">
              <h3 className="text-lg font-semibold text-white">Room Details</h3>
              <button
                onClick={() => setShowViewModal(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <XIcon className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400">Room Name</label>
                  <p className="text-white mt-1">{viewRoom.name}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400">Cinema</label>
                  <p className="text-white mt-1">{getCinemaName(viewRoom.cinemaId)}</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400">Capacity</label>
                  <p className="text-white mt-1">{viewRoom.capacity} seats</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400">Rows</label>
                  <p className="text-white mt-1">{viewRoom.rowCount}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400">Columns</label>
                  <p className="text-white mt-1">{viewRoom.columnCount}</p>
                </div>
              </div>

              {viewRoom.description && (
                <div>
                  <label className="block text-sm font-medium text-gray-400">Description</label>
                  <p className="text-white mt-1">{viewRoom.description}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageRooms;
