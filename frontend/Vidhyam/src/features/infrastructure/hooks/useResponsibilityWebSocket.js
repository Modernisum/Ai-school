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
    
    let url = import.meta.env.VITE_WS_BASE_URL;
    if (url) {
      if (url.includes("/system/ws")) {
        url = url.replace("/system/ws", "/operations/responsibility/ws");
      } else {
        url = `${url.replace(/\/+$/, "")}/school/${schoolId}/operations/responsibility/ws`;
      }
    } else {
      url = `${protocol}//${host}:8080/api/school/${schoolId}/operations/responsibility/ws`;
    }

    try {
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log("[Responsibility WS] Connected, sending authentication payload");
        const token = localStorage.getItem("accessToken") || localStorage.getItem("token");
        ws.send(JSON.stringify({
          token,
          school_id: schoolId,
          user_id: "unknown"
        }));
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log("[Responsibility WS] Received:", data);
          if (data.type?.startsWith("responsibility_")) {
            invalidateTags();
          } else if (data.type?.startsWith("space_") || data.type?.startsWith("category_")) {
            dispatch(baseApi.util.invalidateTags(['Spaces', 'Categories']));
          } else if (data.type?.startsWith("material_")) {
            dispatch(baseApi.util.invalidateTags(['Materials']));
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
  }, [schoolId, invalidateTags, dispatch]);

  useEffect(() => {
    connect();
    return () => {
      if (wsRef.current) wsRef.current.close();
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
    };
  }, [connect]);

  return { connected: wsRef.current?.readyState === WebSocket.OPEN };
}
