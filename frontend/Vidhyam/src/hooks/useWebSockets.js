import { useEffect, useState, useCallback } from "react";

const WS_BASE_URL = import.meta.env.VITE_WS_BASE_URL || `ws://${window.location.hostname}:8080/api/ws`;

export function useWebSockets(schoolId) {
  const [socket, setSocket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!schoolId) return;

    let ws = new WebSocket(WS_BASE_URL);

    ws.onopen = () => {
      console.log("WebSocket connected");
      // Authenticate
      const token = localStorage.getItem("token");
      ws.send(JSON.stringify({ token, school_id: schoolId }));
    };

    ws.onmessage = (event) => {
      if (event.data === "Authenticated successfully") {
        setConnected(true);
        return;
      }
      try {
        const data = JSON.parse(event.data);
        setMessages((prev) => [...prev, data]);
      } catch (e) {
        console.log("WS text message:", event.data);
        setMessages((prev) => [...prev, { type: "text", content: event.data }]);
      }
    };

    ws.onclose = () => {
      setConnected(false);
      console.log("WebSocket disconnected. Retrying in 5s...");
      setTimeout(() => setSocket(null), 5000); // Trigger reconnect
    };

    setSocket(ws);

    return () => {
      ws.close();
    };
  }, [schoolId]);

  return { connected, messages, clearMessages: () => setMessages([]) };
}
