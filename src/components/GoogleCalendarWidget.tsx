import React, { useState, useEffect } from "react";
import { 
  Calendar, 
  Clock, 
  Plus, 
  Trash2, 
  LogIn, 
  LogOut, 
  Loader2, 
  CheckCircle2, 
  CalendarRange, 
  ExternalLink,
  BookOpen,
  Info
} from "lucide-react";
import { initAuth, googleSignIn, logout } from "../lib/googleAuth";
import { User } from "firebase/auth";

interface GoogleCalendarWidgetProps {
  paperTitle?: string;
  paperUrl?: string;
  paperSlug?: string;
}

interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: {
    dateTime?: string;
    date?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
  };
  htmlLink?: string;
}

export const GoogleCalendarWidget: React.FC<GoogleCalendarWidgetProps> = ({
  paperTitle = "General Research Review",
  paperUrl = "https://arxiv.org",
  paperSlug = "general"
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [needsAuth, setNeedsAuth] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isLoadingEvents, setIsLoadingEvents] = useState(false);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  
  // Schedule Form State
  const [scheduleDate, setScheduleDate] = useState("");
  const [duration, setDuration] = useState("60"); // default 1 hour
  const [isScheduling, setIsScheduling] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Initialize Auth
  useEffect(() => {
    const unsubscribe = initAuth(
      (currentUser, accessToken) => {
        setUser(currentUser);
        setToken(accessToken);
        setNeedsAuth(false);
      },
      () => {
        setUser(null);
        setToken(null);
        setNeedsAuth(true);
      }
    );
    return () => unsubscribe();
  }, []);

  // Fetch events when token is available
  useEffect(() => {
    if (token) {
      fetchUpcomingEvents();
    }
  }, [token]);

  // Set default schedule date to tomorrow at 10:00 AM local time
  useEffect(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0);
    
    // Format to yyyy-MM-ddThh:mm for datetime-local input
    const year = tomorrow.getFullYear();
    const month = String(tomorrow.getMonth() + 1).padStart(2, "0");
    const day = String(tomorrow.getDate()).padStart(2, "0");
    const hours = String(tomorrow.getHours()).padStart(2, "0");
    const minutes = String(tomorrow.getMinutes()).padStart(2, "0");
    
    setScheduleDate(`${year}-${month}-${day}T${hours}:${minutes}`);
  }, [paperSlug]);

  const handleLogin = async () => {
    setIsLoggingIn(true);
    setErrorMessage(null);
    try {
      const result = await googleSignIn();
      if (result) {
        setUser(result.user);
        setToken(result.accessToken);
        setNeedsAuth(false);
      }
    } catch (err: any) {
      console.error("Google Sign-In failed:", err);
      setErrorMessage(err.message || "Sign-In failed. Please try again.");
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      setUser(null);
      setToken(null);
      setNeedsAuth(true);
      setEvents([]);
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  const fetchUpcomingEvents = async () => {
    if (!token) return;
    setIsLoadingEvents(true);
    setErrorMessage(null);
    try {
      const timeMin = new Date().toISOString();
      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${timeMin}&orderBy=startTime&singleEvents=true&maxResults=15`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      
      if (!response.ok) {
        if (response.status === 401) {
          // Token expired or invalid, prompt login again
          setNeedsAuth(true);
          setToken(null);
          return;
        }
        throw new Error("Failed to load events from Google Calendar");
      }

      const data = await response.json();
      
      // Filter events that match Meridian study sessions
      const meridianEvents = (data.items || []).filter((event: CalendarEvent) => {
        const isMeridianEvent = 
          event.summary.includes("📖 Read") || 
          event.summary.includes("Meridian") || 
          (event.description && event.description.includes("Meridian"));
        return isMeridianEvent;
      });

      setEvents(meridianEvents);
    } catch (err: any) {
      console.error("Error fetching events:", err);
      setErrorMessage(err.message || "Failed to load scheduled sessions.");
    } finally {
      setIsLoadingEvents(false);
    }
  };

  const handleScheduleEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !scheduleDate) return;
    
    setIsScheduling(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    try {
      const startDT = new Date(scheduleDate);
      const endDT = new Date(startDT.getTime() + parseInt(duration) * 60 * 1000);

      const eventBody = {
        summary: `📖 Read: ${paperTitle.slice(0, 50)}${paperTitle.length > 50 ? "..." : ""}`,
        description: `Study slot scheduled via Meridian Research Journal.\n\nPaper Topic: ${paperTitle}\nSource arXiv Link: ${paperUrl}\n\nHappy reading!`,
        start: {
          dateTime: startDT.toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
        },
        end: {
          dateTime: endDT.toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
        },
        reminders: {
          useDefault: false,
          overrides: [
            { method: "popup", minutes: 15 }
          ]
        }
      };

      const response = await fetch(
        "https://www.googleapis.com/calendar/v3/calendars/primary/events",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify(eventBody)
        }
      );

      if (!response.ok) {
        throw new Error("Failed to create calendar event");
      }

      setSuccessMessage("Study session added to Google Calendar!");
      fetchUpcomingEvents(); // Refresh list
    } catch (err: any) {
      console.error("Error creating event:", err);
      setErrorMessage(err.message || "Failed to schedule event.");
    } finally {
      setIsScheduling(false);
    }
  };

  const handleDeleteEvent = async (eventId: string, eventSummary: string) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete the scheduled session "${eventSummary}" from Google Calendar?`
    );
    if (!confirmed) return;

    setErrorMessage(null);
    try {
      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      if (!response.ok) {
        throw new Error("Failed to delete event from Google Calendar");
      }

      setSuccessMessage("Session deleted successfully!");
      setEvents(events.filter(e => e.id !== eventId));
    } catch (err: any) {
      console.error("Error deleting event:", err);
      setErrorMessage(err.message || "Failed to delete session.");
    }
  };

  const formatEventTime = (dateTimeStr?: string) => {
    if (!dateTimeStr) return "All Day";
    const date = new Date(dateTimeStr);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit"
    });
  };

  return (
    <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-xl shadow-gray-200/10 space-y-6">
      <div className="flex items-center justify-between border-b border-gray-100 pb-4">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-black" />
          <h3 className="font-serif font-bold italic text-md text-gray-900">Study Companion</h3>
        </div>
        
        {user && (
          <button
            onClick={handleLogout}
            title="Sign out from Google"
            className="p-1.5 hover:bg-neutral-100 rounded-full text-gray-400 hover:text-black transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        )}
      </div>

      {needsAuth ? (
        <div className="text-center py-4 space-y-4">
          <div className="w-12 h-12 bg-neutral-50 rounded-2xl flex items-center justify-center mx-auto border border-neutral-100">
            <CalendarRange className="w-6 h-6 text-neutral-400" />
          </div>
          <div className="space-y-1.5">
            <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider">Sync with Google Calendar</h4>
            <p className="text-[11px] text-gray-500 leading-relaxed max-w-xs mx-auto">
              Schedule reading sessions, set custom reminders, and keep track of your academic study progress directly in Google Calendar with permission.
            </p>
          </div>

          <button
            onClick={handleLogin}
            disabled={isLoggingIn}
            className="inline-flex items-center gap-2 bg-white hover:bg-neutral-50 text-gray-700 font-bold text-xs px-5 py-2.5 rounded-full border border-gray-300 shadow-sm transition-all duration-200 disabled:opacity-50 cursor-pointer active:scale-95"
          >
            {isLoggingIn ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-gray-500" />
                <span>Connecting...</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#EA4335"
                    d="M12.24 10.285V14.4h6.887c-.274 1.564-1.78 4.594-6.887 4.594-4.42 0-8.02-3.66-8.02-8.17s3.6-8.17 8.02-8.17c2.51 0 4.19 1.05 5.15 1.97l3.29-3.23C18.42 1.54 15.61 0 12.24 0 5.58 0 0 5.48 0 12.24s5.58 12.24 12.24 12.24c6.96 0 11.58-4.89 11.58-11.78 0-.79-.08-1.4-.19-1.97H12.24z"
                  />
                </svg>
                <span>Sign in with Google</span>
              </>
            )}
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* User profile header info */}
          <div className="flex items-center gap-2.5 bg-neutral-50/50 p-2.5 rounded-2xl border border-neutral-100">
            {user?.photoURL ? (
              <img
                src={user.photoURL}
                alt={user.displayName || "User"}
                referrerPolicy="no-referrer"
                className="w-7 h-7 rounded-full border border-neutral-200"
              />
            ) : (
              <div className="w-7 h-7 bg-black text-white rounded-full flex items-center justify-center font-bold text-xs">
                {user?.displayName?.[0] || "U"}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-bold text-gray-800 truncate">
                {user?.displayName || "Google Scholar"}
              </p>
              <p className="text-[10px] text-gray-400 truncate font-mono">
                {user?.email}
              </p>
            </div>
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
          </div>

          {/* Feedback Messages */}
          {successMessage && (
            <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-2xl text-emerald-700 text-xs flex items-start gap-2 animate-fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <span>{successMessage}</span>
            </div>
          )}

          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-xs flex items-start gap-2">
              <Info className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Schedule Event Form */}
          <form onSubmit={handleScheduleEvent} className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider font-mono">
                Study Date & Time
              </label>
              <div className="relative">
                <input
                  type="datetime-local"
                  required
                  value={scheduleDate}
                  onChange={(e) => setScheduleDate(e.target.value)}
                  className="w-full bg-neutral-50 hover:bg-neutral-100 focus:bg-white text-xs border border-gray-200 rounded-2xl px-3.5 py-2.5 outline-none transition-colors"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider font-mono">
                Session Duration
              </label>
              <select
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="w-full bg-neutral-50 hover:bg-neutral-100 focus:bg-white text-xs border border-gray-200 rounded-2xl px-3.5 py-2.5 outline-none transition-colors cursor-pointer appearance-none"
              >
                <option value="30">30 Minutes (Focus slot)</option>
                <option value="60">1 Hour (Deep dive)</option>
                <option value="90">1.5 Hours (Extensive study)</option>
                <option value="120">2 Hours (Seminar session)</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={isScheduling}
              className="w-full bg-black hover:bg-neutral-800 disabled:bg-neutral-400 text-white font-bold text-xs py-3 rounded-full transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
            >
              {isScheduling ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Scheduling session...</span>
                </>
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5" />
                  <span>Schedule Study Session</span>
                </>
              )}
            </button>
          </form>

          {/* Upcoming scheduled events list */}
          <div className="space-y-3 pt-2 border-t border-gray-100">
            <div className="flex items-center justify-between">
              <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider font-mono">
                My Reading Calendar ({events.length})
              </h4>
              <button
                type="button"
                onClick={fetchUpcomingEvents}
                disabled={isLoadingEvents}
                className="text-[10px] font-bold text-black hover:underline cursor-pointer disabled:opacity-50"
              >
                {isLoadingEvents ? "Refreshing..." : "Refresh"}
              </button>
            </div>

            {isLoadingEvents ? (
              <div className="flex items-center justify-center py-6 gap-2 text-xs text-gray-400">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Loading calendar events...</span>
              </div>
            ) : events.length > 0 ? (
              <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                {events.map((event) => (
                  <div 
                    key={event.id} 
                    className="p-3 bg-neutral-50 rounded-2xl border border-neutral-100 flex items-start justify-between gap-3 group/item hover:border-neutral-200 transition-colors"
                  >
                    <div className="min-w-0 space-y-1">
                      <p className="text-xs font-semibold text-gray-800 truncate leading-snug">
                        {event.summary.replace("📖 Read: ", "")}
                      </p>
                      <div className="flex items-center gap-2 text-[10px] text-gray-400 font-mono">
                        <Clock className="w-3 h-3 text-gray-400" />
                        <span>{formatEventTime(event.start.dateTime || event.start.date)}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-1 shrink-0">
                      {event.htmlLink && (
                        <a
                          href={event.htmlLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Open in Google Calendar"
                          className="p-1 text-gray-400 hover:text-black hover:bg-neutral-200/50 rounded transition-colors"
                        >
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                      <button
                        type="button"
                        onClick={() => handleDeleteEvent(event.id, event.summary)}
                        title="Remove study session"
                        className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded opacity-0 group-hover/item:opacity-100 transition-opacity"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 border border-dashed border-gray-200 rounded-2xl">
                <p className="text-[11px] text-gray-400">No study sessions scheduled yet.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
