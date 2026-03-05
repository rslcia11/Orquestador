import { useEffect, useRef, useCallback } from 'react';

type WSEvent = {
    type:
        | 'session_created' | 'session_active' | 'session_closed'
        | 'agent_checkin'   | 'browser_event'  | 'session_denied'
        | 'connected'       | 'agent_online'   | 'agent_offline'
        | 'agent_metrics'   | 'agent_log';
    [key: string]: any;
};

export function useAdminWS(onEvent: (e: WSEvent) => void, enabled = true) {
    const wsRef      = useRef<WebSocket | null>(null);
    const timerRef   = useRef<ReturnType<typeof setTimeout>  | null>(null);
    const pingRef    = useRef<ReturnType<typeof setInterval> | null>(null);

    // FIX: iniciar en false — el efecto lo activa, no el constructor.
    // El bug original: useRef(true) hacía que StrictMode (mount→unmount→mount)
    // encontrara mountedRef=false en el segundo mount y no reconectara.
    const mountedRef = useRef(false);

    // Versión más reciente del callback sin recrear el efecto WS
    const onEventRef = useRef(onEvent);
    useEffect(() => { onEventRef.current = onEvent; }, [onEvent]);

    // Limpia ping + timer + socket SIN disparar onclose (evita reconexión en unmount)
    const cleanup = useCallback(() => {
        if (pingRef.current)  { clearInterval(pingRef.current);  pingRef.current  = null; }
        if (timerRef.current) { clearTimeout(timerRef.current);  timerRef.current = null; }
        if (wsRef.current) {
            wsRef.current.onopen    = null;
            wsRef.current.onmessage = null;
            wsRef.current.onerror   = null;
            wsRef.current.onclose   = null; // ← evita reconexión al cerrar
            if (
                wsRef.current.readyState === WebSocket.OPEN ||
                wsRef.current.readyState === WebSocket.CONNECTING
            ) wsRef.current.close();
            wsRef.current = null;
        }
    }, []);

    const connect = useCallback(() => {
        if (!mountedRef.current) return;
        if (wsRef.current?.readyState === WebSocket.OPEN)       return;
        if (wsRef.current?.readyState === WebSocket.CONNECTING) return;

        const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
        const ws = new WebSocket(`${protocol}://${window.location.hostname}:8000/api/v1/admin/ws`);
        wsRef.current = ws;

        ws.onopen = () => {
            if (!mountedRef.current) { ws.close(); return; }
            console.log('[WS] Admin conectado');

            // FIX: ping en ref propio, no en (ws as any)._pingInterval
            // El bug original: si ws.onerror → ws.close() se disparaba onclose
            // pero el ping del socket anterior quedaba corriendo forever.
            if (pingRef.current) clearInterval(pingRef.current);
            pingRef.current = setInterval(() => {
                if (wsRef.current?.readyState === WebSocket.OPEN) {
                    wsRef.current.send(JSON.stringify({ type: 'ping' }));
                }
            }, 25_000);
        };

        ws.onmessage = (msg) => {
            try {
                const data = JSON.parse(msg.data);
                if (data.type !== 'pong') onEventRef.current(data);
            } catch {}
        };

        ws.onerror = () => {
            // No limpiar ping aquí — onclose siempre se dispara después
            ws.close();
        };

        ws.onclose = () => {
            if (!mountedRef.current) return;

            // FIX: limpiar ping en onclose, no solo en cleanup().
            // Antes el ping del socket cerrado quedaba vivo hasta el unmount.
            if (pingRef.current) { clearInterval(pingRef.current); pingRef.current = null; }

            console.log('[WS] Desconectado — reconectando en 4s...');
            if (timerRef.current) clearTimeout(timerRef.current);
            timerRef.current = setTimeout(() => {
                if (mountedRef.current) connect();
            }, 4_000);
        };
    }, []); // estable — todo por refs, sin deps directas

    useEffect(() => {
        if (!enabled) {
            cleanup();
            return;
        }

        mountedRef.current = true;
        connect();

        return () => {
            mountedRef.current = false;
            cleanup();
        };
    }, [enabled, connect, cleanup]);
}