import React, { useEffect, useState } from "react";
import Loading from "../components/Loading";
import BlurCircle from "../components/BlurCircle";
import { ticketsAPI, paymentAPI } from "../lib/api";
import { dateFormat } from "../lib/dateFormat";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { RefreshCw } from "lucide-react";

function groupTickets(tickets) {
  const groups = {};
  tickets.forEach((ticket) => {
    const schedule = ticket.schedule;
    const key = `${schedule.id}-${ticket.bookedAt}`;
    if (!groups[key]) {
      groups[key] = {
        schedule,
        bookedAt: ticket.bookedAt,
        tickets: [],
        seatCodes: [],
        totalPrice: 0,
        statuses: [],
        isOverdue: false,
        paymentId: ticket.paymentId,
        payment: ticket.payment,
      };
    }
    groups[key].tickets.push(ticket);
    groups[key].seatCodes.push(ticket.seatCode);
    groups[key].totalPrice += ticket.price;
    groups[key].statuses.push(ticket.status);
    // Keep paymentId if available
    if (ticket.paymentId && !groups[key].paymentId) {
      groups[key].paymentId = ticket.paymentId;
    }
    if (ticket.payment && !groups[key].payment) {
      groups[key].payment = ticket.payment;
    }
  });

  const now = new Date();

  Object.values(groups).forEach((group) => {
    if (group.statuses.every((st) => st === "PAID")) {
      group.status = "PAID";
    } else if (group.statuses.every((st) => st === "CANCELLED")) {
      group.status = "CANCELLED";
    } else if (group.statuses.every((st) => st === "REFUNDED")) {
      group.status = "REFUNDED";
    } else if (group.statuses.some((st) => st === "REFUND_APPROVED")) {
      group.status = "REFUND_APPROVED";
    } else if (group.statuses.some((st) => st === "BOOKED")) {
      group.status = "BOOKED";
      if (
        group.tickets.some(
          (ticket) =>
            ticket.status === "BOOKED" &&
            // So sánh theo GMT+7: cộng 7 giờ cho startTime rồi so với "now"
            new Date(
              new Date(group.schedule.startTime).getTime() + 7 * 60 * 60 * 1000
            ) < now
        )
      ) {
        group.isOverdue = true;
      }
    } else {
      group.status = "OTHER";
    }
    delete group.statuses;
  });

  return Object.values(groups).sort(
    (a, b) => new Date(b.bookedAt) - new Date(a.bookedAt)
  );
}

const TABS = [
  { label: "All", value: "ALL" },
  { label: "Unpaid", value: "BOOKED" },
  { label: "Paid", value: "PAID" },
  { label: "Cancelled", value: "CANCELLED" },
  { label: "Refunded", value: "REFUNDED" },
  { label: "Overdue", value: "OVERDUE" },
];

function filterGroups(groups, tab) {
  if (tab === "ALL") return groups;
  if (tab === "OVERDUE") return groups.filter((g) => g.isOverdue);
  if (tab === "BOOKED")
    return groups.filter((g) => g.status === "BOOKED" && !g.isOverdue);
  return groups.filter((g) => g.status === tab);
}

const MyBookings = () => {
  const { user, isLoggedIn } = useAuth();
  const currency = import.meta.env.VITE_CURRENCY || "₫";
  const [ticketGroups, setTicketGroups] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [selectedTab, setSelectedTab] = useState("ALL");
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [refundReason, setRefundReason] = useState("");
  const [isRefunding, setIsRefunding] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [refundStatus, setRefundStatus] = useState(null);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [showMoneyReceivedModal, setShowMoneyReceivedModal] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const navigate = useNavigate();

  const userId = user?.id;

  const getMyTickets = async () => {
    setIsLoading(true);
    try {
      const res = await ticketsAPI.getByUserId(userId);
      const tickets = res.data.data || [];
      const groups = groupTickets(tickets);

      // Fetch payment info for tickets that have paymentId
      const groupsWithPayment = await Promise.all(
        groups.map(async (group) => {
          if (group.paymentId) {
            try {
              const paymentRes = await paymentAPI.getById(group.paymentId);
              const payment = paymentRes.data;
              // Add full payment object to group
              group.payment = payment;
              // Set refund status if applicable
              if (
                payment.status === "REFUND_REQUESTED" ||
                payment.status === "REFUNDED"
              ) {
                group.refundStatus = payment.status;
              }
            } catch (error) {
              console.error("Error fetching payment info:", error);
            }
          }
          return group;
        })
      );

      setTicketGroups(groupsWithPayment);
    } catch {
      setTicketGroups([]);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    if (isLoggedIn && userId) {
      getMyTickets();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, isLoggedIn]);

  // Prevent body scroll when modals are open
  useEffect(() => {
    const isModalOpen =
      showCancelModal ||
      showRefundModal ||
      showStatusModal ||
      showMoneyReceivedModal;
    if (isModalOpen) {
      document.body.style.overflow = "hidden";
      document.body.style.position = "fixed";
      document.body.style.width = "100%";
    } else {
      document.body.style.overflow = "";
      document.body.style.position = "";
      document.body.style.width = "";
    }
    return () => {
      document.body.style.overflow = "";
      document.body.style.position = "";
      document.body.style.width = "";
    };
  }, [
    showCancelModal,
    showRefundModal,
    showStatusModal,
    showMoneyReceivedModal,
  ]);

  const handlePayGroup = (group) => {
    if (group.isOverdue) {
      toast.error("This booking is overdue and cannot be paid!");
      return;
    }
    navigate("/payment", {
      state: {
        scheduleId: group.schedule.id,
        seatCodes: group.seatCodes,
        totalPrice: group.totalPrice,
        ticketIds: group.tickets.map((t) => t.id),
        movie: group.schedule.movie,
        room: group.schedule.room,
        showTime: group.schedule.startTime,
      },
    });
  };

  const handleCancelGroup = (group) => {
    setSelectedGroup(group);
    setShowCancelModal(true);
  };

  const handleConfirmCancel = async () => {
    if (!selectedGroup) return;
    setIsCancelling(true);
    try {
      await Promise.all(
        selectedGroup.tickets.map((ticket) => ticketsAPI.delete(ticket.id))
      );
      toast.success("Tickets cancelled successfully!");
      setShowCancelModal(false);
      setSelectedGroup(null);
      getMyTickets();
    } catch {
      toast.error("Failed to cancel tickets!");
    }
    setIsCancelling(false);
  };

  const handleMoneyReceivedClick = (group) => {
    setSelectedGroup(group);
    setShowMoneyReceivedModal(true);
    setAgreedToTerms(false);
  };

  const handleConfirmMoneyReceived = async () => {
    if (!selectedGroup) return;
    if (!agreedToTerms) {
      toast.error("Please confirm that you have read and agreed to the terms");
      return;
    }

    // Get payment ID from the first ticket
    const firstTicket = selectedGroup.tickets[0];
    const paymentId = firstTicket.paymentId;

    if (!paymentId) {
      toast.error("Payment ID not found for this booking");
      return;
    }

    setIsCancelling(true);
    try {
      // Use payment API to remove refunded payment and tickets (same logic as cancelPayment)
      await paymentAPI.removeRefunded(paymentId);
      toast.success("Refunded payment removed successfully!");
      setShowMoneyReceivedModal(false);
      setSelectedGroup(null);
      setAgreedToTerms(false);
      getMyTickets();
    } catch (error) {
      console.error("Error removing refunded payment:", error);
      toast.error(
        error.response?.data?.message || "Failed to remove refunded payment!"
      );
    } finally {
      setIsCancelling(false);
    }
  };

  const handleRefundGroup = (group) => {
    setSelectedGroup(group);
    setShowRefundModal(true);
  };

  const canRefund = (group) => {
    if (!group.schedule.startTime) return false;
    // Check if paymentId exists (ticket must be paid)
    const firstTicket = group.tickets[0];
    if (!firstTicket?.paymentId) return false;
    // Don't show refund button if already requested or refunded
    if (
      group.refundStatus === "REFUND_REQUESTED" ||
      group.status === "REFUNDED"
    ) {
      return false;
    }
    // Check if show time is at least 2 hours away (theo GMT+7)
    const showDateTime = new Date(
      new Date(group.schedule.startTime).getTime() + 7 * 60 * 60 * 1000
    );
    const now = new Date();
    const hoursUntilShow =
      (showDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);
    return hoursUntilShow >= 2;
  };

  const hasRefundRequest = (group) => {
    return group.refundStatus === "REFUND_REQUESTED";
  };

  const handleCheckRefundStatus = async (group) => {
    const firstTicket = group.tickets[0];
    if (!firstTicket?.paymentId) return;

    setIsCheckingStatus(true);
    try {
      const response = await paymentAPI.getById(firstTicket.paymentId);
      const payment = response.data;
      setRefundStatus(payment.status);
      setSelectedGroup(group);
      setShowStatusModal(true);
    } catch (error) {
      console.error("Error checking refund status:", error);
      toast.error("Failed to check refund status");
    } finally {
      setIsCheckingStatus(false);
    }
  };

  const handleConfirmRefunded = async () => {
    if (!selectedGroup) return;

    try {
      // Delete refunded tickets
      await Promise.all(
        selectedGroup.tickets.map((ticket) => ticketsAPI.delete(ticket.id))
      );
      toast.success("Refunded tickets removed successfully!");
      setShowStatusModal(false);
      setSelectedGroup(null);
      setRefundStatus(null);
      getMyTickets();
    } catch (error) {
      console.error("Error removing refunded tickets:", error);
      toast.error("Failed to remove refunded tickets");
    }
  };

  const handleConfirmRefund = async () => {
    if (!selectedGroup) return;
    if (!refundReason.trim()) {
      toast.error("Please provide a reason for refund");
      return;
    }

    setIsRefunding(true);
    try {
      // Get payment ID from the first ticket
      const firstTicket = selectedGroup.tickets[0];
      const paymentId = firstTicket.paymentId;

      if (!paymentId) {
        toast.error("Payment ID not found for this booking");
        setIsRefunding(false);
        return;
      }

      await paymentAPI.refund(paymentId, { reason: refundReason });
      toast.success("Refund request submitted successfully!");
      setShowRefundModal(false);
      setSelectedGroup(null);
      setRefundReason("");
      getMyTickets();
    } catch (error) {
      toast.error(error.response?.data?.message || "Refund request failed");
    } finally {
      setIsRefunding(false);
    }
  };

  return isLoading ? (
    <Loading />
  ) : (
    <div className="relative px-4 sm:px-6 md:px-16 lg:px-40 xl:px-44 py-20 pt-30 min-h-screen background-color overflow-x-hidden">
      <BlurCircle top="100px" left="100px" />
      <div>
        <BlurCircle bottom="0px" left="1100px" />
      </div>
      <h1 className="text-2xl font-semibold my-8 flex items-center gap-2">
        My Bookings
      </h1>

      <div className="flex gap-2 mb-3 flex-wrap">
        {TABS.map((tab) => (
          <button
            key={tab.value}
            className={`px-3 sm:px-4 py-1.5 rounded-lg border font-medium text-sm sm:text-base flex-shrink-0 ${
              selectedTab === tab.value
                ? "bg-primary text-white border-primary"
                : "bg-gray-200 border-gray-300 text-gray-800"
            } transition`}
            onClick={() => setSelectedTab(tab.value)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Ticket list */}
      {filterGroups(ticketGroups, selectedTab).length === 0 && (
        <div className="text-center text-gray-400 mt-8">No bookings found.</div>
      )}

      {filterGroups(ticketGroups, selectedTab).map((group, idx) => (
        <div
          key={idx}
          className="flex flex-col md:flex-row justify-between bg-primary/8 border border-primary/20 rounded-lg mt-4 p-2 max-w-5xl w-full"
        >
          <div className="flex flex-col md:flex-row min-w-0 flex-1">
            <img
              src={group.schedule.movie.posterUrl || "/placeholder.jpg"}
              alt={group.schedule.movie.title}
              className="w-full md:max-w-45 md:w-auto aspect-video h-auto object-cover object-bottom rounded flex-shrink-0"
              loading="lazy"
            />
            <div className="flex flex-col p-4 min-w-0 flex-1">
              <p className="text-lg font-semibold break-words">
                {group.schedule.movie.title}
              </p>
              <p className="text-gray-400 text-sm break-words">
                {group.schedule.room.name}
              </p>
              <p className="text-gray-400 text-sm mt-auto">
                {group.schedule.startTime
                  ? dateFormat(group.schedule.startTime)
                  : ""}
              </p>
            </div>
          </div>
          <div className="flex flex-col md:items-end md:text-right justify-between p-4 min-w-0 flex-shrink-0">
            <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4 w-full md:w-auto">
              <p className="text-xl sm:text-2xl font-semibold mb-2 md:mb-3 whitespace-nowrap">
                {currency}
                {group.totalPrice.toLocaleString()}
              </p>
              {group.status === "PAID" &&
              group.payment.status === "COMPLETED" ? (
                <div className="flex flex-wrap gap-2">
                  <span className="px-3 md:px-4 py-1.5 text-xs md:text-sm rounded-full font-medium bg-green-200 text-green-700 whitespace-nowrap">
                    Paid
                  </span>
                  {hasRefundRequest(group) ? (
                    <button
                      className="flex items-center gap-1 md:gap-2 bg-blue-600 hover:bg-blue-700 text-white px-3 md:px-4 py-1.5 text-xs md:text-sm rounded-full font-medium transition disabled:opacity-50 whitespace-nowrap"
                      onClick={() => handleCheckRefundStatus(group)}
                      disabled={isCheckingStatus}
                    >
                      {isCheckingStatus ? (
                        <>
                          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                          <span className="hidden sm:inline">Checking...</span>
                          <span className="sm:hidden">...</span>
                        </>
                      ) : (
                        <>
                          <RefreshCw size={12} className="md:w-3.5 md:h-3.5" />
                          <span className="hidden sm:inline">Check Status</span>
                          <span className="sm:hidden">Status</span>
                        </>
                      )}
                    </button>
                  ) : canRefund(group) ? (
                    <button
                      className="flex items-center gap-1 md:gap-2 bg-orange-600 hover:bg-orange-700 text-white px-3 md:px-4 py-1.5 text-xs md:text-sm rounded-full font-medium transition whitespace-nowrap"
                      onClick={() => handleRefundGroup(group)}
                    >
                      <RefreshCw size={12} className="md:w-3.5 md:h-3.5" />
                      <span className="hidden sm:inline">Request Refund</span>
                      <span className="sm:hidden">Refund</span>
                    </button>
                  ) : null}
                </div>
              ) : group.status === "CANCELLED" ? (
                <span className="px-3 md:px-4 py-1.5 text-xs md:text-sm rounded-full font-medium bg-gray-300 text-gray-700 whitespace-nowrap">
                  Cancelled
                </span>
              ) : group.status === "REFUNDED" ? (
                <span className="px-3 md:px-4 py-1.5 text-xs md:text-sm rounded-full font-medium bg-red-500 text-white whitespace-nowrap">
                  Refunded
                </span>
              ) : group.status === "PAID" &&
                group.payment.status === "PENDING" ? (
                <span
                  className="px-4 py-1.5 text-sm rounded-full font-medium bg-gray-500 text-white cursor-help flex items-center gap-1"
                  title="Wait 5 mins to retry"
                >
                  Payment Failed
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    class="lucide lucide-info-icon lucide-info"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 16v-4" />
                    <path d="M12 8h.01" />
                  </svg>
                </span>
              ) : group.isOverdue ? (
                <span className="px-3 md:px-4 py-1.5 text-xs md:text-sm rounded-full font-medium bg-yellow-200 text-yellow-700 whitespace-nowrap">
                  Overdue
                </span>
              ) : group.status === "REFUND_APPROVED" ? (
                <button
                  className="bg-green-500 px-3 md:px-4 py-1.5 text-xs md:text-sm rounded-full font-medium cursor-pointer hover:bg-green-700 transition disabled:opacity-50 whitespace-nowrap"
                  onClick={() => handleMoneyReceivedClick(group)}
                  disabled={isCancelling}
                >
                  <span className="hidden sm:inline">MONEY RECEIVED</span>
                  <span className="sm:hidden">RECEIVED</span>
                </button>
              ) : (
                <div className="flex flex-wrap gap-2">
                  <button
                    className="bg-primary px-3 md:px-4 py-1.5 text-xs md:text-sm rounded-full font-medium cursor-pointer whitespace-nowrap"
                    onClick={() => handlePayGroup(group)}
                  >
                    Pay Now
                  </button>
                  <button
                    className="bg-red-500 px-3 md:px-4 py-1.5 text-xs md:text-sm rounded-full font-medium cursor-pointer hover:bg-red-700 transition whitespace-nowrap"
                    onClick={() => handleCancelGroup(group)}
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
            <div className="text-sm break-words">
              <p className="break-words">
                <span className="text-gray-400">Total seats:</span>{" "}
                {group.seatCodes.length}
              </p>
              <p className="break-words">
                <span className="text-gray-400">Seats:</span>{" "}
                {group.seatCodes.join(", ")}
              </p>
              <p className="break-words">
                <span className="text-gray-400">Room:</span>{" "}
                {group.schedule.room.name}
              </p>
              <p className="break-words">
                <span className="text-gray-400">Cinema:</span>{" "}
                {group.schedule.room.cinema?.name}
              </p>
              <p className="break-words">
                <span className="text-gray-400">Address:</span>{" "}
                {group.schedule.room.cinema?.location}
              </p>
            </div>
          </div>
        </div>
      ))}

      {showCancelModal && selectedGroup && (
        <div
          className="fixed z-50 inset-0 bg-black/40 overflow-y-auto flex items-center justify-center p-3 md:p-4"
          style={{ position: "fixed" }}
        >
          <div
            className="bg-white text-black rounded-xl shadow-xl p-4 md:p-8 w-full max-w-md mx-auto animate-fade-in"
            style={{ maxWidth: "calc(100% - 1.5rem)" }}
          >
            <h2 className="font-bold text-lg mb-3">
              Confirm Ticket Cancellation
            </h2>
            <div className="mb-3 text-sm">
              <div className="mb-2 break-words">
                <b>Movie:</b> {selectedGroup.schedule.movie.title}
              </div>
              <div className="mb-1 break-words">
                <b>Seats:</b> {selectedGroup.seatCodes.join(", ")}
              </div>
              <div className="mb-1 break-words">
                <b>Room:</b> {selectedGroup.schedule.room.name}
              </div>
              <div className="mb-1 break-words">
                <b>Cinema:</b> {selectedGroup.schedule.room.cinema?.name}
              </div>
              <div className="mb-1">
                <b>Showtime:</b> {dateFormat(selectedGroup.schedule.startTime)}
              </div>
              <div className="mb-1">
                <b>Total price:</b> {selectedGroup.totalPrice.toLocaleString()}₫
              </div>
              <div className="mt-3 text-red-600 font-semibold">
                Are you sure you want to cancel{" "}
                <b>{selectedGroup.seatCodes.length}</b> tickets?
              </div>
            </div>
            <div className="flex flex-col sm:flex-row justify-end gap-3 mt-4">
              <button
                className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300 transition-colors"
                onClick={() => {
                  setShowCancelModal(false);
                  setSelectedGroup(null);
                }}
                disabled={isCancelling}
              >
                Close
              </button>
              <button
                className="px-4 py-2 rounded bg-red-500 text-white hover:bg-red-700 transition-colors disabled:opacity-50"
                onClick={handleConfirmCancel}
                disabled={isCancelling}
              >
                {isCancelling ? "Cancelling..." : "Confirm Cancel"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showRefundModal && selectedGroup && (
        <div
          className="fixed z-50 inset-0 bg-black/40 overflow-y-auto flex items-center justify-center p-3 md:p-4"
          style={{ position: "fixed" }}
        >
          <div className="bg-white text-black rounded-xl shadow-xl p-4 md:p-5 w-[calc(100%-1.5rem)] md:w-auto md:max-w-xs mx-auto animate-fade-in max-h-[90vh] md:max-h-[75vh] overflow-y-auto">
            <h2 className="font-bold text-base md:text-lg mb-2">
              Request Refund
            </h2>
            <div className="mb-2 text-xs md:text-sm">
              <div className="mb-1.5 break-words">
                <b>Movie:</b> {selectedGroup.schedule.movie.title}
              </div>
              <div className="mb-1 break-words">
                <b>Seats:</b> {selectedGroup.seatCodes.join(", ")}
              </div>
              <div className="mb-1 break-words">
                <b>Room:</b> {selectedGroup.schedule.room.name}
              </div>
              <div className="mb-1 break-words">
                <b>Cinema:</b> {selectedGroup.schedule.room.cinema?.name}
              </div>
              <div className="mb-1">
                <b>Showtime:</b> {dateFormat(selectedGroup.schedule.startTime)}
              </div>
              <div className="mb-1">
                <b>Total price:</b> {currency}
                {selectedGroup.totalPrice.toLocaleString()}
              </div>
            </div>
            <p className="text-gray-600 mb-2 text-xs md:text-sm">
              Please provide a reason for your refund request:
            </p>
            <textarea
              value={refundReason}
              onChange={(e) => setRefundReason(e.target.value)}
              className="w-full bg-gray-100 border border-gray-300 text-black p-2 md:p-3 rounded-lg mb-3 resize-none text-xs md:text-sm"
              placeholder="E.g., Unable to attend, emergency, etc."
              rows="3"
            />
            <div className="flex flex-col sm:flex-row justify-end gap-2 mt-3">
              <button
                className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300 transition-colors"
                onClick={() => {
                  setShowRefundModal(false);
                  setSelectedGroup(null);
                  setRefundReason("");
                }}
                disabled={isRefunding}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 rounded bg-orange-600 text-white hover:bg-orange-700 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
                onClick={handleConfirmRefund}
                disabled={isRefunding || !refundReason.trim()}
              >
                {isRefunding ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Processing...
                  </>
                ) : (
                  <>
                    <RefreshCw size={16} />
                    Submit Refund
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Refund Status Modal */}
      {showStatusModal && selectedGroup && (
        <div
          className="fixed z-50 inset-0 bg-black/40 overflow-y-auto flex items-center justify-center p-3 md:p-4"
          style={{ position: "fixed" }}
        >
          <div
            className="bg-white text-black rounded-xl shadow-xl p-4 md:p-8 w-full max-w-md mx-auto animate-fade-in"
            style={{ maxWidth: "calc(100% - 1.5rem)" }}
          >
            <h2 className="font-bold text-lg mb-3">Refund Status</h2>
            <div className="mb-3 text-sm">
              <div className="mb-2 break-words">
                <b>Movie:</b> {selectedGroup.schedule.movie.title}
              </div>
              <div className="mb-1 break-words">
                <b>Seats:</b> {selectedGroup.seatCodes.join(", ")}
              </div>
              <div className="mb-1">
                <b>Showtime:</b> {dateFormat(selectedGroup.schedule.startTime)}
              </div>
              <div className="mb-1">
                <b>Total price:</b> {currency}
                {selectedGroup.totalPrice.toLocaleString()}
              </div>
            </div>

            {refundStatus === "REFUND_REQUESTED" ? (
              <div className="mb-4 p-4 bg-yellow-100 border border-yellow-300 rounded-lg">
                <p className="text-yellow-800 text-sm break-words">
                  <strong>Status:</strong> Your refund request is pending
                  approval from admin.
                  <br />
                  Please wait for admin to process your request.
                </p>
              </div>
            ) : refundStatus === "REFUNDED" ? (
              <div className="mb-4 p-4 bg-green-100 border border-green-300 rounded-lg">
                <p className="text-green-800 text-sm break-words">
                  <strong>Status:</strong> Your refund has been approved!
                  <br />
                  The refund amount will be processed according to your payment
                  method.
                </p>
              </div>
            ) : (
              <div className="mb-4 p-4 bg-gray-100 border border-gray-300 rounded-lg">
                <p className="text-gray-800 text-sm break-words">
                  <strong>Status:</strong> {refundStatus || "Unknown"}
                </p>
              </div>
            )}

            <div className="flex flex-col sm:flex-row justify-end gap-3 mt-4">
              <button
                className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300 transition-colors"
                onClick={() => {
                  setShowStatusModal(false);
                  setSelectedGroup(null);
                  setRefundStatus(null);
                }}
              >
                Close
              </button>
              {refundStatus === "REFUNDED" && (
                <button
                  className="px-4 py-2 rounded bg-green-600 text-white hover:bg-green-700 transition-colors"
                  onClick={handleConfirmRefunded}
                >
                  OK & Remove Tickets
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Money Received Confirmation Modal */}
      {showMoneyReceivedModal && selectedGroup && (
        <div
          className="fixed z-50 inset-0 bg-black/40 overflow-y-auto flex items-center justify-center p-3 md:p-4"
          style={{ position: "fixed" }}
        >
          <div
            className="bg-white text-black rounded-xl shadow-xl p-4 md:p-8 w-full max-w-md mx-auto animate-fade-in max-h-[90vh] md:max-h-[80vh] overflow-y-auto"
            style={{ maxWidth: "calc(100% - 1.5rem)" }}
          >
            <h2 className="font-bold text-lg mb-4">Confirm Money Received</h2>
            <div className="mb-4 text-sm">
              <div className="mb-2 break-words">
                <b>Movie:</b> {selectedGroup.schedule.movie.title}
              </div>
              <div className="mb-1 break-words">
                <b>Seats:</b> {selectedGroup.seatCodes.join(", ")}
              </div>
              <div className="mb-1">
                <b>Showtime:</b> {dateFormat(selectedGroup.schedule.startTime)}
              </div>
              <div className="mb-1">
                <b>Refund Amount:</b> {currency}
                {selectedGroup.totalPrice.toLocaleString()}
              </div>
            </div>

            <div className="mb-6 p-4 bg-red-50 border-2 border-red-300 rounded-lg">
              <p className="text-red-800 font-semibold mb-2">
                ⚠️ Important Notice:
              </p>
              <p className="text-red-700 text-sm">
                By clicking "Confirm", you acknowledge that you have received
                the refund amount and understand that{" "}
                <strong>
                  we will not be responsible for any further refund requests{" "}
                </strong>
                regarding this transaction. This action cannot be undone.
              </p>
            </div>

            <div className="mb-6">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={agreedToTerms}
                  onChange={(e) => setAgreedToTerms(e.target.checked)}
                  className="mt-1 w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500 flex-shrink-0"
                />
                <span className="text-sm text-gray-700">
                  I confirm that I have received the refund amount and
                  understand that
                  <strong>
                    {" "}
                    we will not be responsible for any further refund requests{" "}
                  </strong>
                  after this confirmation.
                </span>
              </label>
            </div>

            <div className="flex flex-col sm:flex-row justify-end gap-3 mt-6">
              <button
                className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300 transition-colors"
                onClick={() => {
                  setShowMoneyReceivedModal(false);
                  setSelectedGroup(null);
                  setAgreedToTerms(false);
                }}
                disabled={isCancelling}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 rounded bg-green-600 text-white hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                onClick={handleConfirmMoneyReceived}
                disabled={isCancelling || !agreedToTerms}
              >
                {isCancelling ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Processing...
                  </>
                ) : (
                  "Confirm"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyBookings;
