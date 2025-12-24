import React, { useState, useEffect } from "react";
import {
  RefreshCw,
  CheckCircle,
  XCircle,
  UserIcon,
  CalendarIcon,
  DollarSignIcon,
  FilmIcon,
  BuildingIcon,
  ClockIcon,
  AlertCircleIcon,
} from "lucide-react";
import { paymentAPI } from "../../lib/api";
import { toast } from "react-hot-toast";
import { dateFormat } from "../../lib/dateFormat";

const ManageTicketRefund = () => {
  const [refundRequests, setRefundRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [approvingId, setApprovingId] = useState(null);
  const [approvedIds, setApprovedIds] = useState(new Set());

  const fetchRefundRequests = async () => {
    try {
      setLoading(true);
      const response = await paymentAPI.getAllRefundRequests();
      const requests = response.data || [];
      setRefundRequests(requests);

      // Check which requests are already approved (tickets have REFUND_APPROVED status)
      const alreadyApproved = new Set();
      requests.forEach((request) => {
        if (request.tickets && request.tickets.length > 0) {
          const allApproved = request.tickets.every(
            (ticket) => ticket.status === "REFUND_APPROVED"
          );
          if (allApproved) {
            alreadyApproved.add(request.id);
          }
        }
      });
      setApprovedIds(alreadyApproved);
    } catch (error) {
      console.error("Error fetching refund requests:", error);
      toast.error("Failed to load refund requests");
      setRefundRequests([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRefundRequests();
  }, []);

  const handleApproveRefund = async (paymentId) => {
    try {
      setApprovingId(paymentId);
      await paymentAPI.approveRefund(paymentId);
      toast.success("Refund approved successfully!");
      // Mark this payment as approved
      setApprovedIds((prev) => new Set([...prev, paymentId]));
      await fetchRefundRequests();
    } catch (error) {
      console.error("Error approving refund:", error);
      toast.error(error.response?.data?.message || "Failed to approve refund");
    } finally {
      setApprovingId(null);
    }
  };

  const formatCurrency = (amount) => {
    return `${amount.toLocaleString()}₫`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto"></div>
          <p className="mt-4 text-gray-400">Loading refund requests...</p>
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
            Manage{" "}
            <span className="text-red-500 bg-red-500/20 px-2 py-1 rounded">
              Refund Requests
            </span>
          </h1>
          <p className="text-gray-400 mt-2">
            Review and approve refund requests from users
          </p>
        </div>

        {/* Refund Requests List */}
        {refundRequests.length === 0 ? (
          <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-12 text-center">
            <AlertCircleIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-400 text-lg">No refund requests found</p>
            <p className="text-gray-500 mt-2">
              All refund requests have been processed
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {refundRequests.map((request) => (
              <div
                key={request.id}
                className="bg-gray-900/50 border border-gray-700 rounded-lg p-6 hover:border-red-500/50 transition-colors"
              >
                <div className="flex flex-col md:flex-row justify-between gap-6">
                  {/* Left Section - Request Info */}
                  <div className="flex-1 space-y-4">
                    <div className="flex items-start gap-4">
                      {request.movie?.posterUrl && (
                        <img
                          src={request.movie.posterUrl}
                          alt={request.movie.title}
                          className="w-24 h-32 object-cover rounded-lg"
                        />
                      )}
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <FilmIcon className="w-5 h-5 text-red-500" />
                          <h3 className="text-xl font-semibold text-white">
                            {request.movie?.title || "Unknown Movie"}
                          </h3>
                        </div>

                        <div className="space-y-2 text-sm">
                          <div className="flex items-center gap-2 text-gray-300">
                            <UserIcon className="w-4 h-4" />
                            <span>
                              <strong>User:</strong>{" "}
                              {request.user?.name || "Unknown"} (
                              {request.user?.email || "N/A"})
                            </span>
                          </div>

                          {request.schedule && (
                            <>
                              <div className="flex items-center gap-2 text-gray-300">
                                <BuildingIcon className="w-4 h-4" />
                                <span>
                                  <strong>Cinema:</strong>{" "}
                                  {request.schedule.room?.cinema?.name || "N/A"}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 text-gray-300">
                                <span className="w-4 h-4 flex items-center justify-center">
                                  
                                </span>
                                <span>
                                  <strong>Room:</strong>{" "}
                                  {request.schedule.room?.name || "N/A"}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 text-gray-300">
                                <ClockIcon className="w-4 h-4" />
                                <span>
                                  <strong>Showtime:</strong>{" "}
                                  {dateFormat(request.schedule.startTime)}
                                </span>
                              </div>
                            </>
                          )}

                          <div className="flex items-center gap-2 text-gray-300">
                            <CalendarIcon className="w-4 h-4" />
                            <span>
                              <strong>Requested at:</strong>{" "}
                              {dateFormat(request.requestedAt)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Tickets Info */}
                    {request.tickets && request.tickets.length > 0 && (
                      <div className="mt-4 p-4 bg-gray-800/50 rounded-lg">
                        <p className="text-sm text-gray-300 mb-2">
                          <strong>Seats:</strong>{" "}
                          {request.tickets.map((t) => t.seatCode).join(", ")}
                        </p>
                        <p className="text-sm text-gray-300">
                          <strong>Total tickets:</strong>{" "}
                          {request.tickets.length}
                        </p>
                      </div>
                    )}

                    {/* Reason */}
                    <div className="mt-4 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                      <p className="text-sm text-yellow-300">
                        <strong>Reason:</strong>{" "}
                        {request.reason || "No reason provided"}
                      </p>
                    </div>
                  </div>

                  {/* Right Section - Actions */}
                  <div className="flex flex-col items-end justify-between gap-4 min-w-[200px]">
                    <div className="text-right">
                      <div className="flex items-center gap-2 justify-end mb-2">
                        <DollarSignIcon className="w-5 h-5 text-green-500" />
                        <span className="text-2xl font-bold text-green-400">
                          {formatCurrency(request.amount)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-400">
                        Payment Method: {request.method || "N/A"}
                      </p>
                    </div>

                    <button
                      onClick={() => handleApproveRefund(request.id)}
                      disabled={
                        approvingId === request.id ||
                        approvedIds.has(request.id)
                      }
                      className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {approvingId === request.id ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          Processing...
                        </>
                      ) : approvedIds.has(request.id) ? (
                        <>
                          <ClockIcon className="w-5 h-5" />
                          Waiting for user
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-5 h-5" />
                          Approve Refund
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Refresh Button */}
        <div className="mt-6 flex justify-end">
          <button
            onClick={fetchRefundRequests}
            className="flex items-center gap-2 px-6 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>
    </div>
  );
};

export default ManageTicketRefund;
