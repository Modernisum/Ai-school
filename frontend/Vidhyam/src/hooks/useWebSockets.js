import { useEffect, useState, useCallback, useRef } from "react";

export const MESSAGE_TYPES = {
  NOTIFICATION: "notification",
  TRANSPORT_GPS: "transport.gps",
  COMPLAINT_NEW: "complaint.new",
  STUDENT_ENROLLED: "student.enrolled",
  ANNOUNCEMENT: "announcement",
  PONG: "pong",
  ERROR: "error",
  AUTHENTICATED: "authenticated",
};

export function useWebSockets(schoolId, options = {}) {
  const { vehicleId, onMessage } = options;
  const [connected, setConnected] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [lastMessage, setLastMessage] = useState(null);
  const [messages, setMessages] = useState([]);

  const socketRef = useRef(null);
  const lastPongRef = useRef(Date.now());
  const retryCountRef = useRef(0);
  const reconnectTimeoutRef = useRef(null);
  const heartbeatRef = useRef(null);
  const pongCheckRef = useRef(null);

  const clearTimers = useCallback(() => {
    if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
    if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    if (pongCheckRef.current) clearInterval(pongCheckRef.current);
    reconnectTimeoutRef.current = null;
    heartbeatRef.current = null;
    pongCheckRef.current = null;
  }, []);

  const connect = useCallback(() => {
    if (!schoolId) return;

    const wsBaseUrl =
      import.meta.env.VITE_WS_BASE_URL ||
      `ws://${window.location.hostname}:8080/api/school/${schoolId}/system/ws`;
    const ws = new WebSocket(wsBaseUrl);
    socketRef.current = ws;

    ws.onopen = () => {
      const token = localStorage.getItem("token");
      ws.send(
        JSON.stringify({
          token,
          school_id: schoolId,
          vehicle_id: vehicleId || null,
        })
      );
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);

        if (msg.type === MESSAGE_TYPES.AUTHENTICATED) {
          setConnected(true);
          retryCountRef.current = 0;
          setRetryCount(0);
          lastPongRef.current = Date.now();

          heartbeatRef.current = setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ type: "ping" }));
            }
          }, 30000);

          pongCheckRef.current = setInterval(() => {
            if (Date.now() - lastPongRef.current > 90000) {
              ws.close();
            }
          }, 10000);

          return;
        }

        if (msg.type === MESSAGE_TYPES.PONG) {
          lastPongRef.current = Date.now();
          return;
        }

        setLastMessage(msg);
        setMessages((prev) => [...prev, msg]);
        if (onMessage) onMessage(msg);
      } catch (e) {
        setMessages((prev) => [
          ...prev,
          { type: "text", content: event.data },
        ]);
      }
    };

    ws.onclose = () => {
      setConnected(false);
      clearTimers();
      const currentRetry = retryCountRef.current;
      const delay = Math.min(
        1000 * Math.pow(2, currentRetry) + Math.random() * 1000,
        30000
      );
      retryCountRef.current = currentRetry + 1;
      setRetryCount(currentRetry + 1);
      reconnectTimeoutRef.current = setTimeout(() => {
        connect();
      }, delay);
    };

    ws.onerror = () => {
      ws.close();
    };
  }, [schoolId, vehicleId, onMessage, clearTimers]);

  useEffect(() => {
    connect();
    return () => {
      clearTimers();
      if (socketRef.current) {
        socketRef.current.onclose = null;
        socketRef.current.close();
        socketRef.current = null;
      }
    };
  }, [connect, clearTimers]);

  const send = useCallback((data) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(typeof data === "string" ? data : JSON.stringify(data));
    }
  }, []);

  return {
    connected,
    retryCount,
    lastMessage,
    messages,
    send,
    clearMessages: () => setMessages([]),
  };
}
