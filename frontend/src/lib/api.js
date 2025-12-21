import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:3000",
  withCredentials: true,
  timeout: 10000, // 10 seconds timeout
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("accessToken");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.code === "ECONNABORTED") {
      console.error("Request timeout");
      return Promise.reject(new Error("Request timeout. Please try again."));
    }

    if (error.response) {
      // Server responded with error status
      const { status, data } = error.response;
      if (status === 401) {
        // Unauthorized - clear token and redirect to login
        localStorage.removeItem("accessToken");
        window.location.href = "/login";
      }
      return Promise.reject(error);
    } else if (error.request) {
      // Network error
      console.error("Network error:", error.request);
      return Promise.reject(
        new Error("Network error. Please check your connection.")
      );
    }

    return Promise.reject(error);
  }
);

export const permissionAPI = {
  getAll: (params = {}) => api.get("/permissions", { params }),
  getById: (id) => api.get(`/permissions/${id}`),
  create: (data) => api.post("/permissions", data),
  update: (id, data) => api.put(`/permissions/${id}`, data),
  delete: (id) => api.delete(`/permissions/${id}`),
};

export const roleAPI = {
  getAll: (params = {}) => api.get("/role", { params }),
  getById: (id) => api.get(`/role/${id}`),
  create: (data) => api.post("/role", data),
  update: (id, data) => api.put(`/role/${id}`, data),
  delete: (id) => api.delete(`/role/${id}`),
};

export const movieAPI = {
  getAll: (params = {}) => api.get("/movies", { params }),
  getById: (id) => api.get(`/movies/${id}`),
  create: (data) => api.post("/movies", data),
  update: (id, data) => api.put(`/movies/${id}`, data),
  delete: (id, confirm = false) =>
    api.delete(`/movies/${id}`, { data: { confirm } }),
  getCategories: () => api.get("/movies/categories"),
  toggleFavorite: (id, token) =>
    api.put(
      `/movies/${id}/favorite`,
      {},
      { headers: { Authorization: `Bearer ${token}` } }
    ),

  checkFavoriteStatus: (id, token) =>
    api.get(`/movies/${id}/favorite/status`, {
      headers: { Authorization: `Bearer ${token}` },
    }),
  getFavorites: (params = {}, token) =>
    api.get(`/movies/favorites`, {
      params,
      headers: { Authorization: `Bearer ${token}` },
    }),
};

export const cinemaAPI = {
  getAll: (params = {}) => api.get("/cinemas", { params }),
  getById: (id) => api.get(`/cinemas/${id}`),
  create: (data) => api.post("/cinemas", data),
  update: (id, data) => api.put(`/cinemas/${id}`, data),
  delete: (id) => api.delete(`/cinemas/${id}`),
};

export const roomAPI = {
  getAll: (params = {}) => api.get("/cinema/rooms", { params }),
  getById: (id) => api.get(`/cinema/rooms/${id}`),
  create: (data) => api.post("/cinema/rooms", data),
  update: (id, data) => api.put(`/cinema/rooms/${id}`, data),
  delete: (id) => api.delete(`/cinema/rooms/${id}`),
};

export const scheduleAPI = {
  getByMovieId: (movieId, date) =>
    api.get(`/schedules/movie/${movieId}`, { params: { date } }),
  getById: (id) => api.get(`/schedules/${id}`),
  create: (data) => api.post("/schedules", data),
  update: (id, data) => api.put(`/schedules/${id}`, data),
  delete: (id) => api.delete(`/schedules/${id}`),
};

export const ticketsAPI = {
  getAvailableSeats: (scheduleId) =>
    api.get(`/tickets/schedule/${scheduleId}/available-seats`),
  getByUserId: (userId) => api.get(`/tickets/user/${userId}`),
  bookTickets: (data) => api.post("/tickets/book", data),
  delete: (id) => api.delete(`/tickets/${id}`),
};

export const paymentAPI = {
  getUserPayments: (userId) => api.get(`/payments/user/${userId}`),
  getById: (id) => api.get(`/payments/${id}`),
  create: (data) => api.post("/payments", data),
  refund: (id, data) => api.post(`/payments/${id}/refund`, data),
  cancel: (id) => api.post(`/payments/${id}/cancel`),
  removeRefunded: (id) => api.post(`/payments/${id}/remove-refunded`),
  vnpayReturn: (params) => api.get("/payments/vnpay-return", { params }),
  getAllRefundRequests: () => api.get("/payments/admin/refund-requests"),
  approveRefund: (id) => api.post(`/payments/admin/${id}/approve-refund`),
};

export const userAPI = {
  getAll: (params = {}) => api.get('/users', { params }),
  getById: (id) => api.get(`/users/${id}`),
  create: (data) => api.post('/users', data),
  update: (id, data) => api.put(`/users/${id}`, data),
  delete: (id) => api.delete(`/users/${id}`),
};

export const statisticsAPI = {
  getRevenue: (params = {}) => api.get('/statistics/revenue', { params }),
  getBookings: (params = {}) => api.get('/statistics/bookings', { params }),
};


export default api;
