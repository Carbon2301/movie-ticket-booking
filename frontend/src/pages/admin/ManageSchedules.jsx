import React, { useState, useEffect, useRef } from 'react';
import { 
  CalendarIcon, 
  PlusIcon, 
  EditIcon, 
  TrashIcon, 
  SearchIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  XIcon,
  SaveIcon,
  ClockIcon,
  FilmIcon,
  BuildingIcon,
  ChevronDownIcon
} from 'lucide-react';
import { scheduleAPI, movieAPI, cinemaAPI } from '../../lib/api';
import { toast } from 'react-toastify';

const ManageSchedules = () => {
  const [schedules, setSchedules] = useState([]);
  const [movies, setMovies] = useState([]);
  const [cinemas, setCinemas] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    totalPages: 1,
    totalItems: 0
  });
  
  const [searchTerm, setSearchTerm] = useState('');
  const [cinemaFilter, setCinemaFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('create'); 
  const [selectedSchedule, setSelectedSchedule] = useState(null);
  const [selectedCinema, setSelectedCinema] = useState('');
  
  // Movie search states
  const [movieSearch, setMovieSearch] = useState('');
  const [showMovieSuggestions, setShowMovieSuggestions] = useState(false);
  const [filteredMovies, setFilteredMovies] = useState([]);
  const movieSearchRef = useRef(null);
  const suggestionsRef = useRef(null);
  
  const [formData, setFormData] = useState({
    movieId: '',
    roomId: '',
    startTime: ''
  });

  useEffect(() => {
    fetchMovies();
    fetchCinemas();
  }, []);

  useEffect(() => {
    if (movies.length > 0) {
      fetchSchedules();
    }
  }, [pagination.page, pagination.limit, cinemaFilter, dateFilter, movies]);

  // Handle movie search
  useEffect(() => {
    if (movieSearch.trim()) {
      const filtered = movies.filter(movie =>
        movie.title.toLowerCase().includes(movieSearch.toLowerCase())
      );
      setFilteredMovies(filtered);
    } else {
      setFilteredMovies([]);
    }
  }, [movieSearch, movies]);

  // Handle click outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        movieSearchRef.current && 
        !movieSearchRef.current.contains(event.target) &&
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target)
      ) {
        setShowMovieSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const fetchSchedules = async () => {
    try {
      setLoading(true);
      
      if (cinemaFilter) {
        // Fetch schedules for specific cinema
        const cinema = cinemas.find(c => c.id.toString() === cinemaFilter);
        if (!cinema || !cinema.rooms) {
          setSchedules([]);
          setPagination(prev => ({ ...prev, totalPages: 1, totalItems: 0 }));
          return;
        }

        const allSchedules = [];
        for (const room of cinema.rooms) {
          for (const movie of movies) {
            try {
              const params = {};
              if (dateFilter) {
                params.date = dateFilter;
              }
              const response = await scheduleAPI.getByMovieId(movie.id, params);
              if (Array.isArray(response.data)) {
                // Filter schedules that belong to this room
                const roomSchedules = response.data.filter(schedule => 
                  schedule.room?.id === room.id
                );
                allSchedules.push(...roomSchedules);
              }
            } catch (error) {
              console.warn(`Error fetching schedules for movie ${movie.id}, room ${room.id}:`, error);
            }
          }
        }
        
        // Sort by newest
        allSchedules.sort((a, b) => new Date(b.startTime) - new Date(a.startTime));
        
        // Pagination
        const startIndex = (pagination.page - 1) * pagination.limit;
        const endIndex = startIndex + pagination.limit;
        const paginatedSchedules = allSchedules.slice(startIndex, endIndex);
        
        setSchedules(paginatedSchedules);
        setPagination(prev => ({
          ...prev,
          totalPages: Math.ceil(allSchedules.length / pagination.limit),
          totalItems: allSchedules.length
        }));
      } else {
        // Fetch all schedules from all movies
        const allSchedules = [];
        for (const movie of movies) {
          try {
            const params = {};
            if (dateFilter) {
              params.date = dateFilter;
            }
            const response = await scheduleAPI.getByMovieId(movie.id, params);
            if (Array.isArray(response.data)) {
              allSchedules.push(...response.data);
            }
          } catch (error) {
            console.warn(`Error fetching schedules for movie ${movie.id}:`, error);
          }
        }
        
        // Sort by newest
        allSchedules.sort((a, b) => new Date(b.startTime) - new Date(a.startTime));
        
        // Pagination
        const startIndex = (pagination.page - 1) * pagination.limit;
        const endIndex = startIndex + pagination.limit;
        const paginatedSchedules = allSchedules.slice(startIndex, endIndex);
        
        setSchedules(paginatedSchedules);
        setPagination(prev => ({
          ...prev,
          totalPages: Math.ceil(allSchedules.length / pagination.limit),
          totalItems: allSchedules.length
        }));
      }
    } catch (error) {
      console.error('Error fetching schedules:', error);
      toast.error('Error loading schedules');
      setSchedules([]);
      setPagination(prev => ({ ...prev, totalPages: 1, totalItems: 0 }));
    } finally {
      setLoading(false);
    }
  };

  const fetchMovies = async () => {
    try {
      const response = await movieAPI.getAll({ limit: 1000 });
      setMovies(response.data.movies || []);
    } catch (error) {
      console.error('Error fetching movies:', error);
      setMovies([]);
    }
  };

  const fetchCinemas = async () => {
    try {
      const response = await cinemaAPI.getAll({ limit: 1000 });
      setCinemas(response.data.cinemas || []);
    } catch (error) {
      console.error('Error fetching cinemas:', error);
      setCinemas([]);
    }
  };

  const fetchRoomsByCinema = async (cinemaId) => {
    try {
      const response = await cinemaAPI.getById(cinemaId);
      const cinema = response.data;
      setRooms(cinema.rooms || []);
    } catch (error) {
      console.error('Error fetching rooms:', error);
      toast.error('Error loading cinema rooms');
      setRooms([]);
    }
  };

  const openModal = (type, schedule = null) => {
    setModalType(type);
    setSelectedSchedule(schedule);
    
    if (type === 'create') {
      setFormData({
        movieId: '',
        roomId: '',
        startTime: ''
      });
      setSelectedCinema('');
      setMovieSearch('');
      setRooms([]);
    } else if (type === 'edit' && schedule) {
      setFormData({
        movieId: schedule.movie?.id?.toString() || '',
        roomId: schedule.room?.id?.toString() || '',
        startTime: new Date(schedule.startTime).toISOString().slice(0, 16)
      });
      
      setMovieSearch(schedule.movie?.title || '');
      
      const cinemaId = schedule.room?.cinema?.id || schedule.room?.cinemaId;
      if (cinemaId) {
        setSelectedCinema(cinemaId.toString());
        fetchRoomsByCinema(cinemaId);
      }
    }
    
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setModalType('create');
    setSelectedSchedule(null);
    setFormData({
      movieId: '',
      roomId: '',
      startTime: ''
    });
    setSelectedCinema('');
    setMovieSearch('');
    setShowMovieSuggestions(false);
    setRooms([]);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCinemaChange = (cinemaId) => {
    setSelectedCinema(cinemaId);
    setFormData(prev => ({ ...prev, roomId: '' }));
    if (cinemaId) {
      fetchRoomsByCinema(cinemaId);
    } else {
      setRooms([]);
    }
  };

  const handleMovieSearchChange = (e) => {
    const value = e.target.value;
    setMovieSearch(value);
    setShowMovieSuggestions(true);
    
    // Clear movie ID if search is cleared
    if (!value.trim()) {
      setFormData(prev => ({ ...prev, movieId: '' }));
    }
  };

  const handleMovieSelect = (movie) => {
    setMovieSearch(movie.title);
    setFormData(prev => ({ ...prev, movieId: movie.id.toString() }));
    setShowMovieSuggestions(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    if (!formData.movieId || !formData.roomId || !formData.startTime) {
      toast.error('Please fill in all required fields');
      setLoading(false);
      return;
    }

    try {
      const scheduleData = {
        movieId: parseInt(formData.movieId),
        roomId: parseInt(formData.roomId),
        startTime: formData.startTime
      };

      if (modalType === 'create') {
        await scheduleAPI.create(scheduleData);
      } else if (modalType === 'edit') {
        await scheduleAPI.update(selectedSchedule.id, scheduleData);
      }
      
      await fetchSchedules();
      closeModal();
      toast.success(`Schedule ${modalType === 'create' ? 'created' : 'updated'} successfully!`);
    } catch (error) {
      console.error(`Error ${modalType}ing schedule:`, error);
      const errorMessage = error.response?.data?.message || `Error ${modalType}ing schedule`;
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedSchedule) return;
    
    setLoading(true);
    try {
      await scheduleAPI.delete(selectedSchedule.id);
      
      const currentPageItems = schedules.length;
      const isLastItemOnPage = currentPageItems === 1;
      const isNotFirstPage = pagination.page > 1;
      
      if (isLastItemOnPage && isNotFirstPage) {
        setPagination(prev => ({ ...prev, page: prev.page - 1 }));
      } else {
        await fetchSchedules();
      }
      
      closeModal();
      toast.success('Schedule deleted successfully!');
    } catch (error) {
      console.error('Error deleting schedule:', error);
      const errorMessage = error.response?.data?.message || 'Error deleting schedule';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const filteredSchedules = schedules.filter(schedule => {
    const movieTitle = schedule.movie?.title?.toLowerCase() || '';
    const searchLower = searchTerm.toLowerCase();
    
    return movieTitle.includes(searchLower);
  });

  const formatDateTime = (dateString) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handlePageChange = (newPage) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  const handleFilterChange = (field, value) => {
    if (field === 'cinema') setCinemaFilter(value);
    if (field === 'date') setDateFilter(value);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  if (loading && schedules.length === 0) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto"></div>
          <p className="mt-4 text-gray-400">Loading schedules...</p>
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
            Manage <span className="text-red-500 bg-red-500/20 px-2 py-1 rounded">Schedules</span>
          </h1>
          <p className="text-gray-400 mt-2">Manage movie screening schedules in the system</p>
        </div>

        {/* Search and Add Button */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by movie name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-red-500 focus:border-transparent"
            />
          </div>
          
          {/* Filters */}
          <select
            value={cinemaFilter}
            onChange={(e) => handleFilterChange('cinema', e.target.value)}
            className="px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-red-500 focus:border-transparent"
          >
            <option value="">All Cinemas</option>
            {cinemas.map(cinema => (
              <option key={cinema.id} value={cinema.id}>
                {cinema.name}
              </option>
            ))}
          </select>
          
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => handleFilterChange('date', e.target.value)}
            className="px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-red-500 focus:border-transparent"
          />
          
          <button
            onClick={() => openModal('create')}
            className="flex items-center gap-2 px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
          >
            <PlusIcon className="w-5 h-5" />
            Add Schedule
          </button>
        </div>

        {/* Table */}
        <div className="bg-gray-900/50 border border-gray-700 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-800">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Movie
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Cinema
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Room
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Start Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    End Time
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {filteredSchedules.map((schedule) => (
                  <tr key={schedule.id} className="hover:bg-gray-800/50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-white font-medium">#{schedule.id}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <FilmIcon className="w-5 h-5 text-red-500 mr-3" />
                        <span className="text-white font-medium">{schedule.movie?.title || 'N/A'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <BuildingIcon className="w-5 h-5 text-green-500 mr-3" />
                        <span className="text-gray-300">{schedule.room?.cinema?.name || 'N/A'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-gray-300">{schedule.room?.name || 'N/A'}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <ClockIcon className="w-4 h-4 text-red-400 mr-2" />
                        <span className="text-gray-300 text-sm">
                          {formatDateTime(schedule.startTime)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <ClockIcon className="w-4 h-4 text-red-400 mr-2" />
                        <span className="text-gray-300 text-sm">
                          {formatDateTime(schedule.endTime)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => openModal('edit', schedule)}
                          className="p-2 text-blue-400 hover:text-blue-300 hover:bg-blue-400/10 rounded-lg transition-colors"
                        >
                          <EditIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openModal('delete', schedule)}
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

          {filteredSchedules.length === 0 && (
            <div className="text-center py-12">
              <CalendarIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-400 text-lg">No schedules found</p>
              <p className="text-gray-500 mt-2">
                {searchTerm || cinemaFilter || dateFilter 
                  ? 'Try adjusting your search filters' 
                  : 'Add some schedules to get started'
                }
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

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-700 flex items-center justify-between">
              <h3 className="text-xl font-semibold text-white">
                {modalType === 'create' && 'Add New Schedule'}
                {modalType === 'edit' && 'Edit Schedule'}
                {modalType === 'delete' && 'Delete Schedule'}
              </h3>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <XIcon className="w-6 h-6" />
              </button>
            </div>
            
            {modalType === 'delete' ? (
              <div className="p-6">
                <p className="text-gray-300 mb-6">
                  Are you sure you want to delete the schedule for "{selectedSchedule?.movie?.title}" at {formatDateTime(selectedSchedule?.startTime)}?
                </p>
                <div className="flex justify-end gap-4">
                  <button
                    onClick={closeModal}
                    className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={loading}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50"
                  >
                    {loading ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="relative">
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Movie *
                    </label>
                    <div className="relative" ref={movieSearchRef}>
                      <input
                        type="text"
                        value={movieSearch}
                        onChange={handleMovieSearchChange}
                        onFocus={() => setShowMovieSuggestions(true)}
                        placeholder="Search for a movie..."
                        className="w-full px-4 py-2 pr-10 bg-gray-800 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-red-500 focus:border-transparent"
                        required
                      />
                      <ChevronDownIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
                      
                      {showMovieSuggestions && filteredMovies.length > 0 && (
                        <div 
                          ref={suggestionsRef}
                          className="absolute z-10 w-full mt-1 bg-gray-800 border border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto"
                        >
                          {filteredMovies.map(movie => (
                            <div
                              key={movie.id}
                              onClick={() => handleMovieSelect(movie)}
                              className="px-4 py-3 hover:bg-gray-700 cursor-pointer text-white border-b border-gray-700 last:border-b-0"
                            >
                              <div className="flex items-center">
                                <FilmIcon className="w-4 h-4 text-red-500 mr-2" />
                                <div>
                                  <div className="font-medium">{movie.title}</div>
                                  <div className="text-sm text-gray-400">{movie.genre} • {movie.durationMinutes} min</div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Cinema *
                    </label>
                    <select
                      value={selectedCinema}
                      onChange={(e) => handleCinemaChange(e.target.value)}
                      className="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      required
                    >
                      <option value="">Select Cinema</option>
                      {cinemas.map(cinema => (
                        <option key={cinema.id} value={cinema.id}>
                          {cinema.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Room *
                    </label>
                    <select
                      name="roomId"
                      value={formData.roomId}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      required
                      disabled={!selectedCinema}
                    >
                      <option value="">Select Room</option>
                      {rooms.map(room => (
                        <option key={room.id} value={room.id}>
                          {room.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Start Time *
                    </label>
                    <input
                      type="datetime-local"
                      name="startTime"
                      value={formData.startTime}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      required
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-4 pt-6 border-t border-gray-700">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="px-6 py-2 text-gray-400 hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading || !formData.movieId}
                    className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    <SaveIcon className="w-4 h-4" />
                    {loading ? 'Saving...' : (modalType === 'create' ? 'Create' : 'Update')}
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

export default ManageSchedules;
