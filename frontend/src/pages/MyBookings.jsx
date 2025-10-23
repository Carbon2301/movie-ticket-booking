import React, { useEffect, useState } from "react";
import Loading from "../components/Loading";
import BlurCircle from "../components/BlurCircle";
import { ticketsAPI } from "../lib/api";
import { dateFormat } from "../lib/dateFormat";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";

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
      };
    }
    groups[key].tickets.push(ticket);
    groups[key].seatCodes.push(ticket.seatCode);
    groups[key].totalPrice += ticket.price;
    groups[key].statuses.push(ticket.status);
  });

  const now = new Date();

  Object.values(groups).forEach((group) => {
    if (group.statuses.every((st) => st === "PAID")) {
      group.status = "PAID";
    } else if (group.statuses.every((st) => st === "CANCELLED")) {
      group.status = "CANCELLED";
    } else if (group.statuses.every((st) => st === "REFUNDED")) {
      group.status = "REFUNDED";
    } else if (group.statuses.some((st) => st === "BOOKED")) {
      group.status = "BOOKED";
      if (
        group.tickets.some(
          (ticket) =>
            ticket.status === "BOOKED" &&
            new Date(group.schedule.startTime) < now
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
  const navigate = useNavigate();

  const userId = user?.id;

  const getMyTickets = async () => {
    setIsLoading(true);
    try {
      const res = await ticketsAPI.getByUserId(userId);
      const tickets = res.data.data || [];
      setTicketGroups(groupTickets(tickets));
    } catch (err) {
      setTicketGroups([]);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    if (isLoggedIn && userId) {
      getMyTickets();
    }
  }, [userId, isLoggedIn]);

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
    } catch (err) {
      toast.error("Failed to cancel tickets!");
    }
    setIsCancelling(false);
  };

  return isLoading ? (
    <Loading />
  ) : (
    <div className="relative px-6 md:px-16 lg:px-40 xl:px-44 py-20 pt-30 min-h-screen background-color">
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
            className={`px-4 py-1.5 rounded-lg border font-medium ${
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
          className="flex flex-col md:flex-row justify-between bg-primary/8 border border-primary/20 rounded-lg mt-4 p-2 max-w-5xl"
        >
          <div className="flex flex-col md:flex-row">
            <img
              src={group.schedule.movie.posterUrl || "/placeholder.jpg"}
              alt={group.schedule.movie.title}
              className="md:max-w-45 aspect-video h-auto object-cover object-bottom rounded"
            />
            <div className="flex flex-col p-4">
              <p className="text-lg font-semibold">
                {group.schedule.movie.title}
              </p>
              <p className="text-gray-400 text-sm">
                {group.schedule.room.name}
              </p>
              <p className="text-gray-400 text-sm mt-auto">
                {group.schedule.startTime
                  ? dateFormat(group.schedule.startTime)
                  : ""}
              </p>
            </div>
          </div>
          <div className="flex flex-col md:items-end md:text-right justify-between p-4">
            <div className="flex items-center gap-4">
              <p className="text-2xl font-semibold mb-3">
                {currency}
                {group.totalPrice.toLocaleString()}
              </p>
              {group.status === "PAID" ? (
                <span className="px-4 py-1.5 text-sm rounded-full font-medium bg-green-200 text-green-700">
                  Paid
                </span>
                ) : group.status === "CANCELLED" ? (
                  <span className="px-4 py-1.5 text-sm rounded-full font-medium bg-gray-300 text-gray-700">
                    Cancelled
                  </span>
                ) : group.status === "REFUNDED" ? (
                  <span className="px-4 py-1.5 text-sm rounded-full font-medium bg-red-500 text-white">
                    Refunded
                  </span>
              ) : group.isOverdue ? (
                <span className="px-4 py-1.5 text-sm rounded-full font-medium bg-yellow-200 text-yellow-700">
                  Overdue
                </span>
              ) : (
                <div className="flex gap-2">
                  <button
                    className="bg-primary px-4 py-1.5 text-sm rounded-full font-medium cursor-pointer"
                    onClick={() => handlePayGroup(group)}
                  >
                    Pay Now
                  </button>
                  <button
                    className="bg-red-500 px-4 py-1.5 text-sm rounded-full font-medium cursor-pointer hover:bg-red-700 transition"
                    onClick={() => handleCancelGroup(group)}
                  >
                    Cancel Tickets
                  </button>
                </div>
              )}
            </div>
            <div className="text-sm">
              <p>
                <span className="text-gray-400">Total seats:</span>{" "}
                {group.seatCodes.length}
              </p>
              <p>
                <span className="text-gray-400">Seats:</span>{" "}
                {group.seatCodes.join(", ")}
              </p>
              <p>
                <span className="text-gray-400">Room:</span>{" "}
                {group.schedule.room.name}
              </p>
              <p>
                <span className="text-gray-400">Cinema:</span>{" "}
                {group.schedule.room.cinema?.name}
              </p>
              <p>
                <span className="text-gray-400">Address:</span>{" "}
                {group.schedule.room.cinema?.location}
              </p>
            </div>
          </div>
        </div>
      ))}

      {showCancelModal && selectedGroup && (
        <div className="fixed z-50 inset-0 bg-black/40 flex items-center justify-center">
          <div className="bg-white text-black rounded-xl shadow-xl p-8 min-w-[350px] max-w-full animate-fade-in">
            <h2 className="font-bold text-lg mb-3">
              Confirm Ticket Cancellation
            </h2>
            <div className="mb-3 text-sm">
              <div className="mb-2">
                <b>Movie:</b> {selectedGroup.schedule.movie.title}
              </div>
              <div className="mb-1">
                <b>Seats:</b> {selectedGroup.seatCodes.join(", ")}
              </div>
              <div className="mb-1">
                <b>Room:</b> {selectedGroup.schedule.room.name}
              </div>
              <div className="mb-1">
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
            <div className="flex justify-end gap-3 mt-4">
              <button
                className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300"
                onClick={() => {
                  setShowCancelModal(false);
                  setSelectedGroup(null);
                }}
                disabled={isCancelling}
              >
                Close
              </button>
              <button
                className="px-4 py-2 rounded bg-red-500 text-white hover:bg-red-700"
                onClick={handleConfirmCancel}
                disabled={isCancelling}
              >
                {isCancelling ? "Cancelling..." : "Confirm Cancel"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyBookings;
