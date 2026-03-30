// src/pages/OrchestratorTerminal.tsx
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
    LayoutDashboard, Server, Users, Bell, Search,
    CheckCircle2, AlertTriangle, Monitor, History,
    Terminal as TerminalIcon, Plus, ExternalLink, RefreshCw,
    Globe, Shield, X, Wifi, WifiOff, Activity
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { orchestratorService } from '@/services/orchestrator.service';
import { useAdminWS } from '@/hooks/useAdminWS';
import { useOrchestratorData } from '@/hooks/useOrchestratorData';
import { useNodeDrawer } from '@/hooks/useNodeDrawer';
import { useDashboardModals } from '@/hooks/useDashboardModals';
import {
    ComputerNode, ProfileItem, Alert,
    SystemEvent, ServiceStatus, ConnectionItem,
} from '@/types/orchestratorTypes';
import {
    AdminKPICard, ComputerRow, AlertItem, SkeletonKPI,
    SkeletonRow, HealthOverview, SystemEventsFeed, ServiceStatusBar,
    ConnectionRow, ProfileRow, GlobalStatusHero, MiniCapacityPanel,
    JobsQueueWidget, FilterButton,
} from '@/components/OrchestratorComponents';
import {
    NodeItemDrawer, AlertModal, SessionHistoryModal,
    DashKPIModal,
    SecurityCheckModal, SessionStartModal, CreateProfileModal, EventDetailModal,
    SystemDiagnosticModal, JobQueueModal,
    ProxyHistoryModal,
    ComputerStatusModal,   // ← importar el nuevo modal
} from '@/components/OrchestratorDrawers';

// ─── HELPERS ─────────────────────────────────────────────────────────────────

const CLEAN_ERROR_MAP: [string, string][] = [
    ['Proxy inválido', 'Proxy inválido o caído — ejecuta rotación de proxies'],
    ['Check Proxy', 'Proxy inválido o caído — ejecuta rotación de proxies'],
    ['PROXY_INVALID', 'Proxy inválido o caído — ejecuta rotación de proxies'],
    ['Proxy caído', 'Proxy caído'],
    ['AdsPower no disponible', 'AdsPower no disponible — verifica que la app esté abierta'],
    ['ADSPOWER_OFFLINE', 'AdsPower no disponible — verifica que la app esté abierta'],
    ['Timeout', 'Timeout al abrir navegador — AdsPower tardó demasiado'],
    ['not exist', 'Perfil no encontrado en AdsPower — puede haber sido eliminado'],
];

function cleanAgentError(raw: string): string {
    const cleaned = raw.replace(/^\[.*?\]\s*(✕\s*)?/, '').trim();
    for (const [keyword, friendly] of CLEAN_ERROR_MAP) {
        if (cleaned.toLowerCase().includes(keyword.toLowerCase())) return friendly;
    }
    return cleaned;
}

function computeVerdict(score: number, risks: string[], services: ServiceStatus[]): string {
    const criticalDown = services.filter(
        s => s.status === 'DEGRADED' && ['Database', 'Redis', 'Agents'].includes(s.name)
    ).map(s => s.name);
    const proxiesDegraded = services.find(s => s.name === 'Proxies')?.status === 'DEGRADED';
    const soaxDegraded = services.find(s => s.name === 'SOAX')?.status === 'DEGRADED';

    if (score >= 85) return '"Sistema operando nominalmente. Todos los servicios en línea."';
    if (score >= 70) {
        if (risks.length === 0) return '"Operación estable. Sin riesgos detectados."';
        return `"Operación estable con aviso: ${risks[0].toLowerCase()}"`;
    }
    if (score >= 50) {
        if (proxiesDegraded && !soaxDegraded) return '"Proxies con latencia alta — considera rotar. Resto del sistema OK."';
        if (soaxDegraded) return '"SOAX sin respuesta — verifica la API key y conectividad."';
        if (criticalDown.length > 0) return `"Servicio(s) con problemas: ${criticalDown.join(', ')}. Revisar conexiones."`;
        return '"Degradación menor detectada — sistema funcional con advertencias."';
    }
    if (criticalDown.length >= 2) return '"Estado crítico — múltiples servicios caídos. Intervención requerida."';
    return '"Rendimiento bajo — revisa nodos offline y alertas activas."';
}

type TabType = 'DASHBOARD' | 'NODES' | 'PROFILES' | 'ALERTS' | 'CONNECTIONS' | 'SETTINGS';

function getInitialTab(searchParams: URLSearchParams): TabType {
    const t = searchParams.get('tab');
    return (t === 'NODES' || t === 'PROFILES' || t === 'ALERTS' || t === 'CONNECTIONS' || t === 'SETTINGS')
        ? t : 'DASHBOARD';
}

// ─── SIDEBAR ─────────────────────────────────────────────────────────────────

const SidebarItem = ({ label, active, onClick, icon }: any) => (
    <button
        onClick={onClick}
        className={`w-full aspect-square rounded-2xl flex flex-col gap-1 items-center justify-center transition-all relative
            ${active ? 'bg-[#00ff88]/10 text-[#00ff88]' : 'text-[#444] hover:text-white hover:bg-white/5'}`}
    >
        {active && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-[#00ff88] rounded-r-full" />}
        {icon}
        <span className="text-[9px] font-black uppercase tracking-wider">{label}</span>
    </button>
);

// ─── MAIN ─────────────────────────────────────────────────────────────────────

const OrchestratorTerminal: React.FC = () => {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();

    // ── NUEVO: estado AdsPower por computadora ────────────────────────────────
    const [adspowerStatusByComputer, setAdspowerStatusByComputer] = useState<
        Record<string, boolean | null>
    >({});
    const [showComputerStatus, setShowComputerStatus] = useState(false);

    // ─── HOOKS ───────────────────────────────────────────────────────────────
    const {
        stats, nodes, profiles, alerts, events, services, connections,
        loading, refreshing, fetchData, debouncedFetch,
        setStats, setAlerts, setEvents, setProfiles,
        updateNodeLive, markNodeOnline, markNodeOffline,
    } = useOrchestratorData();

    const {
        selectedNode, nodeHistory, nodeLogs,
        openDrawer: handleNodeClick, closeDrawer, appendMetric, appendLog,
    } = useNodeDrawer();

    const {
        dashModal, setDashModal,
        showHealthDetail, setShowHealthDetail,
        showSystemDiag, setShowSystemDiag,
        showResourceDetail, setShowResourceDetail,
        showJobQueue, setShowJobQueue,
        selectedService, setSelectedService,
        selectedEvent, setSelectedEvent,
        securityProfile, setSecurityProfile,
        selectedConn, setSelectedConn,
        showSessionModal, setShowSessionModal,
        showCreateProfile, setShowCreateProfile,
        selectedProfileHistoryId, setSelectedProfileHistoryId,
        profileHistoryData, setProfileHistoryData,
        selectedAlert, setSelectedAlert,
    } = useDashboardModals();

    // ─── UI STATE ─────────────────────────────────────────────────────────────
    const [autoRefresh, setAutoRefresh] = useState(true);
    const [activeTab, setActiveTab] = useState<TabType>(() => getInitialTab(searchParams));
    const [searchText, setSearchText] = useState(searchParams.get('q') || '');
    const [filters, setFilters] = useState({
        status: searchParams.get('status') || 'ALL',
        minLatency: Number(searchParams.get('minLat')) || 0,
        minMem: Number(searchParams.get('minMem')) || 0,
    });
    const [dashFilters] = useState({ timeRange: '1h', severity: 'ALL', owner: 'ALL', cookieStatus: 'ALL' });
    const [rotationInProgress, setRotationInProgress] = useState(false);
    const [selectedComputerId, setSelectedComputerId] = useState<string | null>(null);
    const [taskQueue, setTaskQueue] = useState({ failed: 0, processing: 0, queue: 0 });
    const [proxyTasks, setProxyTasks] = useState<{
        id: number; profileName: string;
        status: 'failed' | 'processing' | 'resolved';
        message: string; timestamp: string;
    }[]>([]);
    const [adspowerStatus, setAdspowerStatus] = useState<'online' | 'offline' | 'error' | null>(null);
    const [verifyInProgress, setVerifyInProgress] = useState(false);
    const [activeAction, setActiveAction] = useState<string | null>(null);

    const alertsEndRef = useRef<HTMLDivElement>(null);
    const rotationLogRef = useRef<string[]>([]);
    const autoRefreshRef = useRef(autoRefresh);
    useEffect(() => { autoRefreshRef.current = autoRefresh; }, [autoRefresh]);

    // ─── MODALES CON FETCH ────────────────────────────────────────────────────
    const [eventPages, setEventPages] = useState<any[]>([]);
    const [eventPagesLoading, setEventPagesLoading] = useState(false);
    const [proxyLogs, setProxyLogs] = useState<any[]>([]);
    const [proxyLogsLoading, setProxyLogsLoading] = useState(false);

    // ─── AUTO-DETECTAR COMPUTADORA LOCAL ─────────────────────────────────────
    useEffect(() => {
        orchestratorService.getLocalAgent()
            .then(data => { if (data?.computer_id) setSelectedComputerId(data.computer_id.toString()); })
            .catch(() => { });
    }, []);

    // ─── DERIVED ─────────────────────────────────────────────────────────────
    const liveSelectedNode = useMemo(
        () => nodes.find(n => n.id === selectedNode?.id) ?? selectedNode,
        [nodes, selectedNode]
    );
    const liveSelectedEvent = useMemo(
        () => selectedEvent ? events.find(e => e.id === selectedEvent.id) ?? selectedEvent : null,
        [events, selectedEvent]
    );
    const visibleContent = useMemo(() => {
        const q = searchText.toLowerCase();
        if (activeTab === 'NODES') return nodes.filter(n => n.name.toLowerCase().includes(q));
        if (activeTab === 'PROFILES') return profiles.filter(p => {
            const nm = p.name.toLowerCase().includes(q) || (p.owner ?? '').toLowerCase().includes(q);
            const om = dashFilters.owner === 'ALL' || p.owner === dashFilters.owner;
            const cm = dashFilters.cookieStatus === 'ALL' || p.cookieStatus === dashFilters.cookieStatus;
            return nm && om && cm;
        });
        if (activeTab === 'ALERTS') return alerts.filter(a => a.message.toLowerCase().includes(q));
        if (activeTab === 'CONNECTIONS') return connections.filter(c => c.url.toLowerCase().includes(q));
        return [];
    }, [activeTab, nodes, profiles, alerts, connections, searchText, dashFilters]);

    // ─── EFFECTS ─────────────────────────────────────────────────────────────
    useEffect(() => { fetchData(); }, [fetchData]);

    useEffect(() => {
        setSearchParams(prev => { prev.set('tab', activeTab); return prev; });
    }, [activeTab]);

    useEffect(() => {
        if (activeTab === 'ALERTS' && alertsEndRef.current)
            alertsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }, [activeTab, alerts]);

    useEffect(() => {
        const t = setTimeout(() => {
            setSearchParams(prev => {
                searchText ? prev.set('q', searchText) : prev.delete('q');
                filters.status !== 'ALL' ? prev.set('status', filters.status) : prev.delete('status');
                filters.minLatency > 0 ? prev.set('minLat', String(filters.minLatency)) : prev.delete('minLat');
                filters.minMem > 0 ? prev.set('minMem', String(filters.minMem)) : prev.delete('minMem');
                return prev;
            });
        }, 500);
        return () => clearTimeout(t);
    }, [searchText, filters]);

    // ─── HELPER: validar agente + AdsPower antes de actuar ───────────────────
    const checkAgentAndAdspower = useCallback((computerId: string | null): {
        ok: boolean; reason?: string
    } => {
        if (!computerId) return {
            ok: false,
            reason: '❌ No hay agente detectado en esta computadora. Abre la app del agente primero.',
        };
        const node = nodes.find(n => n.id === computerId);
        if (!node || node.status !== 'ONLINE') return {
            ok: false,
            reason: `❌ Agente offline en ${node?.name ?? `Computer #${computerId}`}. Inicia el agente primero.`,
        };
        const adspowerOk = adspowerStatusByComputer[computerId];
        if (adspowerOk === false) return {
            ok: false,
            reason: `⚠️ Agente conectado pero AdsPower no está abierto en ${node.name}. Ábrelo antes de continuar.`,
        };
        // adspowerOk === null/undefined → desconocido, dejar pasar (el agente lo reportará si falla)
        return { ok: true };
    }, [nodes, adspowerStatusByComputer]);

    const handleOpenComputerStatus = useCallback(async () => {
        setShowComputerStatus(true);  // ← lo que debería hacer
        // Forzar consulta inmediata de AdsPower en todos los agentes
        try {
            await fetch('/api/v1/agent/broadcast-check-adspower', { method: 'POST' });
        } catch {
            // Silencioso — el modal igual mostrará el estado cacheado
        }
    }, []);

    // Helper para registrar bloqueo en timeline
    const reportBlocked = useCallback((reason: string) => {
        setEvents(prev => [{
            id: `ws-blocked-${Date.now()}`,
            type: 'WARNING' as const,
            message: reason,
            source: 'admin-panel',
            timestamp: new Date().toISOString(),
            meta: {},
        }, ...prev.slice(0, 18)]);
    }, [setEvents]);

    // ─── WS CALLBACK ─────────────────────────────────────────────────────────
    const handleWSEvent = useCallback((event: any) => {
        if (!['agent_metrics', 'pong'].includes(event.type)) {
            console.log('[WS]', event.type, JSON.stringify(event).slice(0, 300));
        }

        // ── Métricas ─────────────────────────────────────────────────────────
        if (event.type === 'agent_metrics') {
            const cid = event.computer_id?.toString();
            const cpu = event.data?.system?.cpu_percent ?? 0;
            const ram = event.data?.system?.ram_percent ?? event.data?.system?.memory_percent ?? 0;
            const browsers = event.data?.active_browsers_count;
            if (!cid || (cpu === 0 && ram === 0)) return;
            updateNodeLive(cid, cpu, ram, browsers);
            appendMetric(cid, cpu, ram);
            return;
        }

        // ── NUEVO: estado de AdsPower por computadora ─────────────────────────
        if (event.type === 'adspower_status') {
            const cid = event.computer_id?.toString();
            const available = event.status === 'available' || event.status === 'online';
            if (cid) {
                setAdspowerStatusByComputer(prev => ({ ...prev, [cid]: available }));
            }
            // Mantener compatibilidad con estado global anterior
            if (available && adspowerStatus !== 'online') {
                setAdspowerStatus('online');
                setEvents(prev => [{
                    id: `ws-adspower-on-${Date.now()}`,
                    type: 'SUCCESS' as const,
                    message: '🟢 AdsPower operativo nuevamente',
                    source: `Computer #${event.computer_id}`,
                    timestamp: new Date().toISOString(),
                    meta: {},
                }, ...prev.slice(0, 18)]);
                fetchData();
            } else if (!available && adspowerStatus !== 'offline') {
                setAdspowerStatus('offline');
                setEvents(prev => [{
                    id: `ws-adspower-off-${Date.now()}`,
                    type: 'ERROR' as const,
                    message: '🔴 AdsPower no disponible — abre la aplicación en el agente',
                    source: `Computer #${event.computer_id}`,
                    timestamp: new Date().toISOString(),
                    meta: {},
                }, ...prev.slice(0, 18)]);
                fetchData();
            }
            return;
        }

        // ── NUEVO: acción bloqueada por AdsPower no disponible ────────────────
        if (event.type === 'adspower_unavailable_for_action') {
            const actionLabel: Record<string, string> = {
                create_profile: 'crear perfil',
                open_browser: 'abrir sesión',
                verify_profile: 'verificar perfil',
            };
            const label = actionLabel[event.action] ?? event.action;
            const name = event.name ? ` "${event.name}"` : '';
            setEvents(prev => [{
                id: `ws-adspower-block-${Date.now()}`,
                type: 'WARNING' as const,
                message: `⚠️ Acción bloqueada: ${label}${name} — AdsPower no está abierto en el agente`,
                source: `Computer #${event.computer_id ?? '?'}`,
                timestamp: new Date().toISOString(),
                meta: {},
            }, ...prev.slice(0, 18)]);
            return;
        }

        // ── NUEVO: agente conectado pero AdsPower no listo → cola en pausa ────
        if (event.type === 'adspower_not_ready_on_connect') {
            setEvents(prev => [{
                id: `ws-queue-paused-${Date.now()}`,
                type: 'INFO' as const,
                message: `⏸️ Cola en pausa — Computer #${event.computer_id} conectado. Abre AdsPower para procesar perfiles pendientes`,
                source: 'Sistema',
                timestamp: new Date().toISOString(),
                meta: {},
            }, ...prev.slice(0, 18)]);
            return;
        }

        // ── Logs del agente ───────────────────────────────────────────────────
        if (event.type === 'agent_log') {
            appendLog(event.computer_id?.toString(), event.log);

            const msg = event.log?.message ?? '';
            const rawMsg = msg;
            const cleanMsg = cleanAgentError(rawMsg).toLowerCase();

            const isOffline = cleanMsg.includes('adspower no está disponible') ||
                cleanMsg.includes('adspower_offline') ||
                cleanMsg.includes('dejó de responder');
            const isOnline = cleanMsg.includes('adspower disponible nuevamente');

            if (isOffline && adspowerStatus !== 'offline') {
                setAdspowerStatus('offline');
                const cid = event.computer_id?.toString();
                if (cid) setAdspowerStatusByComputer(prev => ({ ...prev, [cid]: false }));
                setEvents(prev => [{
                    id: `ws-adspower-off-${Date.now()}`,
                    type: 'ERROR',
                    message: '🔴 AdsPower no disponible — abre la aplicación en el agente',
                    source: `Computer #${event.computer_id}`,
                    timestamp: new Date().toISOString(),
                    meta: { raw: rawMsg },
                }, ...prev.slice(0, 18)]);
                fetchData();
                return;
            }

            if (isOnline && adspowerStatus !== 'online') {
                setAdspowerStatus('online');
                const cid = event.computer_id?.toString();
                if (cid) setAdspowerStatusByComputer(prev => ({ ...prev, [cid]: true }));
                setEvents(prev => [{
                    id: `ws-adspower-on-${Date.now()}`,
                    type: 'SUCCESS',
                    message: '🟢 AdsPower operativo nuevamente',
                    source: `Computer #${event.computer_id}`,
                    timestamp: new Date().toISOString(),
                    meta: { raw: rawMsg },
                }, ...prev.slice(0, 18)]);
                fetchData();
                return;
            }

            if (event.log?.level === 'ERROR' || event.log?.level === 'WARNING') {
                const friendlyMsg =
                    cleanMsg.includes('proxy inválido') || cleanMsg.includes('proxy_invalid') || cleanMsg.includes('check proxy')
                        ? '🔴 Proxy inválido o caído — ejecuta rotación de proxies'
                        : cleanMsg.includes('timeout') || cleanMsg.includes('time out')
                            ? '🟡 Timeout abriendo navegador — AdsPower tardó demasiado'
                            : cleanMsg.includes('profile does not exist') || cleanMsg.includes('profile_not_found')
                                ? '🔴 Perfil no encontrado en AdsPower — puede haber sido eliminado'
                                : cleanAgentError(msg);

                setEvents(prev => [{
                    id: `ws-log-${Date.now()}`,
                    type: event.log?.level === 'ERROR' ? 'ERROR' : 'INFO',
                    message: friendlyMsg,
                    source: `Computer #${event.computer_id}`,
                    timestamp: new Date().toISOString(),
                    meta: { raw: rawMsg },
                }, ...prev.slice(0, 18)]);

                if (event.log?.level === 'ERROR') {
                    setAlerts(prev => [{
                        id: Date.now(), type: 'ERROR', message: friendlyMsg,
                        source: `agent-${event.computer_id}`, read: false,
                        timestamp: new Date().toISOString(),
                    }, ...prev]);
                    setStats(prev => prev ? { ...prev, alertsActive: (prev.alertsActive ?? 0) + 1 } : prev);
                }
            }
            return;
        }

        // ── Eventos de perfil ─────────────────────────────────────────────────
        if (event.type === 'profile_created') {
            const name = event.name ?? `Perfil #${event.profile_id}`;
            setEvents(prev => [{
                id: `ws-profile-${Date.now()}`,
                type: event.adspower_id ? 'SUCCESS' as const : 'ERROR' as const,
                message: event.adspower_id
                    ? `✅ Perfil creado en AdsPower — ${name}`
                    : `Iniciando creación de perfil — ${name}`,
                source: `agent-${event.computer_id ?? 1}`,
                timestamp: new Date().toISOString(),
                meta: {},
            }, ...prev.slice(0, 18)]);
            if (autoRefreshRef.current) fetchData();
            return;
        }

        if (event.type === 'profile_ready') {
            if (event.profile_id && event.adspower_id) {
                setProfiles(prev => prev.map(p =>
                    p.id === event.profile_id.toString() ? { ...p, adsId: event.adspower_id } : p
                ));
            }
            setEvents(prev => [{
                id: `ws-profile-ready-${Date.now()}`,
                type: 'SUCCESS' as const,
                message: `✅ Perfil listo — ${event.name}`,
                source: `agent-${event.computer_id ?? 1}`,
                timestamp: new Date().toISOString(),
                meta: {},
            }, ...prev.slice(0, 18)]);
            if (autoRefreshRef.current) fetchData();
            return;
        }

        if (event.type === 'profile_deleted') {
            const name = event.name ?? `Perfil #${event.profile_id}`;
            setProfiles(prev => prev.filter(p => p.id !== event.profile_id?.toString()));
            setEvents(prev => [{
                id: `ws-profile-del-${Date.now()}`,
                type: 'INFO' as const,
                message: `🗑️ Perfil eliminado — ${name}`,
                source: `agent-${event.computer_id ?? 1}`,
                timestamp: new Date().toISOString(),
                meta: {},
            }, ...prev.slice(0, 18)]);
            if (autoRefreshRef.current) fetchData();
            return;
        }

        if (event.type === 'profile_delete_queued') {
            setEvents(prev => [{
                id: `ws-del-queued-${Date.now()}`,
                type: 'INFO' as const,
                message: `⏸️ Eliminación de AdsPower encolada — se procesará cuando AdsPower esté disponible`,
                source: 'admin-panel',
                timestamp: new Date().toISOString(),
                meta: {},
            }, ...prev.slice(0, 18)]);
            return;
        }

        if (event.type === 'profile_delete_result' && event.status === 'deleted') {
            const name = event.name ?? `Perfil #${event.profile_id}`;
            // Confirmar que la eliminación pendiente se completó
            setEvents(prev => [{
                id: `ws-del-done-${Date.now()}`,
                type: 'SUCCESS' as const,
                message: `✅ Perfil eliminado de AdsPower correctamente`,
                source: 'admin-panel',
                timestamp: new Date().toISOString(),
                meta: {},
            }, ...prev.slice(0, 18)]);
            return;
        }

        // ── Eventos de agente ─────────────────────────────────────────────────
        if (event.type === 'agent_online' || event.type === 'agent_checkin') {
            const cid = event.computer_id?.toString();
            const name = event.name ?? `Computer #${cid}`;
            if (cid) {
                markNodeOnline(cid, event.connected_since);
                if (!selectedComputerId) {
                    orchestratorService.getLocalAgent()
                        .then(data => { if (data?.computer_id) setSelectedComputerId(data.computer_id.toString()); })
                        .catch(() => { });
                }
                setEvents(prev => [{
                    id: `ws-online-${Date.now()}`,
                    type: 'SUCCESS' as const,
                    message: `✅ Agente conectado — ${name}`,
                    source: 'agent',
                    timestamp: new Date().toISOString(),
                    meta: {},
                }, ...prev.slice(0, 18)]);
                fetchData();
            }
            return;
        }

        if (event.type === 'agent_offline') {
            const cid = event.computer_id?.toString();
            const name = event.name ?? `Computer #${cid}`;
            if (cid) {
                markNodeOffline(cid);
                // Limpiar estado de AdsPower para esta computadora
                setAdspowerStatusByComputer(prev => { const n = { ...prev }; delete n[cid]; return n; });
                setAlerts(prev => [{
                    id: Date.now(), type: 'ERROR' as const,
                    message: `Agente desconectado: ${name}`,
                    source: 'agent', read: false, timestamp: new Date().toISOString(),
                }, ...prev]);
                setEvents(prev => [{
                    id: `ws-offline-${Date.now()}`,
                    type: 'ERROR' as const,
                    message: `❌ Agente offline — ${name}`,
                    source: 'agent',
                    timestamp: new Date().toISOString(),
                    meta: {},
                }, ...prev.slice(0, 18)]);
                fetchData();
            }
            return;
        }

        // ── Sesiones ──────────────────────────────────────────────────────────
        if (event.type === 'session_created') {
            setEvents(prev => [{
                id: `ws-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                type: 'INFO' as const,
                message: event.message ?? `Sesión creada — ${event.profile}`,
                source: event.agent_name ?? 'Agent',
                timestamp: new Date().toISOString(),
                meta: { session_id: event.session_id },
            }, ...prev.slice(0, 18)]);
            setStats(prev => ({
                nodesOnline: prev?.nodesOnline ?? 1, nodesTotal: prev?.nodesTotal ?? 1,
                profilesActive: (prev?.profilesActive ?? 0) + 1, browsersOpen: (prev?.browsersOpen ?? 0) + 1,
                alertsActive: prev?.alertsActive ?? 0, healthScore: prev?.healthScore ?? 100, healthRisks: prev?.healthRisks ?? [],
            }));
            if (autoRefreshRef.current) setTimeout(() => fetchData(), 3000);
            return;
        }

        if (event.type === 'session_active') {
            setEvents(prev => [{
                id: `ws-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                type: 'SUCCESS' as const,
                message: event.message ?? `Sesión activa — ${event.profile}`,
                source: event.agent_name ?? 'Agent',
                timestamp: new Date().toISOString(),
                meta: { session_id: event.session_id },
            }, ...prev.slice(0, 18)]);
            setStats(prev => ({
                nodesOnline: prev?.nodesOnline ?? 1, nodesTotal: prev?.nodesTotal ?? 1,
                profilesActive: (prev?.profilesActive ?? 0) + 1, browsersOpen: (prev?.browsersOpen ?? 0) + 1,
                alertsActive: prev?.alertsActive ?? 0, healthScore: prev?.healthScore ?? 100, healthRisks: prev?.healthRisks ?? [],
            }));
            if (autoRefreshRef.current) setTimeout(() => fetchData(), 3000);
            return;
        }

        if (event.type === 'session_closed') {
            setEvents(prev => [{
                id: `ws-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                type: 'INFO' as const,
                message: `Sesión cerrada — ${event.profile_name ?? `Perfil #${event.profile}`}: ${event.duration_seconds ?? 0}s, ${(event.total_data_mb ?? 0).toFixed(1)}MB`,
                source: event.agent_name ?? 'Agent',
                timestamp: new Date().toISOString(),
                meta: { session_id: event.session_id },
            }, ...prev.slice(0, 18)]);
            setStats(prev => ({
                nodesOnline: prev?.nodesOnline ?? 1, nodesTotal: prev?.nodesTotal ?? 1,
                profilesActive: Math.max(0, (prev?.profilesActive ?? 1) - 1),
                browsersOpen: Math.max(0, (prev?.browsersOpen ?? 1) - 1),
                alertsActive: prev?.alertsActive ?? 0, healthScore: prev?.healthScore ?? 100, healthRisks: prev?.healthRisks ?? [],
            }));
            if (autoRefreshRef.current) setTimeout(() => fetchData(), 3000);
            return;
        }

        // ── Proxy tasks ───────────────────────────────────────────────────────
        if (event.type === 'proxy_task_failed') {
            setTaskQueue(prev => ({ ...prev, failed: prev.failed + 1 }));
            setProxyTasks(prev => [{
                id: event.alert_id, profileName: event.profile_name,
                status: 'failed', message: event.message, timestamp: event.timestamp,
            }, ...prev.slice(0, 19)]);
            setAlerts(prev => [{
                id: event.alert_id, type: 'Proxy Caído', message: event.message,
                severity: 'Critical' as const, time: 'ahora', read: false,
            }, ...prev]);
            setStats(prev => prev ? { ...prev, alertsActive: (prev.alertsActive ?? 0) + 1 } : prev);
            return;
        }

        if (event.type === 'proxy_rotation_started') {
            setTaskQueue(prev => ({ ...prev, failed: Math.max(0, prev.failed - 1), processing: prev.processing + 1 }));
            setProxyTasks(prev => prev.map(t =>
                t.id === event.alert_id ? { ...t, status: 'processing', message: event.message } : t
            ));
            setEvents(prev => [{
                id: `ws-proxyrot-start-${Date.now()}`,
                type: 'INFO' as const,
                message: `🔄 ${event.message}`,
                source: `Computer #${event.computer_id ?? 1}`,
                timestamp: new Date().toISOString(),
                meta: {},
            }, ...prev.slice(0, 18)]);
            return;
        }

        if (event.type === 'proxy_rotation_resolved') {
            setTaskQueue(prev => ({ ...prev, processing: Math.max(0, prev.processing - 1) }));
            setProxyTasks(prev => prev.map(t =>
                t.id === event.alert_id ? { ...t, status: 'resolved' as const, message: event.message } : t
            ));
            setAlerts(prev => prev.map(a =>
                (a.id === event.alert_id || (a as any).profile_id === event.profile_id) ? { ...a, read: true } : a
            ));
            setStats(prev => prev ? { ...prev, alertsActive: Math.max(0, (prev.alertsActive ?? 0) - 1) } : prev);
            setEvents(prev => [{
                id: `ws-proxyrot-ok-${Date.now()}`,
                type: 'SUCCESS' as const,
                message: `✅ ${event.message}`,
                source: 'auto_rotation',
                timestamp: new Date().toISOString(),
                meta: {},
            }, ...prev.slice(0, 18)]);
            if (autoRefreshRef.current) setTimeout(() => fetchData(), 2000);
            return;
        }

        if (event.type === 'proxy_rotation_failed') {
            setTaskQueue(prev => ({ ...prev, processing: Math.max(0, prev.processing - 1), failed: prev.failed + 1 }));
            setProxyTasks(prev => prev.map(t =>
                t.id === event.alert_id ? { ...t, status: 'failed', message: event.message } : t
            ));
            setEvents(prev => [{
                id: `ws-proxyrot-fail-${Date.now()}`,
                type: 'ERROR' as const,
                message: `❌ ${event.message}`,
                source: 'auto_rotation',
                timestamp: new Date().toISOString(),
                meta: {},
            }, ...prev.slice(0, 18)]);
            return;
        }
        if (event.type === 'proxy_rotation_waiting_adspower') {
            setEvents(prev => [{
                id: `ws-rot-wait-adspower-${Date.now()}`,
                type: 'WARNING' as const,
                message: event.message ?? '⏸️ Rotación encolada — esperando AdsPower',
                source: 'proxy_rotation',
                timestamp: new Date().toISOString(),
                meta: {},
            }, ...prev.slice(0, 18)]);
            // Mantener el indicador de rotación activo
            setRotationInProgress(true);
            return;
        }

        if (event.type === 'proxy_rotation_waiting') {
            setEvents(prev => [{
                id: `ws-rot-wait-agent-${Date.now()}`,
                type: 'INFO' as const,
                message: event.message ?? '⏸️ Rotación en espera — sin agentes conectados',
                source: 'proxy_rotation',
                timestamp: new Date().toISOString(),
                meta: {},
            }, ...prev.slice(0, 18)]);
            setRotationInProgress(true);
            return;
        }

        if (event.type === 'system_event' && event.event === 'proxy_rotation_queue_processing') {
            setEvents(prev => [{
                id: 'ws-rotation-active',
                type: 'INFO' as const,
                message: event.message ?? '⚡ Procesando rotaciones encoladas...',
                source: 'proxy_rotation',
                timestamp: new Date().toISOString(),
                meta: {},
            }, ...prev.slice(0, 18)]);
            return;
        }

        if (event.type === 'system_event' && event.event === 'proxy_rotation_queue_done') {
            setEvents(prev => [{
                id: 'ws-rotation-queue-done',
                type: 'SUCCESS' as const,
                message: event.message ?? '✅ Cola de rotaciones procesada',
                source: 'proxy_rotation',
                timestamp: new Date().toISOString(),
                meta: {},
            }, ...prev.slice(0, 18)]);
            setRotationInProgress(false);
            setActiveAction(null);
            if (autoRefreshRef.current) debouncedFetch();
            return;
        }

        // Actualizar indicador AdsPower en el panel cuando se encola por AdsPower offline
        if (event.type === 'proxy_rotation_queued') {
            const cid = event.computer_id?.toString();
            if (cid) {
                setAdspowerStatusByComputer(prev => ({ ...prev, [cid]: false }));
            }
            setEvents(prev => [{
                id: `ws-rot-queued-${Date.now()}`,
                type: 'WARNING' as const,
                message: `⏸️ ${event.message ?? 'Rotación encolada'} — se ejecutará cuando AdsPower abra`,
                source: 'proxy_rotation',
                timestamp: new Date().toISOString(),
                meta: {},
            }, ...prev.slice(0, 18)]);
            // NO apagar rotationInProgress — sigue "activo" esperando
            return;
        }

        // ── Session crashed ───────────────────────────────────────────────────
        if (event.type === 'session_crashed') {
            const isProxyError = event.is_proxy_error === true;
            const reason = event.crash_reason ?? 'Error desconocido';
            const friendlyReason = reason.includes('Proxy') || reason.includes('Check Proxy')
                ? '🔴 Proxy inválido o caído'
                : reason.includes('AdsPower') ? '🔴 AdsPower no disponible'
                    : reason.includes('Timeout') ? '🟡 Timeout abriendo navegador'
                        : reason;
            setEvents(prev => [{
                id: `ws-crash-${Date.now()}`,
                type: 'ERROR' as const,
                message: `Sesión crasheó — ${event.profile_name ?? `Perfil #${event.profile}`}: ${friendlyReason}`,
                source: event.agent_name ?? 'Agent',
                timestamp: new Date().toISOString(),
                meta: { session_id: event.session_id },
            }, ...prev.slice(0, 18)]);
            if (!isProxyError) {
                setAlerts(prev => [{
                    id: Date.now(), type: 'Sesión Crasheó', message: friendlyReason,
                    severity: 'Critical' as const, time: 'ahora', read: false,
                }, ...prev]);
                setStats(prev => prev ? { ...prev, alertsActive: (prev.alertsActive ?? 0) + 1 } : prev);
            }
            if (autoRefreshRef.current) setTimeout(() => fetchData(), 2000);
            return;
        }

        // ── System events ─────────────────────────────────────────────────────
        if (event.type === 'system_event' && event.event === 'verify_profiles_start') {
            setEvents(prev => prev.map(e =>
                e.id === 'ws-verify-active'
                    ? { ...e, message: `Verificando ${event.stats?.total ?? ''} perfiles — en proceso...` }
                    : e
            ));
            return;
        }

        if (event.type === 'system_event' && event.event === 'verify_profiles_complete') {
            const s = event.stats;
            setEvents(prev => [{
                id: 'ws-verify-complete',
                type: s?.verified === s?.total ? 'SUCCESS' as const : 'WARNING' as const,
                message: `✅ Verificación completada — ${s?.verified}/${s?.total} perfiles actualizados`,
                source: 'verify_profiles',
                timestamp: new Date().toISOString(),
                meta: {},
            }, ...prev.filter(e => e.id !== 'ws-verify-active').slice(0, 17)]);
            fetchData();
            setVerifyInProgress(false);
            setActiveAction(null);
            return;
        }

        if (event.type === 'rotation_progress') {
            const s = event.stats;
            const icon = event.result === 'ok' ? '✓' : event.result === 'rotated' ? '↺' : '✗';
            rotationLogRef.current = [...rotationLogRef.current, `${icon} ${event.detail}`];
            setRotationInProgress(true);
            setEvents(prev => {
                const exists = prev.some(e =>
                    e.source === 'proxy_rotation' &&
                    (e.message.startsWith('Rotando') || e.message.includes('iniciada'))
                );
                const updated = {
                    id: 'ws-rotation-active',
                    type: 'INFO' as const,
                    message: `Rotando proxies — ${s.optimal}✓ ${s.rotated}↺ ${s.failed}✗ / ${s.total}`,
                    source: 'proxy_rotation',
                    timestamp: new Date().toISOString(),
                    meta: { log: [...rotationLogRef.current] },
                };
                if (!exists) return [updated, ...prev.slice(0, 18)];
                return prev.map(e =>
                    e.source === 'proxy_rotation' && (e.message.startsWith('Rotando') || e.message.includes('iniciada'))
                        ? updated : e
                );
            });
            return;
        }

        if (event.type === 'system_event' && event.event === 'proxy_auto_rotated') {
            setEvents(prev => [{
                id: `ws-autorotate-${Date.now()}`,
                type: 'INFO' as const,
                message: `🔄 ${event.message}`,
                source: 'auto_rotation',
                timestamp: new Date().toISOString(),
                meta: {},
            }, ...prev.slice(0, 18)]);
            return;
        }

        if (event.type === 'system_event' && event.event === 'proxy_rotation_complete') {
            const s = event.stats;
            const capturedLog = [...rotationLogRef.current];
            rotationLogRef.current = [];
            const completionEvent = {
                id: 'ws-rotation-active',
                type: (s.failed === 0 ? 'SUCCESS' : 'ERROR') as const,
                message: `Rotación completada — ${s.optimal} óptimos · ${s.rotated} rotados · ${s.failed} fallidos`,
                source: 'proxy_rotation',
                timestamp: new Date().toISOString(),
                meta: { log: capturedLog },
            };
            setEvents(prev => [
                completionEvent,
                ...prev.filter(e => !(
                    e.source === 'proxy_rotation' &&
                    (e.message.includes('iniciada') || e.message.startsWith('Rotando'))
                )).slice(0, 17),
            ]);
            setSelectedEvent(prev => prev?.id === 'ws-rotation-active' ? completionEvent : prev);
            setRotationInProgress(false);
            setActiveAction(null);
            if (autoRefreshRef.current) debouncedFetch();
            return;
        }

    }, [
        debouncedFetch, fetchData, setStats, updateNodeLive, appendMetric, appendLog,
        markNodeOnline, markNodeOffline, setAlerts, setEvents, setProfiles, setSelectedEvent,
        adspowerStatus, selectedComputerId, reportBlocked,
    ]);

    useAdminWS(handleWSEvent, autoRefresh);

    // ─── HANDLERS ────────────────────────────────────────────────────────────
    const handleEventClick = useCallback(async (ev: SystemEvent) => {
        setSelectedEvent(ev);
        const sid = (ev as any).meta?.session_id;
        if (!sid) return;
        setEventPagesLoading(true);
        try {
            const r = await fetch(`/api/v1/admin/sessions/${sid}/events`);
            const d = await r.json();
            setEventPages(d.events ?? []);
        } catch { setEventPages([]); }
        finally { setEventPagesLoading(false); }
    }, [setSelectedEvent]);

    const handleEventClose = useCallback(() => {
        setSelectedEvent(null);
        setEventPages([]);
    }, [setSelectedEvent]);

    const handleConnHistory = useCallback(async (conn: ConnectionItem) => {
        setSelectedConn(conn);
        setProxyLogsLoading(true);
        try {
            const r = await fetch(`/api/v1/proxy-rotation/${conn.id}/history`);
            const d = await r.json();
            setProxyLogs(d.items ?? []);
        } catch { setProxyLogs([]); }
        finally { setProxyLogsLoading(false); }
    }, [setSelectedConn]);

    const handleStartSessions = async (selectedIds: string[], targetUrl: string) => {
        const computer = selectedComputerId
            ? nodes.find(n => n.id === selectedComputerId && n.status === 'ONLINE')
            : null;

        if (!computer) {
            setShowSessionModal(false);
            reportBlocked('❌ Agente local no disponible — abre la app del agente en esta computadora para iniciar sesiones');
            setAlerts(prev => [{
                id: Date.now(), type: 'ERROR' as const,
                message: 'Agente no disponible. Abre la aplicación del agente para continuar.',
                source: 'admin-panel', severity: 'Warning' as const, time: 'ahora', read: false,
            }, ...prev]);
            return;
        }

        const results = await Promise.allSettled(
            selectedIds.map(id => {
                const p = profiles.find(prof => prof.id === id);
                if (!p) return Promise.reject(new Error('Perfil no encontrado'));
                if (p.adsId?.startsWith('pending')) return Promise.reject(new Error(`Perfil "${p.name}" aún no está listo en AdsPower`));
                return orchestratorService.openBrowser({
                    profileAdsId: p.adsId, computerId: parseInt(computer.id),
                    targetUrl, agentName: 'admin-panel',
                });
            })
        );

        const ok = results.filter(r => r.status === 'fulfilled').length;
        const failed = results.filter(r => r.status === 'rejected') as PromiseRejectedResult[];

        if (ok > 0) {
            setEvents(prev => [{
                id: `ws-session-sent-${Date.now()}`,
                type: 'INFO' as const,
                message: `⏳ ${ok} sesión(es) enviadas al agente`,
                source: 'admin-panel',
                timestamp: new Date().toISOString(),
                meta: {},
            }, ...prev.slice(0, 29)]);
        }

        failed.forEach((f, i) => {
            const p = profiles.find(prof => prof.id === selectedIds[i]);
            const reason = f.reason?.message ?? 'Error desconocido';
            const msg = `❌ Error abriendo "${p?.name ?? 'perfil'}": ${reason}`;
            setEvents(prev => [{
                id: `ws-open-error-${Date.now()}-${i}`,
                type: 'ERROR' as const,
                message: msg,
                source: 'admin-panel',
                timestamp: new Date().toISOString(),
                meta: {},
            }, ...prev.slice(0, 29)]);
            setAlerts(prev => [{
                id: Date.now() + i, type: 'ERROR' as const, message: msg,
                source: 'admin-panel', severity: 'Critical' as const, time: 'ahora', read: false,
            }, ...prev]);
            setStats(prev => prev ? { ...prev, alertsActive: (prev.alertsActive ?? 0) + 1 } : prev);
        });

        setShowSessionModal(false);
        if (ok > 0 || failed.length > 0) setTimeout(() => fetchData(), 2000);
    };

    const handleVerifyProfile = async (profileId: string) => {
        try {
            const r = await orchestratorService.verifyProfileSecurity(profileId);
            setProfiles(prev => prev.map(p => p.id === profileId
                ? { ...p, browserScore: r.browser_score, fingerprintScore: r.fingerprint_score, cookieStatus: r.cookie_status, verifyResult: r }
                : p
            ));
            setSecurityProfile(prev => prev?.id === profileId
                ? { ...prev, browserScore: r.browser_score, fingerprintScore: r.fingerprint_score, cookieStatus: r.cookie_status, verifyResult: r }
                : prev
            );
        } catch (err: any) { alert(`Error al verificar perfil: ${err.message}`); }
    };

    const handleViewProfileHistory = useCallback((profileId: string) => {
        setSelectedProfileHistoryId(profileId);
    }, []);

    const handleAlertAck = async (id: number) => {
        await orchestratorService.ackAlert(id);
        setAlerts(prev => prev.map(a => a.id === id ? { ...a, read: true } : a));
    };
    const handleAlertSilence = async (id: number) => {
        await orchestratorService.silenceAlert(id, 30);
        setAlerts(prev => prev.map(a => a.id === id ? { ...a, read: true } : a));
        alert('Alerta silenciada 30m');
    };

    const handleDeleteProfile = useCallback(async (profileId: string) => {
        const profile = profiles.find(p => p.id === profileId);
        if (!profile) return;
        const confirmed = window.confirm(`¿Eliminar el perfil "${profile.name}"?\n\nEsto eliminará:\n• El perfil en la base de datos\n• El proxy asignado\n• El perfil en AdsPower\n\nEsta acción no se puede deshacer.`);
        if (!confirmed) return;

        setProfiles(prev => prev.filter(p => p.id !== profileId));
        setEvents(prev => [{
            id: `ws-deleting-${Date.now()}`,
            type: 'INFO' as const,
            message: `🗑️ Eliminando perfil "${profile.name}"...`,
            source: 'admin-panel',
            timestamp: new Date().toISOString(),
            meta: {},
        }, ...prev.slice(0, 29)]);

        try {
            await orchestratorService.deleteProfile(profileId);
            setEvents(prev => [{
                id: `ws-deleted-${Date.now()}`,
                type: 'SUCCESS' as const,
                message: `✅ Perfil "${profile.name}" eliminado correctamente`,
                source: 'admin-panel',
                timestamp: new Date().toISOString(),
                meta: {},
            }, ...prev.slice(0, 29)]);
            setTimeout(() => fetchData(), 1500);
        } catch (err: any) {
            setProfiles(prev => [...prev, profile].sort((a, b) => Number(a.id) - Number(b.id)));
            setEvents(prev => [{
                id: `ws-delete-error-${Date.now()}`,
                type: 'ERROR' as const,
                message: `❌ Error eliminando "${profile.name}": ${err.message}`,
                source: 'admin-panel',
                timestamp: new Date().toISOString(),
                meta: {},
            }, ...prev.slice(0, 29)]);
            setAlerts(prev => [{
                id: Date.now(), type: 'ERROR' as const,
                message: `Error eliminando perfil "${profile.name}": ${err.message}`,
                source: 'admin-panel', severity: 'Critical' as const, time: 'ahora', read: false,
            }, ...prev]);
            setStats(prev => prev ? { ...prev, alertsActive: (prev.alertsActive ?? 0) + 1 } : prev);
        }
    }, [profiles, setProfiles, setEvents, setAlerts, setStats, fetchData]);

    const handleRotateProxies = async () => {
        if (!window.confirm('¿Rotar proxies lentos?')) return;
        try {
            setRotationInProgress(true);
            rotationLogRef.current = [];
            setEvents(prev => [{
                id: 'ws-rotation-active',
                type: 'INFO' as const,
                message: 'Rotación de proxies iniciada...',
                source: 'proxy_rotation',
                timestamp: new Date().toISOString(),
                meta: {},
            }, ...prev.slice(0, 18)]);
            await orchestratorService.rotateAllProxies(selectedComputerId ?? undefined);
        } catch {
            setRotationInProgress(false);
            alert('Error proxies');
        }
    };

    // ── Acciones del Panel de Agente con validación previa ────────────────────
    const agentActions = useMemo(() => [
        {
            id: 'session',
            label: 'Iniciar Sesión',
            desc: activeAction === 'session' ? 'Enviando...' : 'Seleccionar y abrir perfiles',
            icon: <Monitor size={24} />,
            color: '#00ff88',
            fn: () => {
                const { ok, reason } = checkAgentAndAdspower(selectedComputerId);
                if (!ok) { reportBlocked(reason!); return; }
                setShowSessionModal(true);
            },
        },
        {
            id: 'profile',
            label: 'Nuevo Perfil',
            desc: 'Crear navegador y credenciales',
            icon: <Plus size={24} />,
            color: '#ffffff',
            fn: () => {
                // Crear perfil no requiere AdsPower inmediatamente (va a cola)
                // Solo advertimos si el agente está offline
                const node = selectedComputerId ? nodes.find(n => n.id === selectedComputerId) : null;
                if (!node || node.status !== 'ONLINE') {
                    // Permitir crear — irá a cola cuando el agente se conecte
                    setEvents(prev => [{
                        id: `ws-profile-queue-${Date.now()}`,
                        type: 'INFO' as const,
                        message: '⏸️ Agente offline — el perfil se creará cuando el agente se conecte',
                        source: 'admin-panel',
                        timestamp: new Date().toISOString(),
                        meta: {},
                    }, ...prev.slice(0, 18)]);
                }
                setShowCreateProfile(true);
            },
        },
        {
            id: 'rotation',
            label: 'Monitor de Red',
            desc: rotationInProgress ? '⏳ Rotando proxies...' : 'Rotar proxies lentos ahora',
            icon: <RefreshCw size={24} className={rotationInProgress ? 'animate-spin' : ''} />,
            color: rotationInProgress ? '#666' : '#3b82f6',
            disabled: rotationInProgress,
            fn: rotationInProgress ? () => { } : async () => {
                // ── Validar agente antes de rotar ────────────────────────────
                const node = selectedComputerId ? nodes.find(n => n.id === selectedComputerId) : null;
                if (!node || node.status !== 'ONLINE') {
                    reportBlocked('❌ Agente offline — inicia el agente antes de rotar proxies');
                    return;
                }
                // ── Advertir si AdsPower está cerrado, pero NO bloquear ──────
                // La rotación se puede encolar y ejecutar cuando AdsPower abra
                const adspowerOk = selectedComputerId
                    ? adspowerStatusByComputer[selectedComputerId]
                    : undefined;
                if (adspowerOk === false) {
                    const ok = window.confirm(
                        '⚠️ AdsPower no está abierto en el agente.\n\n' +
                        'La rotación se encolará y se ejecutará automáticamente cuando abras AdsPower.\n\n' +
                        '¿Continuar de todas formas?'
                    );
                    if (!ok) return;
                }
                // ────────────────────────────────────────────────────────────
                await handleRotateProxies();
            },
        },
        {
            id: 'logs',
            label: 'Logs de Sistema',
            desc: 'Ver alertas y eventos',
            icon: <History size={24} />,
            color: '#f59e0b',
            fn: () => setActiveTab('ALERTS'),
        },
        {
            id: 'verify',
            label: 'Verificar Perfiles',
            desc: verifyInProgress ? '⏳ Verificando...' : 'Actualizar scores y cookies',
            icon: <Shield size={24} className={verifyInProgress ? 'animate-pulse' : ''} />,
            color: verifyInProgress ? '#666' : '#00ff88',
            disabled: verifyInProgress,
            fn: verifyInProgress ? () => { } : async () => {
                const { ok, reason } = checkAgentAndAdspower(selectedComputerId);
                if (!ok) { reportBlocked(reason!); return; }
                setVerifyInProgress(true);
                setActiveAction('verify');
                setEvents(prev => [{
                    id: 'ws-verify-active',
                    type: 'INFO' as const,
                    message: 'Verificando perfiles — en proceso...',
                    source: 'verify_profiles',
                    timestamp: new Date().toISOString(),
                    meta: {},
                }, ...prev.slice(0, 18)]);
                try {
                    await orchestratorService.verifyAllProfiles(selectedComputerId ?? undefined);
                } catch (err: any) {
                    setVerifyInProgress(false);
                    setActiveAction(null);
                    setEvents(prev => [{
                        id: 'ws-verify-error',
                        type: 'ERROR' as const,
                        message: `❌ Error al iniciar verificación: ${err.message}`,
                        source: 'verify_profiles',
                        timestamp: new Date().toISOString(),
                        meta: {},
                    }, ...prev.filter(e => e.id !== 'ws-verify-active').slice(0, 17)]);
                }
            },
        },
    ], [
        activeAction, rotationInProgress, verifyInProgress,
        selectedComputerId, nodes, checkAgentAndAdspower, reportBlocked,
        setShowSessionModal, setShowCreateProfile, setActiveTab,
        setEvents, setVerifyInProgress, setActiveAction,
    ]);

    // ─── ESTADO DEL AGENTE LOCAL (para el header del panel) ──────────────────
    const localNode = nodes.find(n => n.id === selectedComputerId);
    const localAdspowerOk = selectedComputerId
        ? adspowerStatusByComputer[selectedComputerId]
        : undefined;

    // ─── RENDER ───────────────────────────────────────────────────────────────
    return (
        <div className="w-full h-full bg-[#020202] text-[#f0f0f0] flex overflow-hidden font-sans selection:bg-[#00ff88]/30">

            {/* ── Sidebar ─────────────────────────────────────────────────── */}
            <aside className="w-20 bg-[#050505] border-r border-white/5 flex flex-col items-center py-6 gap-8 shrink-0 z-50 shadow-[4px_0_20px_rgba(0,0,0,0.5)]">
                <div onClick={() => navigate('/ops/operator')} className="size-12 bg-white/5 text-[#666] hover:bg-white/10 hover:text-white rounded-2xl flex items-center justify-center cursor-pointer transition-colors">
                    <TerminalIcon size={24} />
                </div>
                <nav className="flex flex-col gap-6 w-full px-2">
                    <SidebarItem label="Dash" active={activeTab === 'DASHBOARD'} onClick={() => setActiveTab('DASHBOARD')} icon={<LayoutDashboard size={22} />} />
                    <div className="h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                    <SidebarItem label="Nodes" active={activeTab === 'NODES'} onClick={() => setActiveTab('NODES')} icon={<Monitor size={22} />} />
                    <SidebarItem label="Net" active={activeTab === 'CONNECTIONS'} onClick={() => setActiveTab('CONNECTIONS')} icon={<Globe size={22} />} />
                    <SidebarItem label="Alerts" active={activeTab === 'ALERTS'} onClick={() => setActiveTab('ALERTS')} icon={<Bell size={22} />} />
                    <div className="h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                    <SidebarItem label="Profs" active={activeTab === 'PROFILES'} onClick={() => setActiveTab('PROFILES')} icon={<Users size={22} />} />
                </nav>
            </aside>

            <div className="flex-1 flex flex-col overflow-hidden relative bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-[#00ff8805] via-[#020202] to-[#020202]">

                {/* ── Header ──────────────────────────────────────────────── */}
                <header className="px-8 py-5 flex justify-between items-center z-40 bg-gradient-to-b from-[#020202] to-transparent">
                    <div className="flex items-center gap-6">
                        <div>
                            <h1 className="text-2xl font-black tracking-tighter flex items-center gap-3 italic">
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00ff88] to-[#00b560]">WB</span>
                                <span className="text-white">ORCHESTRATOR</span>
                            </h1>
                            <p className="text-[10px] font-bold text-[#666] uppercase tracking-[0.3em] ml-1">Infraestructura & Agentes</p>
                        </div>
                        <div className="h-8 w-px bg-white/10 mx-2" />
                        {/* ── ServiceStatusBar: AdsPower/Agents abre modal de computadoras ── */}
                        <div className="flex items-center gap-3 bg-white/5 px-4 py-2 rounded-xl border border-white/5 backdrop-blur-md">
                            <ServiceStatusBar
                                services={services}
                                onServiceClick={(svc) => {
                                    if (svc.name === 'AdsPower' || svc.name === 'Agents') {
                                        handleOpenComputerStatus();
                                    } else {
                                        setSelectedService(svc);
                                    }
                                }}
                            />
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="relative group hidden md:block">
                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#444] group-focus-within:text-[#00ff88] transition-colors" />
                            <input
                                type="text"
                                placeholder="Buscar nodo / perfil / error..."
                                value={searchText}
                                onChange={e => setSearchText(e.target.value)}
                                className="bg-[#0a0a0a] border border-white/5 rounded-xl pl-9 pr-4 py-2.5 text-xs font-bold text-white placeholder:text-[#333] focus:border-[#00ff88]/30 focus:outline-none w-64 transition-all focus:w-80"
                            />
                        </div>
                        <button
                            onClick={fetchData}
                            disabled={refreshing}
                            className={`p-3 rounded-xl border border-white/5 bg-white/5 text-[#888] hover:text-white hover:bg-white/10 transition-all ${refreshing ? 'animate-spin cursor-not-allowed' : ''}`}
                        >
                            <RefreshCw size={18} />
                        </button>
                        <button onClick={() => navigate('/ops/operator')} className="flex items-center gap-2 px-6 py-3 bg-[#0a0a0a] border border-white/10 text-white text-[11px] font-black uppercase rounded-xl hover:bg-white/5 transition-all">
                            <ExternalLink size={16} /> Ir a Operador
                        </button>
                    </div>
                </header>

                {/* ── Main ────────────────────────────────────────────────── */}
                <main className="flex-1 overflow-y-auto custom-scrollbar p-8 pt-2 pb-40 scroll-smooth">
                    <div className="max-w-[1600px] mx-auto space-y-12 pb-20">

                        {/* ─── DASHBOARD ──────────────────────────────────── */}
                        {activeTab === 'DASHBOARD' && (
                            <div className="space-y-8 animate-in fade-in">
                                <div className="flex justify-between items-end">
                                    <div>
                                        <h2 className="text-xl font-black text-white italic tracking-tight">Panel de Control</h2>
                                        <p className="text-xs text-[#666]">Vista general del estado de la infraestructura.</p>
                                    </div>
                                </div>

                                <section className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                                    <div className="lg:col-span-2">
                                        <GlobalStatusHero
                                            status={(stats?.healthScore || 0) > 75 ? 'OK' : 'DEGRADED'}
                                            lastUpdate="2s"
                                            autoRefresh={autoRefresh}
                                            onToggleAuto={() => setAutoRefresh(v => !v)}
                                            onClick={() => setShowSystemDiag(true)}
                                            verdict={computeVerdict(stats?.healthScore ?? 0, stats?.healthRisks ?? [], services)}
                                        />
                                    </div>
                                    <div className="lg:col-span-1 h-full">
                                        <MiniCapacityPanel
                                            cpu={Math.round(nodes.reduce((a, b) => a + b.cpu, 0) / (nodes.length || 1))}
                                            ram={Math.round(nodes.reduce((a, b) => a + b.ram, 0) / (nodes.length || 1))}
                                            net={45}
                                            onClick={() => setShowResourceDetail(true)}
                                        />
                                    </div>
                                    <div className="lg:col-span-1 h-full">
                                        <JobsQueueWidget
                                            queue={taskQueue.queue}
                                            running={taskQueue.processing + (rotationInProgress ? 1 : 0)}
                                            failed={taskQueue.failed}
                                            onClick={() => setShowJobQueue(true)}
                                        />
                                    </div>
                                </section>

                                <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                    <AdminKPICard label="Computadoras Online" value={stats ? `${stats.nodesOnline}/${stats.nodesTotal}` : '-/-'} icon={<Server size={20} />} active loading={loading} trend="+2 vs 1h" tooltip="Nodos conectados" onClick={() => setDashModal({ type: 'NODES', data: nodes })} />
                                    <AdminKPICard label="Perfiles Activos" value={stats ? stats.profilesActive.toString() : '-'} icon={<Users size={20} />} loading={loading} trend="Stable" tooltip="Sesiones activas" onClick={() => setDashModal({ type: 'PROFILES', data: profiles.filter(p => p.status !== 'IDLE') })} />
                                    <AdminKPICard label="Navegadores Abiertos" value={stats ? stats.browsersOpen.toString() : '-'} icon={<CheckCircle2 size={20} />} loading={loading} tooltip="Instancias Chrome" onClick={() => setDashModal({ type: 'BROWSERS', data: nodes.map(n => ({ name: n.name, openBrowsers: n.openBrowsers })) })} />
                                    <AdminKPICard label="Alertas Activas" value={stats ? stats.alertsActive.toString() : '-'} icon={<AlertTriangle size={20} />} loading={loading} alert={(stats?.alertsActive || 0) > 0} trend={stats?.alertsActive ? '+1 Reciente' : '0'} tooltip="Alertas" onClick={() => setDashModal({ type: 'ALERTS', data: alerts.filter(a => !a.read) })} />
                                </section>

                                <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[400px]">
                                    <div className="lg:col-span-1">
                                        <HealthOverview
                                            score={stats?.healthScore || 0}
                                            risks={stats?.healthRisks || []}
                                            healthDetails={stats?.healthDetails}
                                            onDetails={() => setShowHealthDetail(true)}
                                        />
                                    </div>
                                    <div className="lg:col-span-2 overflow-hidden">
                                        <SystemEventsFeed events={events} onEventClick={handleEventClick} />
                                    </div>
                                </section>

                                {/* ── Panel de Agente ──────────────────────── */}
                                <section className="bg-[#0c0c0c] border border-white/5 rounded-2xl p-6">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-[10px] font-black text-[#444] uppercase tracking-[0.2em] flex items-center gap-2">
                                            <TerminalIcon size={12} className="text-[#00ff88]" /> Panel de Agente
                                        </h3>
                                        {/* ── Indicador agente + AdsPower ── */}
                                        <div className="flex items-center gap-3">
                                            {/* Agente */}
                                            <div className="flex items-center gap-1.5">
                                                <div className={`size-2 rounded-full ${localNode?.status === 'ONLINE'
                                                    ? 'bg-[#00ff88] animate-pulse'
                                                    : selectedComputerId ? 'bg-red-500' : 'bg-amber-500 animate-pulse'
                                                    }`} />
                                                <span className="text-[9px] text-[#555] font-mono">
                                                    {!localNode ? 'Detectando...' : localNode.status === 'ONLINE' ? localNode.name : `${localNode.name} — offline`}
                                                </span>
                                            </div>
                                            {/* AdsPower — solo si hay agente */}
                                            {localNode?.status === 'ONLINE' && (
                                                <button
                                                    onClick={() => handleOpenComputerStatus()}
                                                    className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border text-[9px] font-black uppercase transition-colors ${localAdspowerOk === true
                                                        ? 'bg-[#00ff88]/10 border-[#00ff88]/20 text-[#00ff88] hover:bg-[#00ff88]/15'
                                                        : localAdspowerOk === false
                                                            ? 'bg-amber-500/10 border-amber-500/20 text-amber-400 hover:bg-amber-500/15 animate-pulse'
                                                            : 'bg-white/5 border-white/10 text-[#555] hover:bg-white/10'
                                                        }`}
                                                    title="Ver estado de computadoras"
                                                >
                                                    <Activity size={10} />
                                                    AdsPower {localAdspowerOk === true ? 'Abierto' : localAdspowerOk === false ? 'Cerrado' : '...'}
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {/* Alerta inline si AdsPower está cerrado */}
                                    {localNode?.status === 'ONLINE' && localAdspowerOk === false && (
                                        <div className="mb-4 px-4 py-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start gap-3">
                                            <AlertTriangle size={14} className="text-amber-400 shrink-0 mt-0.5" />
                                            <div className="flex-1">
                                                <p className="text-[10px] font-bold text-amber-400">
                                                    AdsPower no está abierto en {localNode.name}
                                                </p>
                                                <p className="text-[9px] text-[#666] mt-0.5">
                                                    Abre AdsPower para poder iniciar sesiones y verificar perfiles. Los perfiles en cola se procesarán automáticamente.
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                                        {agentActions.map(({ id, label, desc, icon, color, fn, disabled }) => (
                                            <div
                                                key={id}
                                                onClick={fn}
                                                className={`group cursor-pointer bg-[#0a0a0a] border border-white/5 hover:border-white/20 p-4 rounded-xl transition-all relative overflow-hidden
                                                    ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
                                            >
                                                <div className="absolute inset-0 bg-white/[0.03] translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                                                <div className="relative z-10 flex items-center gap-4">
                                                    <div className="p-3 rounded-lg" style={{ background: `${color}18`, color }}>{icon}</div>
                                                    <div>
                                                        <h4 className="font-black text-white uppercase text-sm">{label}</h4>
                                                        <p className="text-[10px] text-[#666] mt-1">{desc}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </section>
                            </div>
                        )}

                        {/* ─── TABS SECUNDARIAS ───────────────────────────── */}
                        {activeTab !== 'DASHBOARD' && activeTab !== 'SETTINGS' && (
                            <section className="space-y-6 animate-in slide-in-from-bottom-4">
                                <div className="sticky top-0 z-30 flex items-center gap-4 p-2 pl-4 bg-[#0c0c0c]/80 backdrop-blur-xl border border-white/5 rounded-2xl shadow-xl">
                                    <h3 className="text-[12px] font-black text-white uppercase tracking-widest flex items-center gap-2">
                                        {activeTab === 'NODES' && <Monitor size={14} className="text-[#00ff88]" />}
                                        {activeTab === 'CONNECTIONS' && <Globe size={14} className="text-[#00ff88]" />}
                                        {activeTab === 'ALERTS' && <Bell size={14} className="text-[#00ff88]" />}
                                        {activeTab === 'PROFILES' && <Users size={14} className="text-[#00ff88]" />}
                                        {activeTab} VIEW
                                    </h3>
                                    <div className="h-4 w-px bg-white/10" />
                                    <div className="flex gap-1">
                                        <FilterButton label="Computadoras" active={activeTab === 'NODES'} onClick={() => setActiveTab('NODES')} />
                                        <FilterButton label="Conexiones" active={activeTab === 'CONNECTIONS'} onClick={() => setActiveTab('CONNECTIONS')} />
                                        <FilterButton label="Alertas" active={activeTab === 'ALERTS'} onClick={() => setActiveTab('ALERTS')} dotColor={(stats?.alertsActive || 0) > 0 ? 'bg-red-500' : ''} />
                                    </div>
                                    <div className="relative group">
                                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#444] group-focus-within:text-[#00ff88] transition-colors" />
                                        <input
                                            type="text"
                                            placeholder="Buscar item..."
                                            value={searchText}
                                            onChange={e => setSearchText(e.target.value)}
                                            className="bg-black/40 border border-white/5 rounded-xl pl-9 pr-4 py-2 text-xs font-bold text-white placeholder:text-[#333] focus:border-[#00ff88]/30 focus:outline-none w-48 transition-all focus:w-64"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-4 min-h-[400px]">
                                    {loading ? (<><SkeletonRow /><SkeletonRow /></>) : (
                                        <>
                                            {activeTab === 'NODES' && visibleContent.map((n: any) => (
                                                <ComputerRow key={n.id} node={n} onClick={() => handleNodeClick(n)} />
                                            ))}

                                            {activeTab === 'CONNECTIONS' && visibleContent.map((c: any) => (
                                                <ConnectionRow
                                                    key={c.id} conn={c}
                                                    linkedProfiles={profiles.filter(p => (p as any).proxyId === Number(c.id))}
                                                    onHistory={() => handleConnHistory(c)}
                                                />
                                            ))}

                                            {activeTab === 'PROFILES' && (
                                                <div className="bg-[#0a0a0a] border border-white/5 rounded-2xl overflow-hidden">
                                                    <div className="grid grid-cols-12 gap-4 p-3 border-b border-white/5 text-[9px] font-black text-[#666] uppercase tracking-wider pl-4">
                                                        <div className="col-span-3">Perfil</div>
                                                        <div className="col-span-2 hidden md:block">Adspower ID</div>
                                                        <div className="col-span-2 hidden md:block">Cookies</div>
                                                        <div className="col-span-2">Score</div>
                                                        <div className="col-span-2 hidden md:block">Última Acción</div>
                                                        <div className="col-span-1 text-right pr-2">Acc.</div>
                                                    </div>
                                                    {(visibleContent as ProfileItem[]).map(p => (
                                                        <ProfileRow
                                                            key={p.id} profile={p} connections={connections}
                                                            onHistory={() => handleViewProfileHistory(p.id)}
                                                            onSecurity={() => setSecurityProfile(p)}
                                                            onDelete={() => handleDeleteProfile(p.id)}
                                                        />
                                                    ))}
                                                </div>
                                            )}

                                            {activeTab === 'ALERTS' && [...visibleContent].reverse().map((a: any) => (
                                                <AlertItem
                                                    key={a.id} alert={a}
                                                    onRead={() => setSelectedAlert(a)}
                                                    onAction={(action: string) => {
                                                        if (action === 'SILENCE') handleAlertSilence(a.id);
                                                        if (action === 'RETRY') fetchData();
                                                        if (action === 'VIEW_CAUSE') setSelectedAlert(a);
                                                    }}
                                                />
                                            ))}
                                            {activeTab === 'ALERTS' && <div ref={alertsEndRef} className="h-1" />}

                                            {visibleContent.length === 0 && (
                                                <div className="p-12 text-center border border-dashed border-white/5 rounded-2xl">
                                                    <p className="text-[#444] text-xs font-bold uppercase">No data found</p>
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            </section>
                        )}

                    </div>
                </main>

                {/* ── Modales y Drawers ────────────────────────────────────── */}
                <EventDetailModal
                    event={liveSelectedEvent}
                    pages={eventPages}
                    loadingPages={eventPagesLoading}
                    onClose={handleEventClose}
                />
                <SystemDiagnosticModal
                    isOpen={showSystemDiag}
                    onClose={() => setShowSystemDiag(false)}
                    services={services}
                    healthDetails={stats?.healthDetails}
                />
                <JobQueueModal
                    isOpen={showJobQueue}
                    onClose={() => setShowJobQueue(false)}
                    queue={taskQueue.queue}
                    running={taskQueue.processing}
                    failed={taskQueue.failed}
                    pendingProfiles={proxyTasks
                        .filter(t => t.status !== 'resolved')
                        .map(t => ({
                            id: t.id, name: t.profileName,
                            status: t.status === 'processing' ? '⏳ Rotando proxy...' : '❌ Proxy caído',
                        }))
                    }
                />
                <NodeItemDrawer node={liveSelectedNode} history={nodeHistory} logs={nodeLogs} onClose={closeDrawer} />
                <AlertModal alert={selectedAlert} onClose={() => setSelectedAlert(null)} onAck={handleAlertAck} />
                <DashKPIModal type={dashModal.type} data={dashModal.data} onClose={() => setDashModal({ type: null, data: null })} />
                <SecurityCheckModal profile={securityProfile} onClose={() => setSecurityProfile(null)} onVerify={handleVerifyProfile} />
                <SessionStartModal
                    isOpen={showSessionModal}
                    onClose={() => setShowSessionModal(false)}
                    profiles={profiles}
                    onStart={handleStartSessions}
                />
                <SessionHistoryModal
                    isOpen={selectedProfileHistoryId !== null}
                    events={profileHistoryData}
                    profileId={selectedProfileHistoryId}
                    onClose={() => { setSelectedProfileHistoryId(null); setProfileHistoryData([]); }}
                />
                <CreateProfileModal
                    isOpen={showCreateProfile}
                    onClose={() => setShowCreateProfile(false)}
                    onCreate={async (data: any) => {
                        try {
                            await orchestratorService.createProfile(data);
                            const agentOnline = nodes.some(n => n.status === 'ONLINE');
                            const adspowerReady = selectedComputerId
                                ? adspowerStatusByComputer[selectedComputerId] !== false
                                : true;

                            const statusMsg = !agentOnline
                                ? `⏸️ Perfil "${data.name}" en cola — agente offline`
                                : !adspowerReady
                                    ? `⏸️ Perfil "${data.name}" en cola — AdsPower no está abierto`
                                    : `🆕 Creando perfil "${data.name}" — enviado al agente`;

                            setEvents(prev => [{
                                id: `ws-profile-creating-${Date.now()}`,
                                type: (!agentOnline || !adspowerReady) ? 'INFO' as const : 'INFO' as const,
                                message: statusMsg,
                                source: 'admin-panel',
                                timestamp: new Date().toISOString(),
                                meta: {},
                            }, ...prev.slice(0, 29)]);

                            setShowCreateProfile(false);
                            setTimeout(() => fetchData(), 1500);
                        } catch (err: any) {
                            setEvents(prev => [{
                                id: `ws-profile-error-${Date.now()}`,
                                type: 'ERROR' as const,
                                message: `❌ Error creando perfil "${data.name}": ${err.message ?? 'Error desconocido'}`,
                                source: 'admin-panel',
                                timestamp: new Date().toISOString(),
                                meta: {},
                            }, ...prev.slice(0, 29)]);
                            setAlerts(prev => [{
                                id: Date.now(), type: 'ERROR' as const,
                                message: `Error creando perfil "${data.name}"`,
                                source: 'admin-panel', severity: 'Critical' as const, time: 'ahora', read: false,
                            }, ...prev]);
                        }
                    }}
                />
                <ProxyHistoryModal
                    conn={selectedConn}
                    logs={proxyLogs}
                    loading={proxyLogsLoading}
                    onClose={() => { setSelectedConn(null); setProxyLogs([]); }}
                />

                {/* ── NUEVO: Modal de estado de computadoras ───────────────── */}
                <ComputerStatusModal
                    isOpen={showComputerStatus}
                    onClose={() => setShowComputerStatus(false)}
                    nodes={nodes}
                    adspowerStatusByComputer={adspowerStatusByComputer}
                />
            </div>
        </div>
    );
};

export default OrchestratorTerminal;
