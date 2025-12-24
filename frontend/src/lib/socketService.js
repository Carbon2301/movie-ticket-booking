import { io } from "socket.io-client";

class SocketService {
  constructor() {
    this.socket = null;
    this.currentScheduleId = null;
    this.isConnected = false;
  }

  connect() {
    // Disconnect existing socket if any
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    
    // When running behind Cloudflare Tunnel (HTTPS), use relative path with Vite proxy
    // Otherwise use direct backend connection
    const isHttps = window.location.protocol === "https:";
    const isLocalhost =
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1" ||
      window.location.hostname === "";

    let socketOptions = {
      transports: ["websocket", "polling"],
      autoConnect: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    };

    // Always use relative path when HTTPS (Cloudflare Tunnel) or not localhost
    if (isHttps || !isLocalhost) {
      // Use relative path - Vite will proxy to backend
      // Socket.io will connect to /socket.io with namespace /tickets
      console.log("Using relative path for Socket.io connection (HTTPS/Cloudflare Tunnel)");
      this.socket = io("/tickets", {
        ...socketOptions,
        path: "/socket.io",
        secure: isHttps,
      });
    } else {
      // Direct connection for local development (HTTP localhost)
      console.log("Using direct connection for Socket.io (localhost)");
      const socketUrl = "http://localhost:3000";
      this.socket = io(`${socketUrl}/tickets`, socketOptions);
    }

    this.socket.on("connect", () => {
      console.log("WebSocket connected:", this.socket.id);
      this.isConnected = true;
    });

    this.socket.on("disconnect", () => {
      console.log("WebSocket disconnected");
      this.isConnected = false;
    });

    this.socket.on("connect_error", (error) => {
      console.error("WebSocket connection error:", error);
    });

    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }

  /**
   * Join a schedule room to receive real-time updates
   * @param {number} scheduleId - The schedule ID to join
   * @param {function} onStateReceived - Callback when initial state is received
   */
  joinSchedule(scheduleId, onStateReceived) {
    if (!this.socket) this.connect();

    this.currentScheduleId = scheduleId;
    this.socket.emit("joinSchedule", { scheduleId });

    // Listen for initial state (only once)
    if (onStateReceived) {
      this.socket.once("scheduleState", (data) => {
        console.log("Schedule state received:", data);
        onStateReceived(data);
      });
    }
  }

  /**
   * Leave the current schedule room
   */
  leaveSchedule(scheduleId) {
    if (this.socket && scheduleId) {
      this.socket.emit("leaveSchedule", { scheduleId });
      console.log("Left schedule:", scheduleId);
    }
    this.currentScheduleId = null;
  }

  /**
   * Lock a seat (when user clicks to select)
   * @param {number} scheduleId
   * @param {string} seatCode
   * @param {number} userId
   */
  lockSeat(scheduleId, seatCode, userId) {
    if (!this.socket) return;
    this.socket.emit("lockSeat", { scheduleId, seatCode, userId });
  }

  /**
   * Unlock a seat (when user deselects)
   * @param {number} scheduleId
   * @param {string} seatCode
   * @param {number} userId
   */
  unlockSeat(scheduleId, seatCode, userId) {
    if (!this.socket) return;
    this.socket.emit("unlockSeat", { scheduleId, seatCode, userId });
  }

  /**
   * Listen for seat locked event (by other users)
   * @param {function} callback - (data: { scheduleId, seatCode, userId }) => void
   */
  onSeatLocked(callback) {
    if (!this.socket) return;
    this.socket.on("seatLocked", callback);
  }

  /**
   * Listen for seat unlocked event
   * @param {function} callback - (data: { scheduleId, seatCode }) => void
   */
  onSeatUnlocked(callback) {
    if (!this.socket) return;
    this.socket.on("seatUnlocked", callback);
  }

  /**
   * Listen for seat booked event (confirmed booking)
   * @param {function} callback - (data: { scheduleId, seatCode }) => void
   */
  onSeatBooked(callback) {
    if (!this.socket) return;
    this.socket.on("seatBooked", callback);
  }

  /**
   * Listen for seat cancelled event (ticket cancelled)
   * @param {function} callback - (data: { scheduleId, seatCode }) => void
   */
  onSeatCancelled(callback) {
    if (!this.socket) return;
    this.socket.on("seatCancelled", callback);
  }

  /**
   * Listen for lock success event
   * @param {function} callback - (data: { scheduleId, seatCode }) => void
   */
  onLockSuccess(callback) {
    if (!this.socket) return;
    this.socket.on("lockSuccess", callback);
  }

  /**
   * Listen for lock failed event
   * @param {function} callback - (data: { scheduleId, seatCode, reason }) => void
   */
  onLockFailed(callback) {
    if (!this.socket) return;
    this.socket.on("lockFailed", callback);
  }

  /**
   * Remove all event listeners
   */
  removeAllListeners() {
    if (this.socket) {
      this.socket.removeAllListeners("seatLocked");
      this.socket.removeAllListeners("seatUnlocked");
      this.socket.removeAllListeners("seatBooked");
      this.socket.removeAllListeners("seatCancelled");
      this.socket.removeAllListeners("lockSuccess");
      this.socket.removeAllListeners("lockFailed");
      this.socket.removeAllListeners("scheduleState");
    }
  }

  /**
   * Check if socket is connected
   */
  getConnectionStatus() {
    return this.isConnected && this.socket?.connected;
  }
}

// Export singleton instance
export default new SocketService();
