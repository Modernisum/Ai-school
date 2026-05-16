import { useEffect, useRef, useCallback } from "react";
import { useDispatch } from "react-redux";
import { baseApi } from "../../../app/api/baseApi";

export default function useResponsibilityWebSocket(schoolId) {
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const dispatch = useDispatch();

  const invalidateTags = useCallback(() => {
    dispatch(baseApi.util.invalidateTags([
      'Responsibilities',
      'ResponsibilityDetails',
      'ResponsibilityHistory',
      'ResponsibilityVersions',
      'ResponsibilityAnalytics',
      'EmployeeResponsibilities',
    ]));
  }, [dispatch]);

  const connect = useCallback(() => {
    if (!schoolId) return;
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.hostname || "localhost";
    const port = window.location.port || "8080";
    const url = `${protocol}//${host}:${port}/ws/${schoolId}`;

    try {
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => console.log("[Responsibility WS] Connected");

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type?.startsWith("responsibility_")) {
            console.log("[Responsibility WS] Event:", data.type);
            invalidateTags();
          }
        } catch (e) {
          // ignore malformed messages
        }
      };

      ws.onclose = () => {
        const delay = Math.min(1000 * Math.pow(2, reconnectTimeoutRef.current || 0), 30000);
        reconnectTimeoutRef.current = (reconnectTimeoutRef.current || 0) + 1;
        setTimeout(connect, delay);
      };

      ws.onerror = () => {
        ws.close();
      };
    } catch (e) {
      console.warn("[Responsibility WS] Connection failed:", e);
    }
  }, [schoolId, invalidateTags]);

  useEffect(() => {
    connect();
    return () => {
      if (wsRef.current) wsRef.current.close();
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
    };
  }, [connect]);

  return { connected: wsRef.current?.readyState === WebSocket.OPEN };
}
