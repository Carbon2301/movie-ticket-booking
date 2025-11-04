import React, { useState, useEffect } from 'react';
import { 
  FilmIcon, 
  PlusIcon, 
  EditIcon, 
  TrashIcon, 
  SearchIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  XIcon,
  SaveIcon,
  CalendarIcon,
  ClockIcon,
  ExternalLinkIcon
} from 'lucide-react';
import { movieAPI } from '../../lib/api';
import { toast } from 'react-toastify';

const ManageMovies = () => {
  const [movies, setMovies] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    totalPages: 1,
    totalItems: 0
  });
  
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('create'); 
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [deleteInfo, setDeleteInfo] = useState(null);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    durationMinutes: '',
    releaseDate: '',
    posterUrl: '',
    trailerUrl: '',
    genre: '',
    categoryIds: []
  });

  useEffect(() => {
    fetchMovies();
    fetchCategories();
  }, [pagination.page, pagination.limit, searchTerm, categoryFilter]);

  const fetchMovies = async () => {
    try {
      setLoading(true);
      const params = {
        page: pagination.page,
        limit: pagination.limit
      };
      
      if (searchTerm) params.name = searchTerm;
      if (categoryFilter) params.category = categoryFilter;
      
      const response = await movieAPI.getAll(params);
      
      setMovies(response.data.movies || []);
      setPagination(prev => ({
        ...prev,
        totalPages: response.data.totalPages || 1,
        totalItems: response.data.totalItems || 0
      }));
    } catch (error) {
      console.error('Error fetching movies:', error);
      setMovies([]);
      setPagination(prev => ({ ...prev, totalPages: 1, totalItems: 0 }));
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await movieAPI.getCategories();
      setCategories(response.data || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
      setCategories([]);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (type === 'checkbox') {
      const categoryId = parseInt(value);
      setFormData(prev => ({
        ...prev,
        categoryIds: checked 
          ? [...prev.categoryIds, categoryId]
          : prev.categoryIds.filter(id => id !== categoryId)
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const openModal = (type, movie = null) => {
    setModalType(type);
    setSelectedMovie(movie);
    setDeleteInfo(null);
    
    if (type === 'create') {
      setFormData({
        title: '',
        description: '',
        durationMinutes: '',
        releaseDate: '',
        posterUrl: '',
        trailerUrl: '',
        genre: '',
        categoryIds: []
      });
    } else if (type === 'edit' && movie) {
      const categoryIds = movie.categories ? movie.categories.map(cat => parseInt(cat.categoryId)) : [];
      
      setFormData({
        title: movie.title,
        description: movie.description,
        durationMinutes: movie.durationMinutes,
        releaseDate: movie.releaseDate ? movie.releaseDate.split('T')[0] : '',
        posterUrl: movie.posterUrl,
        trailerUrl: movie.trailerUrl,
        genre: movie.genre || '',
        categoryIds: categoryIds
      });
    }
    
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedMovie(null);
    setDeleteInfo(null);
    setFormData({
      title: '',
      description: '',
      durationMinutes: '',
      releaseDate: '',
      posterUrl: '',
      trailerUrl: '',
      genre: '',
      categoryIds: []
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate required fields
      if (!formData.title?.trim()) {
        toast.error('Movie title is required');
        setLoading(false);
        return;
      }
      if (!formData.description?.trim()) {
        toast.error('Movie description is required');
        setLoading(false);
        return;
      }
      if (!formData.durationMinutes || parseInt(formData.durationMinutes) <= 0) {
        toast.error('Valid duration is required');
        setLoading(false);
        return;
      }
      if (!formData.releaseDate) {
        toast.error('Release date is required');
        setLoading(false);
        return;
      }
      if (!formData.posterUrl?.trim()) {
        toast.error('Poster URL is required');
        setLoading(false);
        return;
      }
      if (modalType === 'create' && !formData.trailerUrl?.trim()) {
        toast.error('Trailer URL is required');
        setLoading(false);
        return;
      }
      if (!formData.genre?.trim()) {
        toast.error('Genre is required');
        setLoading(false);
        return;
      }

      const movieData = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        durationMinutes: parseInt(formData.durationMinutes),
        releaseDate: new Date(formData.releaseDate).toISOString(), 
        posterUrl: formData.posterUrl.trim(),
        genre: formData.genre.trim(),
      };


      if (modalType === 'create') {
        movieData.trailerUrl = formData.trailerUrl.trim();
      } else if (modalType === 'edit' && formData.trailerUrl.trim()) {
        movieData.trailerUrl = formData.trailerUrl.trim();
      }

      if (formData.categoryIds.length > 0) {
        movieData.categoryIds = formData.categoryIds;
      }

      if (modalType === 'create') {
        await movieAPI.create(movieData);
      } else if (modalType === 'edit') {
        await movieAPI.update(selectedMovie.id, movieData);
      }
      
      await fetchMovies();
      closeModal();
      toast.success(`Movie ${modalType === 'create' ? 'created' : 'updated'} successfully!`);
    } catch (error) {
      console.error(`Error ${modalType}ing movie:`, error);
      
      let errorMessage = 'Unknown error occurred';
      if (error.response?.data?.message) {
        if (Array.isArray(error.response.data.message)) {
          errorMessage = error.response.data.message.join(', ');
        } else {
          errorMessage = error.response.data.message;
        }
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (Array.isArray(error.response?.data)) {
        errorMessage = error.response.data.join(', ');
      } else if (error.response?.data) {
        errorMessage = JSON.stringify(error.response.data);
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast.error(`Error ${modalType}ing movie: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCheck = async (movie) => {
    try {
      const response = await movieAPI.delete(movie.id, false);
      setDeleteInfo(response.data);
      setSelectedMovie(movie);
      setModalType('delete');
      setShowModal(true);
    } catch (error) {
      console.error('Error checking delete:', error);
      toast.error('Error checking movie deletion');
    }
  };

  const handleDeleteConfirm = async () => {
    if (!selectedMovie) return;
    
    setLoading(true);
    try {
      await movieAPI.delete(selectedMovie.id, true);
      
      
      const currentPageItems = movies.length;
      const isLastItemOnPage = currentPageItems === 1;
      const isNotFirstPage = pagination.page > 1;
      
      if (isLastItemOnPage && isNotFirstPage) {
        setPagination(prev => ({ ...prev, page: prev.page - 1 }));
      } else {
        await fetchMovies();
      }
      
      closeModal();
      toast.success('Movie deleted successfully!');
    } catch (error) {
      console.error('Error deleting movie:', error);
      toast.error('Error deleting movie');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('vi-VN');
  };

  const formatDuration = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  if (loading && movies.length === 0) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto"></div>
          <p className="mt-4 text-gray-400">Loading movies...</p>
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
            Manage <span className="text-red-500 bg-red-500/20 px-2 py-1 rounded">Movies</span>
          </h1>
          <p className="text-gray-400 mt-2">Manage movie catalog and information</p>
        </div>

        {/* Filters and Search */}
        <div className="flex flex-col lg:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search movies by title..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-red-500 focus:border-transparent"
            />
          </div>
          
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-red-500 focus:border-transparent"
          >
            <option value="">All Categories</option>
            {categories.map(category => (
              <option key={category.id} value={category.name}>{category.name}</option>
            ))}
          </select>
          
          <button
            onClick={() => openModal('create')}
            className="flex items-center gap-2 px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors whitespace-nowrap"
          >
            <PlusIcon className="w-5 h-5" />
            Add Movie
          </button>
        </div>

        {/* Movies Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-6">
          {movies.map((movie) => (
            <div key={movie.id} className="bg-gray-900/50 border border-gray-700 rounded-lg overflow-hidden hover:border-red-500/50 transition-colors">
              <div className="aspect-[2/3] relative">
                <img
                  src={movie.posterUrl}
                  alt={movie.title}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.target.src = '/api/placeholder/300/450';
                  }}
                />
                <div className="absolute top-2 right-2 bg-black/70 rounded-full p-1">
                  <FilmIcon className="w-4 h-4 text-red-500" />
                </div>
              </div>
              
              <div className="p-4">
                <h3 className="text-white font-semibold text-lg mb-2 line-clamp-2">{movie.title}</h3>
                
                <div className="space-y-2 text-sm text-gray-400 mb-4">
                  <div className="flex items-center gap-2">
                    <ClockIcon className="w-4 h-4" />
                    <span>{formatDuration(movie.durationMinutes)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CalendarIcon className="w-4 h-4" />
                    <span>{formatDate(movie.releaseDate)}</span>
                  </div>
                </div>

                {movie.categories && movie.categories.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-4">
                    {movie.categories.slice(0, 2).map((categoryRelation, index) => {
                      const displayName = categoryRelation.category?.name || 
                                        categoryRelation.categoryName || 
                                        `Category ${categoryRelation.categoryId || index + 1}`;
                      
                      return (
                        <span key={categoryRelation.categoryId || index} className="px-2 py-1 bg-red-600/20 border border-red-500/30 text-red-400 text-xs rounded">
                          {displayName}
                        </span>
                      );
                    })}
                    {movie.categories.length > 2 && (
                      <span className="px-2 py-1 bg-gray-800 text-gray-300 text-xs rounded">
                        +{movie.categories.length - 2}
                      </span>
                    )}
                  </div>
                )}

                <div className="flex justify-between items-center">
                  <div className="flex gap-2">
                    <button
                      onClick={() => openModal('edit', movie)}
                      className="p-2 text-blue-400 hover:text-blue-300 hover:bg-blue-400/10 rounded-lg transition-colors"
                      title="Edit Movie"
                    >
                      <EditIcon className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteCheck(movie)}
                      className="p-2 text-red-400 hover:text-red-300 hover:bg-red-400/10 rounded-lg transition-colors"
                      title="Delete Movie"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                  
                  {movie.trailerUrl && (
                    <a
                      href={movie.trailerUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
                      title="Watch Trailer"
                    >
                      <ExternalLinkIcon className="w-4 h-4" />
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {movies.length === 0 && !loading && (
          <div className="text-center py-12">
            <FilmIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-400 text-lg">No movies found</p>
            <p className="text-gray-500 mt-2">
              {searchTerm || categoryFilter ? 'Try adjusting your filters' : 'Add some movies to get started'}
            </p>
          </div>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between mt-6">
            <div className="text-sm text-gray-400">
              Showing {Math.min((pagination.page - 1) * pagination.limit + 1, pagination.totalItems)} to {Math.min(pagination.page * pagination.limit, pagination.totalItems)} of {pagination.totalItems} movies
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                disabled={pagination.page === 1}
                className="p-2 text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeftIcon className="w-5 h-5" />
              </button>
              <span className="px-3 py-1 bg-gray-800 text-white rounded">
                {pagination.page} / {pagination.totalPages}
              </span>
              <button
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
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
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-gray-900 border border-gray-700 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-700">
              <h3 className="text-lg font-semibold text-white">
                {modalType === 'create' && 'Add New Movie'}
                {modalType === 'edit' && 'Edit Movie'}
                {modalType === 'delete' && 'Delete Movie'}
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
                <p className="text-gray-300 mb-4">
                  Are you sure you want to delete the movie <strong>"{selectedMovie?.title}"</strong>?
                </p>
                
                {deleteInfo && (
                  <div className="bg-yellow-900/20 border border-yellow-600/30 rounded-lg p-4 mb-6">
                    <p className="text-yellow-400 font-medium mb-2">This will also affect:</p>
                    <ul className="text-gray-300 space-y-1">
                      <li>• {deleteInfo.movie.relatedData.categories} categories</li>
                      <li>• {deleteInfo.movie.relatedData.comments} comments</li>
                      <li>• {deleteInfo.movie.relatedData.favorites} favorites</li>
                      <li>• {deleteInfo.movie.relatedData.schedules} schedules</li>
                    </ul>
                  </div>
                )}
                
                <div className="flex gap-3">
                  <button
                    onClick={handleDeleteConfirm}
                    disabled={loading}
                    className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-600/50 text-white rounded-lg transition-colors"
                  >
                    {loading ? 'Deleting...' : 'Delete Movie'}
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Movie Title *
                    </label>
                    <input
                      type="text"
                      name="title"
                      value={formData.title}
                      onChange={handleInputChange}
                      placeholder="Enter movie title"
                      required
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Description *
                    </label>
                    <textarea
                      name="description"
                      value={formData.description}
                      onChange={handleInputChange}
                      placeholder="Enter movie description"
                      required
                      rows={3}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Genre *
                    </label>
                    <input
                      type="text"
                      name="genre"
                      value={formData.genre}
                      onChange={handleInputChange}
                      placeholder="e.g., Action, Comedy, Drama"
                      required
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Duration (minutes) *
                    </label>
                    <input
                      type="number"
                      name="durationMinutes"
                      value={formData.durationMinutes}
                      onChange={handleInputChange}
                      placeholder="120"
                      required
                      min="1"
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Release Date *
                    </label>
                    <input
                      type="date"
                      name="releaseDate"
                      value={formData.releaseDate}
                      onChange={handleInputChange}
                      required
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Poster URL *
                    </label>
                    <input
                      type="url"
                      name="posterUrl"
                      value={formData.posterUrl}
                      onChange={handleInputChange}
                      placeholder="https://example.com/poster.jpg"
                      required
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Trailer URL {modalType === 'create' ? '*' : ''}
                    </label>
                    <input
                      type="url"
                      name="trailerUrl"
                      value={formData.trailerUrl}
                      onChange={handleInputChange}
                      placeholder="https://youtube.com/watch?v=..."
                      required={modalType === 'create'}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    />
                  </div>

                  {categories.length > 0 && (
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Categories
                      </label>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-32 overflow-y-auto p-3 bg-gray-800 border border-gray-600 rounded-lg">
                        {categories.map(category => {
                          const categoryId = parseInt(category.id);
                          const isChecked = formData.categoryIds.includes(categoryId);
                          
                          return (
                            <label key={category.id} className="flex items-center gap-2 text-sm">
                              <input
                                type="checkbox"
                                value={category.id}
                                checked={isChecked}
                                onChange={handleInputChange}
                                className="rounded border-gray-600 text-red-500 focus:ring-red-500"
                              />
                              <span className="text-gray-300">{category.name}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-600/50 text-white rounded-lg transition-colors"
                  >
                    <SaveIcon className="w-4 h-4" />
                    {loading ? 'Saving...' : (modalType === 'create' ? 'Create Movie' : 'Update Movie')}
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

export default ManageMovies;
