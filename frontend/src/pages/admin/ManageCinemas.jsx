import React, { useState, useEffect } from 'react';
import { 
  BuildingIcon, 
  PlusIcon, 
  EditIcon, 
  TrashIcon, 
  SearchIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  XIcon,
  SaveIcon,
  MapPinIcon,
  AlertTriangleIcon,
  UsersIcon,
  ArrowLeftIcon,
  EyeIcon
} from 'lucide-react';
import { cinemaAPI, roomAPI } from '../../lib/api';
import { toast } from 'react-toastify';

const ManageCinemas = () => {
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
  const [selectedCinema, setSelectedCinema] = useState(null);
  
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [cinemaToDelete, setCinemaToDelete] = useState(null);
  
  // Room delete modal states
  const [showRoomDeleteModal, setShowRoomDeleteModal] = useState(false);
  const [roomToDelete, setRoomToDelete] = useState(null);
  
  // Room management states
  const [showRoomView, setShowRoomView] = useState(false);
  const [selectedCinemaForRooms, setSelectedCinemaForRooms] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [showRoomModal, setShowRoomModal] = useState(false);
  const [roomModalType, setRoomModalType] = useState('create');
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [roomFormData, setRoomFormData] = useState({
    name: '',
    totalSeats: '',
    seatLayout: {}
  });
  
  const [formData, setFormData] = useState({
    name: '',
    location: '',
    totalRooms: 1
  });

  useEffect(() => {
    fetchCinemas();
  }, [pagination.page, pagination.limit, searchTerm]);

  const fetchCinemas = async () => {
    try {
      setLoading(true);
      const params = {
        page: pagination.page,
        limit: pagination.limit
      };

      if (searchTerm.trim()) {
        params.name = searchTerm.trim();
      }

      const response = await cinemaAPI.getAll(params);
      setCinemas(response.data.cinemas || []);
      setPagination(prev => ({
        ...prev,
        totalPages: response.data.totalPages || 1,
        totalItems: response.data.totalItems || 0
      }));
    } catch (error) {
      console.error('Error fetching cinemas:', error);
      toast.error('Failed to load cinemas');
      setCinemas([]);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'totalRooms' ? parseInt(value) || 1 : value
    }));
  };

  const openModal = (type, cinema = null) => {
    setModalType(type);
    setSelectedCinema(cinema);
    
    if (type === 'create') {
      setFormData({
        name: '',
        location: '',
        totalRooms: 1
      });
    } else if (type === 'edit' && cinema) {
      setFormData({
        name: cinema.name || '',
        location: cinema.location || '',
        totalRooms: cinema.totalRooms || 1
      });
    }
    
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedCinema(null);
    setFormData({
      name: '',
      location: '',
      totalRooms: 1
    });
  };

  // Room management functions
  const openRoomView = async (cinema) => {
    setSelectedCinemaForRooms(cinema);
    setShowRoomView(true);
    setRooms(cinema.rooms || []);
  };

  const closeRoomView = () => {
    setShowRoomView(false);
    setSelectedCinemaForRooms(null);
    setRooms([]);
    closeRoomModal();
  };

  const openRoomModal = (type, room = null) => {
    setRoomModalType(type);
    setSelectedRoom(room);
    setShowRoomModal(true);
    
    if (type === 'create') {
      setRoomFormData({
        name: '',
        totalSeats: '',
        seatLayout: {}
      });
    } else if (type === 'edit' && room) {
      setRoomFormData({
        name: room.name || '',
        totalSeats: room.totalSeats || '',
        seatLayout: room.seatLayout || {}
      });
    }
  };

  const closeRoomModal = () => {
    setShowRoomModal(false);
    setSelectedRoom(null);
    setRoomFormData({
      name: '',
      totalSeats: '',
      seatLayout: {}
    });
  };

  // Generate default seat layout
  const generateDefaultSeatLayout = (totalSeats) => {
    // Optimize seats per row based on total seats
    let seatsPerRow = 15;
    if (totalSeats <= 50) {
      seatsPerRow = 10;
    } else if (totalSeats <= 120) {
      seatsPerRow = 15;
    } else if (totalSeats <= 240) {
      seatsPerRow = 20;
    } else {
      seatsPerRow = 25;
    }
    
    const rows = Math.ceil(totalSeats / seatsPerRow);
    const rowLabels = [];
    
    for (let i = 0; i < rows; i++) {
      rowLabels.push(String.fromCharCode(65 + i)); // A, B, C...
    }
    
    // Tự động chọn hàng VIP ở giữa hoặc cuối (30% tổng số hàng)
    const vipRowCount = Math.max(1, Math.ceil(rows * 0.3));
    const vipStartIndex = Math.max(0, rows - vipRowCount);
    const vipRows = rowLabels.slice(vipStartIndex);
    
    return {
      rows: rowLabels,
      seatsPerRow: seatsPerRow,
      vipRows: rows > 2 ? vipRows : [] // Chỉ có VIP nếu có hơn 2 hàng
    };
  };

  // Render seat layout component
  const SeatLayoutDisplay = ({ seatLayout, totalSeats }) => {
    if (!seatLayout || !seatLayout.rows) {
      return (
        <div className="text-center py-4 text-gray-400">
          <span className="text-sm">No seat layout available</span>
        </div>
      );
    }

    const { rows, seatsPerRow, vipRows = [] } = seatLayout;
    
    return (
      <div className="bg-gray-800 p-4 rounded-lg">
        <div className="mb-3 text-center">
          <div className="bg-gray-600 text-white px-3 py-1 rounded text-xs inline-block">
            SCREEN
          </div>
        </div>
        
        <div className="space-y-2 max-h-40 overflow-y-auto">
          {rows.map((row, rowIndex) => {
            const isVipRow = vipRows.includes(row);
            const seatsInThisRow = rowIndex === rows.length - 1 
              ? totalSeats - (rowIndex * seatsPerRow)
              : seatsPerRow;
            
            return (
              <div key={row} className="flex items-center justify-center gap-1">
                <span className="w-6 text-xs text-gray-400 text-center">{row}</span>
                <div className="flex gap-1">
                  {Array.from({ length: seatsInThisRow }, (_, seatIndex) => (
                    <div
                      key={seatIndex}
                      className={`w-4 h-4 rounded-sm text-xs flex items-center justify-center ${
                        isVipRow 
                          ? 'bg-yellow-500 text-black' 
                          : 'bg-green-500 text-white'
                      }`}
                      title={`${row}${seatIndex + 1} ${isVipRow ? '(VIP)' : ''}`}
                    >
                      {seatIndex + 1}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
        
        <div className="mt-3 flex justify-center gap-4 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-green-500 rounded-sm"></div>
            <span className="text-gray-400">Regular Seats</span>
          </div>
          {vipRows.length > 0 && (
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-yellow-500 rounded-sm"></div>
              <span className="text-gray-400">VIP Seats</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  const handleRoomSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const roomData = {
        name: roomFormData.name,
        totalSeats: parseInt(roomFormData.totalSeats),
        seatLayout: roomFormData.seatLayout
      };

      if (roomModalType === 'create') {
        roomData.cinemaId = selectedCinemaForRooms.id;
        await roomAPI.create(roomData);
        toast.success('Room created successfully!');
      } else if (roomModalType === 'edit' && selectedRoom) {
        await roomAPI.update(selectedRoom.id, roomData);
        toast.success('Room updated successfully!');
      }
      
      closeRoomModal();
      // Refresh cinema data to get updated rooms
      const updatedCinema = await cinemaAPI.getById(selectedCinemaForRooms.id);
      setSelectedCinemaForRooms(updatedCinema.data);
      setRooms(updatedCinema.data.rooms || []);
      fetchCinemas(); // Refresh main list
    } catch (error) {
      console.error('Error saving room:', error);
      const errorMessage = error.response?.data?.message || 
                          (roomModalType === 'create' ? 'Cannot create room' : 'Cannot update room');
      toast.error(errorMessage);
    }
  };

  const handleRoomDelete = (room) => {
    setRoomToDelete(room);
    setShowRoomDeleteModal(true);
    // Close room view modal to avoid overlapping
    setShowRoomView(false);
  };

  const confirmRoomDelete = async () => {
    try {
      await roomAPI.delete(roomToDelete.id);
      toast.success('Room deleted successfully!');
      setShowRoomDeleteModal(false);
      setRoomToDelete(null);
      
      // Refresh cinema data
      const updatedCinema = await cinemaAPI.getById(selectedCinemaForRooms.id);
      setSelectedCinemaForRooms(updatedCinema.data);
      setRooms(updatedCinema.data.rooms || []);
      fetchCinemas(); // Refresh main list
    } catch (error) {
      console.error('Error deleting room:', error);
      toast.error('Cannot delete room');
    }
  };

  const cancelRoomDelete = () => {
    setShowRoomDeleteModal(false);
    setRoomToDelete(null);
    // Reopen room view modal
    setShowRoomView(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!formData.name?.trim()) {
        toast.error('Cinema name is required');
        setLoading(false);
        return;
      }
      if (!formData.location?.trim()) {
        toast.error('Cinema location is required');
        setLoading(false);
        return;
      }
      if (!formData.totalRooms || formData.totalRooms < 1) {
        toast.error('Total rooms must be at least 1');
        setLoading(false);
        return;
      }

      const cinemaData = {
        name: formData.name.trim(),
        location: formData.location.trim(),
        totalRooms: parseInt(formData.totalRooms)
      };

      if (modalType === 'create') {
        await cinemaAPI.create(cinemaData);
      } else if (modalType === 'edit') {
        await cinemaAPI.update(selectedCinema.id, cinemaData);
      }
      
      await fetchCinemas();
      closeModal();
      toast.success(`Cinema ${modalType === 'create' ? 'created' : 'updated'} successfully!`);
    } catch (error) {
      console.error(`Error ${modalType}ing cinema:`, error);
      
      let errorMessage = 'Unknown error occurred';
      if (error.response?.data?.message) {
        if (Array.isArray(error.response.data.message)) {
          errorMessage = error.response.data.message.join(', ');
        } else {
          errorMessage = error.response.data.message;
        }
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast.error(`Error ${modalType}ing cinema: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (cinema) => {
    setCinemaToDelete(cinema);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    try {
      await cinemaAPI.delete(cinemaToDelete.id);
      await fetchCinemas();
      toast.success('Cinema deleted successfully!');
      setShowDeleteModal(false);
      setCinemaToDelete(null);
    } catch (error) {
      console.error('Error deleting cinema:', error);
      
      let errorMessage = 'Failed to delete cinema';
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage);
    }
  };

  const cancelDelete = () => {
    setShowDeleteModal(false);
    setCinemaToDelete(null);
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      setPagination(prev => ({ ...prev, page: newPage }));
    }
  };

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">
            Manage <span className="text-red-500 bg-red-500/20 px-2 py-1 rounded">Cinemas</span>
          </h1>
          <p className="text-gray-400 mt-2">Create, edit, and manage cinema locations</p>
        </div>

        {/* Search and Add Button */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search cinemas..."
              value={searchTerm}
              onChange={handleSearch}
              className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-red-500 focus:border-transparent"
            />
          </div>
          <button
            onClick={() => openModal('create')}
            className="flex items-center gap-2 px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
          >
            <PlusIcon className="w-5 h-5" />
            Add Cinema
          </button>
        </div>

        {/* Table */}
        <div className="bg-gray-900/50 border border-gray-700 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-800">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Cinema Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Location
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Total Rooms
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
                {loading ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-12 text-center">
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500"></div>
                        <span className="ml-3 text-gray-400">Loading cinemas...</span>
                      </div>
                    </td>
                  </tr>
                ) : cinemas.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-12 text-center">
                      <BuildingIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-400 text-lg">No cinemas found</p>
                      <p className="text-gray-500 mt-2">
                        {searchTerm ? 'Try adjusting your search terms' : 'Add some cinemas to get started'}
                      </p>
                    </td>
                  </tr>
                ) : (
                  cinemas.map((cinema) => (
                    <tr key={cinema.id} className="hover:bg-gray-800/50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <BuildingIcon className="w-5 h-5 text-red-500 mr-3" />
                          <span className="text-white font-medium">{cinema.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <MapPinIcon className="w-4 h-4 text-gray-400 mr-2" />
                          <span className="text-gray-300">{cinema.location}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-600/20 text-red-400 border border-red-600/30">
                          {cinema.totalRooms || 0} rooms
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-300 text-sm">
                        {new Date(cinema.createdAt).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: '2-digit',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => openRoomView(cinema)}
                            className="p-2 text-blue-400 hover:text-blue-300 hover:bg-blue-400/10 rounded-lg transition-colors"
                            title="View Rooms"
                          >
                            <EyeIcon className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => openModal('edit', cinema)}
                            className="p-2 text-yellow-400 hover:text-yellow-300 hover:bg-yellow-400/10 rounded-lg transition-colors"
                            title="Edit Cinema"
                          >
                            <EditIcon className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(cinema)}
                            className="p-2 text-red-400 hover:text-red-300 hover:bg-red-400/10 rounded-lg transition-colors"
                            title="Delete Cinema"
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
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between mt-6">
            <div className="text-sm text-gray-400">
              Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.totalItems)} of {pagination.totalItems} results
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handlePageChange(Math.max(1, pagination.page - 1))}
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
                    onClick={() => handlePageChange(pageNum)}
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
                onClick={() => handlePageChange(Math.min(pagination.totalPages, pagination.page + 1))}
                disabled={pagination.page === pagination.totalPages}
                className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRightIcon className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-700">
              <h2 className="text-xl font-semibold text-white">
                {modalType === 'create' ? 'Add New Cinema' : 'Edit Cinema'}
              </h2>
              <button
                onClick={closeModal}
                className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
              >
                <XIcon className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Cinema Name *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="Enter cinema name"
                    required
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Location *
                  </label>
                  <textarea
                    name="location"
                    value={formData.location}
                    onChange={handleInputChange}
                    placeholder="Enter cinema location/address"
                    required
                    rows={2}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Total Rooms *
                  </label>
                  <input
                    type="number"
                    name="totalRooms"
                    value={formData.totalRooms}
                    onChange={handleInputChange}
                    placeholder="Number of rooms"
                    required
                    min="1"
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-600/50 text-white rounded-lg transition-colors"
                >
                  <SaveIcon className="w-4 h-4" />
                  {loading ? 'Saving...' : (modalType === 'create' ? 'Create Cinema' : 'Update Cinema')}
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
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center space-x-3 mb-4">
              <div className="flex-shrink-0">
                <AlertTriangleIcon className="w-8 h-8 text-red-500" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Delete Confirm</h3>
                <p className="text-gray-400 mt-1">
                  Do you want to delete "{cinemaToDelete?.name}"?
                </p>
              </div>
            </div>
            
            <div className="bg-red-950 border border-red-800 rounded-lg p-3 mb-4">
              <p className="text-red-200 text-sm">
                <strong>NOTICE:</strong> This action cannot be undone. All related data will be permanently deleted.
              </p>
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
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors flex items-center space-x-2"
              >
                <TrashIcon className="w-4 h-4" />
                <span>Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Room Delete Confirmation Modal */}
      {showRoomDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
          <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center space-x-3 mb-4">
              <div className="flex-shrink-0">
                <AlertTriangleIcon className="w-8 h-8 text-red-500" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Delete Room Confirm</h3>
                <p className="text-gray-400 mt-1">
                  Do you want to delete room "{roomToDelete?.name}"?
                </p>
              </div>
            </div>
            
            <div className="bg-red-950 border border-red-800 rounded-lg p-3 mb-4">
              <p className="text-red-200 text-sm">
                <strong>NOTICE:</strong> This action cannot be undone. All related data will be permanently deleted.
              </p>
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={cancelRoomDelete}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmRoomDelete}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors flex items-center space-x-2"
              >
                <TrashIcon className="w-4 h-4" />
                <span>Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Room View Modal */}
      {showRoomView && selectedCinemaForRooms && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-lg max-w-4xl w-full border border-gray-700 max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-gray-700">
              <div>
                <h3 className="text-lg font-medium text-white">
                  Rooms - {selectedCinemaForRooms.name}
                </h3>
                <p className="text-sm text-gray-400">{selectedCinemaForRooms.location}</p>
              </div>
              <button
                onClick={closeRoomView}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <XIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
              {/* Room controls */}
              <div className="flex justify-between items-center mb-6">
                <div>
                  <p className="text-gray-300">
                    Total Rooms: <span className="text-white font-medium">{rooms.length}</span>
                  </p>
                  <p className="text-gray-300">
                    Total Seats: <span className="text-white font-medium">
                      {rooms.reduce((total, room) => total + (room.totalSeats || 0), 0)}
                    </span>
                  </p>
                </div>
                <button
                  onClick={() => openRoomModal('create')}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                >
                  <PlusIcon className="w-4 h-4" />
                  Add Room
                </button>
              </div>

              {/* Rooms grid */}
              {rooms.length === 0 ? (
                <div className="text-center py-12">
                  <UsersIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-white">No rooms available</h3>
                  <p className="mt-1 text-sm text-gray-400">
                    Get started by creating your first room
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {rooms.map((room) => (
                    <div key={room.id} className="bg-gray-700 rounded-lg border border-gray-600 overflow-hidden">
                      {/* Room Header */}
                      <div className="p-4 border-b border-gray-600">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h4 className="font-medium text-white text-lg">{room.name}</h4>
                            <p className="text-sm text-gray-400">ID: {room.id}</p>
                          </div>
                          <div className="flex gap-1">
                            <button
                              onClick={() => openRoomModal('edit', room)}
                              className="p-2 text-yellow-400 hover:text-yellow-300 hover:bg-yellow-400/10 rounded transition-colors"
                              title="Edit Room"
                            >
                              <EditIcon className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleRoomDelete(room)}
                              className="p-2 text-red-400 hover:text-red-300 hover:bg-red-400/10 rounded transition-colors"
                              title="Delete Room"
                            >
                              <TrashIcon className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <UsersIcon className="w-4 h-4 text-gray-400" />
                            <span className="text-sm text-gray-300">{room.totalSeats} seats</span>
                          </div>
                          {room.createdAt && (
                            <div className="text-xs text-gray-400">
                              {new Date(room.createdAt).toLocaleDateString('vi-VN')}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Seat Layout */}
                      <div className="p-4">
                        <h5 className="text-sm font-medium text-gray-300 mb-3">Seat Layout</h5>
                        <SeatLayoutDisplay seatLayout={room.seatLayout} totalSeats={room.totalSeats} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-700">
              <button
                onClick={closeRoomView}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
              >
                <ArrowLeftIcon className="w-4 h-4 inline mr-2" />
                Back to Cinema List
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Room Modal */}
      {showRoomModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-60">
          <div className="bg-gray-800 rounded-lg max-w-lg w-full border border-gray-700 max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-gray-700">
              <h3 className="text-lg font-medium text-white">
                {roomModalType === 'create' ? 'Add New Room' : 'Edit Room'}
              </h3>
              <button
                onClick={closeRoomModal}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <XIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              <form onSubmit={handleRoomSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Room Name *
                </label>
                <input
                  type="text"
                  value={roomFormData.name}
                  onChange={(e) => setRoomFormData(prev => ({ ...prev, name: e.target.value }))}
                  required
                  placeholder="e.g: Room 1, Hall A..."
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Total Seats *
                </label>
                <input
                  type="number"
                  value={roomFormData.totalSeats}
                  onChange={(e) => {
                    const seats = e.target.value;
                    setRoomFormData(prev => ({ 
                      ...prev, 
                      totalSeats: seats,
                      seatLayout: seats ? generateDefaultSeatLayout(parseInt(seats)) : {}
                    }));
                  }}
                  required
                  min="1"
                  max="500"
                  placeholder="Number of seats"
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
              </div>

              {/* Seat Layout Configuration */}
              {roomFormData.totalSeats && (
                <div className="space-y-4 border border-gray-600 rounded-lg p-4">
                  <h3 className="text-lg font-medium text-white mb-3">Seat Layout Configuration</h3>
                  
                  {/* Preset Templates */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Select Template
                    </label>
                    <select
                      onChange={(e) => {
                        const template = e.target.value;
                        if (template === 'small') {
                          setRoomFormData(prev => ({
                            ...prev,
                            totalSeats: '50',
                            seatLayout: {
                              rows: ['A', 'B', 'C', 'D', 'E'],
                              seatsPerRow: 10,
                              vipRows: ['D', 'E']
                            }
                          }));
                        } else if (template === 'medium') {
                          setRoomFormData(prev => ({
                            ...prev,
                            totalSeats: '120',
                            seatLayout: {
                              rows: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'],
                              seatsPerRow: 15,
                              vipRows: ['F', 'G', 'H']
                            }
                          }));
                        } else if (template === 'large') {
                          setRoomFormData(prev => ({
                            ...prev,
                            totalSeats: '240',
                            seatLayout: {
                              rows: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'],
                              seatsPerRow: 20,
                              vipRows: ['H', 'I', 'J', 'K', 'L']
                            }
                          }));
                        } else if (template === 'imax') {
                          setRoomFormData(prev => ({
                            ...prev,
                            totalSeats: '350',
                            seatLayout: {
                              rows: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N'],
                              seatsPerRow: 25,
                              vipRows: ['J', 'K', 'L', 'M', 'N']
                            }
                          }));
                        }
                      }}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    >
                      <option value="">-- Select Template --</option>
                      <option value="small">Small Room (50 seats - 5x10)</option>
                      <option value="medium">Medium Room (120 seats - 8x15)</option>
                      <option value="large">Large Room (240 seats - 12x20)</option>
                      <option value="imax">IMAX (350 seats - 14x25)</option>
                    </select>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Number of Rows
                      </label>
                      <input
                        type="number"
                        value={roomFormData.seatLayout?.rows?.length || 0}
                        onChange={(e) => {
                          const numRows = parseInt(e.target.value) || 0;
                          const rowLabels = [];
                          for (let i = 0; i < numRows; i++) {
                            rowLabels.push(String.fromCharCode(65 + i)); // A, B, C...
                          }
                          setRoomFormData(prev => ({
                            ...prev,
                            seatLayout: {
                              ...prev.seatLayout,
                              rows: rowLabels,
                              vipRows: rowLabels.length > 4 ? [rowLabels[Math.floor(rowLabels.length / 2)]] : []
                            }
                          }));
                        }}
                        min="1"
                        max="26"
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Seats per Row
                      </label>
                      <input
                        type="number"
                        value={roomFormData.seatLayout?.seatsPerRow || 0}
                        onChange={(e) => {
                          const seatsPerRow = parseInt(e.target.value) || 0;
                          const totalSeats = (roomFormData.seatLayout?.rows?.length || 0) * seatsPerRow;
                          setRoomFormData(prev => ({
                            ...prev,
                            totalSeats: totalSeats.toString(),
                            seatLayout: {
                              ...prev.seatLayout,
                              seatsPerRow: seatsPerRow
                            }
                          }));
                        }}
                        min="1"
                        max="30"
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  {/* VIP Rows Selection */}
                  {roomFormData.seatLayout?.rows?.length > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Select VIP Rows
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {roomFormData.seatLayout.rows.map(row => (
                          <label key={row} className="flex items-center space-x-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={roomFormData.seatLayout?.vipRows?.includes(row) || false}
                              onChange={(e) => {
                                const isChecked = e.target.checked;
                                setRoomFormData(prev => {
                                  const currentVipRows = prev.seatLayout?.vipRows || [];
                                  const newVipRows = isChecked 
                                    ? [...currentVipRows, row]
                                    : currentVipRows.filter(r => r !== row);
                                  
                                  return {
                                    ...prev,
                                    seatLayout: {
                                      ...prev.seatLayout,
                                      vipRows: newVipRows
                                    }
                                  };
                                });
                              }}
                              className="form-checkbox h-4 w-4 text-red-600 bg-gray-700 border-gray-600 rounded focus:ring-red-500"
                            />
                            <span className="text-sm text-gray-300">Hàng {row}</span>
                          </label>
                        ))}
                      </div>
                      <div className="mt-3 text-xs text-gray-400">
                        💡 Tip: VIP seats are usually placed in the middle or back of the theater for the best viewing experience
                      </div>
                    </div>
                  )}

                  {/* Quick Actions */}
                  <div className="flex gap-2 pt-2 border-t border-gray-700">
                    <button
                      type="button"
                      onClick={() => {
                        const totalSeats = parseInt(roomFormData.totalSeats);
                        if (totalSeats) {
                          setRoomFormData(prev => ({
                            ...prev,
                            seatLayout: generateDefaultSeatLayout(totalSeats)
                          }));
                        }
                      }}
                      className="px-3 py-1 text-xs bg-gray-600 hover:bg-gray-500 text-white rounded transition-colors"
                    >
                      Generate Default Layout
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setRoomFormData(prev => ({
                          ...prev,
                          seatLayout: {
                            ...prev.seatLayout,
                            vipRows: []
                          }
                        }));
                      }}
                      className="px-3 py-1 text-xs bg-gray-600 hover:bg-gray-500 text-white rounded transition-colors"
                    >
                      Clear All VIP
                    </button>
                  </div>
                </div>
              )}

              {/* Seat Layout Preview */}
              {roomFormData.totalSeats && roomFormData.seatLayout && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Seat Layout Preview
                  </label>
                  
                  {/* Seat Layout Stats */}
                  {roomFormData.seatLayout.rows && (
                    <div className="mb-3 p-3 bg-gray-800 rounded-lg">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div className="text-center">
                          <div className="text-white font-medium">
                            {(roomFormData.seatLayout.rows?.length || 0) * (roomFormData.seatLayout.seatsPerRow || 0)}
                          </div>
                          <div className="text-gray-400">Total Seats</div>
                        </div>
                        <div className="text-center">
                          <div className="text-green-400 font-medium">
                            {((roomFormData.seatLayout.rows?.length || 0) * (roomFormData.seatLayout.seatsPerRow || 0)) - 
                             ((roomFormData.seatLayout.vipRows?.length || 0) * (roomFormData.seatLayout.seatsPerRow || 0))}
                          </div>
                          <div className="text-gray-400">Regular Seats</div>
                        </div>
                        <div className="text-center">
                          <div className="text-yellow-400 font-medium">
                            {(roomFormData.seatLayout.vipRows?.length || 0) * (roomFormData.seatLayout.seatsPerRow || 0)}
                          </div>
                          <div className="text-gray-400">VIP Seats</div>
                        </div>
                        <div className="text-center">
                          <div className="text-blue-400 font-medium">
                            {roomFormData.seatLayout.rows?.length || 0}×{roomFormData.seatLayout.seatsPerRow || 0}
                          </div>
                          <div className="text-gray-400">Layout Size</div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <SeatLayoutDisplay 
                    seatLayout={roomFormData.seatLayout} 
                    totalSeats={parseInt(roomFormData.totalSeats)} 
                  />
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={closeRoomModal}
                  className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                >
                  <SaveIcon className="w-4 h-4" />
                  {roomModalType === 'create' ? 'Create Room' : 'Update'}
                </button>
              </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageCinemas;
