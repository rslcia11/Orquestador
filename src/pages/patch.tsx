// ─────────────────────────────────────────────────────────────────────────────
// PATCH para OrchestratorTerminal.tsx — aplicar los cambios marcados con FIX:
// ─────────────────────────────────────────────────────────────────────────────

// ══════════════════════════════════════════════════════════════════════════════
// FIX 1: fetchData — usar connected_since_ts (number) en vez del string ISO
// Antes: connectedAtRef.current.set(cid, new Date(node.connected_since).getTime())
//        → podía parsear como local si el string no tenía Z
// Después: el servicio ya devuelve connected_since_ts normalizado a UTC ms
// ══════════════════════════════════════════════════════════════════════════════

// REEMPLAZA el bloque setNodes dentro de fetchData:


// ══════════════════════════════════════════════════════════════════════════════
// FIX 2: handleWSEvent — desacoplar el guard ram===0 de los logs
//
// BUG ORIGINAL: el guard "if (!cid || ram === 0) return" bloqueaba TODO,
// incluyendo el update de nodeHistory y nodeLogs. Entonces si llegaba
// un evento con ram=0 (AdsPower health-check sin datos del SO), los logs
// no se actualizaban aunque el drawer estuviera abierto.
//
// FIX: separar en dos bloques:
//   1. Si ram > 0 → actualizar nodo + charts
//   2. Siempre (si el drawer está abierto) → actualizar logs
// ══════════════════════════════════════════════════════════════════════════════

// REEMPLAZA el bloque completo "if (event.type === 'agent_metrics')" en handleWSEvent:
if (event.type === 'agent_metrics') {
    const cid      = event.computer_id?.toString();
    const cpu      = event.data?.system?.cpu_percent    ?? 0;
    const ram      = event.data?.system?.memory_percent ?? 0;
    const disk     = event.data?.system?.disk_percent   ?? 0;
    const browsers = event.data?.active_browsers_count;

    if (!cid) return;

    // Solo actualizar nodo y charts si hay datos reales del SO (ram > 0)
    if (ram > 0) {
        setNodes(prev => prev.map(n => {
            if (n.id.toString() !== cid) return n;
            const connectedAt = connectedAtRef.current.get(cid);
            return {
                ...n,
                cpu:          Math.round(cpu),
                ram:          Math.round(ram),
                openBrowsers: browsers ?? n.openBrowsers,
                uptime:       connectedAt ? formatUptime(Date.now() - connectedAt) : n.uptime,
            };
        }));

        if (selectedNodeRef.current?.id.toString() === cid) {
            setNodeHistory(prev => [
                ...prev.slice(-29),
                { time: new Date().toLocaleTimeString(), cpu: Math.round(cpu), ram: Math.round(ram) },
            ]);
        }
    }

    // FIX: actualizar logs SIEMPRE (independiente del guard ram===0)
    // Los logs muestran cualquier evento del agente, no solo métricas del SO
    if (selectedNodeRef.current?.id.toString() === cid) {
        setNodeLogs(prev => [...prev, {
            timestamp: new Date().toISOString(),
            level:     'INFO',
            message:   `cpu=${cpu.toFixed(1)}% mem=${ram.toFixed(1)}% disk=${disk.toFixed(1)}%`,
        }].slice(-100));
    }
}


// ══════════════════════════════════════════════════════════════════════════════
// FIX 3: CRASH CON DOS TABS
//
// Causa: con 2 tabs abiertas hay 2 conexiones admin WS al backend.
// El backend hace broadcast_to_admins → ambas tabs reciben CADA evento.
// Cada tab llama debouncedFetch → 2 fetchData simultáneos → React en ambas tabs
// intenta reconciliar al mismo tiempo → freeze.
//
// FIX: en useAdminWS añadir un ID de tab único y que el backend
// incluya ese ID en los broadcasts — O más simple: aumentar el debounce
// a 3s y añadir una bandera de "fetch en progreso".
// ══════════════════════════════════════════════════════════════════════════════

// En el componente, REEMPLAZA la declaración de debouncedFetch y fetchData:

// Añadir ref para prevenir fetches concurrentes
const fetchingRef = useRef(false);

const fetchData = useCallback(async () => {
    // FIX: si ya hay un fetch en progreso, no lanzar otro
    // Esto previene el crash cuando 2 tabs abiertas reciben el mismo evento WS
    // y ambas intentan fetchData simultáneamente
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    setRefreshing(true);
    try {
        const [s, n, p, a, e, svc, c, b] = await Promise.all([
            orchestratorService.getDashboardStats(),
            orchestratorService.getNodes(),
            orchestratorService.getProfiles(),
            orchestratorService.getAlerts(),
            orchestratorService.getSystemEvents(),
            orchestratorService.getServicesStatus(),
            orchestratorService.getConnections(),
            orchestratorService.getBackups(),
        ]);
        setStats(s);
        setProfiles(p);
        setAlerts(a);
        setEvents(e);
        setServices(svc);
        setConnections(c);
        setBackupStatus(b);

        setNodes((n as any[]).map(node => {
            const cid = node.id.toString();
            if (node.connected_since_ts && !connectedAtRef.current.has(cid)) {
                connectedAtRef.current.set(cid, node.connected_since_ts);
            }
            const connectedAt = connectedAtRef.current.get(cid);
            return {
                ...node,
                uptime: connectedAt ? formatUptime(Date.now() - connectedAt) : node.uptime,
            } as ComputerNode;
        }));

    } catch (err) {
        console.error('[OrchestratorTerminal] fetchData failed:', err);
    } finally {
        fetchingRef.current = false;
        setRefreshing(false);
        setLoading(false);
    }
}, []);

// Debounce de 3s (era 2s) — da más margen cuando hay múltiples tabs
const debouncedFetch = useCallback(() => {
    if (fetchDebounceRef.current) clearTimeout(fetchDebounceRef.current);
    fetchDebounceRef.current = setTimeout(fetchData, 3_000);
}, [fetchData]);