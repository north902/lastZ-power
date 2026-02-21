import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
    Trash2, ZoomIn, ZoomOut, Maximize, Home, Hand, Plus,
    Map as MapIcon, Fish, Shield, Users, Undo2, Redo2, Save, Download, Upload, X
} from 'lucide-react';

// ═══════════════════════════════════════════════════════════════
//  Hex Math & Constants
// ═══════════════════════════════════════════════════════════════
const HEX_R = 20;
const S3 = Math.sqrt(3);
const hex2px = (q, r) => [HEX_R * (S3 * q + S3 / 2 * r), HEX_R * 1.5 * r];
const roundHex = (fq, fr) => {
    let q = Math.round(fq), r = Math.round(fr), s = Math.round(-fq - fr);
    const dq = Math.abs(q - fq), dr = Math.abs(r - fr), ds = Math.abs(s + fq + fr);
    if (dq > dr && dq > ds) q = -r - s; else if (dr > ds) r = -q - s;
    return [q, r];
};
const px2hex = (wx, wy) => roundHex((S3 / 3 * wx - wy / 3) / HEX_R, (2 / 3 * wy) / HEX_R);
const HEX_VERTS = Array.from({ length: 6 }, (_, i) => {
    const a = Math.PI / 180 * (60 * i + 30);
    return [HEX_R * Math.cos(a), HEX_R * Math.sin(a)];
});

const CENTER_SHAPE = [[0, 0], [1, -1], [1, 0], [0, 1], [-1, 1], [-1, 0], [0, -1]];
const HQ_SHAPE = CENTER_SHAPE;
const ZONE_HALF = 13; // 13 on each side + center = 27
const LEVEL_MULTI = { 1: 5, 2: 2, 3: 1 };
const ALLIANCE_COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];
const MAX_HISTORY = 20;

// Offset coordinate conversion for zone rectangle (r+1 flips stagger to 左右左 pattern)
const toOffsetCol = (q, r) => q + Math.floor((r + 1) / 2);

const isInZone = (q, r, cq, cr) => {
    if (Math.abs(r - cr) > ZONE_HALF) return false;
    const col = toOffsetCol(q, r);
    const cCol = toOffsetCol(cq, cr);
    return Math.abs(col - cCol) <= ZONE_HALF;
};
const getZoneHexes = (cq, cr) => {
    const cCol = toOffsetCol(cq, cr);
    const hexes = [];
    for (let r = cr - ZONE_HALF; r <= cr + ZONE_HALF; r++) {
        for (let col = cCol - ZONE_HALF; col <= cCol + ZONE_HALF; col++) {
            const q = col - Math.floor((r + 1) / 2);
            hexes.push([q, r]);
        }
    }
    return hexes;
};
const hexAlpha = (hex, a) => {
    const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${a})`;
};
// Compute zone bounding box in pixel space for outline drawing
const getZoneBounds = (cq, cr) => {
    const cCol = toOffsetCol(cq, cr);
    // Check all 4 corner rows to find pixel extents
    let minX = Infinity, maxX = -Infinity;
    for (const r of [cr - ZONE_HALF, cr - ZONE_HALF + 1, cr + ZONE_HALF, cr + ZONE_HALF - 1]) {
        const qLeft = (cCol - ZONE_HALF) - Math.floor((r + 1) / 2);
        const qRight = (cCol + ZONE_HALF) - Math.floor((r + 1) / 2);
        const [lx] = hex2px(qLeft, r);
        const [rx] = hex2px(qRight, r);
        minX = Math.min(minX, lx);
        maxX = Math.max(maxX, rx);
    }
    const [, topY] = hex2px(0, cr - ZONE_HALF);
    const [, botY] = hex2px(0, cr + ZONE_HALF);
    return {
        left: minX - S3 * HEX_R * 0.5,
        right: maxX + S3 * HEX_R * 0.5,
        top: topY - HEX_R,
        bottom: botY + HEX_R
    };
};

// ═══════════════════════════════════════════════════════════════
//  Draw
// ═══════════════════════════════════════════════════════════════
function drawGloryMap(ctx, cells, alliances, activeId, hoveredHex, viewBounds) {
    const { left, right, top, bottom } = viewBounds;
    // Collect zones
    const zones = [];
    for (const a of alliances) {
        for (const lv of [1, 2, 3]) {
            const c = a.centers[lv];
            if (!c) continue;
            const bounds = getZoneBounds(c.q, c.r);
            zones.push({ aid: a.id, lv, cq: c.q, cr: c.r, bounds, color: a.color, isActive: a.id === activeId });
        }
    }
    // Background hexes
    const rMin = Math.floor((top - HEX_R * 2) / (HEX_R * 1.5));
    const rMax = Math.ceil((bottom + HEX_R * 2) / (HEX_R * 1.5));
    for (let r = rMin; r <= rMax; r++) {
        const xOff = HEX_R * S3 / 2 * r;
        const qMin2 = Math.floor((left - xOff - HEX_R * 2) / (HEX_R * S3));
        const qMax2 = Math.ceil((right - xOff + HEX_R * 2) / (HEX_R * S3));
        for (let q = qMin2; q <= qMax2; q++) {
            const [cx, cy] = hex2px(q, r);
            const key = `${q},${r}`, cell = cells[key];
            // Collect zones this hex belongs to
            const hexZones = [];
            for (const z of zones) {
                if (isInZone(q, r, z.cq, z.cr)) hexZones.push(z);
            }
            // Base fill & stroke
            let fill = 'rgba(248,250,252,0.08)', stroke = 'rgba(186,230,253,0.12)', sw = 0.6;
            const hasCell = cell && cell.type !== 'hq_part';
            if (hasCell) {
                fill = cell.color || '#3b82f6'; stroke = 'rgba(255,255,255,0.6)'; sw = cell.isCenter ? 2 : 1;
            }
            // Draw hex
            ctx.beginPath();
            for (let i = 0; i < 6; i++) {
                const vx = cx + HEX_VERTS[i][0], vy = cy + HEX_VERTS[i][1];
                i === 0 ? ctx.moveTo(vx, vy) : ctx.lineTo(vx, vy);
            }
            ctx.closePath();
            ctx.fillStyle = fill; ctx.globalAlpha = cell?.type === 'building' ? 0.65 : 1;
            ctx.fill(); ctx.globalAlpha = 1;
            // Overlay each zone's alliance color (stacks on overlap)
            if (!hasCell && hexZones.length > 0) {
                for (const z of hexZones) {
                    ctx.fillStyle = hexAlpha(z.color, z.isActive ? 0.18 : 0.10);
                    ctx.fill();
                }
                stroke = hexZones.some(z => z.isActive) ? 'rgba(148,163,184,0.3)' : 'rgba(148,163,184,0.18)';
            }
            ctx.strokeStyle = stroke; ctx.lineWidth = sw; ctx.stroke();
            if (hoveredHex && hoveredHex[0] === q && hoveredHex[1] === r) {
                ctx.fillStyle = 'rgba(255,255,255,0.15)'; ctx.fill();
            }
        }
    }
    // Zone border: passes through centers of outermost hexagons (cuts them in half)
    for (const z of zones) {
        // Scan all rows to find outermost hex centers (stagger shifts X per row)
        const cCol = toOffsetCol(z.cq, z.cr);
        let minX = Infinity, maxX = -Infinity;
        for (let row = z.cr - ZONE_HALF; row <= z.cr + ZONE_HALF; row++) {
            const qL = (cCol - ZONE_HALF) - Math.floor((row + 1) / 2);
            const qR = (cCol + ZONE_HALF) - Math.floor((row + 1) / 2);
            const [lx] = hex2px(qL, row);
            const [rx] = hex2px(qR, row);
            minX = Math.min(minX, lx);
            maxX = Math.max(maxX, rx);
        }
        // Border at outermost hex centers — no extra edge offset
        const leftX = minX;
        const rightX = maxX;
        const [, topRowY] = hex2px(0, z.cr - ZONE_HALF);
        const [, botRowY] = hex2px(0, z.cr + ZONE_HALF);
        const topY = topRowY;
        const botY = botRowY;
        // Draw dashed rectangle
        ctx.strokeStyle = hexAlpha(z.color, z.isActive ? 0.9 : 0.5);
        ctx.lineWidth = z.isActive ? 3 : 2;
        ctx.setLineDash([10, 5]);
        ctx.strokeRect(leftX, topY, rightX - leftX, botY - topY);
        ctx.setLineDash([]);
        // Zone label
        ctx.font = 'bold 14px sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'bottom';
        ctx.fillStyle = hexAlpha(z.color, 0.9);
        const aName = alliances.find(a => a.id === z.aid)?.name || '';
        ctx.fillText(`${aName} Lv${z.lv}`, leftX + 8, topY - 4);
    }
    // Labels & icons on cells
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (const [key, cell] of Object.entries(cells)) {
        if (!cell) continue;
        const [q, r] = key.split(',').map(Number);
        const [cx, cy] = hex2px(q, r);
        if (cx < left - 50 || cx > right + 50 || cy < top - 50 || cy > bottom + 50) continue;
        if (cell.isCenter && cell.type === 'center') {
            ctx.font = '16px serif'; ctx.fillText('🏛️', cx, cy);
            if (cell.label) {
                ctx.font = 'bold 12px sans-serif'; ctx.fillStyle = 'white';
                ctx.shadowColor = 'rgba(0,0,0,0.8)'; ctx.shadowBlur = 3;
                ctx.fillText(cell.label, cx, cy + HEX_R * 1.2); ctx.shadowBlur = 0;
            }
        }
        if (cell.isCenter && cell.type === 'hq') {
            ctx.font = '14px serif'; ctx.fillText('🏠', cx, cy);
            if (cell.label) {
                ctx.font = 'bold 11px sans-serif'; ctx.fillStyle = 'white';
                ctx.shadowColor = 'rgba(0,0,0,0.8)'; ctx.shadowBlur = 3;
                ctx.fillText(cell.label, cx, cy + HEX_R * 1.2); ctx.shadowBlur = 0;
            }
        }
        if (cell.type === 'building') {
            ctx.font = '10px serif'; ctx.fillText('⛺', cx, cy);
        }
    }
}

// ═══════════════════════════════════════════════════════════════
//  Component
// ═══════════════════════════════════════════════════════════════
export const GloryPlanner = ({ onSwitchMap, isAdmin = false }) => {
    const [alliances, setAlliances] = useState([]);
    const [activeAllianceId, setActiveAllianceId] = useState(null);
    const [cells, setCells] = useState({});
    const [tool, setTool] = useState('hand');
    const [toolLevel, setToolLevel] = useState(1);
    const [zoom, setZoom] = useState(0.5);
    const [toast, setToast] = useState('');

    const canvasRef = useRef(null); const containerRef = useRef(null);
    const offsetRef = useRef({ x: 0, y: 0 }); const zoomRef = useRef(0.5);
    const cellsRef = useRef({}); const alliancesRef = useRef([]);
    const toolRef = useRef('hand'); const toolLevelRef = useRef(1);
    const activeIdRef = useRef(null);
    const isDragging = useRef(false); const isPainting = useRef(false);
    const lastPos = useRef({ x: 0, y: 0 }); const dragStart = useRef({ x: 0, y: 0 });
    const lastPaintHex = useRef(null);
    const hoveredHex = useRef(null); const rafId = useRef(null); const dprRef = useRef(1);
    const historyRef = useRef([{}]); const historyIdx = useRef(0); const skipHistory = useRef(false);

    const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 1800); };
    const pushHistory = (nc) => {
        if (skipHistory.current) { skipHistory.current = false; return; }
        const h = historyRef.current.slice(0, historyIdx.current + 1);
        h.push(JSON.parse(JSON.stringify(nc)));
        if (h.length > MAX_HISTORY) h.shift();
        historyRef.current = h; historyIdx.current = h.length - 1;
    };
    const undo = () => { if (historyIdx.current <= 0) return; historyIdx.current--; skipHistory.current = true; setCells({ ...historyRef.current[historyIdx.current] }); showToast('↩️ 復原'); };
    const redo = () => { if (historyIdx.current >= historyRef.current.length - 1) return; historyIdx.current++; skipHistory.current = true; setCells({ ...historyRef.current[historyIdx.current] }); showToast('↪️ 重做'); };

    // Sync refs
    useEffect(() => { cellsRef.current = cells; pushHistory(cells); requestDraw(); }, [cells]);
    useEffect(() => { alliancesRef.current = alliances; requestDraw(); }, [alliances]);
    useEffect(() => { toolRef.current = tool; }, [tool]);
    useEffect(() => { toolLevelRef.current = toolLevel; }, [toolLevel]);
    useEffect(() => { activeIdRef.current = activeAllianceId; requestDraw(); }, [activeAllianceId]);

    // Quota helpers
    const getQuota = (alliance, lv) => alliance.centers[lv] ? alliance.memberCount * LEVEL_MULTI[lv] : 0;
    const countBuildings = (aid, lv) => Object.values(cellsRef.current).filter(c => c?.type === 'building' && c.allianceId === aid && c.level === lv).length;

    // Alliance CRUD
    const addAlliance = () => {
        const name = prompt('聯盟名稱（例如 [KTX]）：');
        if (!name?.trim()) return;
        const usedColors = alliances.map(a => a.color);
        const color = ALLIANCE_COLORS.find(c => !usedColors.includes(c)) || ALLIANCE_COLORS[0];
        const id = `a_${Date.now()}`;
        const newA = { id, name: name.trim(), color, memberCount: 30, centers: { 1: null, 2: null, 3: null } };
        setAlliances(prev => [...prev, newA]);
        setActiveAllianceId(id);
        showToast(`✅ 已新增 ${name.trim()}`);
    };
    const removeAlliance = (id) => {
        if (!window.confirm('確定刪除此聯盟和所有建築？')) return;
        setAlliances(prev => prev.filter(a => a.id !== id));
        setCells(prev => {
            const nc = { ...prev };
            Object.keys(nc).forEach(k => { if (nc[k]?.allianceId === id) delete nc[k]; });
            return nc;
        });
        if (activeAllianceId === id) setActiveAllianceId(null);
    };
    const updateMemberCount = (id, count) => {
        setAlliances(prev => prev.map(a => a.id === id ? { ...a, memberCount: Math.max(1, parseInt(count) || 1) } : a));
    };

    // Auto-fill zone
    const autoFillZone = (aid, lv) => {
        const alliance = alliancesRef.current.find(a => a.id === aid);
        if (!alliance?.centers[lv]) return;
        const { q: cq, r: cr } = alliance.centers[lv];
        const quota = getQuota(alliance, lv);
        const used = countBuildings(aid, lv);
        let remaining = quota - used;
        if (remaining <= 0) { showToast('❌ 配額已滿'); return; }
        const zoneHexes = getZoneHexes(cq, cr);
        setCells(prev => {
            const nc = { ...prev };
            for (const [hq, hr] of zoneHexes) {
                if (remaining <= 0) break;
                const k = `${hq},${hr}`;
                if (nc[k]) continue;
                nc[k] = { type: 'building', allianceId: aid, level: lv, color: alliance.color };
                remaining--;
            }
            return nc;
        });
        showToast(`⛺ 已填充 ${quota - used - remaining} 棟`);
    };

    // localStorage
    const saveLocal = () => {
        localStorage.setItem('glory_planner', JSON.stringify({ cells: cellsRef.current, alliances: alliancesRef.current, zoom: zoomRef.current, offset: offsetRef.current }));
        showToast('💾 已儲存！');
    };
    const loadLocal = () => {
        try {
            const d = JSON.parse(localStorage.getItem('glory_planner'));
            if (!d) return false;
            if (d.cells) { skipHistory.current = true; setCells(d.cells); }
            if (d.alliances) { setAlliances(d.alliances); setActiveAllianceId(d.alliances[0]?.id || null); }
            if (d.zoom) { zoomRef.current = d.zoom; setZoom(d.zoom); }
            if (d.offset) offsetRef.current = d.offset;
            historyRef.current = [JSON.parse(JSON.stringify(d.cells || {}))]; historyIdx.current = 0;
            return true;
        } catch { return false; }
    };
    const resetMap = () => { if (!window.confirm('確定重置？')) return; skipHistory.current = true; setCells({}); setAlliances([]); setActiveAllianceId(null); historyRef.current = [{}]; historyIdx.current = 0; showToast('🗑️ 已重置'); };

    useEffect(() => { loadLocal(); }, []);

    // JSON export/import
    const exportJSON = () => {
        const data = { version: 1, type: 'glory', alliances: alliancesRef.current, cells: cellsRef.current, exportedAt: new Date().toISOString() };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const link = document.createElement('a'); link.download = `glory-map-${new Date().toISOString().slice(0, 10)}.json`;
        link.href = URL.createObjectURL(blob); link.click(); URL.revokeObjectURL(link.href);
        showToast('📁 已匯出！');
    };
    const importJSON = () => {
        const input = document.createElement('input'); input.type = 'file'; input.accept = '.json';
        input.onchange = (e) => {
            const reader = new FileReader();
            reader.onload = (ev) => {
                try {
                    const d = JSON.parse(ev.target.result);
                    if (d.cells) { skipHistory.current = true; setCells(d.cells); }
                    if (d.alliances) { setAlliances(d.alliances); setActiveAllianceId(d.alliances[0]?.id || null); }
                    centerMap(); showToast('📂 已載入');
                } catch { showToast('❌ 格式錯誤'); }
            };
            reader.readAsText(e.target.files[0]);
        };
        input.click();
    };

    // Canvas setup
    const centerMap = () => { if (!containerRef.current) return; const r = containerRef.current.getBoundingClientRect(); offsetRef.current = { x: r.width / 2, y: r.height / 2 }; requestDraw(); };
    useEffect(() => {
        const resize = () => {
            const canvas = canvasRef.current, cont = containerRef.current; if (!canvas || !cont) return;
            const dpr = window.devicePixelRatio || 1; dprRef.current = dpr;
            const rect = cont.getBoundingClientRect();
            canvas.width = rect.width * dpr; canvas.height = rect.height * dpr;
            canvas.style.width = `${rect.width}px`; canvas.style.height = `${rect.height}px`;
            if (offsetRef.current.x === 0) offsetRef.current = { x: rect.width / 2, y: rect.height / 2 };
            requestDraw();
        };
        resize(); window.addEventListener('resize', resize);
        return () => window.removeEventListener('resize', resize);
    }, []);
    useEffect(() => {
        const cont = containerRef.current; if (!cont) return;
        const onWheel = (e) => { e.preventDefault(); zoomRef.current = Math.min(3, Math.max(0.1, zoomRef.current + (e.deltaY > 0 ? -0.05 : 0.05))); setZoom(zoomRef.current); requestDraw(); };
        cont.addEventListener('wheel', onWheel, { passive: false });
        return () => cont.removeEventListener('wheel', onWheel);
    }, []);
    useEffect(() => {
        const onKey = (e) => {
            if (e.ctrlKey && e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
            if (e.ctrlKey && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); redo(); }
            if (e.ctrlKey && e.key === 's') { e.preventDefault(); saveLocal(); }
        };
        window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey);
    }, []);

    const requestDraw = useCallback(() => { if (rafId.current) cancelAnimationFrame(rafId.current); rafId.current = requestAnimationFrame(draw); }, []);
    const draw = () => {
        const canvas = canvasRef.current; if (!canvas) return;
        const ctx = canvas.getContext('2d'); const dpr = dprRef.current;
        const cont = containerRef.current; if (!cont) return;
        const rect = cont.getBoundingClientRect();
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.save(); ctx.scale(dpr, dpr);
        ctx.translate(offsetRef.current.x, offsetRef.current.y);
        ctx.scale(zoomRef.current, zoomRef.current);
        const z = zoomRef.current;
        const viewBounds = {
            left: -offsetRef.current.x / z, right: (rect.width - offsetRef.current.x) / z,
            top: -offsetRef.current.y / z, bottom: (rect.height - offsetRef.current.y) / z
        };
        drawGloryMap(ctx, cellsRef.current, alliancesRef.current, activeIdRef.current, hoveredHex.current, viewBounds);
        ctx.restore();
    };

    // Mouse handlers
    const getWorldPos = (e) => {
        const rect = canvasRef.current.getBoundingClientRect();
        return [(e.clientX - rect.left - offsetRef.current.x) / zoomRef.current, (e.clientY - rect.top - offsetRef.current.y) / zoomRef.current];
    };
    const handleMouseDown = (e) => {
        dragStart.current = { x: e.clientX, y: e.clientY };
        if (e.button === 2 || e.button === 1 || (e.button === 0 && toolRef.current === 'hand')) {
            isDragging.current = true; lastPos.current = { x: e.clientX, y: e.clientY }; e.preventDefault();
        } else if (e.button === 0 && (toolRef.current === 'building' || toolRef.current === 'eraser')) {
            isPainting.current = true; lastPaintHex.current = null;
        }
    };
    const handleMouseMove = (e) => {
        const [wx, wy] = getWorldPos(e);
        if (isDragging.current) {
            const dx = e.clientX - lastPos.current.x, dy = e.clientY - lastPos.current.y;
            lastPos.current = { x: e.clientX, y: e.clientY };
            offsetRef.current = { x: offsetRef.current.x + dx, y: offsetRef.current.y + dy };
            requestDraw(); return;
        }
        if (isPainting.current) {
            const [q, r] = px2hex(wx, wy);
            const k = `${q},${r}`;
            if (lastPaintHex.current !== k) { lastPaintHex.current = k; applyTool(q, r); }
            return;
        }
        const [hq, hr] = px2hex(wx, wy);
        const p = hoveredHex.current;
        if (!p || p[0] !== hq || p[1] !== hr) { hoveredHex.current = [hq, hr]; requestDraw(); }
    };
    const handleMouseUp = () => { isDragging.current = false; isPainting.current = false; lastPaintHex.current = null; };
    const handleClick = (e) => {
        const dx = e.clientX - dragStart.current.x, dy = e.clientY - dragStart.current.y;
        if (Math.sqrt(dx * dx + dy * dy) > 4) return;
        if (e.button !== 0 || toolRef.current === 'hand') return;
        const [wx, wy] = getWorldPos(e);
        const [q, r] = px2hex(wx, wy);
        applyTool(q, r);
    };
    const handleDoubleClick = (e) => {
        e.preventDefault();
        const [wx, wy] = getWorldPos(e);
        const [q, r] = px2hex(wx, wy);
        const cell = cellsRef.current[`${q},${r}`];
        if (cell?.isCenter && (cell.type === 'hq' || cell.type === 'center')) {
            const name = prompt('輸入名稱（留空清除）', cell.label || '');
            if (name === null) return;
            setCells(prev => ({ ...prev, [`${q},${r}`]: { ...prev[`${q},${r}`], label: name.trim() || undefined } }));
        }
    };

    const applyTool = (q, r) => {
        const t = toolRef.current, lv = toolLevelRef.current, aid = activeIdRef.current;
        const alliance = alliancesRef.current.find(a => a.id === aid);
        setCells(prev => {
            const key = `${q},${r}`, nc = { ...prev };
            if (t === 'eraser') {
                const tgt = nc[key];
                if (tgt?.isCenter && tgt.type === 'center') {
                    // Remove center + update alliance
                    const shape = CENTER_SHAPE;
                    shape.forEach(([oq, or]) => delete nc[`${q + oq},${r + or}`]);
                    setAlliances(p => p.map(a => a.id === tgt.allianceId ? { ...a, centers: { ...a.centers, [tgt.level]: null } } : a));
                } else if (tgt?.parent && tgt.type === 'center') {
                    // Clicked non-center part of center
                    const [pq, pr] = tgt.parent.split(',').map(Number);
                    CENTER_SHAPE.forEach(([oq, or]) => delete nc[`${pq + oq},${pr + or}`]);
                    setAlliances(p => p.map(a => a.id === tgt.allianceId ? { ...a, centers: { ...a.centers, [tgt.level]: null } } : a));
                } else if (tgt?.parent && tgt.type === 'hq') {
                    const [pq, pr] = tgt.parent.split(',').map(Number);
                    HQ_SHAPE.forEach(([oq, or]) => delete nc[`${pq + oq},${pr + or}`]);
                } else {
                    delete nc[key];
                }
            } else if (t === 'center') {
                if (!alliance) { showToast('❌ 請先選擇聯盟'); return prev; }
                if (alliance.centers[lv]) { showToast(`❌ 已有 Lv${lv} 中心`); return prev; }
                const blocked = CENTER_SHAPE.some(([oq, or]) => nc[`${q + oq},${r + or}`]);
                if (blocked) return prev;
                CENTER_SHAPE.forEach(([oq, or]) => {
                    nc[`${q + oq},${r + or}`] = { type: 'center', allianceId: aid, level: lv, color: alliance.color, parent: key, isCenter: oq === 0 && or === 0 };
                });
                setAlliances(p => p.map(a => a.id === aid ? { ...a, centers: { ...a.centers, [lv]: { q, r } } } : a));
            } else if (t === 'building') {
                if (!alliance) return prev;
                const center = alliance.centers[lv];
                if (!center) { showToast(`❌ 尚未放置 Lv${lv} 中心`); return prev; }
                if (!isInZone(q, r, center.q, center.r)) return prev;
                if (nc[key]) return prev;
                const quota = getQuota(alliance, lv);
                const used = countBuildings(aid, lv);
                if (used >= quota) { showToast('❌ 配額已滿'); return prev; }
                nc[key] = { type: 'building', allianceId: aid, level: lv, color: alliance.color };
            } else if (t === 'hq') {
                const blocked = HQ_SHAPE.some(([oq, or]) => nc[`${q + oq},${r + or}`]);
                if (blocked) return prev;
                HQ_SHAPE.forEach(([oq, or]) => {
                    nc[`${q + oq},${r + or}`] = { type: 'hq', color: alliance?.color || '#94a3b8', parent: key, isCenter: oq === 0 && or === 0 };
                });
            }
            return nc;
        });
    };

    useEffect(() => { document.body.style.cursor = 'default'; }, [tool]);
    const cursorClass = tool === 'hand' ? 'cursor-grab' : tool === 'eraser' ? 'cursor-crosshair' : 'cursor-cell';
    const activeAlliance = alliances.find(a => a.id === activeAllianceId);

    return (
        <div className="flex flex-col h-[calc(100vh-200px)] bg-slate-900 rounded-2xl overflow-hidden border border-slate-700 shadow-2xl">
            {/* Toolbar */}
            <div className="p-2.5 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 flex items-center justify-between z-10 flex-wrap gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                    {/* Map tabs */}
                    <div className="flex bg-slate-800 rounded-lg p-1">
                        <TabBtn onClick={() => onSwitchMap('svs')} icon={<MapIcon size={14} />} label="SVS" ac="bg-blue-600" />
                        <TabBtn onClick={() => onSwitchMap('fishpond')} icon={<Fish size={14} />} label="魚池" ac="bg-rose-600" />
                        <TabBtn active icon={<Shield size={14} />} label="榮耀" ac="bg-amber-600" />
                    </div>
                    <div className="h-6 w-px bg-slate-700" />
                    {/* Tools */}
                    <div className="flex bg-slate-800 rounded-lg p-1">
                        <ToolBtn active={tool === 'hand'} onClick={() => setTool('hand')} icon={<Hand size={15} />} label="移動" />
                        <ToolBtn active={tool === 'center'} onClick={() => setTool('center')} icon={<Shield size={15} />} label="聯盟中心" />
                        <ToolBtn active={tool === 'building'} onClick={() => setTool('building')} icon="⛺" label="小建築" />
                        <ToolBtn active={tool === 'hq'} onClick={() => setTool('hq')} icon={<Home size={15} />} label="總部" />
                        <ToolBtn active={tool === 'eraser'} onClick={() => setTool('eraser')} icon={<Trash2 size={15} />} label="橡皮擦" />
                    </div>
                    {/* Level selector */}
                    {(tool === 'center' || tool === 'building') && (
                        <div className="flex bg-slate-800 rounded-lg p-1 gap-0.5">
                            {[1, 2, 3].map(lv => (
                                <button key={lv} onClick={() => setToolLevel(lv)}
                                    className={`px-2.5 py-1 rounded-md text-xs font-bold transition-colors ${toolLevel === lv ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}>
                                    Lv{lv}
                                </button>
                            ))}
                        </div>
                    )}
                    <div className="h-6 w-px bg-slate-700" />
                    <div className="flex bg-slate-800 rounded-lg p-1">
                        <ToolBtn onClick={undo} icon={<Undo2 size={14} />} label="復原" />
                        <ToolBtn onClick={redo} icon={<Redo2 size={14} />} label="重做" />
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 bg-slate-800/60 px-2 py-1 rounded-xl border border-slate-700/50">
                        <button onClick={() => { zoomRef.current = Math.max(0.1, zoomRef.current - 0.1); setZoom(zoomRef.current); requestDraw(); }} className="text-slate-400 hover:text-white"><ZoomOut size={13} /></button>
                        <input type="range" min="0.1" max="2.5" step="0.05" value={zoom} onChange={e => { zoomRef.current = parseFloat(e.target.value); setZoom(zoomRef.current); requestDraw(); }}
                            className="w-14 h-1 bg-slate-700 rounded cursor-pointer accent-amber-500" />
                        <button onClick={() => { zoomRef.current = Math.min(2.5, zoomRef.current + 0.1); setZoom(zoomRef.current); requestDraw(); }} className="text-slate-400 hover:text-white"><ZoomIn size={13} /></button>
                        <span className="text-[9px] font-mono text-amber-400 w-7 text-center">{Math.round(zoom * 100)}%</span>
                    </div>
                    <button onClick={centerMap} className="p-1.5 bg-slate-800 text-slate-400 rounded-lg hover:text-white border border-slate-700"><Maximize size={13} /></button>
                    <button onClick={saveLocal} className="p-1.5 bg-slate-800 text-slate-400 rounded-lg hover:text-emerald-400 border border-slate-700" title="儲存 Ctrl+S"><Save size={13} /></button>
                    <button onClick={resetMap} className="p-1.5 bg-slate-800 text-slate-400 rounded-lg hover:text-red-400 border border-slate-700" title="重設"><Trash2 size={13} /></button>
                    <div className="h-6 w-px bg-slate-700" />
                    <button onClick={exportJSON} className="p-1.5 bg-slate-800 text-slate-400 rounded-lg hover:text-cyan-400 border border-slate-700" title="匯出 JSON"><Download size={13} /></button>
                    <button onClick={importJSON} className="p-1.5 bg-slate-800 text-slate-400 rounded-lg hover:text-yellow-400 border border-slate-700" title="匯入 JSON"><Upload size={13} /></button>
                </div>
            </div>

            {/* Main: Left Panel + Canvas */}
            <div className="flex flex-1 overflow-hidden">
                {/* Alliance Panel */}
                <div className="w-56 bg-slate-950/50 border-r border-slate-800 overflow-y-auto p-3 space-y-2 flex-shrink-0">
                    <button onClick={addAlliance} className="w-full py-2 bg-amber-600/20 hover:bg-amber-600/30 text-amber-400 rounded-lg text-xs font-bold flex items-center justify-center gap-1 border border-amber-600/30">
                        <Plus size={14} /> 新增聯盟
                    </button>
                    {alliances.map(a => {
                        const isActive = a.id === activeAllianceId;
                        return (
                            <div key={a.id} onClick={() => setActiveAllianceId(a.id)}
                                className={`rounded-xl p-2.5 cursor-pointer border transition-all ${isActive ? 'border-white/30 bg-slate-800/80 shadow-lg' : 'border-slate-700/50 bg-slate-900/50 opacity-60 hover:opacity-100'}`}>
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: a.color }} />
                                        <span className="text-white text-xs font-bold">{a.name}</span>
                                    </div>
                                    <button onClick={(e) => { e.stopPropagation(); removeAlliance(a.id); }} className="text-slate-500 hover:text-red-400"><X size={12} /></button>
                                </div>
                                <div className="flex items-center gap-1 mb-2">
                                    <Users size={10} className="text-slate-500" />
                                    <span className="text-[10px] text-slate-400">人數：</span>
                                    <input type="number" value={a.memberCount} onClick={e => e.stopPropagation()}
                                        onChange={e => updateMemberCount(a.id, e.target.value)}
                                        className="w-12 bg-slate-800 text-white text-[10px] px-1.5 py-0.5 rounded border border-slate-700 text-center" />
                                </div>
                                {[1, 2, 3].map(lv => {
                                    const hasCenter = !!a.centers[lv];
                                    const quota = getQuota(a, lv);
                                    const used = countBuildings(a.id, lv);
                                    return (
                                        <div key={lv} className="flex items-center justify-between text-[10px] py-0.5">
                                            <span className={hasCenter ? 'text-white' : 'text-slate-600'}>
                                                {hasCenter ? '✅' : '⬜'} Lv{lv}
                                            </span>
                                            {hasCenter && (
                                                <div className="flex items-center gap-1">
                                                    <span className="text-slate-400">{used}/{quota}</span>
                                                    <button onClick={(e) => { e.stopPropagation(); autoFillZone(a.id, lv); }}
                                                        className="px-1.5 py-0.5 bg-amber-600/20 text-amber-400 rounded text-[9px] hover:bg-amber-600/30">
                                                        填滿
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                                {isActive && <div className="mt-1.5 text-[9px] text-amber-400 font-bold text-center">✦ 選中 ✦</div>}
                            </div>
                        );
                    })}
                    {alliances.length === 0 && <p className="text-slate-600 text-[10px] text-center py-4">點擊上方新增聯盟</p>}
                </div>

                {/* Canvas */}
                <div ref={containerRef} className="flex-1 relative overflow-hidden">
                    <canvas ref={canvasRef} className={`absolute inset-0 ${cursorClass}`}
                        onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp}
                        onClick={handleClick} onDoubleClick={handleDoubleClick}
                        onMouseLeave={() => { isDragging.current = false; isPainting.current = false; hoveredHex.current = null; requestDraw(); }}
                        onContextMenu={e => e.preventDefault()} />
                    {toast && <div className="absolute top-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-slate-800/90 text-white text-sm font-bold rounded-xl border border-slate-600 shadow-xl backdrop-blur z-20">{toast}</div>}
                </div>
            </div>
        </div>
    );
};

const ToolBtn = ({ active, onClick, icon, label }) => (
    <button onClick={onClick} title={label}
        className={`p-1.5 rounded-md transition-colors ${active ? 'bg-amber-600 text-white' : 'text-slate-400 hover:bg-slate-700 hover:text-white'}`}>
        {typeof icon === 'string' ? <span className="text-sm">{icon}</span> : icon}
    </button>
);
const TabBtn = ({ active, onClick, icon, label, ac }) => (
    <button onClick={onClick}
        className={`px-2.5 py-1.5 rounded-md text-xs font-bold flex items-center gap-1 transition-colors ${active ? `${ac} text-white` : 'text-slate-400 hover:text-white'}`}>
        {icon} {label}
    </button>
);
