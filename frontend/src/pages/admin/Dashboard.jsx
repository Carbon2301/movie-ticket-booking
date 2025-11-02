import React, { useState, useEffect } from 'react';
import { 
  TrendingUpIcon, 
  TicketIcon, 
  DollarSignIcon,
  CalendarIcon,
  BarChart3Icon,
  RefreshCwIcon,
  EyeIcon,
  AlertCircleIcon
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { statisticsAPI } from '../../lib/api';

const Dashboard = () => {
  const [revenueData, setRevenueData] = useState([]);
  const [bookingData, setBookingData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [revenueFilter, setRevenueFilter] = useState('day');
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  // Fetch revenue statistics
  const fetchRevenueStats = async (period = 'day') => {
    try {
      const response = await statisticsAPI.getRevenue({ period });
      setRevenueData(response.data?.data || response.data || []);
      setError(null);
    } catch (err) {
      console.error('Revenue API error:', err);
      setRevenueData([]);
      setError('Failed to load statistics data. Please check if the backend server is running.');
    }
  };

  // Fetch booking statistics
  const fetchBookingStats = async (period = 'day') => {
    try {
      // Always fetch daily data from backend (since it doesn't support period parameter)
      const response = await statisticsAPI.getBookings();
      let rawData = response.data?.data || response.data || [];
      
      // If period is not 'day', we need to group the daily data
      if (period !== 'day' && rawData.length > 0) {
        rawData = groupBookingDataByPeriod(rawData, period);
      }
      
      setBookingData(rawData);
      if (!error) setError(null);
    } catch (err) {
      console.error('Booking API error:', err);
      setBookingData([]);
      setError('Failed to load statistics data. Please check if the backend server is running.');
    }
  };

  // Helper function to group daily booking data by period
  const groupBookingDataByPeriod = (dailyData, period) => {
    const grouped = {};

    dailyData.forEach(item => {
      const date = new Date(item.date);
      let key;

      if (period === 'week') {
        // Get the start of the week (Sunday)
        const startOfWeek = new Date(date);
        startOfWeek.setDate(date.getDate() - date.getDay());
        key = startOfWeek.toISOString().split('T')[0];
      } else if (period === 'month') {
        // Get year-month format
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      } else {
        key = item.date;
      }

      if (!grouped[key]) {
        grouped[key] = {
          date: key,
          totalBookings: 0,
          totalTickets: item.totalTickets || 0
        };
      }

      grouped[key].totalBookings += item.totalBookings || 0;
      grouped[key].totalTickets += item.totalTickets || 0;
    });

    return Object.values(grouped).sort((a, b) => new Date(a.date) - new Date(b.date));
  };

  // Load all data
  const loadDashboardData = async () => {
    setLoading(true);
    await Promise.all([
      fetchRevenueStats(revenueFilter),
      fetchBookingStats(revenueFilter)
    ]);
    setLoading(false);
  };

  // Refresh data
  const refreshData = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
    toast.success('Dashboard data refreshed!');
  };

  useEffect(() => {
    loadDashboardData();
  }, [revenueFilter]);

  // Calculate statistics
  const totalRevenue = revenueData.reduce((sum, item) => sum + (item.revenue || 0), 0);
  const totalBookings = bookingData.reduce((sum, item) => sum + (item.totalBookings || 0), 0);
  
  // Calculate average revenue: total revenue / (today - first revenue date)
  const calculateAvgRevenue = () => {
    if (revenueData.length === 0) return 0;
    
    // Find the earliest revenue date
    const firstRevenueDate = new Date(Math.min(...revenueData.map(item => new Date(item.date).getTime())));
    const today = new Date();
    
    // Calculate days difference
    const daysDifference = Math.ceil((today - firstRevenueDate) / (1000 * 60 * 60 * 24)) + 1; // +1 to include the first day
    
    return totalRevenue / daysDifference;
  };
  
  const avgRevenue = calculateAvgRevenue();
  
  // Calculate average bookings: total bookings / (today - first booking date)
  const calculateAvgBookings = () => {
    if (bookingData.length === 0) return 0;
    
    // Find the earliest booking date
    const firstBookingDate = new Date(Math.min(...bookingData.map(item => new Date(item.date).getTime())));
    const today = new Date();
    
    // Calculate days difference
    const daysDifference = Math.ceil((today - firstBookingDate) / (1000 * 60 * 60 * 24)) + 1; // +1 to include the first day
    
    return totalBookings / daysDifference;
  };
  
  const avgBookings = calculateAvgBookings();

  // Helper functions to calculate display values based on period
  const getDisplayAvgRevenue = () => {
    const dailyAvg = avgRevenue;
    if (revenueFilter === 'week') return dailyAvg * 7;
    if (revenueFilter === 'month') return dailyAvg * 30;
    return dailyAvg;
  };

  const getDisplayAvgBookings = () => {
    const dailyAvg = avgBookings;
    if (revenueFilter === 'week') return dailyAvg * 7;
    if (revenueFilter === 'month') return dailyAvg * 30;
    return dailyAvg;
  };

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount);
  };

  // Helper function to format date based on period
  const formatDateByPeriod = (dateString, period) => {
    const date = new Date(dateString);
    
    if (period === 'week') {
      const endOfWeek = new Date(date);
      endOfWeek.setDate(date.getDate() + 6);
      return `${date.toLocaleDateString('vi-VN', { month: 'short', day: 'numeric' })} - ${endOfWeek.toLocaleDateString('vi-VN', { month: 'short', day: 'numeric' })}`;
    } else if (period === 'month') {
      return date.toLocaleDateString('vi-VN', { year: 'numeric', month: 'long' });
    } else {
      return date.toLocaleDateString('vi-VN', { month: 'short', day: 'numeric' });
    }
  };

  // Format number
  const formatNumber = (num) => {
    return new Intl.NumberFormat('vi-VN').format(num);
  };
  const maxRevenue = Math.max(...revenueData.map(item => item.revenue || 0));
  const maxBookings = Math.max(...bookingData.map(item => item.totalBookings || 0));

  if (loading) {
    return (
      <div className="p-6 bg-black min-h-screen text-white">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto mb-4"></div>
            <p className="text-gray-400">Loading dashboard data...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-black min-h-screen text-white">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-white">
            Statistics <span className="text-red-500 bg-red-500/20 px-2 py-1 rounded">Dashboard</span>
          </h1>
        </div>
        <div className="flex items-center space-x-3">
          <select
            value={revenueFilter}
            onChange={(e) => setRevenueFilter(e.target.value)}
            className="px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            <option value="day">Dayly</option>
            <option value="week">Weekly</option>
            <option value="month">Monthly</option>
          </select>
          <button
            onClick={refreshData}
            disabled={refreshing}
            className="flex items-center space-x-2 bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCwIcon className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="mb-6 bg-red-900 border border-red-700 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <AlertCircleIcon className="w-5 h-5 text-red-400" />
            <div>
              <p className="text-red-200 font-medium">Unable to load statistics</p>
              <p className="text-red-300 text-sm mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Total Revenue */}
        <div className="bg-gray-900 rounded-lg p-6 border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Total Revenue</p>
              <p className="text-2xl font-bold text-white mt-1">
                {error ? '--' : formatCurrency(totalRevenue)}
              </p>
            </div>
            <div className="bg-green-600 p-3 rounded-full">
              <DollarSignIcon className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        {/* Total Bookings */}
        <div className="bg-gray-900 rounded-lg p-6 border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Total Bookings</p>
              <p className="text-2xl font-bold text-white mt-1">
                {error ? '--' : formatNumber(totalBookings)}
              </p>
            </div>
            <div className="bg-blue-600 p-3 rounded-full">
              <TicketIcon className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        {/* Average Revenue */}
        <div className="bg-gray-900 rounded-lg p-6 border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Average Revenue</p>
              <p className="text-2xl font-bold text-white mt-1">
                {error ? '--' : formatCurrency(getDisplayAvgRevenue())}
              </p>
              <p className="text-purple-400 text-sm mt-1">
                Per {revenueFilter === 'day' ? 'day' : revenueFilter === 'week' ? 'week' : 'month'}
              </p>
            </div>
            <div className="bg-purple-600 p-3 rounded-full">
              <TrendingUpIcon className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        {/* Average Bookings */}
        <div className="bg-gray-900 rounded-lg p-6 border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Average Bookings</p>
              <p className="text-2xl font-bold text-white mt-1">
                {error ? '--' : getDisplayAvgBookings().toFixed(1)}
              </p>
              <p className="text-orange-400 text-sm mt-1">
                Per {revenueFilter === 'day' ? 'day' : revenueFilter === 'week' ? 'week' : 'month'}
              </p>
            </div>
            <div className="bg-orange-600 p-3 rounded-full">
              <CalendarIcon className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Chart */}
        <div className="bg-gray-900 rounded-lg p-6 border border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Revenue Trends</h3>
            <span className="text-sm text-gray-400 capitalize bg-gray-800 px-3 py-1 rounded-lg">
              {revenueFilter}ly
            </span>
          </div>
          
          <div className="h-64 relative">
            {revenueData.length > 0 ? (
              <div className="h-full flex items-end justify-between space-x-2">
                {revenueData.map((item, index) => (
                  <div key={index} className="flex flex-col items-center flex-1">
                    <div className="w-full flex flex-col items-center">
                      <div
                        className="w-8 bg-gradient-to-t from-green-600 to-green-400 rounded-t transition-all duration-300 hover:from-green-500 hover:to-green-300 cursor-pointer relative group"
                        style={{
                          height: `${(item.revenue / maxRevenue) * 220}px`,
                          minHeight: '10px'
                        }}
                      >
                        {/* Tooltip */}
                        <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                          {formatCurrency(item.revenue)}
                        </div>
                      </div>
                      <p className="text-xs text-gray-400 mt-2 text-center">
                        {item.period || new Date(item.date).toLocaleDateString('vi-VN', { 
                          month: 'short', 
                          day: 'numeric' 
                        })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-500">
                <div className="text-center">
                  <EyeIcon className="w-12 h-12 mx-auto mb-2 text-gray-600" />
                  <p>{error ? 'Unable to load revenue data' : 'No revenue data available'}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Booking Chart */}
        <div className="bg-gray-900 rounded-lg p-6 border border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Booking Trends</h3>
            <span className="text-sm text-gray-400 capitalize bg-gray-800 px-3 py-1 rounded-lg">
              {revenueFilter}ly
            </span>
          </div>
          
          <div className="h-64 relative">
            {bookingData.length > 0 ? (
              <div className="h-full flex items-end justify-between space-x-2">
                {bookingData.map((item, index) => (
                  <div key={index} className="flex flex-col items-center flex-1">
                    <div className="w-full flex flex-col items-center">
                      <div
                        className="w-8 bg-gradient-to-t from-blue-600 to-blue-400 rounded-t transition-all duration-300 hover:from-blue-500 hover:to-blue-300 cursor-pointer relative group"
                        style={{
                          height: `${(item.totalBookings / maxBookings) * 220}px`,
                          minHeight: '10px'
                        }}
                      >
                        {/* Tooltip */}
                        <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                          {item.totalBookings} bookings
                        </div>
                      </div>
                      <p className="text-xs text-gray-400 mt-2 text-center">
                        {formatDateByPeriod(item.date, revenueFilter)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-500">
                <div className="text-center">
                  <EyeIcon className="w-12 h-12 mx-auto mb-2 text-gray-600" />
                  <p>{error ? 'Unable to load booking data' : 'No booking data available'}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Detailed Stats */}
      <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Details */}
        <div className="bg-gray-900 rounded-lg p-6 border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
            <DollarSignIcon className="w-5 h-5 text-green-500" />
            <span>Revenue Details</span>
          </h3>
          <div className="space-y-3 max-h-60 overflow-y-auto">
            {revenueData.slice(0, 10).map((item, index) => (
              <div key={index} className="flex justify-between items-center py-2 px-3 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors">
                <span className="text-gray-300">
                  {item.period || new Date(item.date).toLocaleDateString('vi-VN')}
                </span>
                <span className="text-green-400 font-medium">
                  {formatCurrency(item.revenue)}
                </span>
              </div>
            ))}
            {revenueData.length === 0 && (
              <div className="text-center text-gray-500 py-8">
                <TicketIcon className="w-8 h-8 mx-auto mb-2 text-gray-600" />
                <p>No revenue data to display</p>
              </div>
            )}
          </div>
        </div>

        {/* Booking Details */}
        <div className="bg-gray-900 rounded-lg p-6 border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
            <TicketIcon className="w-5 h-5 text-blue-500" />
            <span>Booking Details</span>
          </h3>
          <div className="space-y-3 max-h-60 overflow-y-auto">
            {bookingData.slice(0, 10).map((item, index) => (
              <div key={index} className="flex justify-between items-center py-2 px-3 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors">
                <span className="text-gray-300">
                  {formatDateByPeriod(item.date, revenueFilter)}
                </span>
                <div className="flex items-center space-x-2">
                  <span className="text-blue-400 font-medium">
                    {item.totalBookings}
                  </span>
                  <span className="text-gray-500 text-sm">bookings</span>
                </div>
              </div>
            ))}
            {bookingData.length === 0 && (
              <div className="text-center text-gray-500 py-8">
                <CalendarIcon className="w-8 h-8 mx-auto mb-2 text-gray-600" />
                <p>No booking data to display</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
