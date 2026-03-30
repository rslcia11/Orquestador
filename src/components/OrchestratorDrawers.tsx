// src/components/OrchestratorDrawers.tsx
import React from 'react';
import {
    ComputerNode, Alert, SystemEvent, ConnectionItem, ProfileItem, ServiceStatus, Job, BackupStatus
} from '../types/orchestratorTypes';
import {
    X, Activity, Cpu, HardDrive, Terminal, Clock, Shield, AlertTriangle,
    History, Cookie, Fingerprint, Play, Pause, RefreshCw, Server,
    CheckCircle2, ChevronRight, Plus, ExternalLink, Info
} from 'lucide-react';
import { orchestratorService } from '@/services/orchestrator.service';

// ─── TYPES ───────────────────────────────────────────────────────────────────

interface NodeDrawerProps {
    node: ComputerNode | null;
    history: { time: string; cpu: number; ram: number }[];
    logs: { timestamp: string; level: string; message: string }[];
    onClose: () => void;
}
// ─── HELPERS ─────────────────────────────────────────────────────────────────

const formatTs = (ts: string) => {
    try {
        return new Date(ts).toLocaleString('es-ES', {
            day: '2-digit', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit', second: '2-digit',
        });
    } catch { return ts; }
};

const formatTime = (ts: string) => {
    try {
        return new Date(ts).toLocaleTimeString('es-ES', {
            hour: '2-digit', minute: '2-digit', second: '2-digit',
        });
    } catch { return ts; }
};

// ─── EVENT DETAIL MODAL ──────────────────────────────────────────────────────
// Fetch eliminado — el padre maneja la carga y pasa pages como prop

// ─── EVENT DETAIL MODAL ──────────────────────────────────────────────────────

export const EventDetailModal = ({
    event,
    pages = [],
    loadingPages = false,
    onClose,
}: {
    event: SystemEvent | null;
    pages?: { id: number; url: string; timestamp: string }[];
    loadingPages?: boolean;
    onClose: () => void;
}) => {
    if (!event) return null;

    const proxyLog: string[] = (event as any).meta?.log ?? [];
    const hasProxyLog = proxyLog.length > 0;

    // ← FIX: más recientes primero
    const sortedPages = [...pages].sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
            <div className="bg-[#0c0c0c] border border-white/10 rounded-2xl w-full max-w-sm relative z-[110] p-6 shadow-2xl animate-fade-in-up">
                <button onClick={onClose} className="absolute right-4 top-4 text-[#666] hover:text-white">
                    <X size={20} />
                </button>

                <div className={`size-12 rounded-xl flex items-center justify-center mb-4 ${event.type === 'SUCCESS' ? 'bg-[#00ff88]/10 text-[#00ff88]' :
                        event.type === 'ERROR' ? 'bg-red-500/10 text-red-500' :
                            'bg-blue-500/10 text-blue-500'
                    }`}>
                    <Activity size={24} />
                </div>

                <h3 className="text-lg font-black text-white italic mb-1">Detalle del Evento</h3>
                <p className="text-xs text-[#666] mb-4 font-mono">{formatTs(event.timestamp)}</p>

                <div className="bg-white/5 p-4 rounded-xl border border-white/5 mb-4">
                    <p className="text-sm font-bold text-white mb-2">{event.message}</p>
                    <p className="text-xs text-[#888] uppercase">Origen: {event.source}</p>
                </div>

                {/* PROXY LOG */}
                {hasProxyLog && (
                    <div className="mb-4">
                        <p className="text-[10px] font-black text-[#444] uppercase tracking-widest mb-2 flex items-center gap-2">
                            <RefreshCw size={10} /> Detalle de proxies
                        </p>
                        <div className="bg-[#080808] border border-white/5 rounded-xl overflow-hidden">
                            <div className="max-h-44 overflow-y-auto custom-scrollbar">
                                {proxyLog.map((line, i) => {
                                    const isOk = line.startsWith('✓');
                                    const isRotated = line.startsWith('↺');
                                    return (
                                        <div key={i} className="flex items-center justify-between gap-2 px-3 py-2 border-b border-white/[0.04] last:border-0">
                                            <p className={`text-[10px] font-mono truncate flex-1 ${isOk ? 'text-[#888]' : isRotated ? 'text-blue-400' : 'text-red-400'}`}>
                                                {line.slice(2)}
                                            </p>
                                            <span className={`text-[9px] font-black uppercase shrink-0 px-1.5 py-0.5 rounded ${isOk ? 'text-[#00ff88] bg-[#00ff88]/10' :
                                                    isRotated ? 'text-blue-400 bg-blue-400/10' : 'text-red-400 bg-red-400/10'
                                                }`}>
                                                {isOk ? 'OK' : isRotated ? 'ROTADO' : 'FALLO'}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}

                {/* PÁGINAS VISITADAS — más recientes arriba */}
                {(loadingPages || sortedPages.length > 0) && (
                    <div className="mb-4">
                        <p className="text-[10px] font-black text-[#444] uppercase tracking-widest mb-2 flex items-center gap-2">
                            <History size={10} /> Páginas visitadas
                        </p>
                        <div className="bg-[#080808] border border-white/5 rounded-xl max-h-40 overflow-y-auto custom-scrollbar">
                            {loadingPages ? (
                                <p className="text-[10px] text-[#444] animate-pulse p-3">Cargando...</p>
                            ) : sortedPages.map((p, i) => (
                                <div key={p.id ?? i} className="flex items-center justify-between gap-2 px-3 py-2 border-b border-white/[0.04] last:border-0">
                                    <p className="text-[10px] text-[#888] truncate flex-1">
                                        {(() => { try { return new URL(p.url).hostname; } catch { return p.url; } })()}
                                    </p>
                                    <p className="text-[9px] text-[#555] font-mono shrink-0">
                                        {formatTime(p.timestamp)}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <button onClick={onClose} className="w-full py-3 bg-[#00ff88] text-black font-black uppercase rounded-xl text-xs hover:bg-[#00cc6a] transition-colors">
                    Entendido
                </button>
            </div>
        </div>
    );
};

// ─── NODE ITEM DRAWER ────────────────────────────────────────────────────────

export const NodeItemDrawer = ({ node, history, logs, onClose }: NodeDrawerProps) => {
    const logsEndRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        logsEndRef.current?.scrollIntoView({ behavior: 'instant' });
    }, [logs]);

    if (!node) return null;

    const isOnline = node.status === 'ONLINE';


    return (
        <>
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]" onClick={onClose} />
            <div className="fixed inset-y-0 right-0 w-full md:w-[450px] bg-[#0c0c0c] border-l border-white/10 z-[70] shadow-2xl flex flex-col animate-slide-in-right">

                {/* HEADER */}
                <div className="p-6 border-b border-white/5 flex justify-between items-start">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <h2 className="text-xl font-black text-white tracking-tighter italic">{node.name}</h2>
                            <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${isOnline ? 'bg-[#00ff88]/10 text-[#00ff88]' : 'bg-red-500/10 text-red-500'
                                }`}>
                                {node.status}
                            </span>
                        </div>
                        <p className="text-[10px] text-[#666] font-mono uppercase">{node.group} • {node.id}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg text-[#666] hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* CONTENT */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8">

                    {/* KEY METRICS */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-[#0a0a0a] border border-white/5 p-4 rounded-xl">
                            <div className="flex items-center gap-2 mb-2 text-[10px] font-bold text-[#666] uppercase">
                                <Clock size={12} /> Uptime
                            </div>
                            <p className="text-lg font-mono text-white">{node.uptime}</p>
                        </div>
                        <div className="bg-[#0a0a0a] border border-white/5 p-4 rounded-xl">
                            <div className="flex items-center gap-2 mb-2 text-[10px] font-bold text-[#666] uppercase">
                                <Shield size={12} /> Browsers
                            </div>
                            <p className="text-lg font-mono text-[#00ff88]">{node.openBrowsers}</p>
                        </div>
                    </div>

                    {/* CPU CHART */}
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-[10px] font-black text-[#444] uppercase tracking-widest flex items-center gap-2">
                                <Cpu size={12} /> CPU Trend
                            </h3>
                            {history.length > 0 && (
                                <span className="text-[10px] font-mono text-[#555]">
                                    {history[history.length - 1].cpu}%
                                </span>
                            )}
                        </div>
                        {history.length === 0 ? (
                            <div className="h-24 flex items-center justify-center border border-dashed border-white/5 rounded-lg">
                                <p className="text-[10px] text-[#333] uppercase">Sin datos aún...</p>
                            </div>
                        ) : (
                            <div className="h-24 flex items-end gap-[2px] bg-[#080808] border border-white/5 rounded-lg px-2 pt-2 pb-1 overflow-hidden">
                                {history.map((pt, i) => {
                                    const heightPct = Math.max(pt.cpu, 4);
                                    const isLast = i === history.length - 1;
                                    return (
                                        <div
                                            key={i}
                                            title={`${pt.time}: ${pt.cpu}%`}
                                            className={`flex-1 rounded-t-[2px] transition-all ${isLast
                                                    ? 'bg-[#3b82f6]'
                                                    : pt.cpu > 80 ? 'bg-red-500/70' : 'bg-[#3b82f6]/50'
                                                }`}
                                            style={{ height: `${heightPct}%` }}
                                        />
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* RAM CHART */}
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-[10px] font-black text-[#444] uppercase tracking-widest flex items-center gap-2">
                                <HardDrive size={12} /> RAM Trend
                            </h3>
                            {history.length > 0 && (
                                <span className="text-[10px] font-mono text-[#555]">
                                    {history[history.length - 1].ram}%
                                </span>
                            )}
                        </div>
                        {history.length === 0 ? (
                            <div className="h-24 flex items-center justify-center border border-dashed border-white/5 rounded-lg">
                                <p className="text-[10px] text-[#333] uppercase">Sin datos aún...</p>
                            </div>
                        ) : (
                            <div className="h-24 flex items-end gap-[2px] bg-[#080808] border border-white/5 rounded-lg px-2 pt-2 pb-1 overflow-hidden">
                                {history.map((pt, i) => {
                                const heightPct = Math.max(pt.ram, 4);
                                    const isLast = i === history.length - 1;
                                    return (
                                        <div
                                            key={i}
                                            title={`${pt.time}: ${pt.ram}%`}
                                            className={`flex-1 rounded-t-[2px] transition-all ${isLast
                                                    ? 'bg-purple-500'
                                                    : pt.ram > 85 ? 'bg-red-500/70' : 'bg-purple-500/50'
                                                }`}
                                            style={{ height: `${heightPct}%` }}
                                        />
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* LOGS */}
                    <div>
                        <h3 className="text-[10px] font-black text-[#444] uppercase tracking-widest mb-4 flex items-center gap-2">
                            <Terminal size={12} /> Node Events
                        </h3>
                        <div className="space-y-1 font-mono text-[9px] bg-[#050505] p-4 rounded-lg border border-white/5 h-48 overflow-y-auto custom-scrollbar">
                            {logs.length === 0 ? (
                                <p className="text-[#444]">&gt; Sin logs disponibles...</p>
                            ) : (
                                logs.map((log, i) => (
                                    <p key={i} className={
                                        log.level === 'WARNING' ? 'text-amber-500' :
                                            log.level === 'ERROR' ? 'text-red-500' :
                                                log.level === 'SUCCESS' ? 'text-[#00ff88]' : 'text-[#666]'
                                    }>
                                        &gt; [{new Date(log.timestamp).toLocaleTimeString()}] {log.message}
                                    </p>
                                ))
                            )}
                            <div ref={logsEndRef} />
                        </div>
                    </div>
                </div>

                {/* FOOTER */}
                <div className="p-4 border-t border-white/5 bg-[#0a0a0a]">
                    <button className="w-full py-3 bg-[#00ff88] text-black font-black uppercase rounded-xl hover:bg-[#00cc6a] transition-colors text-xs flex items-center justify-center gap-2">
                        <Activity size={16} /> Run Diagnostics
                    </button>
                </div>
            </div>
        </>
    );
};

// ─── ALERT MODAL ─────────────────────────────────────────────────────────────

export const AlertModal = ({
    alert,
    onClose,
    onAck,
}: {
    alert: Alert | null;
    onClose: () => void;
    onAck: (id: number) => void;
}) => {
    if (!alert) return null;

    return (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
            <div className="bg-[#0c0c0c] border border-white/10 rounded-2xl w-full max-w-md relative z-[90] p-6 shadow-2xl animate-fade-in-up">
                <button onClick={onClose} className="absolute right-4 top-4 text-[#666] hover:text-white">
                    <X size={20} />
                </button>

                <div className="flex items-center gap-3 mb-6">
                    <div className={`p-3 rounded-xl ${alert.severity === 'Critical' ? 'bg-red-500/10 text-red-500' : 'bg-amber-500/10 text-amber-500'
                        }`}>
                        <AlertTriangle size={24} />
                    </div>
                    <div>
                        <h3 className="text-lg font-black text-white uppercase tracking-tighter">System Alert</h3>
                        <p className="text-xs text-[#666] font-mono">{alert.time}</p>
                    </div>
                </div>

                <div className="bg-white/5 border border-white/5 rounded-xl p-4 mb-6">
                    <p className="text-sm font-bold text-[#ccc] mb-2">{alert.type}</p>
                    <p className="text-xs text-[#888]">{alert.message}</p>
                    {alert.nodeId && (
                        <p className="text-[10px] text-[#555] font-mono mt-4 uppercase">Source: {alert.nodeId}</p>
                    )}
                </div>

                <div className="flex gap-3">
                    <button onClick={onClose} className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-white font-bold rounded-xl border border-white/5 text-xs uppercase transition-colors">
                        Close
                    </button>
                    <button
                        onClick={() => { onAck(alert.id); onClose(); }}
                        className="flex-1 py-3 bg-[#00ff88] hover:bg-[#00cc6a] text-black font-black rounded-xl text-xs uppercase transition-colors"
                    >
                        Acknowledge
                    </button>
                </div>
            </div>
        </div>
    );
};

// ─────────────────────────────────────────────────────────────────────────────
// SessionHistoryModal (versión con filtro de fechas)
// ─────────────────────────────────────────────────────────────────────────────

// ─── TIPOS INTERNOS ───────────────────────────────────────────────────────────

interface DateRange {
    start: Date | null;
    end: Date | null;
}

// ─── CONSTANTES ───────────────────────────────────────────────────────────────

const MONTHS_ES = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];
const DAYS_ES = ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá'];


// ─────────────────────────────────────────────────────────────────────────────
// DateRangeCalendar
// Calendario de selección de rango de fechas con tema oscuro y acento verde.
// ─────────────────────────────────────────────────────────────────────────────

export const DateRangeCalendar: React.FC<{
    range: DateRange;
    onSelect: (date: Date) => void;
}> = ({ range, onSelect }) => {

    const today = React.useMemo(() => {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        return d;
    }, []);

    const [view, setView] = React.useState({
        y: today.getFullYear(),
        m: today.getMonth(),
    });
    const [hover, setHover] = React.useState<Date | null>(null);

    const goBack = () =>
        setView(v => v.m === 0 ? { y: v.y - 1, m: 11 } : { ...v, m: v.m - 1 });
    const goNext = () =>
        setView(v => v.m === 11 ? { y: v.y + 1, m: 0 } : { ...v, m: v.m + 1 });

    // Construir la cuadrícula del mes
    const firstDoW = new Date(view.y, view.m, 1).getDay();
    const daysInMonth = new Date(view.y, view.m + 1, 0).getDate();

    const cells: (Date | null)[] = [
        ...Array(firstDoW).fill(null),
        ...Array.from({ length: daysInMonth }, (_, i) => new Date(view.y, view.m, i + 1)),
    ];

    // ── Helpers de comparación ────────────────────────────────────────────────
    const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();

    const effectiveEnd: Date | null =
        range.end ??
        (range.start && hover && hover >= range.start ? hover : null);

    const isStart = (d: Date) => !!range.start && sameDay(d, range.start);
    const isEnd = (d: Date) => !!range.end && sameDay(d, range.end);
    const isSingle = !!(range.start && range.end && sameDay(range.start, range.end));
    const isInRange = (d: Date): boolean => {
        if (!range.start || !effectiveEnd) return false;
        return d > range.start && d < effectiveEnd;
    };
    const isTodayDate = (d: Date) => sameDay(d, today);

    return (
        <div className="w-full select-none">
            {/* ── Navegación de mes ─────────────────────────────────────── */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-white/5">
                <button
                    onClick={goBack}
                    className="w-7 h-7 flex items-center justify-center text-lg leading-none text-[#666]
                               hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                >
                    ‹
                </button>
                <span className="text-[13px] font-black text-white tracking-wide">
                    {MONTHS_ES[view.m]} {view.y}
                </span>
                <button
                    onClick={goNext}
                    className="w-7 h-7 flex items-center justify-center text-lg leading-none text-[#666]
                               hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                >
                    ›
                </button>
            </div>

            <div className="px-4 pb-4 pt-2">
                {/* ── Cabecera de días ─────────────────────────────────────── */}
                <div className="grid grid-cols-7 mb-1">
                    {DAYS_ES.map(d => (
                        <div
                            key={d}
                            className="h-7 flex items-center justify-center
                                       text-[9px] font-black text-[#3a3a3a] uppercase tracking-wider"
                        >
                            {d}
                        </div>
                    ))}
                </div>

                {/* ── Cuadrícula de días ───────────────────────────────────── */}
                <div className="grid grid-cols-7">
                    {cells.map((date, idx) => {
                        if (!date) return <div key={`e-${idx}`} className="h-9" />;

                        const dateStart = isStart(date);
                        const dateEnd = isEnd(date);
                        const inRange = isInRange(date);
                        const future = date > today;
                        const todayD = isTodayDate(date);

                        // Semitransparencia de rango entre los extremos
                        const showFull = inRange;
                        const showRightHalf = dateStart && !isSingle &&
                            !!(range.end || (hover && range.start && hover > range.start));
                        const showLeftHalf = dateEnd && !isSingle;

                        return (
                            <div
                                key={`d-${idx}`}
                                className="relative h-9 flex items-center justify-center"
                            >
                                {/* Fondo de rango continuo */}
                                {showFull && <div className="absolute inset-y-[3px] inset-x-0 bg-[#00ff88]/[0.12]" />}
                                {showRightHalf && <div className="absolute inset-y-[3px] left-1/2 right-0 bg-[#00ff88]/[0.12]" />}
                                {showLeftHalf && <div className="absolute inset-y-[3px] left-0 right-1/2 bg-[#00ff88]/[0.12]" />}

                                <button
                                    disabled={future}
                                    onClick={() => !future && onSelect(date)}
                                    onMouseEnter={() => !future && setHover(date)}
                                    onMouseLeave={() => setHover(null)}
                                    className={[
                                        'relative z-10 w-8 h-8 rounded-full text-[11px] font-bold transition-all duration-150',
                                        future
                                            ? 'text-[#2a2a2a] cursor-not-allowed'
                                            : 'cursor-pointer',
                                        (dateStart || dateEnd)
                                            ? 'bg-[#00ff88] text-black font-black shadow-[0_0_14px_rgba(0,255,136,0.45)]'
                                            : '',
                                        !dateStart && !dateEnd && todayD
                                            ? 'ring-1 ring-[#00ff88]/60 text-[#00ff88]'
                                            : '',
                                        !dateStart && !dateEnd && inRange && !todayD
                                            ? 'text-white'
                                            : '',
                                        !dateStart && !dateEnd && !inRange && !todayD && !future
                                            ? 'text-[#999] hover:bg-white/10 hover:text-white'
                                            : '',
                                    ].filter(Boolean).join(' ')}
                                >
                                    {date.getDate()}
                                </button>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* ── Leyenda inferior ─────────────────────────────────────────── */}
            {(range.start || range.end) && (
                <div className="px-5 pb-3 flex justify-between items-center border-t border-white/5 pt-2">
                    <span className="text-[9px] text-[#444] font-bold uppercase tracking-widest">Rango seleccionado</span>
                    <span className="text-[10px] font-black text-[#00ff88] font-mono">
                        {range.start
                            ? range.start.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })
                            : '—'}
                        {range.end && !sameDay(range.start!, range.end)
                            ? ` → ${range.end.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}`
                            : ''}
                    </span>
                </div>
            )}
        </div>
    );
};

// HELPERS de formato (internos al componente)
const _fmtSessionDate = (ts: string) => {
    try {
        const d = new Date(ts);
        return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })
            + ' · '
            + d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    } catch { return ts; }
};

const _fmtPageTime = (ts: string) => {
    try {
        return new Date(ts).toLocaleTimeString('es-ES', {
            hour: '2-digit', minute: '2-digit', second: '2-digit',
        });
    } catch { return ts; }
};

export const SessionHistoryModal = ({
    isOpen,
    events: _eventsIgnored = [],   // ya no usamos el prop, el modal es auto-fetch
    profileId,
    onClose,
}: {
    isOpen: boolean;
    events: SystemEvent[];     // mantenemos la firma para retrocompatibilidad
    profileId: string | null;
    onClose: () => void;
}) => {
    // ── Estado del filtro de fechas ───────────────────────────────────────────
    type DateMode = 'today' | 'range';
    const [dateMode, setDateMode] = React.useState<DateMode>('today');
    const [range, setRange] = React.useState<DateRange>({ start: null, end: null });
    const [showCal, setShowCal] = React.useState(false);
    const calContainerRef = React.useRef<HTMLDivElement>(null);

    // ── Datos auto-fetched ────────────────────────────────────────────────────
    const [sessions, setSessions] = React.useState<SystemEvent[]>([]);
    const [totalCount, setTotalCount] = React.useState(0);
    const [fetching, setFetching] = React.useState(false);

    // ── Acordeón de visitas ───────────────────────────────────────────────────
    const [expandedId, setExpandedId] = React.useState<string | null>(null);
    const [pagesCache, setPagesCache] = React.useState<Record<string, any[]>>({});
    const [loadingPageId, setLoadingPageId] = React.useState<string | null>(null);

    // ── Cerrar calendario al click fuera ─────────────────────────────────────
    React.useEffect(() => {
        if (!showCal) return;
        const handler = (e: MouseEvent) => {
            if (calContainerRef.current && !calContainerRef.current.contains(e.target as Node)) {
                setShowCal(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [showCal]);

    // ── Helpers de rango ISO ──────────────────────────────────────────────────
    const startOfDay = (d: Date) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
    const endOfDay = (d: Date) => { const x = new Date(d); x.setHours(23, 59, 59, 999); return x; };

    const getISOParams = React.useCallback((): {
        dateFrom?: string;
        dateTo?: string;
    } => {
        if (dateMode === 'today') {
            const now = new Date();
            return {
                dateFrom: startOfDay(now).toISOString(),
                dateTo: endOfDay(now).toISOString(),
            };
        }
        if (range.start) {
            return {
                dateFrom: startOfDay(range.start).toISOString(),
                dateTo: endOfDay(range.end ?? range.start).toISOString(),
            };
        }
        return {};
    }, [dateMode, range]);

    // ── Fetch de sesiones ────────────────────────────────────────────────────
    const fetchSessions = React.useCallback(async () => {
        if (!profileId) return;
        setFetching(true);
        try {
            const params = getISOParams();
            const data = await orchestratorService.getProfileHistoryFiltered(profileId, {
                ...params,
                limit: 50,
            });
            const mapped: SystemEvent[] = (data.items ?? []).map((s: any) => ({
                id: s.id.toString(),
                type: (
                    s.status === 'closed' ? 'SUCCESS' :
                        s.status === 'crashed' ? 'ERROR' : 'INFO'
                ) as SystemEvent['type'],
                message: [
                    s.agent_name ?? 'Agent',
                    s.target_url
                        ? (() => { try { return new URL(s.target_url).hostname; } catch { return s.target_url; } })()
                        : 'N/A',
                    `${s.duration_seconds ?? 0}s`,
                    `${(s.total_data_mb ?? 0).toFixed(1)} MB`,
                ].join(' · '),
                source: `Computer #${s.computer_id}`,
                timestamp: s.requested_at,
                meta: {
                    session_id: s.id,
                    computer_id: s.computer_id,
                    target_url: s.target_url,
                    duration_s: s.duration_seconds,
                    data_mb: s.total_data_mb,
                },
            } as SystemEvent));
            setSessions(mapped);
            setTotalCount(data.total ?? mapped.length);
        } catch {
            setSessions([]);
            setTotalCount(0);
        } finally {
            setFetching(false);
        }
    }, [profileId, getISOParams]);

    // ── Efecto principal: resetear al abrir/cerrar ────────────────────────────
    React.useEffect(() => {
        if (!isOpen) {
            // Reset al cerrar (sin re-fetch)
            setDateMode('today');
            setRange({ start: null, end: null });
            setShowCal(false);
            setExpandedId(null);
            setPagesCache({});
            return;
        }
        // Fetch al abrir
        fetchSessions();
        setExpandedId(null);
        setPagesCache({});
    }, [isOpen, profileId]);  // no depende de fetchSessions para evitar loops

    // ── Efecto secundario: refetch al cambiar filtros ─────────────────────────
    React.useEffect(() => {
        if (!isOpen || !profileId) return;
        if (dateMode === 'range' && !range.start) return;   // esperar selección
        fetchSessions();
        setExpandedId(null);
        setPagesCache({});
    }, [dateMode, range.start?.toISOString(), range.end?.toISOString()]);   // eslint-disable-line

    // ── Selección de fecha en el calendario ───────────────────────────────────
    const handleCalSelect = (date: Date) => {
        setRange(prev => {
            // Si no hay inicio o ya hay rango completo → nuevo inicio
            if (!prev.start || prev.end !== null) {
                return { start: date, end: null };
            }
            // Mismo día → día único
            if (date.toDateString() === prev.start.toDateString()) {
                setTimeout(() => setShowCal(false), 120);
                return { start: date, end: date };
            }
            // Antes del inicio → intercambiar
            if (date < prev.start) {
                return { start: date, end: null };
            }
            // Fin válido → cerrar calendario
            setTimeout(() => setShowCal(false), 120);
            return { start: prev.start, end: date };
        });
        setDateMode('range');
    };

    // ── Etiqueta del botón "Elige fecha" ──────────────────────────────────────
    const rangeLabel = React.useMemo(() => {
        if (!range.start) return 'Elige fecha';
        const fmt = (d: Date) =>
            d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
        if (!range.end || range.start.toDateString() === range.end.toDateString()) {
            return fmt(range.start);
        }
        return `${fmt(range.start)} – ${fmt(range.end)}`;
    }, [range]);

    // ── Acordeón de páginas visitadas ────────────────────────────────────────
    const handleToggle = React.useCallback(async (ev: SystemEvent) => {
        if (expandedId === ev.id) { setExpandedId(null); return; }
        setExpandedId(ev.id);
        if (pagesCache[ev.id] !== undefined) return;

        const sessionId = (ev as any).meta?.session_id ?? ev.id;
        setLoadingPageId(ev.id);
        try {
            const r = await fetch(`/api/v1/admin/sessions/${sessionId}/events`);
            const d = await r.json();
            const pages = (d.events ?? [])
                .filter((e: any) => e.type === 'page_visit' || e.url)
                .sort((a: any, b: any) =>
                    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
                );
            setPagesCache(prev => ({ ...prev, [ev.id]: pages }));
        } catch {
            setPagesCache(prev => ({ ...prev, [ev.id]: [] }));
        } finally {
            setLoadingPageId(null);
        }
    }, [expandedId, pagesCache]);

    if (!isOpen || !profileId) return null;

    const hasRange = dateMode === 'range' && !!range.start;

    // ── RENDER ────────────────────────────────────────────────────────────────
    return (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Panel */}
            <div
                className="bg-[#0c0c0c] border border-white/10 rounded-2xl w-full max-w-lg
                           relative z-[90] shadow-2xl animate-fade-in-up flex flex-col max-h-[88vh]"
            >
                {/* ── Botón cerrar ─────────────────────────────────────────── */}
                <button
                    onClick={onClose}
                    className="absolute right-4 top-4 text-[#666] hover:text-white transition-colors z-10"
                >
                    <X size={20} />
                </button>

                {/* ── Header ───────────────────────────────────────────────── */}
                <div className="px-6 pt-6 pb-4 border-b border-white/5 shrink-0">
                    <div className="flex items-center gap-3 mb-1">
                        <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-500">
                            <History size={20} />
                        </div>
                        <div>
                            <h3 className="text-lg font-black text-white uppercase tracking-tighter italic">
                                Session History
                            </h3>
                            <p className="text-[10px] text-[#555] font-mono mt-0.5">
                                Perfil #{profileId}
                                {!fetching && (
                                    <span className="ml-2 text-[#444]">
                                        · {totalCount} sesión{totalCount !== 1 ? 'es' : ''}
                                    </span>
                                )}
                            </p>
                        </div>
                    </div>

                    {/* ── Filtro de fechas ─────────────────────────────────── */}
                    <div className="mt-4" ref={calContainerRef}>

                        {/* Píldoras de selección */}
                        <div
                            className="inline-flex items-center gap-1 p-1 rounded-full
                                       bg-black/60 border border-white/[0.07]"
                        >
                            {/* Hoy */}
                            <button
                                onClick={() => {
                                    setDateMode('today');
                                    setRange({ start: null, end: null });
                                    setShowCal(false);
                                }}
                                className={[
                                    'px-4 py-1.5 rounded-full text-[11px] font-black uppercase tracking-wider transition-all duration-200',
                                    dateMode === 'today'
                                        ? 'bg-white text-black shadow-md'
                                        : 'text-[#555] hover:text-[#aaa]',
                                ].join(' ')}
                            >
                                Hoy
                            </button>

                            {/* Elige fecha */}
                            <button
                                onClick={() => {
                                    setDateMode('range');
                                    setShowCal(v => !v);
                                }}
                                className={[
                                    'px-4 py-1.5 rounded-full text-[11px] font-black uppercase tracking-wider transition-all duration-200',
                                    hasRange
                                        ? 'bg-[#00ff88] text-black shadow-[0_0_12px_rgba(0,255,136,0.3)]'
                                        : dateMode === 'range'
                                            ? 'bg-[#00ff88]/15 text-[#00ff88] border border-[#00ff88]/30'
                                            : 'text-[#555] hover:text-[#aaa]',
                                ].join(' ')}
                            >
                                {rangeLabel}
                            </button>
                        </div>

                        {/* ── Calendario desplegable ────────────────────── */}
                        <div
                            className={[
                                'overflow-hidden transition-all duration-300 ease-in-out',
                                showCal ? 'max-h-[340px] opacity-100 mt-3' : 'max-h-0 opacity-0',
                            ].join(' ')}
                        >
                            <div
                                className="bg-[#080808] border border-white/[0.08] rounded-2xl
                                           shadow-2xl shadow-black/60 overflow-hidden"
                            >
                                <DateRangeCalendar range={range} onSelect={handleCalSelect} />
                            </div>
                        </div>

                        {/* Indicador de rango activo (cuando calendario está cerrado) */}
                        {hasRange && !showCal && (
                            <div className="flex items-center justify-between mt-2 px-1">
                                <div className="flex items-center gap-2">
                                    <div className="size-1.5 rounded-full bg-[#00ff88] animate-pulse" />
                                    <span className="text-[9px] text-[#00ff88] font-black uppercase tracking-widest">
                                        Filtro activo
                                    </span>
                                </div>
                                <button
                                    onClick={() => {
                                        setRange({ start: null, end: null });
                                        setDateMode('today');
                                    }}
                                    className="text-[9px] text-[#555] hover:text-red-400 font-bold
                                               uppercase tracking-wider transition-colors"
                                >
                                    Limpiar ×
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* ── Lista de sesiones ─────────────────────────────────────── */}
                <div className="flex-1 overflow-y-auto custom-scrollbar px-6 py-4 space-y-2 min-h-0">

                    {/* Estado: cargando */}
                    {fetching && (
                        <div className="space-y-2">
                            {[1, 2, 3].map(i => (
                                <div
                                    key={i}
                                    className="h-14 bg-white/[0.03] rounded-xl border border-white/5 animate-pulse"
                                />
                            ))}
                        </div>
                    )}

                    {/* Estado: sin resultados */}
                    {!fetching && sessions.length === 0 && (
                        <div
                            className="py-14 flex flex-col items-center justify-center
                                       border border-dashed border-white/5 rounded-2xl"
                        >
                            <History size={22} className="text-[#2a2a2a] mb-3" />
                            <p className="text-[11px] text-[#3a3a3a] font-black uppercase tracking-widest">
                                Sin sesiones
                            </p>
                            <p className="text-[10px] text-[#2a2a2a] mt-1">
                                {dateMode === 'today'
                                    ? 'No hay sesiones hoy'
                                    : 'Prueba con un rango diferente'}
                            </p>
                        </div>
                    )}

                    {/* Lista de sesiones */}
                    {!fetching && sessions.map(ev => {
                        const isOpenItem = expandedId === ev.id;
                        const isLoadingPg = loadingPageId === ev.id;
                        const pages = pagesCache[ev.id] ?? [];

                        const dotColor =
                            ev.type === 'SUCCESS' ? 'bg-[#00ff88]' :
                                ev.type === 'ERROR' ? 'bg-red-500' : 'bg-blue-400';

                        const borderColor =
                            ev.type === 'SUCCESS' ? 'border-[#00ff88]/15' :
                                ev.type === 'ERROR' ? 'border-red-500/15' : 'border-white/8';

                        return (
                            <div
                                key={ev.id}
                                className={[
                                    'rounded-xl border transition-all overflow-hidden',
                                    isOpenItem
                                        ? `${borderColor} bg-white/[0.025]`
                                        : 'border-white/5 bg-[#0a0a0a] hover:bg-white/[0.035]',
                                ].join(' ')}
                            >
                                {/* Fila clickeable */}
                                <button
                                    onClick={() => handleToggle(ev)}
                                    className="w-full text-left p-4 flex items-start gap-3"
                                >
                                    <div className={`shrink-0 size-2.5 rounded-full mt-1.5 ${dotColor}`} />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-bold text-white truncate">
                                            {ev.message}
                                        </p>
                                        <div className="flex items-center gap-2.5 mt-1 flex-wrap">
                                            <span className={[
                                                'text-[9px] font-black uppercase tracking-wider',
                                                ev.type === 'SUCCESS' ? 'text-[#00ff88]' :
                                                    ev.type === 'ERROR' ? 'text-red-400' : 'text-blue-400',
                                            ].join(' ')}>
                                                {ev.type === 'SUCCESS' ? 'cerrada' :
                                                    ev.type === 'ERROR' ? 'crash' : 'activa'}
                                            </span>
                                            <span className="text-[9px] text-[#555] font-mono">
                                                {_fmtSessionDate(ev.timestamp)}
                                            </span>
                                            {(ev as any).meta?.computer_id && (
                                                <span className="text-[9px] text-[#3a3a3a] font-mono uppercase hidden sm:inline">
                                                    Computer #{(ev as any).meta.computer_id}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <ChevronRight
                                        size={14}
                                        className={[
                                            'text-[#333] shrink-0 mt-0.5 transition-transform duration-200',
                                            isOpenItem ? 'rotate-90 text-[#00ff88]' : '',
                                        ].join(' ')}
                                    />
                                </button>

                                {/* Acordeón: páginas visitadas */}
                                {isOpenItem && (
                                    <div className="px-4 pb-4 border-t border-white/5">
                                        <p className="text-[9px] font-black text-[#3a3a3a] uppercase
                                                      tracking-widest pt-3 pb-2 flex items-center gap-2">
                                            <History size={9} />
                                            Páginas visitadas
                                            {pages.length > 0 && (
                                                <span className="text-[#2a2a2a]">· {pages.length}</span>
                                            )}
                                        </p>

                                        {isLoadingPg ? (
                                            <div className="flex items-center gap-2 py-3 px-2">
                                                <RefreshCw size={11} className="text-[#00ff88] animate-spin" />
                                                <p className="text-[10px] text-[#444] animate-pulse">
                                                    Cargando páginas...
                                                </p>
                                            </div>
                                        ) : pages.length === 0 ? (
                                            <div
                                                className="py-4 border border-dashed border-white/5
                                                           rounded-lg text-center"
                                            >
                                                <p className="text-[10px] text-[#2a2a2a] italic">
                                                    Sin páginas registradas
                                                </p>
                                            </div>
                                        ) : (
                                            <div
                                                className="bg-[#060606] border border-white/5 rounded-xl
                                                           overflow-hidden max-h-56 overflow-y-auto custom-scrollbar"
                                            >
                                                {pages.map((page: any, pi: number) => {
                                                    let hostname = page.url ?? '';
                                                    try { hostname = new URL(page.url).hostname; } catch { }
                                                    const title = page.title || page.extra?.title || null;

                                                    return (
                                                        <div
                                                            key={page.id ?? pi}
                                                            className="flex items-center gap-3 px-3 py-2.5
                                                                       border-b border-white/[0.04] last:border-0
                                                                       hover:bg-white/[0.025] transition-colors"
                                                        >
                                                            <span className="text-[9px] text-[#2a2a2a] font-mono w-4 shrink-0 text-right">
                                                                {pi + 1}
                                                            </span>
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-[11px] font-bold text-[#bbb] truncate">
                                                                    {hostname}
                                                                </p>
                                                                {title && (
                                                                    <p className="text-[9px] text-[#444] truncate mt-0.5">
                                                                        {title}
                                                                    </p>
                                                                )}
                                                            </div>
                                                            <span className="text-[9px] text-[#3a3a3a] font-mono shrink-0">
                                                                {_fmtPageTime(page.timestamp)}
                                                            </span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* ── Footer ───────────────────────────────────────────────── */}
                <div className="px-6 pb-6 pt-4 border-t border-white/5 shrink-0">
                    <button
                        onClick={onClose}
                        className="w-full py-3 bg-[#00ff88]/10 hover:bg-[#00ff88]/15
                                   text-[#00ff88] font-black rounded-xl border border-[#00ff88]/20
                                   text-xs uppercase tracking-widest transition-colors"
                    >
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    );
};

// ─── JOB DRAWER ──────────────────────────────────────────────────────────────

export const JobDrawer = ({ job, onClose }: { job: Job | null; onClose: () => void }) => {
    if (!job) return null;

    const isRunning = job.status === 'RUNNING';
    const isFailed = job.status === 'FAILED';

    return (
        <>
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]" onClick={onClose} />
            <div className="fixed inset-y-0 right-0 w-full md:w-[500px] bg-[#0c0c0c] border-l border-white/10 z-[70] shadow-2xl flex flex-col animate-slide-in-right">
                <div className="p-6 border-b border-white/5 flex justify-between items-start">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <h2 className="text-xl font-black text-white tracking-tighter italic">{job.name}</h2>
                            <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${isRunning ? 'bg-blue-500/10 text-blue-500' :
                                    isFailed ? 'bg-red-500/10 text-red-500' :
                                        'bg-[#00ff88]/10 text-[#00ff88]'
                                }`}>
                                {job.status}
                            </span>
                        </div>
                        <p className="text-[10px] text-[#666] font-mono uppercase">{job.type} • {job.id}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg text-[#666] hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8">
                    <div className="bg-[#0a0a0a] border border-white/5 p-4 rounded-xl">
                        <div className="flex justify-between items-end mb-2">
                            <span className="text-[10px] font-bold text-[#666] uppercase">Progress</span>
                            <span className="text-lg font-mono text-white">{job.progress}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden mb-4">
                            <div
                                className={`h-full rounded-full transition-all ${isFailed ? 'bg-red-500' : 'bg-[#00ff88]'}`}
                                style={{ width: `${job.progress}%` }}
                            />
                        </div>
                        <div className="flex justify-between text-[10px] font-mono text-[#555] border-t border-white/5 pt-2">
                            <span>Tasks: {job.completedTasks}/{job.totalTasks}</span>
                            <span>Start: {job.startTime}</span>
                        </div>
                        {job.barrierStatus && (
                            <div className={`mt-4 p-3 rounded-lg border flex items-center gap-3 ${job.barrierStatus === 'SYNCED' ? 'bg-[#00ff88]/5 border-[#00ff88]/20 text-[#00ff88]' :
                                    job.barrierStatus === 'TIMEOUT' ? 'bg-red-500/5 border-red-500/20 text-red-500' :
                                        'bg-blue-500/5 border-blue-500/20 text-blue-500'
                                }`}>
                                <Activity size={16} />
                                <div>
                                    <p className="text-[10px] font-black uppercase">Barrier Status: {job.barrierStatus}</p>
                                    <p className="text-[9px] opacity-70">Waiting for all threads to synchronize...</p>
                                </div>
                            </div>
                        )}
                    </div>

                    <div>
                        <h3 className="text-[10px] font-black text-[#444] uppercase tracking-widest mb-4 flex items-center gap-2">
                            <Terminal size={12} /> Execution Logs
                        </h3>
                        <div className="bg-[#050505] p-4 rounded-lg border border-white/5 font-mono text-[10px] space-y-1.5 min-h-[200px] max-h-[400px] overflow-y-auto custom-scrollbar">
                            {job.logs.length === 0 ? (
                                <p className="text-[#444]">No logs available...</p>
                            ) : (
                                job.logs.map((log, i) => (
                                    <p key={i} className="text-[#888] border-b border-white/[0.02] pb-1 last:border-0">
                                        <span className="text-[#444] mr-2">[{i + 1}]</span>
                                        {log}
                                    </p>
                                ))
                            )}
                            {isRunning && <p className="animate-pulse text-[#00ff88]">&gt;_</p>}
                        </div>
                    </div>
                </div>

                <div className="p-4 border-t border-white/5 bg-[#0a0a0a]">
                    <button className="w-full py-3 bg-white/5 hover:bg-white/10 text-white font-bold rounded-xl border border-white/5 text-xs uppercase transition-colors">
                        Download Report
                    </button>
                </div>
            </div>
        </>
    );
};

// ─── DASH KPI MODAL ──────────────────────────────────────────────────────────

export const DashKPIModal = ({
    type,
    data,
    onClose,
}: {
    type: string | null;
    data: any;
    onClose: () => void;
}) => {
    if (!type) return null;

    const getTitle = () => {
        switch (type) {
            case 'NODES': return 'Computadoras Online';
            case 'PROFILES': return 'Perfiles Activos';
            case 'BROWSERS': return 'Navegadores Abiertos';
            case 'ALERTS': return 'Alertas Activas';
            case 'NETWORK_MONITOR': return 'Monitor de Red (Proxy/IP)';
            default: return 'Detalle';
        }
    };

    return (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
            <div className="bg-[#0c0c0c] border border-white/10 rounded-2xl w-full max-w-lg relative z-[90] p-6 shadow-2xl animate-fade-in-up max-h-[80vh] flex flex-col">
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <h3 className="text-xl font-black text-white italic">{getTitle()}</h3>
                        <p className="text-xs text-[#666]">Vista detallada y métricas rápidas</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg text-[#666] hover:text-white">
                        <X size={20} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2">
                    {data && data.length > 0 ? (
                        data.map((item: any, i: number) => (
                            <div key={i} className="p-3 bg-white/5 rounded-xl border border-white/5 flex justify-between items-center">
                                <div>
                                    <p className="text-sm font-bold text-white">{item.name || item.message || item.url}</p>
                                    <p className="text-[10px] text-[#666] uppercase">{item.status || item.severity || item.id}</p>
                                </div>
                                <div className="text-right">
                                    {type === 'NODES' && <span className="text-[#00ff88] text-xs font-mono">{item.cpu}% CPU</span>}
                                    {type === 'PROFILES' && <span className="text-blue-500 text-xs font-mono">{item.memory}MB</span>}
                                    {type === 'ALERTS' && <span className="text-red-500 text-xs font-bold">{item.severity}</span>}
                                    {type === 'BROWSERS' && <span className="text-amber-500 text-xs font-mono">{item.openBrowsers} Tabs</span>}
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="p-8 text-center text-[#444] italic">No hay datos disponibles</div>
                    )}
                </div>

                <div className="pt-4 mt-4 border-t border-white/5">
                    <button onClick={onClose} className="w-full py-3 bg-[#00ff88]/10 text-[#00ff88] font-bold rounded-xl border border-[#00ff88]/20 hover:bg-[#00ff88]/20 transition-all uppercase text-xs">
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    );
};



// ─── SECURITY CHECK MODAL ────────────────────────────────────────────────────

export const SecurityCheckModal = ({
    profile,
    onClose,
    onVerify,
}: {
    profile: ProfileItem | null;
    onClose: () => void;
    onVerify: (id: string) => void;
}) => {
    if (!profile) return null;

    const browserScore    = profile.browserScore    || 0;
    const isCookiesOk     = profile.cookieStatus    === 'OK';
    const result          = (profile as any).verifyResult as import('../types/orchestratorTypes').VerifyResult | undefined;
    const [verifying, setVerifying] = React.useState(false);

    const scoreColor = (s: number) =>
        s >= 80 ? 'text-[#00ff88]' : s >= 60 ? 'text-amber-500' : 'text-red-500';
    const scoreBg = (s: number) =>
        s >= 80 ? 'bg-[#00ff88]/5 border-[#00ff88]/20' : s >= 60 ? 'bg-amber-500/5 border-amber-500/20' : 'bg-red-500/5 border-red-500/20';

    const gradeColor = (g?: string) => (({
        EXCELENTE: 'text-[#00ff88] bg-[#00ff88]/10 border-[#00ff88]/30',
        BUENO:     'text-blue-400 bg-blue-400/10 border-blue-400/30',
        REGULAR:   'text-amber-500 bg-amber-500/10 border-amber-500/30',
        DÉBIL:     'text-red-500 bg-red-500/10 border-red-500/30',
    } as Record<string, string>)[g ?? 'DÉBIL'] ?? 'text-red-500 bg-red-500/10 border-red-500/30');

    const handleVerify = async () => {
        setVerifying(true);
        await onVerify(profile.id);
        setVerifying(false);
    };

    return (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
            <div className="bg-[#0c0c0c] border border-white/10 rounded-2xl w-full max-w-lg relative z-[90] p-6 shadow-2xl animate-fade-in-up max-h-[90vh] overflow-y-auto custom-scrollbar">
                <button onClick={onClose} className="absolute right-4 top-4 text-[#666] hover:text-white">
                    <X size={20} />
                </button>

                {/* HEADER */}
                <div className="flex items-center gap-4 mb-5">
                    <div className="p-4 rounded-xl bg-blue-500/10 text-blue-500">
                        <Shield size={24} />
                    </div>
                    <div className="flex-1">
                        <div className="flex items-center gap-3">
                            <h3 className="text-xl font-black text-white italic tracking-tighter">Seguridad & Cookies</h3>
                            {result?.grade && (
                                <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase border ${gradeColor(result.grade)}`}>
                                    {result.grade}
                                </span>
                            )}
                        </div>
                        <p className="text-xs text-[#666]">
                            Verificación de integridad para: <span className="text-white font-bold">{profile.name}</span>
                        </p>
                    </div>
                </div>

                {/* SCORES */}
                <div className="grid grid-cols-3 gap-3 mb-5">
                    <div className={`p-3 rounded-xl border text-center ${scoreBg(browserScore)}`}>
                        <p className={`text-2xl font-black ${scoreColor(browserScore)}`}>{browserScore}</p>
                        <p className="text-[9px] text-[#666] uppercase mt-1">Browser</p>
                    </div>
                    <div className={`p-3 rounded-xl border text-center ${scoreBg(profile.fingerprintScore ?? 0)}`}>
                        <p className={`text-2xl font-black ${scoreColor(profile.fingerprintScore ?? 0)}`}>{profile.fingerprintScore ?? 0}</p>
                        <p className="text-[9px] text-[#666] uppercase mt-1">Fingerprint</p>
                    </div>
                    <div className={`p-3 rounded-xl border text-center ${isCookiesOk ? 'bg-[#00ff88]/5 border-[#00ff88]/20' : 'bg-red-500/5 border-red-500/20'}`}>
                        <p className={`text-lg font-black mt-1 ${isCookiesOk ? 'text-[#00ff88]' : 'text-red-500'}`}>
                            {result?.cookie_count !== undefined ? result.cookie_count : (isCookiesOk ? '✓' : '✗')}
                        </p>
                        <p className="text-[9px] text-[#666] uppercase mt-1">
                            {result?.cookie_count !== undefined ? 'Cookies' : profile.cookieStatus}
                        </p>
                    </div>
                </div>

                {/* RESULTADO DETALLADO — solo si ya se verificó */}
                {result && (
                    <>
                        {/* BREAKDOWN */}
                        {result.breakdown && (
                            <div className="mb-4">
                                <p className="text-[10px] font-black text-[#444] uppercase tracking-widest mb-2">Checks</p>
                                <div className="grid grid-cols-2 gap-2">
                                    {([
                                        { key: 'automation_clean', label: 'Sin Automatización' },
                                        { key: 'webrtc_clean',     label: 'WebRTC OK'         },
                                        { key: 'webgl_real',       label: 'WebGL Real'         },
                                        { key: 'has_plugins',      label: 'Plugins OK'         },
                                        { key: 'has_cookies',      label: 'Cookies'            },
                                        { key: 'timezone_match',   label: 'Timezone Match'     },
                                    ] as const).map(({ key, label }) => {
                                        const val = (result.breakdown as any)[key];
                                        const isNull = val === null || val === undefined;
                                        return (
                                            <div key={key} className="flex items-center gap-2 p-2 bg-white/[0.02] rounded-lg border border-white/5">
                                                <div className={`size-2 rounded-full flex-shrink-0 ${isNull ? 'bg-[#333]' : val ? 'bg-[#00ff88]' : 'bg-red-500'}`} />
                                                <span className={`text-[10px] font-bold ${isNull ? 'text-[#444]' : val ? 'text-[#ccc]' : 'text-red-400'}`}>
                                                    {label}
                                                </span>
                                                {isNull && <span className="text-[9px] text-[#333] ml-auto">N/A</span>}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* ISSUES */}
                        {result.issues && result.issues.length > 0 && (
                            <div className="mb-4">
                                <p className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-2 flex items-center gap-1">
                                    <AlertTriangle size={10} /> Problemas ({result.issues.length})
                                </p>
                                <div className="space-y-1.5">
                                    {result.issues.map((issue, i) => (
                                        <div key={i} className="flex items-start gap-2 p-2.5 bg-red-500/5 border border-red-500/20 rounded-lg">
                                            <div className="size-1.5 rounded-full bg-red-500 flex-shrink-0 mt-1.5" />
                                            <p className="text-[11px] text-red-300 leading-tight">{issue}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* WARNINGS */}
                        {result.warnings && result.warnings.length > 0 && (
                            <div className="mb-4">
                                <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-2">
                                    Advertencias ({result.warnings.length})
                                </p>
                                <div className="space-y-1.5">
                                    {result.warnings.map((w, i) => (
                                        <div key={i} className="flex items-start gap-2 p-2.5 bg-amber-500/5 border border-amber-500/20 rounded-lg">
                                            <div className="size-1.5 rounded-full bg-amber-500 flex-shrink-0 mt-1.5" />
                                            <p className="text-[11px] text-amber-300 leading-tight">{w}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* FINGERPRINT RAW — colapsable */}
                        {result.raw_fingerprint && (
                            <details className="mb-4 group">
                                <summary className="text-[10px] font-black text-[#444] uppercase tracking-widest cursor-pointer hover:text-[#888] transition-colors list-none flex items-center gap-2">
                                    <ChevronRight size={10} className="group-open:rotate-90 transition-transform" />
                                    Fingerprint Raw
                                </summary>
                                <div className="mt-2 bg-[#080808] border border-white/5 rounded-xl p-3 font-mono text-[9px] text-[#888] space-y-1 max-h-40 overflow-y-auto custom-scrollbar">
                                    {Object.entries(result.raw_fingerprint).map(([k, v]) => {
                                        if (v === null || v === undefined) return null;
                                        const strVal = Array.isArray(v) ? v.join(', ') || '—' : String(v);
                                        const isAlert = (k === 'webdriver' && v === true)
                                            || (k === 'webrtcLeak' && v === true)
                                            || (k === 'automationProps' && Array.isArray(v) && v.length > 0);
                                        return (
                                            <div key={k} className="flex gap-2">
                                                <span className="text-[#555] flex-shrink-0 w-32">{k}</span>
                                                <span className={isAlert ? 'text-red-400 font-bold' : 'text-[#aaa]'}>
                                                    {strVal.length > 60 ? strVal.slice(0, 60) + '…' : strVal}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </details>
                        )}

                        {/* ERROR */}
                        {result.error && (
                            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                                <p className="text-[10px] text-red-400 font-mono">{result.error}</p>
                            </div>
                        )}
                    </>
                )}

                {/* BOTONES */}
                <div className="flex gap-2 mt-2">
                    <button
                        onClick={handleVerify}
                        disabled={verifying}
                        className="flex-1 py-3 bg-[#00ff88] text-black font-black uppercase text-xs rounded-xl hover:bg-[#00cc6a] transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {verifying
                            ? <><RefreshCw size={14} className="animate-spin" /> Verificando...</>
                            : <><CheckCircle2 size={14} /> {result ? 'Re-verificar' : 'Verificar Ahora'}</>
                        }
                    </button>
                    <button onClick={onClose} className="px-4 py-3 bg-white/5 text-white font-bold uppercase text-xs rounded-xl hover:bg-white/10 transition-colors">
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    );
};

// ─── SESSION START MODAL ─────────────────────────────────────────────────────

export const SessionStartModal = ({
    isOpen,
    onClose,
    profiles,
    onStart,
}: {
    isOpen: boolean;
    onClose: () => void;
    profiles: ProfileItem[];
        onStart: (ids: string[], url: string) => void;  // ← agrega url
}) => {
    const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
    const [filterMode, setFilterMode] = React.useState<'ALL' | 'OWNER' | 'BOOKIE'>('ALL');
    const [activeFilter, setActiveFilter] = React.useState<string | null>(null);

    const owners = Array.from(new Set(profiles.map(p => p.owner).filter(Boolean))) as string[];
    const bookies = Array.from(new Set(profiles.map(p => p.bookie).filter(Boolean))) as string[];

    const [loginMode, setLoginMode] = React.useState<'NORMAL' | 'DIRECT'>('NORMAL');
    const [selectedBookieUrl, setSelectedBookieUrl] = React.useState<string>('');

    // URLs quemadas de casas de apuestas
    const BOOKIE_URLS: Record<string, { label: string; url: string; color: string }> = {
        bet365: { label: 'Bet365', url: 'https://www.bet365.com', color: '#097b42' },
        betfair: { label: 'Betfair', url: 'https://www.betfair.com', color: '#f5a623' },
        '1xbet': { label: '1xBet', url: 'https://www.1xbet.com', color: '#1e5fa7' },
        pinnacle: { label: 'Pinnacle', url: 'https://www.pinnacle.com', color: '#d41515' },
        williamhill: { label: 'William Hill', url: 'https://www.williamhill.com', color: '#1a1a6e' },
        bwin: { label: 'Bwin', url: 'https://www.bwin.com', color: '#1a1a1a' },
        unibet: { label: 'Unibet', url: 'https://www.unibet.com', color: '#147b45' },
        betway: { label: 'Betway', url: 'https://betway.com', color: '#00b67a' },
        betsson: { label: 'Betsson', url: 'https://www.betsson.com', color: '#f5a623' },
        codere: { label: 'Codere', url: 'https://www.codere.com', color: '#c8a84b' },
        ecuabet: { label: 'Ecuabet', url: 'https://www.ecuabet.com', color: '#e63946' },
        interwetten: { label: 'Interwetten', url: 'https://www.interwetten.com', color: '#004c97' },
        betcris: { label: 'Betcris', url: 'https://www.betcris.com', color: '#1b3a6b' },
        marathonbet: { label: 'Marathonbet', url: 'https://www.marathonbet.com', color: '#00843d' },
        coolbet: { label: 'Coolbet', url: 'https://www.coolbet.com', color: '#f4d03f' },
    };

    // Calcular la URL final según modo
    const getFinalUrl = () => {
        if (loginMode === 'NORMAL') return 'https://www.google.com';
        return selectedBookieUrl || 'https://www.google.com';
    };

    if (!isOpen) return null;

    const filteredProfiles = profiles.filter(p => {
        if (filterMode === 'ALL') return true;
        if (filterMode === 'OWNER' && activeFilter) return p.owner === activeFilter;
        if (filterMode === 'BOOKIE' && activeFilter) return p.bookie === activeFilter;
        return true;
    });

    const toggleProfile = (id: string) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(pid => pid !== id) : [...prev, id]
        );
    };

    const toggleAll = () => {
        setSelectedIds(
            selectedIds.length === filteredProfiles.length ? [] : filteredProfiles.map(p => p.id)
        );
    };

    return (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
            <div className="bg-[#0c0c0c] border border-white/10 rounded-2xl w-full max-w-4xl relative z-[90] p-0 shadow-2xl animate-fade-in-up max-h-[85vh] flex overflow-hidden">

                {/* SIDEBAR */}
                <div className="w-1/3 bg-[#050505] border-r border-white/5 p-6 flex flex-col gap-6">
                    <div>
                        <h3 className="text-lg font-black text-white italic tracking-tighter mb-1">Filtrar Por</h3>
                        <p className="text-[10px] text-[#666]">Selecciona el criterio de búsqueda</p>
                    </div>
                    <div className="space-y-4">
                        <div className="flex bg-black p-1 rounded-xl border border-white/10">
                            {(['OWNER', 'BOOKIE'] as const).map(mode => (
                                <button
                                    key={mode}
                                    onClick={() => { setFilterMode(mode); setActiveFilter(null); }}
                                    className={`flex-1 py-2 text-[10px] font-black uppercase rounded-lg transition-colors ${filterMode === mode ? 'bg-[#00ff88] text-black' : 'text-[#666] hover:text-white'
                                        }`}
                                >
                                    {mode === 'OWNER' ? 'Dueños' : 'Bookies'}
                                </button>
                            ))}
                        </div>
                        <div className="overflow-y-auto custom-scrollbar h-[300px] pr-2 space-y-1">
                            {filterMode === 'ALL' && (
                                <div className="p-4 text-center text-[#444] text-xs italic">
                                    Selecciona un modo arriba.
                                </div>
                            )}
                            {filterMode === 'OWNER' && owners.map(owner => (
                                <button
                                    key={owner}
                                    onClick={() => setActiveFilter(owner)}
                                    className={`w-full text-left p-3 rounded-lg border text-[10px] font-bold uppercase transition-all ${activeFilter === owner
                                            ? 'bg-[#00ff88]/10 border-[#00ff88] text-[#00ff88]'
                                            : 'bg-white/5 border-transparent text-[#aaa] hover:bg-white/10'
                                        }`}
                                >
                                    {owner}
                                </button>
                            ))}
                            {filterMode === 'BOOKIE' && bookies.map(bookie => (
                                <button
                                    key={bookie}
                                    onClick={() => setActiveFilter(bookie)}
                                    className={`w-full text-left p-3 rounded-lg border text-[10px] font-bold uppercase transition-all ${activeFilter === bookie
                                            ? 'bg-[#00ff88]/10 border-[#00ff88] text-[#00ff88]'
                                            : 'bg-white/5 border-transparent text-[#aaa] hover:bg-white/10'
                                        }`}
                                >
                                    {bookie}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* MAIN */}
                <div className="flex-1 p-6 flex flex-col bg-[#0c0c0c]">
                    <div className="flex justify-between items-center mb-4">
                        <div>
                            <h3 className="text-xl font-black text-white italic tracking-tighter">Perfiles Disponibles</h3>
                            <p className="text-xs text-[#666]">
                                {filterMode === 'ALL' ? 'Mostrando todos' : `Filtrado por: ${activeFilter || 'Ninguno'}`}
                            </p>
                        </div>
                        <button onClick={onClose} className="text-[#666] hover:text-white"><X size={20} /></button>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar border border-white/5 rounded-xl bg-[#0a0a0a]">
                        <div className="grid grid-cols-12 gap-2 p-3 border-b border-white/5 text-[9px] font-black uppercase text-[#666] sticky top-0 bg-[#0a0a0a] z-10">
                            <div className="col-span-1 text-center">Sel</div>
                            <div className="col-span-4">Perfil</div>
                            <div className="col-span-3">Dueño</div>
                            <div className="col-span-2 text-center">Salud</div>
                            <div className="col-span-2 text-center">Score</div>
                        </div>
                        {filteredProfiles.length === 0 ? (
                            <div className="p-8 text-center text-[#444] text-xs uppercase italic">
                                No hay perfiles con este filtro
                            </div>
                        ) : filteredProfiles.map(p => (
                            <div
                                key={p.id}
                                onClick={() => toggleProfile(p.id)}
                                className={`grid grid-cols-12 gap-2 p-3 border-b border-white/5 items-center hover:bg-white/5 cursor-pointer transition-colors ${selectedIds.includes(p.id) ? 'bg-[#00ff88]/5' : ''
                                    }`}
                            >
                                <div className="col-span-1 flex justify-center">
                                    <div className={`size-4 rounded border flex items-center justify-center ${selectedIds.includes(p.id) ? 'bg-[#00ff88] border-[#00ff88]' : 'border-white/20'
                                        }`}>
                                        {selectedIds.includes(p.id) && <CheckCircle2 size={12} className="text-black" />}
                                    </div>
                                </div>
                                <div className="col-span-4 font-bold text-white text-xs truncate">{p.name}</div>
                                <div className="col-span-3 text-[10px] text-[#888] truncate">{p.owner || '-'}</div>
                                <div className="col-span-2 flex justify-center">
                                    <span className={`text-[10px] font-bold ${p.browserScore > 80 ? 'text-[#00ff88]' : 'text-red-500'}`}>
                                        {p.browserScore}%
                                    </span>
                                </div>
                                <div className="col-span-2 flex justify-center gap-1">
                                    {(p.browserScore || 0) > 60
                                        ? <Shield size={12} className="text-[#00ff88]" />
                                        : <AlertTriangle size={12} className="text-amber-500" />
                                    }
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* FOOTER DEL MODAL */}
                    <div className="mt-4 flex justify-between items-center">

                        {/* SELECTOR DE MODO */}
                        <div className="flex flex-col gap-2">
                            <div className="flex bg-black p-1 rounded-lg border border-white/10">
                                <button
                                    onClick={() => { setLoginMode('DIRECT'); }}
                                    className={`px-3 py-1 text-[9px] font-black rounded uppercase transition-colors ${loginMode === 'DIRECT'
                                            ? 'bg-[#00ff88] text-black'
                                            : 'text-[#666] hover:text-white'
                                        }`}
                                >
                                    Login Directo
                                </button>
                                <button
                                    onClick={() => { setLoginMode('NORMAL'); setSelectedBookieUrl(''); }}
                                    className={`px-3 py-1 text-[9px] font-black rounded uppercase transition-colors ${loginMode === 'NORMAL'
                                            ? 'bg-white/10 text-white'
                                            : 'text-[#666] hover:text-white'
                                        }`}
                                >
                                    Normal
                                </button>
                            </div>

                            {/* SELECTOR DE BOOKIE — solo visible en Login Directo */}
                            {loginMode === 'DIRECT' && (
                                <div className="flex flex-wrap gap-1.5 max-w-[360px] animate-in fade-in slide-in-from-top-1 duration-150">
                                    {Object.entries(BOOKIE_URLS).map(([key, bookie]) => (
                                        <button
                                            key={key}
                                            onClick={() => setSelectedBookieUrl(bookie.url)}
                                            className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase border transition-all ${selectedBookieUrl === bookie.url
                                                    ? 'border-[#00ff88]/60 bg-[#00ff88]/10 text-[#00ff88]'
                                                    : 'border-white/10 bg-white/5 text-[#888] hover:text-white hover:border-white/30'
                                                }`}
                                        >
                                            {bookie.label}
                                        </button>
                                    ))}
                                </div>
                            )}

                            
                        </div>

                        {/* BOTONES DERECHA */}
                        <div className="flex items-center gap-3">
                            <button
                                onClick={toggleAll}
                                className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white text-xs font-bold rounded-lg border border-white/5"
                            >
                                {selectedIds.length === filteredProfiles.length && filteredProfiles.length > 0 ? 'Nada' : 'Todos'}
                            </button>
                            <button
                                onClick={() => onStart(selectedIds, getFinalUrl())}
                                disabled={
                                    selectedIds.length === 0 ||
                                    (loginMode === 'DIRECT' && !selectedBookieUrl)
                                }
                                className="px-6 py-2 bg-[#00ff88] text-black font-black uppercase rounded-lg text-xs hover:bg-[#00cc6a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                <Play size={14} /> Iniciar ({selectedIds.length})
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// ─── CREATE PROFILE MODAL ────────────────────────────────────────────────────

export const CreateProfileModal = ({
    isOpen,
    onClose,
    onCreate,
}: {
    isOpen: boolean;
    onClose: () => void;
    onCreate: (data: any) => void;
}) => {
    const [soaxCountries, setSoaxCountries] = React.useState<{ code: string, name: string }[]>([]);
    const [soaxCities, setSoaxCities] = React.useState<string[]>([]);
    const [loadingCities, setLoadingCities] = React.useState(false);
    const [step, setStep] = React.useState(1);
    const [submitting, setSubmitting] = React.useState(false);
    const [form, setForm] = React.useState({
        name: '', owner: '', bookie: 'Bet365', sport: 'Fútbol',
        proxyType: 'RESIDENTIAL', country: 'ES', city: '', rotationMinutes: 30,
        warmupUrls: 'https://www.google.com\nhttps://www.youtube.com',
        deviceType: 'DESKTOP', os: 'Windows', screenRes: '1920x1080',
        language: 'es-ES', autoFingerprint: true, openOnCreate: false,
    });

    const set = (k: string, v: any) => setForm(prev => ({ ...prev, [k]: v }));

    const STEPS = ['Info General', 'Proxy / Red', 'Dispositivo', 'Resumen'];
    const BOOKIES = ['Bet365', '1xBet', 'Betfair', 'Pinnacle', 'William Hill', 'Bwin', 'Unibet', 'Codere', 'Betway'];
    const SPORTS = ['Fútbol', 'Tenis', 'Baloncesto', 'Béisbol', 'Hockey', 'Fórmula 1', 'eSports'];
    const COUNTRIES = soaxCountries.length > 0 ? soaxCountries.map(c => ({
        code: c.code.toUpperCase(),
        name: c.name
    })) : [
        { code: 'EC', name: 'Ecuador' },
        { code: 'CO', name: 'Colombia' }, { code: 'MX', name: 'México' },
        { code: 'ES', name: 'España' },
        { code: 'US', name: 'Estados Unidos' },
    ];
    const SCREENS_BY_DEVICE: Record<string, string[]> = {
        DESKTOP: ['1920x1080', '2560x1440', '1440x900', '1366x768'],
        TABLET: ['1280x800', '1024x768', '768x1024'],
        MOBILE: ['390x844', '414x896', '375x812', '360x780'],
    };

    const fieldCls = 'w-full bg-[#080808] border border-white/10 rounded-xl p-3 text-sm text-white focus:border-[#00ff88] outline-none transition-colors';
    const labelCls = 'text-[10px] font-black text-[#555] uppercase tracking-widest';

    const canNext = () => {
        if (step === 1) return form.name.trim().length > 0 && form.owner.trim().length > 0;
        if (step === 2) return form.country.length > 0;
        return true;
    };

    const handleSubmit = async () => {
        setSubmitting(true);
        try {
            await onCreate({
                name: form.name, owner: form.owner, bookie: form.bookie, sport: form.sport,
                proxy_type: form.proxyType, country: form.country, city: form.city || null,
                rotation_minutes: form.rotationMinutes,
                warmup_urls: form.warmupUrls.split('\n').map(u => u.trim()).filter(Boolean),
                device_type: form.deviceType, os: form.os, screen_res: form.screenRes,
                language: form.language, auto_fingerprint: form.autoFingerprint,
                open_on_create: form.openOnCreate,
            });
            // ← RESET después de crear exitosamente
            setStep(1);
            setForm({
                name: '', owner: '', bookie: 'Bet365', sport: 'Fútbol',
                proxyType: 'RESIDENTIAL', country: 'ES', city: '', rotationMinutes: 30,
                warmupUrls: 'https://www.google.com\nhttps://www.youtube.com',
                deviceType: 'DESKTOP', os: 'Windows', screenRes: '1920x1080',
                language: 'es-ES', autoFingerprint: true, openOnCreate: false,
            });
        } finally {
            setSubmitting(false);
        }
    };

    // Cargar países al abrir
    React.useEffect(() => {
        if (!isOpen) return;
        fetch('/api/v1/proxies/soax/countries')
            .then(r => r.json())
            .then(d => setSoaxCountries(d.countries ?? []))
            .catch(() => { });
    }, [isOpen]);

    // Cargar ciudades cuando cambia el país
    React.useEffect(() => {
        if (!form.country) return;
        setLoadingCities(true);
        setSoaxCities([]);
        fetch(`/api/v1/proxies/soax/cities?country=${form.country.toLowerCase()}&conn_type=mobile`)
            .then(r => r.json())
            .then(d => setSoaxCities(d.cities ?? []))
            .catch(() => { })
            .finally(() => setLoadingCities(false));
    }, [form.country]);


    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
            <div className="bg-[#0c0c0c] border border-white/10 rounded-2xl w-full max-w-2xl relative z-[90] shadow-2xl animate-fade-in-up flex flex-col max-h-[90vh]">
                <button onClick={onClose} className="absolute right-4 top-4 text-[#666] hover:text-white z-10">
                    <X size={20} />
                </button>

                {/* Header */}
                <div className="p-8 pb-4">
                    <h3 className="text-2xl font-black text-white italic tracking-tighter mb-4">Nuevo Perfill</h3>
                    <div className="flex gap-2 mb-1">
                        {STEPS.map((_, i) => (
                            <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-300 ${step > i ? 'bg-[#00ff88]' : step === i + 1 ? 'bg-[#00ff88]/60' : 'bg-white/10'
                                }`} />
                        ))}
                    </div>
                    <p className="text-[10px] font-black text-[#444] uppercase tracking-widest mt-2">
                        Paso {step} de {STEPS.length} — {STEPS[step - 1]}
                    </p>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto px-8 pb-2">

                    {step === 1 && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className={labelCls}>Nombre del Perfil *</label>
                                    <input className={fieldCls} placeholder="Ej: Bet365-ES-Jose" value={form.name} onChange={e => set('name', e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                    <label className={labelCls}>Propietario *</label>
                                    <input className={fieldCls} placeholder="Nombre del dueño" value={form.owner} onChange={e => set('owner', e.target.value)} />
                                </div>

                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-5 animate-in fade-in slide-in-from-right-4">
                            <div className="space-y-2">
                                <label className={labelCls}>Tipo de Proxy</label>
                                <div className="flex gap-2">
                                    {[
                                        { val: 'RESIDENTIAL', label: 'Residencial', desc: 'Mayor confianza' },
                                        { val: 'MOBILE_4G', label: 'Móvil 4G', desc: 'Anti-detección' },
                                        { val: 'DATACENTER', label: 'Datacenter', desc: 'Alta velocidad' },
                                    ].map(t => (
                                        <button
                                            key={t.val}
                                            onClick={() => set('proxyType', t.val)}
                                            className={`flex-1 p-3 rounded-xl border text-left transition-all ${form.proxyType === t.val
                                                    ? 'border-[#00ff88]/50 bg-[#00ff88]/5'
                                                    : 'border-white/10 bg-white/[0.02] hover:bg-white/5'
                                                }`}
                                        >
                                            <p className={`text-xs font-black uppercase ${form.proxyType === t.val ? 'text-[#00ff88]' : 'text-white'}`}>{t.label}</p>
                                            <p className="text-[10px] text-[#555] mt-0.5">{t.desc}</p>
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className={labelCls}>País de la IP *</label>
                                    <select className={fieldCls} value={form.country} onChange={e => set('country', e.target.value)}>
                                        {COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className={labelCls}>
                                        Ciudad (opcional) {loadingCities && <span className="text-[#00ff88] animate-pulse">— cargando...</span>}
                                    </label>
                                    <select className={fieldCls} value={form.city} onChange={e => set('city', e.target.value)}>
                                        <option value="">Cualquier ciudad</option>
                                        {soaxCities.map(c => (
                                            <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                           
                        </div>
                    )}

                    {step === 3 && (
                        <div className="space-y-5 animate-in fade-in slide-in-from-right-4">
                            <div className="space-y-2">
                                <label className={labelCls}>Tipo de Dispositivo</label>
                                <div className="flex gap-3">
                                    {[
                                        { val: 'DESKTOP', icon: '🖥️', label: 'Desktop' },
                                        { val: 'TABLET', icon: '📱', label: 'Tablet' },
                                        { val: 'MOBILE', icon: '📲', label: 'Mobile' },
                                    ].map(d => (
                                        <button
                                            key={d.val}
                                            onClick={() => {
                                                set('deviceType', d.val);
                                                if (d.val === 'MOBILE') { set('os', 'Android'); set('screenRes', '390x844'); }
                                                if (d.val === 'TABLET') { set('os', 'Android'); set('screenRes', '1280x800'); }
                                                if (d.val === 'DESKTOP') { set('os', 'Windows'); set('screenRes', '1920x1080'); }
                                            }}
                                            className={`flex-1 py-4 rounded-xl border text-center transition-all ${form.deviceType === d.val
                                                    ? 'border-[#00ff88]/50 bg-[#00ff88]/5'
                                                    : 'border-white/10 bg-white/[0.02] hover:bg-white/5'
                                                }`}
                                        >
                                            <div className="text-2xl mb-1">{d.icon}</div>
                                            <p className={`text-xs font-black uppercase ${form.deviceType === d.val ? 'text-[#00ff88]' : 'text-[#888]'}`}>{d.label}</p>
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className={labelCls}>Sistema Operativo</label>
                                    <select className={fieldCls} value={form.os} onChange={e => set('os', e.target.value)}>
                                        {(form.deviceType === 'DESKTOP' ? ['Windows', 'macOS', 'Linux'] : ['Android', 'iOS'])
                                            .map(o => <option key={o}>{o}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className={labelCls}>Resolución de Pantalla</label>
                                    <select className={fieldCls} value={form.screenRes} onChange={e => set('screenRes', e.target.value)}>
                                        {(SCREENS_BY_DEVICE[form.deviceType] || []).map(r => <option key={r}>{r}</option>)}
                                    </select>
                                </div>
                               
                            </div>
                           
                        </div>
                    )}

                    {step === 4 && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
                            <div className="bg-[#00ff88]/5 border border-[#00ff88]/20 rounded-xl p-4">
                                <p className="text-[10px] font-black text-[#00ff88] uppercase tracking-widest mb-3">Resumen de configuración</p>
                                <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs">
                                    {[
                                        ['Perfil', form.name],
                                        ['Propietario', form.owner],
                                        ['Bookie', form.bookie],
                                        ['Deporte', form.sport],
                                        ['Proxy', form.proxyType.replace('_', ' ')],
                                        ['País / Ciudad', `${form.country}${form.city ? ' / ' + form.city : ''}`],
                                        ['Dispositivo', `${form.deviceType} · ${form.os}`],
                                        ['Resolución', form.screenRes],
                                    ].map(([k, v]) => (
                                        <div key={k} className="flex justify-between border-b border-white/5 py-1">
                                            <span className="text-[#555] font-bold">{k}</span>
                                            <span className="text-white font-black truncate max-w-[120px]">{v}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            {form.openOnCreate && (
                                <div className="flex items-center gap-2 p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                                    <Play size={14} className="text-blue-400 flex-shrink-0" />
                                    <p className="text-xs text-blue-300">El navegador se abrirá automáticamente en la primera computadora online.</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-8 pt-4 flex justify-between items-center border-t border-white/5 mt-4">
                    {step > 1 ? (
                        <button onClick={() => setStep(s => s - 1)} className="px-6 py-3 bg-white/5 hover:bg-white/10 text-white font-bold uppercase rounded-xl text-xs transition-colors">
                            ← Atrás
                        </button>
                    ) : <div />}

                    {step < 4 ? (
                        <button
                            onClick={() => setStep(s => s + 1)}
                            disabled={!canNext()}
                            className={`px-8 py-3 font-black uppercase rounded-xl text-xs transition-all flex items-center gap-2 ${canNext() ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-white/5 text-[#444] cursor-not-allowed'
                                }`}
                        >
                            Siguiente <ChevronRight size={14} />
                        </button>
                    ) : (
                        <button
                            onClick={handleSubmit}
                            disabled={submitting}
                            className="px-8 py-3 bg-[#00ff88] hover:bg-[#00cc6a] text-black font-black uppercase rounded-xl text-xs transition-colors shadow-[0_0_20px_rgba(0,255,136,0.3)] flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {submitting ? <><RefreshCw size={14} className="animate-spin" /> Creando...</> : '✓ Crear Perfil'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

// ─── SYSTEM DIAGNOSTIC MODAL ─────────────────────────────────────────────────
export const SystemDiagnosticModal = ({
    isOpen, onClose, services = [], healthDetails,
}: {
    isOpen: boolean;
    onClose: () => void;
    services?: import('../types/orchestratorTypes').ServiceStatus[];
    healthDetails?: import('../types/orchestratorTypes').HealthDetails;
}) => {
    if (!isOpen) return null;
    const f = healthDetails?.factors;

    // Mapa de íconos por nombre de servicio
    const serviceIcon = (name: string) => {
        const n = name.toLowerCase();
        if (n.includes('database') || n.includes('db')) return <Server size={16} />;
        if (n.includes('redis')) return <Activity size={16} />;
        if (n.includes('proxy') || n.includes('soax')) return <RefreshCw size={16} />;
        if (n.includes('agent')) return <CheckCircle2 size={16} />;
        if (n.includes('ads')) return <Activity size={16} />;
        return <Info size={16} />;
    };

    const allOk = services.every(s => s.status === 'ONLINE');
    const degraded = services.filter(s => s.status !== 'ONLINE' && s.status !== 'UNKNOWN').length;
    const overallMsg = allOk
        ? 'Todos los servicios responden correctamente.'
        : `${degraded} servicio(s) con problemas — revisar conexiones.`;

    const factors = healthDetails ? [
        {
            label: 'Disponibilidad de Nodos',
            value: f ? `${f.nodesOnline}/${f.nodesTotal}` : '—',
            score: healthDetails.nodeScore,
        },
        {
            label: 'Éxito de Proxies SOAX',
            value: f ? `${Math.round(f.proxySuccessRate)}%` : '—',
            score: healthDetails.proxyScore,
        },
        {
            label: 'Gestión de Alertas',
            value: f ? `${f.criticalAlerts} críticas` : '—',
            score: healthDetails.alertScore,
        },
        // {
        //     label: 'Estado AdsPower',
        //     value: f ? (f.adspowerHealthy ? 'Operativo' : 'Offline') : '—',
        //     score: healthDetails.adspowerScore,
        // },
        {
            label: 'Base de Datos + Redis',
            value: f ? `DB ${f.dbHealthy ? '✓' : '✗'} · Redis ${f.redisHealthy ? '✓' : '✗'}` : '—',
            score: healthDetails.infraScore,
        },
    ] : [];

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
            <div className="bg-[#0c0c0c] border border-white/10 rounded-2xl w-full max-w-lg relative z-[110] p-6 shadow-2xl animate-fade-in-up max-h-[90vh] overflow-y-auto custom-scrollbar">
                <button onClick={onClose} className="absolute right-4 top-4 text-[#666] hover:text-white"><X size={20} /></button>

                <div className="flex items-center gap-4 mb-5">
                    <div className={`p-3 rounded-xl ${allOk ? 'bg-[#00ff88]/10 text-[#00ff88]' : 'bg-amber-500/10 text-amber-500'}`}>
                        <Activity size={24} />
                    </div>
                    <div>
                        <h3 className="text-xl font-black text-white italic tracking-tighter">Diagnóstico de Sistema</h3>
                        <p className="text-xs text-[#666]">Estado en tiempo real — {new Date().toLocaleTimeString()}</p>
                    </div>
                </div>

                {/* SERVICIOS REALES */}
                <div className="space-y-2 mb-5">
                    <p className="text-[10px] font-black text-[#444] uppercase tracking-widest mb-2">Servicios</p>
                    {services.length === 0 ? (
                        ['Database', 'Redis', 'Proxies', 'Agents', 'SOAX'].map(name => (
                            <div key={name} className="flex justify-between items-center p-3 bg-white/5 border border-white/5 rounded-xl animate-pulse">
                                <div className="flex items-center gap-3">
                                    <div className="size-2 rounded-full bg-white/20" />
                                    <span className="text-sm font-bold text-[#555]">{name}</span>
                                </div>
                                <div className="h-3 w-16 bg-white/10 rounded" />
                            </div>
                        ))
                    ) : services.map((svc, i) => {
                        const isOnline = svc.status === 'ONLINE';
                        const isUnknown = svc.status === 'UNKNOWN' || !svc.status;
                        return (
                            <div key={i} className={`flex justify-between items-center p-3 border rounded-xl ${isOnline ? 'bg-[#00ff88]/[0.03] border-[#00ff88]/10' : isUnknown ? 'bg-white/5 border-white/5' : 'bg-red-500/[0.03] border-red-500/10'}`}>
                                <div className="flex items-center gap-3">
                                    <div className={`size-2 rounded-full ${isOnline ? 'bg-[#00ff88] animate-pulse' : isUnknown ? 'bg-white/20' : 'bg-red-500'}`} />
                                    <span className="text-sm font-bold text-white">{svc.name}</span>
                                </div>
                                <div className="text-right">
                                    <span className={`block text-[10px] font-black uppercase ${isOnline ? 'text-[#00ff88]' : isUnknown ? 'text-[#444]' : 'text-red-400'}`}>
                                        {isUnknown ? 'MIDIENDO...' : svc.status}
                                    </span>
                                    {svc.latency > 0 && (
                                        <span className={`text-[9px] font-mono ${svc.latency < 100 ? 'text-[#00ff88]/60' : svc.latency < 400 ? 'text-amber-500/60' : 'text-red-400/60'}`}>
                                            {svc.latency}ms
                                        </span>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* HEALTH FACTORS */}
                {factors.length > 0 && (
                    <div className="mb-5">
                        <p className="text-[10px] font-black text-[#444] uppercase tracking-widest mb-2">Factores de Salud</p>
                        <div className="space-y-2">
                            {factors.map(fac => (
                                <div key={fac.label} className="flex items-center gap-3 p-2.5 bg-white/[0.02] border border-white/5 rounded-lg">
                                    <div className="flex-1">
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="text-[10px] font-bold text-[#999]">{fac.label}</span>
                                            <span className="text-[10px] font-mono text-[#666]">{fac.value}</span>
                                        </div>
                                        <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                                            <div
                                                className="h-full rounded-full transition-all duration-700"
                                                style={{
                                                    width: `${fac.score}%`,
                                                    background: fac.score > 80 ? '#00ff88' : fac.score > 50 ? '#f59e0b' : '#ef4444'
                                                }}
                                            />
                                        </div>
                                    </div>
                                    <span className={`text-[10px] font-black w-8 text-right ${fac.score > 80 ? 'text-[#00ff88]' : fac.score > 50 ? 'text-amber-500' : 'text-red-400'}`}>
                                        {fac.score}%
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* ESTADO GENERAL */}
                <div className={`p-3 rounded-xl mb-5 flex gap-3 ${allOk ? 'bg-[#00ff88]/5 border border-[#00ff88]/20' : 'bg-amber-500/5 border border-amber-500/20'}`}>
                    <Info size={16} className={allOk ? 'text-[#00ff88] shrink-0 mt-0.5' : 'text-amber-500 shrink-0 mt-0.5'} />
                    <div>
                        <p className={`text-xs font-bold ${allOk ? 'text-[#00ff88]' : 'text-amber-500'}`}>
                            {allOk ? 'Todo parece correcto' : 'Atención requerida'}
                        </p>
                        <p className="text-[10px] text-[#888] mt-1">{overallMsg}</p>
                        {f && f.activeSessions > 0 && (
                            <p className="text-[10px] text-[#666] mt-1">
                                {f.activeSessions} sesion(es) de browser activas en este momento.
                            </p>
                        )}
                    </div>
                </div>

                <div className="flex gap-3">
                    <button className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-white font-bold rounded-xl border border-white/5 text-xs uppercase transition-colors">
                        Ver Logs
                    </button>
                    <button onClick={onClose} className="flex-1 py-3 bg-[#00ff88] hover:bg-[#00cc6a] text-black font-black rounded-xl text-xs uppercase transition-colors">
                        Cerrar Diagnóstico
                    </button>
                </div>
            </div>
        </div>
    );
};
// ─── RESOURCE DETAIL MODAL ───────────────────────────────────────────────────

export const ResourceDetailModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
            <div className="bg-[#0c0c0c] border border-white/10 rounded-2xl w-full max-w-md relative z-[110] p-6 shadow-2xl animate-fade-in-up">
                <button onClick={onClose} className="absolute right-4 top-4 text-[#666] hover:text-white"><X size={20} /></button>
                <div className="flex items-center gap-4 mb-6">
                    <div className="p-3 bg-blue-500/10 text-blue-500 rounded-xl"><Cpu size={24} /></div>
                    <div>
                        <h3 className="text-xl font-black text-white italic tracking-tighter">Monitor de Recursos</h3>
                        <p className="text-xs text-[#666]">Consumo actual de hardware</p>
                    </div>
                </div>
                <div className="grid grid-cols-3 gap-3 mb-6">
                    {[
                        { label: 'CPU Total', value: '42%', color: 'text-[#00ff88]' },
                        { label: 'RAM Uso', value: '12GB', color: 'text-blue-500' },
                        { label: 'Red', value: '45mbps', color: 'text-amber-500' },
                    ].map(m => (
                        <div key={m.label} className="p-4 bg-[#0a0a0a] border border-white/5 rounded-xl text-center">
                            <p className="text-[10px] font-bold text-[#666] uppercase mb-1">{m.label}</p>
                            <p className={`text-2xl font-black ${m.color}`}>{m.value}</p>
                        </div>
                    ))}
                </div>
                <h4 className="text-[10px] font-black text-[#666] uppercase mb-3">Mayores Consumidores</h4>
                <div className="space-y-2 mb-6">
                    {[
                        { name: 'Node-01 (Main)', value: '85% CPU', color: 'text-red-500' },
                        { name: 'Node-04 (Incubator)', value: '60% CPU', color: 'text-amber-500' },
                        { name: 'DB Server', value: '15% CPU', color: 'text-[#00ff88]' },
                    ].map(item => (
                        <div key={item.name} className="flex justify-between items-center p-2 border-b border-white/5 text-xs text-[#ccc]">
                            <span>{item.name}</span>
                            <span className={`font-mono ${item.color}`}>{item.value}</span>
                        </div>
                    ))}
                </div>
                <button onClick={onClose} className="w-full py-3 bg-white/5 hover:bg-white/10 text-white font-bold rounded-xl border border-white/5 text-xs uppercase transition-colors">
                    Optimizar Memoria (GC)
                </button>
            </div>
        </div>
    );
};

// ─── JOB QUEUE MODAL ─────────────────────────────────────────────────────────

export const JobQueueModal = ({ isOpen, onClose, queue = 0, running = 0, failed = 0, pendingProfiles = [] }: {
    isOpen: boolean;
    onClose: () => void;
    queue?: number;
    running?: number;
    failed?: number;
    pendingProfiles?: any[];
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
            <div className="bg-[#0c0c0c] border border-white/10 rounded-2xl w-full max-w-lg relative z-[110] p-6 shadow-2xl animate-fade-in-up">
                <button onClick={onClose} className="absolute right-4 top-4 text-[#666] hover:text-white"><X size={20} /></button>
                <div className="flex items-center gap-4 mb-6">
                    <div className="p-3 bg-white/10 text-white rounded-xl"><Server size={24} /></div>
                    <div>
                        <h3 className="text-xl font-black text-white italic tracking-tighter">Gestor de Tareas</h3>
                        <p className="text-xs text-[#666]">Cola de procesamiento en tiempo real</p>
                    </div>
                </div>
                <div className="flex gap-4 mb-6">
                    {[
                        { val: queue.toString(), label: 'En Espera', cls: 'bg-white/5 border-white/5 text-white' },
                        { val: running.toString(), label: 'Procesando', cls: 'bg-[#00ff88]/10 border-[#00ff88]/20 text-[#00ff88]' },
                        { val: failed.toString(), label: 'Falladas', cls: 'bg-red-500/10 border-red-500/20 text-red-500' },
                    ].map(item => (
                        <div key={item.label} className={`flex-1 p-4 border rounded-xl text-center ${item.cls}`}>
                            <span className="block text-2xl font-black">{item.val}</span>
                            <span className="text-[9px] uppercase">{item.label}</span>
                        </div>
                    ))}
                </div>
                <div className="bg-[#0a0a0a] border border-white/5 rounded-xl p-4 mb-6 h-40 overflow-y-auto custom-scrollbar space-y-2">
                    <p className="text-[10px] font-bold text-[#444] uppercase mb-2">Próximas Tareas</p>
                    {pendingProfiles.map((p: any) => (
                        <div key={p.id} className="flex justify-between items-center text-xs text-[#ccc] p-2 bg-white/5 rounded">
                            <span>{p.name}</span>
                            <span className={`text-[10px] font-bold ${p.status?.includes('Rotando') ? 'text-blue-400 animate-pulse' : 'text-red-400'
                                }`}>
                                {p.status}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

// ─── PROXY HISTORY MODAL ─────────────────────────────────────────────────────
// Fetch eliminado — el padre maneja la carga y pasa logs como prop

export const ProxyHistoryModal = ({
    conn,
    logs = [],
    loading = false,
    onClose,
}: {
    conn: ConnectionItem | null;
    logs?: any[];
    loading?: boolean;
    onClose: () => void;
}) => {
    if (!conn) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
            <div className="bg-[#0c0c0c] border border-white/10 rounded-2xl w-full max-w-md relative z-[110] p-6 shadow-2xl animate-fade-in-up flex flex-col max-h-[80vh]">
                <button onClick={onClose} className="absolute right-4 top-4 text-[#666] hover:text-white">
                    <X size={20} />
                </button>

                <div className="flex items-center gap-3 mb-1">
                    <div className="p-3 rounded-xl bg-blue-500/10 text-blue-500">
                        <RefreshCw size={22} />
                    </div>
                    <div>
                        <h3 className="text-lg font-black text-white italic">Historial de Rotación</h3>
                        <p className="text-[10px] text-[#555] font-mono">{conn.url}</p>
                    </div>
                </div>

                <p className="text-[10px] font-black text-[#444] uppercase tracking-widest mb-4 ml-1">
                    {logs.length} rotaciones registradas
                </p>

                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {loading ? (
                        <div className="py-12 text-center">
                            <p className="text-[10px] text-[#444] animate-pulse uppercase tracking-widest">Cargando...</p>
                        </div>
                    ) : logs.length === 0 ? (
                        <div className="py-12 text-center border border-dashed border-white/5 rounded-xl">
                            <RefreshCw size={20} className="text-[#333] mx-auto mb-2" />
                            <p className="text-[10px] text-[#333] uppercase">Sin rotaciones registradas</p>
                        </div>
                    ) : (
                        <div className="border border-white/5 rounded-xl overflow-hidden">
                            {logs.map((log, i) => (
                                <div key={log.id ?? i} className="flex items-start gap-3 px-4 py-3 border-b border-white/[0.04] last:border-0 hover:bg-white/[0.02] transition-colors">
                                    <div className={`shrink-0 size-7 rounded-lg flex items-center justify-center mt-0.5 ${log.success ? 'bg-blue-500/10 text-blue-400' : 'bg-red-500/10 text-red-400'
                                        }`}>
                                        {log.success ? <RefreshCw size={12} /> : <AlertTriangle size={12} />}
                                    </div>
                                    <div className="flex-1">
                                        {log.success ? (
                                            <>
                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                    <span className="text-[10px] text-[#888] font-mono break-all">{log.old_proxy}</span>
                                                    <span className="text-[10px] text-blue-400 font-mono break-all">{log.new_proxy}</span>
                                                </div>
                                                {log.latency_ms && (
                                                    <p className="text-[9px] text-[#555] mt-0.5">
                                                        latencia previa: {Math.round(log.latency_ms)}ms
                                                    </p>
                                                )}
                                            </>
                                        ) : (
                                            <>
                                                <p className="text-[10px] font-black text-red-400 uppercase">Falló</p>
                                                <p className="text-[9px] text-[#555] mt-0.5 font-mono truncate">
                                                    {log.error_message ?? 'Error desconocido'}
                                                </p>
                                            </>
                                        )}
                                    </div>
                                    <div className="text-right shrink-0">
                                        <p className="text-[9px] text-[#555] font-mono">
                                            {new Date(log.rotated_at).toLocaleDateString()}
                                        </p>
                                        <p className="text-[9px] text-[#444] font-mono">
                                            {new Date(log.rotated_at).toLocaleTimeString()}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <button onClick={onClose} className="mt-4 w-full py-3 bg-[#00ff88] text-black font-black uppercase rounded-xl text-xs hover:bg-[#00cc6a] transition-colors">
                    Entendido
                </button>
            </div>
        </div>
    );
};

// ─── COMPUTER STATUS MODAL ─────────────────────────────────────────────────
export const ComputerStatusModal = ({
    isOpen,
    onClose,
    nodes,
    adspowerStatusByComputer,
}: {
    isOpen: boolean;
    onClose: () => void;
    nodes: import('../types/orchestratorTypes').ComputerNode[];
    adspowerStatusByComputer: Record<string, boolean | null>;
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
            <div className="bg-[#0c0c0c] border border-white/10 rounded-2xl w-full max-w-lg relative z-[110] shadow-2xl animate-fade-in-up max-h-[80vh] flex flex-col">
                <button onClick={onClose} className="absolute right-4 top-4 text-[#666] hover:text-white z-10">
                    <X size={20} />
                </button>

                <div className="p-6 border-b border-white/5">
                    <h3 className="text-lg font-black text-white italic tracking-tighter">
                        Estado de Computadoras
                    </h3>
                    <p className="text-[10px] text-[#666] mt-0.5">
                        Agente y AdsPower por equipo
                    </p>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-3">
                    {nodes.length === 0 ? (
                        <div className="py-10 text-center border border-dashed border-white/5 rounded-xl">
                            <p className="text-[11px] text-[#444] uppercase">Sin computadoras registradas</p>
                        </div>
                    ) : nodes.map(node => {
                        const agentOnline = node.status === 'ONLINE';
                        const adspowerOk = adspowerStatusByComputer[node.id];
                        // null = desconocido (agente nunca reportó)
                        const adspowerUnknown = adspowerOk === null || adspowerOk === undefined;

                        return (
                            <div key={node.id}
                                className="p-4 bg-[#0a0a0a] border border-white/5 rounded-xl">
                                <div className="flex items-center justify-between mb-3">
                                    <div>
                                        <p className="text-sm font-black text-white">{node.name}</p>
                                        <p className="text-[9px] text-[#555] font-mono uppercase mt-0.5">
                                            {node.group} · ID {node.id}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2 text-[10px] font-mono text-[#555]">
                                        CPU {node.cpu}% · RAM {node.ram}%
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                    {/* AGENTE */}
                                    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-[10px] font-black uppercase ${agentOnline
                                            ? 'bg-[#00ff88]/5 border-[#00ff88]/20 text-[#00ff88]'
                                            : 'bg-red-500/5 border-red-500/20 text-red-400'
                                        }`}>
                                        <div className={`size-1.5 rounded-full ${agentOnline ? 'bg-[#00ff88] animate-pulse' : 'bg-red-500'}`} />
                                        Agente {agentOnline ? 'Online' : 'Offline'}
                                    </div>

                                    {/* ADSPOWER */}
                                    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-[10px] font-black uppercase ${adspowerUnknown
                                            ? 'bg-white/5 border-white/10 text-[#555]'
                                            : adspowerOk
                                                ? 'bg-[#00ff88]/5 border-[#00ff88]/20 text-[#00ff88]'
                                                : 'bg-amber-500/5 border-amber-500/20 text-amber-400'
                                        }`}>
                                        <div className={`size-1.5 rounded-full ${adspowerUnknown ? 'bg-white/20'
                                                : adspowerOk ? 'bg-[#00ff88] animate-pulse'
                                                    : 'bg-amber-500'
                                            }`} />
                                        AdsPower {adspowerUnknown ? '...' : adspowerOk ? 'Abierto' : 'Cerrado'}
                                    </div>
                                </div>

                                {/* Alerta si agente online pero AdsPower cerrado */}
                                {agentOnline && !adspowerUnknown && !adspowerOk && (
                                    <div className="mt-2 px-3 py-2 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                                        <p className="text-[9px] text-amber-400 font-bold">
                                            ⚠️ Agente conectado pero AdsPower no está abierto.
                                            Abre AdsPower para procesar la cola de perfiles.
                                        </p>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                <div className="p-6 border-t border-white/5">
                    <button onClick={onClose}
                        className="w-full py-3 bg-[#00ff88]/10 text-[#00ff88] font-black rounded-xl border border-[#00ff88]/20 text-xs uppercase hover:bg-[#00ff88]/15 transition-colors">
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    );
};