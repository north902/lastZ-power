import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
    Trash2, ZoomIn, ZoomOut, Maximize, Home, Hand, Plus, Type,
    Map as MapIcon, Fish, Shield, Users, Undo2, Redo2, Save, Download, Upload, X,
    Share2, Copy, Clock, Navigation, MapPin, MousePointer2, HelpCircle
} from 'lucide-react';
import { db } from '../../config/firebase';
import { doc, setDoc, getDocs, deleteDoc, collection, query, orderBy, serverTimestamp } from 'firebase/firestore';

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
const ZONE_HALF = 13;
const LEVEL_MULTI = { 1: 5, 2: 2, 3: 1 };
const ALLIANCE_COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];
const MAX_HISTORY = 20;

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

// ═══════════════════════════════════════════════════════════════
//  HQ Blocking Algorithm (Greedy Dominating Set)
//  Only blocks HQ positions where ALL 7 footprint hexes are
//  inside the zone — minimises buildings needed.
// ═══════════════════════════════════════════════════════════════
const computeHQBlockingSet = (cq, cr, existingCells) => {
    const zoneHexes = getZoneHexes(cq, cr);
    const zoneSet = new Set(zoneHexes.map(([q, r]) => `${q},${r}`));

    const occupied = new Set(
        Object.keys(existingCells).filter(k =>
            existingCells[k] && !k.startsWith('text_') && k !== 'origin'
        )
    );

    // Only HQ positions where all 7 footprint hexes are inside the zone
    const hqPlacements = [];
    for (const [hq, hr] of zoneHexes) {
        const footprint = HQ_SHAPE.map(([oq, or]) => `${hq + oq},${hr + or}`);
        if (!footprint.every(k => zoneSet.has(k))) continue;
        if (footprint.some(k => occupied.has(k))) continue;
        hqPlacements.push(footprint);
    }
    if (hqPlacements.length === 0) return [];

    // hex → list of placement indices that contain it
    const hexToIdx = new Map();
    hqPlacements.forEach((fp, idx) => {
        for (const k of fp) {
            if (!hexToIdx.has(k)) hexToIdx.set(k, []);
            hexToIdx.get(k).push(idx);
        }
    });

    // ── Phase 1: Greedy ──
    // Track coverCnt[idx] = number of chosen blockers that cover placement idx
    const coverCnt = new Array(hqPlacements.length).fill(0);
    const firstCovered = new Array(hqPlacements.length).fill(false);

    const score = new Map();
    for (const [k, idxs] of hexToIdx) {
        if (!occupied.has(k) && zoneSet.has(k)) score.set(k, idxs.length);
    }

    const chosen = new Set();
    let totalUnblocked = hqPlacements.length;

    while (totalUnblocked > 0) {
        let bestKey = null, bestScore = 0;
        for (const [k, s] of score) {
            if (s > bestScore) { bestScore = s; bestKey = k; }
        }
        if (!bestKey || bestScore === 0) break;

        chosen.add(bestKey);
        score.delete(bestKey);

        for (const idx of (hexToIdx.get(bestKey) || [])) {
            coverCnt[idx]++;           // always increment — needed for redundancy removal
            if (!firstCovered[idx]) {
                firstCovered[idx] = true;
                totalUnblocked--;
                // Decrement score of every other hex in this newly-covered placement
                for (const k2 of hqPlacements[idx]) {
                    if (score.has(k2)) {
                        const ns = score.get(k2) - 1;
                        if (ns <= 0) score.delete(k2);
                        else score.set(k2, ns);
                    }
                }
            }
        }
    }

    // ── Phase 2: Redundancy removal ──
    // A blocker is redundant if every placement it touches is still covered ≥1
    // after removing it (i.e., coverCnt[idx] >= 2 for all its placements).
    // Repeat until no more can be removed.
    let improved = true;
    while (improved) {
        improved = false;
        for (const key of [...chosen]) {
            const idxs = hexToIdx.get(key) || [];
            if (idxs.every(idx => coverCnt[idx] >= 2)) {
                chosen.delete(key);
                for (const idx of idxs) coverCnt[idx]--;
                improved = true;
            }
        }
    }

    return [...chosen];
};

const hexAlpha = (hex, a) => {
    const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${a})`;
};
const getZoneBounds = (cq, cr) => {
    const cCol = toOffsetCol(cq, cr);
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

function drawGloryMap(ctx, cells, alliances, activeId, hoveredHex, viewBounds, showCoords = false, tool = 'hand', toolLevel = 1, activeAlliance = null, hoveredTextId = null) {
    const { left, right, top, bottom } = viewBounds;
    const zones = [];
    for (const a of alliances) {
        for (const lv of [1, 2, 3]) {
            const c = a.centers[lv];
            if (!c) continue;
            const bounds = getZoneBounds(c.q, c.r);
            zones.push({ aid: a.id, lv, cq: c.q, cr: c.r, bounds, color: a.color, isActive: a.id === activeId });
        }
    }
    const rMin = Math.floor((top - HEX_R * 2) / (HEX_R * 1.5));
    const rMax = Math.ceil((bottom + HEX_R * 2) / (HEX_R * 1.5));
    for (let r = rMin; r <= rMax; r++) {
        const xOff = HEX_R * S3 / 2 * r;
        const qMin2 = Math.floor((left - xOff - HEX_R * 2) / (HEX_R * S3));
        const qMax2 = Math.ceil((right - xOff + HEX_R * 2) / (HEX_R * S3));
        for (let q = qMin2; q <= qMax2; q++) {
            const [cx, cy] = hex2px(q, r);
            const key = `${q},${r}`, cell = cells[key];
            const hexZones = [];
            for (const z of zones) {
                if (isInZone(q, r, z.cq, z.cr)) hexZones.push(z);
            }
            let fill = 'rgba(248,250,252,0.08)', stroke = 'rgba(186,230,253,0.12)', sw = 0.6;
            const hasCell = cell && cell.type !== 'hq_part';
            let isHq = cell?.type === 'hq';

            if (hasCell) {
                fill = cell.color || '#3b82f6'; stroke = 'rgba(255,255,255,0.6)'; sw = cell.isCenter ? 2 : 1;
            }

            ctx.beginPath();
            for (let i = 0; i < 6; i++) {
                const vx = cx + HEX_VERTS[i][0], vy = cy + HEX_VERTS[i][1];
                i === 0 ? ctx.moveTo(vx, vy) : ctx.lineTo(vx, vy);
            }
            ctx.closePath();

            ctx.fillStyle = fill;
            ctx.globalAlpha = cell?.type === 'building' ? 0.65 : 1;
            ctx.fill();
            ctx.globalAlpha = 1;

            if (!hasCell && hexZones.length > 0) {
                for (const z of hexZones) {
                    ctx.fillStyle = hexAlpha(z.color, z.isActive ? 0.18 : 0.10);
                    ctx.fill();
                }
                stroke = hexZones.some(z => z.isActive) ? 'rgba(148,163,184,0.3)' : 'rgba(148,163,184,0.18)';
            }

            ctx.strokeStyle = stroke; ctx.lineWidth = sw;
            if (isHq) ctx.setLineDash([4, 4]);
            ctx.stroke();
            if (isHq) ctx.setLineDash([]);
            if (hoveredHex && hoveredHex[0] === q && hoveredHex[1] === r) {
                ctx.fillStyle = 'rgba(255,255,255,0.15)'; ctx.fill();
            }
        }
    }
    for (const z of zones) {
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
        const leftX = minX, rightX = maxX;
        const [, topRowY] = hex2px(0, z.cr - ZONE_HALF);
        const [, botRowY] = hex2px(0, z.cr + ZONE_HALF);
        ctx.strokeStyle = hexAlpha(z.color, z.isActive ? 0.9 : 0.5);
        ctx.lineWidth = z.isActive ? 3 : 2;
        ctx.setLineDash([10, 5]);
        ctx.strokeRect(leftX, topRowY, rightX - leftX, botRowY - topRowY);
        ctx.setLineDash([]);
        ctx.font = 'bold 14px sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'bottom';
        ctx.fillStyle = hexAlpha(z.color, 0.9);
        const aName = alliances.find(a => a.id === z.aid)?.name || '';
        ctx.fillText(`${aName} Lv${z.lv}`, leftX + 8, topRowY - 4);
    }
    if (showCoords) {
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        for (let r2 = rMin; r2 <= rMax; r2++) {
            const xOff2 = HEX_R * S3 / 2 * r2;
            const qMin3 = Math.floor((left - xOff2 - HEX_R * 2) / (HEX_R * S3));
            const qMax3 = Math.ceil((right - xOff2 + HEX_R * 2) / (HEX_R * S3));
            for (let q2 = qMin3; q2 <= qMax3; q2++) {
                const k2 = `${q2},${r2}`;
                if (!cells[k2]) {
                    const [cx2, cy2] = hex2px(q2, r2);
                    let text = `${q2},${r2}`;
                    if (cells.origin) {
                        const q0 = cells.origin.q, r0 = cells.origin.r, x0 = cells.origin.x, y0 = cells.origin.y;
                        const gy = r2 - r0 + y0;
                        const gx = q2 - q0 + Math.floor(gy / 2) - Math.floor(y0 / 2) + x0;
                        text = `${gx},${gy}`;
                    }
                    ctx.font = '7px monospace'; ctx.fillStyle = 'rgba(100,180,255,0.45)';
                    ctx.fillText(text, cx2, cy2);
                }
            }
        }
    }
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
        if (cell.type === 'building' || cell.type === 'flex_building') {
            ctx.font = '10px serif'; ctx.fillText('⛺', cx, cy);
        }
    }

    if (hoveredHex && tool && tool !== 'hand' && tool !== 'eraser' && tool !== 'text') {
        const [hq, hr] = hoveredHex;
        let ghostShape = [];
        if (tool === 'hq' || tool === 'center') ghostShape = CENTER_SHAPE;
        else if (tool === 'building' || tool === 'flex_building') ghostShape = [[0, 0]];

        if (ghostShape.length > 0) {
            let blocked = false;
            if (tool === 'center') {
                if (!activeAlliance || activeAlliance.centers[toolLevel]) blocked = true;
                if (!blocked) blocked = ghostShape.some(([oq, or]) => cells[`${hq + oq},${hr + or}`]);
            } else if (tool === 'hq') {
                blocked = ghostShape.some(([oq, or]) => cells[`${hq + oq},${hr + or}`]);
            } else if (tool === 'building') {
                if (!activeAlliance) blocked = true;
                else {
                    const center = activeAlliance.centers[toolLevel];
                    if (!center || !isInZone(hq, hr, center.q, center.r) || cells[`${hq},${hr}`]) blocked = true;
                }
            } else if (tool === 'flex_building') {
                if (cells[`${hq},${hr}`]) blocked = true;
            }

            ctx.save();
            ctx.globalAlpha = 0.55;
            const ghostColor = blocked ? 'rgba(239, 68, 68, 0.8)' : (activeAlliance?.color || '#94a3b8');
            ctx.fillStyle = ghostColor;

            for (const [oq, or] of ghostShape) {
                const tq = hq + oq, tr = hr + or;
                const [cx, cy] = hex2px(tq, tr);
                ctx.beginPath();
                for (let i = 0; i < 6; i++) {
                    const vx = cx + HEX_VERTS[i][0], vy = cy + HEX_VERTS[i][1];
                    i === 0 ? ctx.moveTo(vx, vy) : ctx.lineTo(vx, vy);
                }
                ctx.closePath();
                ctx.fill();
                ctx.strokeStyle = blocked ? 'rgba(255,50,50,0.9)' : 'rgba(255,255,255,0.9)';
                ctx.lineWidth = (oq === 0 && or === 0) ? 2.5 : 1;
                ctx.stroke();
                if (oq === 0 && or === 0) {
                    ctx.globalAlpha = 0.9;
                    ctx.fillStyle = 'white';
                    ctx.font = '14px serif';
                    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                    if (tool === 'hq') ctx.fillText('🏠', cx, cy);
                    if (tool === 'center') ctx.fillText('🏛️', cx, cy);
                    if (tool === 'building' || tool === 'flex_building') ctx.fillText('⛺', cx, cy);
                    ctx.globalAlpha = 0.55;
                }
            }

            if (tool === 'center' && !blocked) {
                const zBounds = getZoneBounds(hq, hr);
                ctx.strokeStyle = activeAlliance ? hexAlpha(activeAlliance.color, 0.7) : 'rgba(255,255,255,0.5)';
                ctx.lineWidth = 2;
                ctx.setLineDash([10, 5]);
                ctx.strokeRect(zBounds.left, zBounds.top, zBounds.right - zBounds.left, zBounds.bottom - zBounds.top);
                ctx.setLineDash([]);
                ctx.font = 'bold 14px sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'bottom';
                ctx.globalAlpha = 0.9;
                ctx.fillStyle = activeAlliance ? hexAlpha(activeAlliance.color, 0.9) : 'rgba(255,255,255,0.9)';
                ctx.fillText(`預覽 Lv${toolLevel} 領地範圍`, zBounds.left + 8, zBounds.top - 4);
                ctx.globalAlpha = 0.55;
            }
            ctx.restore();
        }
    }

    const TEXT_SIZES = { S: 14, M: 24, L: 36 };
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0,0,0,0.8)'; ctx.shadowBlur = 4;
    for (const key of Object.keys(cells)) {
        if (!key.startsWith('text_')) continue;
        const cell = cells[key];
        const isHovered = key === hoveredTextId;

        ctx.save();
        if (isHovered) {
            ctx.shadowColor = 'rgba(245, 158, 11, 0.8)';
            ctx.shadowBlur = 8;
            ctx.fillStyle = 'rgba(245, 158, 11, 0.2)';
            const sz = TEXT_SIZES[cell.size] || TEXT_SIZES.M;
            const textWidth = ctx.measureText(cell.label).width;
            ctx.fillRect(cell.x - textWidth / 2 - 5, cell.y - sz / 2, textWidth + 10, sz);
        }

        const sz = TEXT_SIZES[cell.size] || TEXT_SIZES.M;
        ctx.font = `bold ${sz}px sans-serif`; ctx.fillStyle = cell.color || 'white';
        ctx.fillText(cell.label, cell.x, cell.y);
        ctx.restore();
    }
    ctx.shadowBlur = 0;
}

export const GloryPlanner = ({ onSwitchMap, isAdmin = false }) => {
    const [alliances, setAlliances] = useState([]);
    const [activeAllianceId, setActiveAllianceId] = useState(null);
    const [cells, setCells] = useState({});
    const [tool, setTool] = useState('hand');
    const [toolLevel, setToolLevel] = useState(1);
    const [zoom, setZoom] = useState(0.5);
    const [toast, setToast] = useState('');
    const [showCoords, setShowCoords] = useState(false);
    const [showShared, setShowShared] = useState(false);
    const [sharedMaps, setSharedMaps] = useState([]);
    const [sharedLoading, setSharedLoading] = useState(false);
    const [textColor, setTextColor] = useState(null);
    const [textSize, setTextSize] = useState('M');
    const [textInput, setTextInput] = useState(null);
    const [originInput, setOriginInput] = useState(null);
    const [isPanning, setIsPanning] = useState(false);
    const [hoveredTextId, setHoveredTextId] = useState(null);
    const [showExportList, setShowExportList] = useState(false);
    const [exportTextData, setExportTextData] = useState('');
    const [hoverCoordText, setHoverCoordText] = useState('');
    const [showHelp, setShowHelp] = useState(false);

    const canvasRef = useRef(null); const containerRef = useRef(null);
    const offsetRef = useRef({ x: 0, y: 0 }); const zoomRef = useRef(0.5);
    const showCoordsRef = useRef(false);
    const cellsRef = useRef({}); const alliancesRef = useRef([]);
    const toolRef = useRef('hand'); const toolLevelRef = useRef(1);
    const activeIdRef = useRef(null);
    const isDragging = useRef(false); const isPainting = useRef(false);
    const lastPos = useRef({ x: 0, y: 0 }); const dragStart = useRef({ x: 0, y: 0 });
    const lastPaintHex = useRef(null); const draggingText = useRef(null);
    const textColorRef = useRef(null); const textSizeRef = useRef('M');
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

    useEffect(() => { cellsRef.current = cells; pushHistory(cells); requestDraw(); }, [cells]);
    useEffect(() => { alliancesRef.current = alliances; requestDraw(); }, [alliances]);
    useEffect(() => { toolRef.current = tool; }, [tool]);
    useEffect(() => { toolLevelRef.current = toolLevel; }, [toolLevel]);
    useEffect(() => { activeIdRef.current = activeAllianceId; requestDraw(); }, [activeAllianceId]);
    useEffect(() => { textColorRef.current = textColor; }, [textColor]);
    useEffect(() => { textSizeRef.current = textSize; }, [textSize]);
    useEffect(() => { showCoordsRef.current = showCoords; requestDraw(); }, [showCoords]);

    const getQuota = (alliance, lv) => alliance.centers[lv] ? alliance.memberCount * LEVEL_MULTI[lv] : 0;
    const countBuildings = (aid, lv) => Object.values(cellsRef.current).filter(c => c?.type === 'building' && c.allianceId === aid && c.level === lv).length;

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

    // ── 防總部封鎖：用最少建築讓區域內無法放置任何7格總部 ──
    const antiHQFill = (aid, lv) => {
        const alliance = alliancesRef.current.find(a => a.id === aid);
        if (!alliance?.centers[lv]) return;
        const { q: cq, r: cr } = alliance.centers[lv];

        const blockerKeys = computeHQBlockingSet(cq, cr, cellsRef.current);

        if (blockerKeys.length === 0) {
            showToast('✅ 區域已完全封鎖，無需額外建築');
            return;
        }

        const quota = getQuota(alliance, lv);
        const used = countBuildings(aid, lv);
        const available = quota - used;

        if (blockerKeys.length > available) {
            const ok = window.confirm(
                `需要放置 ${blockerKeys.length} 棟建築才能完全封鎖，\n` +
                `但配額只剩 ${available} 棟（總配額 ${quota}，已用 ${used}）。\n\n` +
                `要用盡剩餘配額盡量封鎖嗎？`
            );
            if (!ok) return;
        }

        setCells(prev => {
            const nc = { ...prev };
            let placed = 0;
            const limit = Math.min(blockerKeys.length, available);
            for (const k of blockerKeys) {
                if (placed >= limit) break;
                if (nc[k]) continue;
                const [q, r] = k.split(',').map(Number);
                if (!isInZone(q, r, cq, cr)) continue;
                nc[k] = { type: 'building', allianceId: aid, level: lv, color: alliance.color };
                placed++;
            }
            if (placed < blockerKeys.length) {
                showToast(`⚠️ 配額不足！放了 ${placed}/${blockerKeys.length} 棟，仍有部分HQ位置未封鎖`);
            } else {
                showToast(`🛡️ 完成！放置 ${placed} 棟，區域內無法再放總部！`);
            }
            return nc;
        });
    };

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

    const publishToCloud = async () => {
        const title = prompt('請輸入共享地圖標題：', '榮耀之戰規劃圖');
        if (!title) return;
        try {
            const id = `glory_${Date.now()}`;
            await setDoc(doc(db, 'shared_maps', id), {
                title, mapMode: 'glory',
                cells: cellsRef.current, alliances: alliancesRef.current,
                publishedAt: serverTimestamp(),
            });
            showToast('☁️ 已發佈到共享區！');
        } catch (err) { showToast('❌ 發佈失敗：' + err.message); }
    };
    const loadSharedList = async () => {
        setSharedLoading(true);
        try {
            const q2 = query(collection(db, 'shared_maps'), orderBy('publishedAt', 'desc'));
            const snap = await getDocs(q2);
            setSharedMaps(snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(m => m.mapMode === 'glory'));
        } catch { showToast('❌ 讀取失敗'); }
        setSharedLoading(false);
    };
    const copySharedMap = (map) => {
        if (map.cells) { skipHistory.current = true; setCells(JSON.parse(JSON.stringify(map.cells))); }
        if (map.alliances) { setAlliances(map.alliances); setActiveAllianceId(map.alliances[0]?.id || null); }
        historyRef.current = [JSON.parse(JSON.stringify(map.cells || {}))]; historyIdx.current = 0;
        centerMap(); setShowShared(false);
        showToast(`📋 已複製: ${map.title}`);
    };
    const deleteSharedMap = async (id) => {
        if (!window.confirm('確定刪除此共享地圖？')) return;
        await deleteDoc(doc(db, 'shared_maps', id));
        setSharedMaps(prev => prev.filter(m => m.id !== id));
        showToast('🗑️ 已刪除');
    };

    const exportPositions = () => {
        if (!cellsRef.current.origin) {
            showToast('❌ 請先校正原點座標！');
            return;
        }

        const { q: q0, r: r0, x: x0, y: y0 } = cellsRef.current.origin;
        const cs = cellsRef.current;
        const as = alliancesRef.current;

        // Group by alliance and filter out text/colors/etc.
        const output = [];

        for (const a of as) {
            output.push(`【${a.name}】`);

            // Output centers and buildings
            for (const key of Object.keys(cs)) {
                const cell = cs[key];
                if (!cell || cell.allianceId !== a.id) continue;

                // Only log center of HQ or Centers
                if ((cell.type === 'center' || cell.type === 'hq') && !cell.isCenter) continue;

                const [q, r] = key.split(',').map(Number);
                if (isNaN(q) || isNaN(r)) continue;

                // Calculate real game coordinates
                const gy = r - r0 + y0;
                const gx = q - q0 + Math.floor(gy / 2) - Math.floor(y0 / 2) + x0;

                let title = '';
                if (cell.type === 'center') title = `Lv${cell.level} 聯盟中心`;
                else if (cell.type === 'hq') title = `總部 ${cell.label || ''}`;
                else if (cell.type === 'building') title = `Lv${cell.level} 小建築`;
                else if (cell.type === 'flex_building') title = `彈性建築`;

                output.push(`- ${title}: (${gx}, ${gy})`);
            }
            output.push('');
        }

        // Output unaffiliated HQs
        const unaffiliatedHQs = Object.keys(cs).filter(k => {
            const c = cs[k];
            return c && c.type === 'hq' && c.isCenter && !c.allianceId;
        });

        if (unaffiliatedHQs.length > 0) {
            output.push('【未分配聯盟的總部】');
            unaffiliatedHQs.forEach(key => {
                const c = cs[key];
                const [q, r] = key.split(',').map(Number);
                const gy = r - r0 + y0;
                const gx = q - q0 + Math.floor(gy / 2) - Math.floor(y0 / 2) + x0;
                output.push(`- 總部 ${c.label || ''}: (${gx}, ${gy})`);
            });
        }

        const textToCopy = output.join('\n').trim();
        if (!textToCopy) {
            showToast('⚠️ 沒有可匯出的建築');
            return;
        }

        setExportTextData(textToCopy);
        setShowExportList(true);

        navigator.clipboard.writeText(textToCopy).then(() => {
            showToast('📋 座標清單已複製到剪貼簿！');
        }).catch(() => {
            showToast('❌ 複製失敗，請手動複製右側清單內容');
        });
    };

    const exportImage = () => {
        const as = alliancesRef.current;
        const cs = cellsRef.current;
        let minPx = Infinity, maxPx = -Infinity, minPy = Infinity, maxPy = -Infinity;
        for (const a of as) {
            for (const lv of [1, 2, 3]) {
                const c = a.centers[lv]; if (!c) continue;
                const b = getZoneBounds(c.q, c.r);
                minPx = Math.min(minPx, b.left); maxPx = Math.max(maxPx, b.right);
                minPy = Math.min(minPy, b.top); maxPy = Math.max(maxPy, b.bottom);
            }
        }
        for (const key of Object.keys(cs)) {
            if (key.startsWith('text_')) {
                const t = cs[key];
                minPx = Math.min(minPx, t.x - 100); maxPx = Math.max(maxPx, t.x + 100);
                minPy = Math.min(minPy, t.y - 40); maxPy = Math.max(maxPy, t.y + 40);
                continue;
            }
            const [q, r] = key.split(',').map(Number);
            if (isNaN(q) || isNaN(r)) continue;
            const [x, y] = hex2px(q, r);
            minPx = Math.min(minPx, x - HEX_R); maxPx = Math.max(maxPx, x + HEX_R);
            minPy = Math.min(minPy, y - HEX_R); maxPy = Math.max(maxPy, y + HEX_R);
        }
        if (!isFinite(minPx)) { showToast('❌ 地圖為空'); return; }
        const padding = HEX_R * 4;
        const w = (maxPx - minPx) + padding * 2;
        const h = (maxPy - minPy) + padding * 2;
        const centerX = (minPx + maxPx) / 2;
        const centerY = (minPy + maxPy) / 2;
        const tmpCanvas = document.createElement('canvas');
        tmpCanvas.width = w * 2; tmpCanvas.height = h * 2;
        const tCtx = tmpCanvas.getContext('2d');
        tCtx.scale(2, 2);
        tCtx.fillStyle = '#0f172a'; tCtx.fillRect(0, 0, w, h);
        tCtx.translate(w / 2 - centerX, h / 2 - centerY);
        const exportBounds = { left: centerX - w / 2, right: centerX + w / 2, top: centerY - h / 2, bottom: centerY + h / 2 };
        drawGloryMap(tCtx, cs, as, null, null, exportBounds, false);
        const link = document.createElement('a');
        link.download = `glory-map-${new Date().toISOString().slice(0, 10)}.png`;
        link.href = tmpCanvas.toDataURL('image/png');
        link.click();
        showToast('📸 已匯出完整地圖！');
    };

    const centerMap = () => { if (!containerRef.current) return; const r = containerRef.current.getBoundingClientRect(); offsetRef.current = { x: r.width / 2, y: r.height / 2 }; requestDraw(); };
    useEffect(() => {
        const cont = containerRef.current;
        if (!cont) return;
        const resizeObserver = new ResizeObserver((entries) => {
            const entry = entries[0];
            if (!entry) return;
            const { width, height } = entry.contentRect;
            if (width <= 0 || height <= 0) return;
            const canvas = canvasRef.current;
            if (!canvas) return;
            const dpr = window.devicePixelRatio || 1;
            dprRef.current = dpr;
            canvas.width = width * dpr;
            canvas.height = height * dpr;
            canvas.style.width = `${width}px`;
            canvas.style.height = `${height}px`;
            if (offsetRef.current.x === 0 && offsetRef.current.y === 0) {
                offsetRef.current = { x: width / 2, y: height / 2 };
            }
            requestDraw();
        });
        resizeObserver.observe(cont);
        return () => resizeObserver.disconnect();
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
        const activeA = alliancesRef.current.find(a => a.id === activeIdRef.current);
        drawGloryMap(ctx, cellsRef.current, alliancesRef.current, activeIdRef.current, hoveredHex.current, viewBounds, showCoordsRef.current, toolRef.current, toolLevelRef.current, activeA, toolRef.current === 'hand' ? hoveredTextId : null);
        ctx.restore();
    };

    const getWorldPos = (e) => {
        const rect = canvasRef.current.getBoundingClientRect();
        return [(e.clientX - rect.left - offsetRef.current.x) / zoomRef.current, (e.clientY - rect.top - offsetRef.current.y) / zoomRef.current];
    };

    const getHoverCoordLabel = useCallback((q, r) => {
        const origin = cellsRef.current?.origin;
        if (origin) {
            const { q: q0, r: r0, x: x0, y: y0 } = origin;
            const gy = r - r0 + y0;
            const gx = q - q0 + Math.floor(gy / 2) - Math.floor(y0 / 2) + x0;
            return `(${gx}, ${gy})`;
        }
        return `(${q}, ${r})`;
    }, []);
    const handleMouseDown = (e) => {
        dragStart.current = { x: e.clientX, y: e.clientY };
        const [wx, wy] = getWorldPos(e);
        if (toolRef.current === 'hand' && e.button === 0) {
            const hitText = Object.keys(cellsRef.current).find(k => k.startsWith('text_') && Math.hypot(cellsRef.current[k].x - wx, cellsRef.current[k].y - wy) < 20);
            if (hitText) {
                draggingText.current = { id: hitText, startX: wx, startY: wy, ix: cellsRef.current[hitText].x, iy: cellsRef.current[hitText].y };
                e.preventDefault(); return;
            }
        }
        if (e.button === 2 || e.button === 1 || (e.button === 0 && toolRef.current === 'hand')) {
            isDragging.current = true; setIsPanning(true); lastPos.current = { x: e.clientX, y: e.clientY }; e.preventDefault();
        } else if (e.button === 0 && (toolRef.current === 'building' || toolRef.current === 'eraser')) {
            isPainting.current = true; lastPaintHex.current = null;
        }
    };
    const handleMouseMove = (e) => {
        const [wx, wy] = getWorldPos(e);
        if (draggingText.current) {
            const dragInfo = draggingText.current;
            const dx = wx - dragInfo.startX, dy = wy - dragInfo.startY;
            setCells(prev => {
                if (!dragInfo.id || !prev[dragInfo.id]) return prev;
                return { ...prev, [dragInfo.id]: { ...prev[dragInfo.id], x: dragInfo.ix + dx, y: dragInfo.iy + dy } };
            });
            return;
        }
        if (isDragging.current) {
            const dx = e.clientX - lastPos.current.x, dy = e.clientY - lastPos.current.y;
            lastPos.current = { x: e.clientX, y: e.clientY };
            offsetRef.current = { x: offsetRef.current.x + dx, y: offsetRef.current.y + dy };
            requestDraw(); return;
        }
        if (isPainting.current) {
            const [q, r] = px2hex(wx, wy);
            const k = `${q},${r}`;
            if (lastPaintHex.current !== k) { lastPaintHex.current = k; applyTool(q, r, wx, wy); }
            return;
        }
        if (toolRef.current === 'hand') {
            const hitText = Object.keys(cellsRef.current).find(k => k.startsWith('text_') && Math.hypot(cellsRef.current[k].x - wx, cellsRef.current[k].y - wy) < 20);
            if (hitText !== hoveredTextId) { setHoveredTextId(hitText); requestDraw(); }
        }
        const [hq, hr] = px2hex(wx, wy);
        const p = hoveredHex.current;
        if (!p || p[0] !== hq || p[1] !== hr) {
            hoveredHex.current = [hq, hr];

            // ✅ 新增：右上角顯示座標
            const label = getHoverCoordLabel(hq, hr);
            setHoverCoordText(prev => (prev === label ? prev : label));

            requestDraw();
        }
    };
    const handleMouseUp = () => {
        if (draggingText.current) { draggingText.current = null; requestDraw(); }
        isDragging.current = false; setIsPanning(false); isPainting.current = false; lastPaintHex.current = null;
    };
    const handleClick = (e) => {
        const dx = e.clientX - dragStart.current.x, dy = e.clientY - dragStart.current.y;
        if (Math.sqrt(dx * dx + dy * dy) > 4) return;
        if (e.button !== 0 || toolRef.current === 'hand') return;
        const [wx, wy] = getWorldPos(e);
        const [q, r] = px2hex(wx, wy);
        applyTool(q, r, wx, wy);
    };
    const handleDoubleClick = (e) => {
        e.preventDefault();
        const [wx, wy] = getWorldPos(e);
        const hitText = Object.keys(cellsRef.current).find(k => k.startsWith('text_') && Math.hypot(cellsRef.current[k].x - wx, cellsRef.current[k].y - wy) < 20);
        if (hitText) {
            const t = cellsRef.current[hitText];
            setTextInput({ x: t.x, y: t.y, val: t.label, color: t.color || '#ffffff', size: t.size || 'M', editId: hitText });
            return;
        }
        const [q, r] = px2hex(wx, wy);
        if (toolRef.current === 'origin') { setOriginInput({ q, r }); return; }
        const cell = cellsRef.current[`${q},${r}`];
        if (cell?.isCenter && (cell.type === 'hq' || cell.type === 'center')) {
            const name = prompt('輸入名稱（留空清除）', cell.label || '');
            if (name === null) return;
            setCells(prev => ({ ...prev, [`${q},${r}`]: { ...prev[`${q},${r}`], label: name.trim() || undefined } }));
        }
    };

    const darkenHex = (hex, amount = -40) => {
        if (!hex || !hex.match(/^#[0-9a-fA-F]{6}$/)) return hex;
        let r = Math.max(0, parseInt(hex.slice(1, 3), 16) + amount);
        let g = Math.max(0, parseInt(hex.slice(3, 5), 16) + amount);
        let b = Math.max(0, parseInt(hex.slice(5, 7), 16) + amount);
        return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    };

    const applyTool = (q, r, wx, wy) => {
        const t = toolRef.current, lv = toolLevelRef.current, aid = activeIdRef.current;
        const alliance = alliancesRef.current.find(a => a.id === aid);
        let activeColor = textColorRef.current;
        if (!activeColor) {
            if (t === 'hq') activeColor = darkenHex(alliance?.color) || '#64748b';
            else activeColor = alliance?.color || '#94a3b8';
        }
        if (t === 'text') {
            setTextInput({ x: wx, y: wy, val: '', color: textColorRef.current || '#ffffff', size: textSizeRef.current, editId: null });
            return;
        }
        setCells(prev => {
            const key = `${q},${r}`, nc = { ...prev };
            if (t === 'eraser') {
                const textKey = Object.keys(nc).find(k => k.startsWith('text_') && Math.hypot(nc[k].x - wx, nc[k].y - wy) < 15);
                if (textKey) { delete nc[textKey]; }
                else {
                    const tgt = nc[key];
                    if (tgt?.isCenter && tgt.type === 'center') {
                        CENTER_SHAPE.forEach(([oq, or]) => delete nc[`${q + oq},${r + or}`]);
                        Object.keys(nc).forEach(k => {
                            if (nc[k]?.type === 'building' && nc[k].allianceId === tgt.allianceId && nc[k].level === tgt.level) {
                                delete nc[k];
                            }
                        });
                        setAlliances(p => p.map(a => a.id === tgt.allianceId ? { ...a, centers: { ...a.centers, [tgt.level]: null } } : a));
                    } else if (tgt?.parent && tgt.type === 'center') {
                        const [pq, pr] = tgt.parent.split(',').map(Number);
                        CENTER_SHAPE.forEach(([oq, or]) => delete nc[`${pq + oq},${pr + or}`]);
                        Object.keys(nc).forEach(k => {
                            if (nc[k]?.type === 'building' && nc[k].allianceId === tgt.allianceId && nc[k].level === tgt.level) {
                                delete nc[k];
                            }
                        });
                        setAlliances(p => p.map(a => a.id === tgt.allianceId ? { ...a, centers: { ...a.centers, [tgt.level]: null } } : a));
                    } else if (tgt?.parent && tgt.type === 'hq') {
                        const [pq, pr] = tgt.parent.split(',').map(Number);
                        HQ_SHAPE.forEach(([oq, or]) => delete nc[`${pq + oq},${pr + or}`]);
                    } else { delete nc[key]; }
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
            } else if (t === 'origin') {
                setOriginInput({ q, r });
            } else if (t === 'building' || t === 'flex_building') {
                if (t === 'building') {
                    if (!alliance) return prev;
                    const center = alliance.centers[lv];
                    if (!center) { showToast(`❌ 尚未放置 Lv${lv} 中心`); return prev; }
                    if (!isInZone(q, r, center.q, center.r)) return prev;
                    if (nc[key]) return prev;
                    const quota = getQuota(alliance, lv);
                    const used = countBuildings(aid, lv);
                    if (used >= quota) { showToast('❌ 配額已滿'); return prev; }
                    nc[key] = { type: 'building', allianceId: aid, level: lv, color: alliance.color };
                } else {
                    if (nc[key]) return prev;
                    nc[key] = { type: 'flex_building', allianceId: aid, level: lv, color: activeColor };
                }
            } else if (t === 'hq') {
                const blocked = HQ_SHAPE.some(([oq, or]) => nc[`${q + oq},${r + or}`]);
                if (blocked) return prev;
                HQ_SHAPE.forEach(([oq, or]) => {
                    nc[`${q + oq},${r + or}`] = { type: 'hq', color: activeColor, parent: key, isCenter: oq === 0 && or === 0 };
                });
            }
            return nc;
        });
    };

    useEffect(() => { document.body.style.cursor = 'default'; }, [tool]);
    const cursorClass = tool === 'hand'
        ? (draggingText.current ? 'cursor-move' : (isPanning ? 'cursor-grabbing' : (hoveredTextId ? 'cursor-move' : 'cursor-grab')))
        : (isPanning ? 'cursor-grabbing' : (tool === 'eraser' ? 'cursor-crosshair' : 'cursor-cell'));
    const activeAlliance = alliances.find(a => a.id === activeAllianceId);

    return (
        <div className="flex flex-col h-full min-h-0 w-full bg-slate-900 overflow-hidden border-t border-slate-700 shadow-2xl relative z-50">
            <div className="p-2.5 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 flex items-center justify-between z-10 flex-wrap gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex bg-slate-800 rounded-lg p-1">
                        <TabBtn onClick={() => onSwitchMap('svs')} icon={<MapIcon size={14} />} label="SVS" ac="bg-blue-600" />
                        <TabBtn onClick={() => onSwitchMap('fishpond')} icon={<Fish size={14} />} label="魚池" ac="bg-rose-600" />
                        <TabBtn active icon={<Shield size={14} />} label="榮耀" ac="bg-amber-600" />
                    </div>
                    <div className="h-6 w-px bg-slate-700" />
                    <div className="flex bg-slate-800 rounded-lg p-1">
                        <ToolBtn active={tool === 'hand'} onClick={() => setTool('hand')} icon={<Hand size={15} />} label="移動" />
                        <ToolBtn active={tool === 'center'} onClick={() => setTool('center')} icon={<Shield size={15} />} label="聯盟中心" />
                        <ToolBtn active={tool === 'building'} onClick={() => setTool('building')} icon="⛺" label="小建築" />
                        <ToolBtn active={tool === 'flex_building'} onClick={() => setTool('flex_building')} icon="⛺✨" label="彈性建築(不限區域/配額)" />
                        <ToolBtn active={tool === 'hq'} onClick={() => setTool('hq')} icon={<Home size={15} />} label="總部" />
                        <ToolBtn active={tool === 'origin'} onClick={() => setTool('origin')} icon={<MapPin size={15} />} label="坐標校正" />
                        <ToolBtn active={tool === 'text'} onClick={() => setTool('text')} icon={<Type size={15} />} label="文字" />
                        <ToolBtn active={tool === 'eraser'} onClick={() => setTool('eraser')} icon={<Trash2 size={15} />} label="橡皮擦" />
                    </div>
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
                    {(tool === 'text' || tool === 'hq' || tool === 'flex_building') && (
                        <>
                            <div className="flex gap-1.5 items-center bg-slate-800 rounded-lg p-1">
                                {(tool === 'hq' || tool === 'flex_building') && activeAlliance && (
                                    <button onClick={() => setTextColor(null)}
                                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-transform ${!textColor ? 'border-white scale-110' : 'border-transparent opacity-50 hover:opacity-100'}`}
                                        style={{ backgroundColor: activeAlliance.color }} title="跟隨聯盟顏色">
                                        <Shield size={10} color="#fff" />
                                    </button>
                                )}
                                {['#ffffff', '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#64748b'].map(c => {
                                    const isSelected = textColor === c || (!textColor && tool === 'text' && c === '#ffffff');
                                    return (
                                        <button key={c} onClick={() => setTextColor(c)}
                                            className={`w-5 h-5 rounded-full border-2 transition-transform ${isSelected ? 'border-white scale-110' : 'border-transparent opacity-50 hover:opacity-100'}`}
                                            style={{ backgroundColor: c }} />
                                    );
                                })}
                            </div>
                            {tool === 'text' && (
                                <div className="flex bg-slate-800 rounded-lg p-0.5 gap-0.5">
                                    {[['S', '小'], ['M', '中'], ['L', '大']].map(([k, label]) => (
                                        <button key={k} onClick={() => setTextSize(k)}
                                            className={`px-2 py-1 rounded-md text-[10px] font-bold transition-colors ${textSize === k ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}>
                                            {label}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </>
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
                    {isAdmin && <>
                        <button onClick={publishToCloud} title="發佈到共享區" className="p-1.5 bg-slate-800 text-slate-400 rounded-lg hover:text-violet-400 border border-slate-700"><Share2 size={13} /></button>
                        <button onClick={() => { setShowShared(true); loadSharedList(); }} title="共享列表" className="px-2 py-1.5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-lg text-[10px] font-bold">
                            ☁️ 共享
                        </button>
                    </>}
                    <div className="h-6 w-px bg-slate-700" />
                    <button onClick={() => setShowHelp(true)} className="px-2 py-1.5 rounded-lg text-[10px] font-bold flex items-center gap-1 bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700 transition-colors">
                        <HelpCircle size={12} className="text-amber-400" /> 說明
                    </button>
                    <button onClick={() => setShowCoords(!showCoords)} className={`px-2 py-1.5 rounded-lg text-[10px] font-medium flex items-center gap-1 ${showCoords ? 'bg-amber-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}>
                        <Navigation size={12} /> 座標
                    </button>
                    <button onClick={exportPositions} title="匯出座標清單到剪貼簿" className="px-2.5 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-lg text-[10px] font-bold shadow-lg hover:from-emerald-500">
                        📋 複製座標
                    </button>
                    <button onClick={exportImage} className="px-2.5 py-1.5 bg-gradient-to-r from-amber-600 to-orange-600 text-white rounded-lg text-[10px] font-bold shadow-lg hover:from-amber-500">
                        📸 匯出圖片
                    </button>
                </div>
            </div>

            <div className="flex flex-1 overflow-hidden">
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
                                                    <button onClick={(e) => { e.stopPropagation(); antiHQFill(a.id, lv); }}
                                                        title="自動放置最少建築，封鎖區域內所有可能的總部位置"
                                                        className="px-1.5 py-0.5 bg-rose-600/20 text-rose-400 rounded text-[9px] hover:bg-rose-600/30">
                                                        🛡️防總
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

                {/* Right Panel for Export List (Toggled) */}
                {showExportList && (
                    <div className="w-64 bg-slate-900 border-r border-slate-800 overflow-y-auto flex flex-col flex-shrink-0 z-10 shadow-xl">
                        <div className="p-3 border-b border-slate-800 flex items-center justify-between sticky top-0 bg-slate-900/90 backdrop-blur">
                            <h3 className="font-bold text-amber-400 text-sm flex items-center gap-2"><MapPin size={14} />座標清單</h3>
                            <button onClick={() => setShowExportList(false)} className="text-slate-400 hover:text-white p-1 bg-slate-800 rounded">
                                <X size={14} />
                            </button>
                        </div>
                        <div className="p-3">
                            <textarea
                                readOnly
                                value={exportTextData}
                                className="w-full h-[500px] bg-slate-950 text-slate-300 text-xs p-2 rounded outline-none border border-slate-800 resize-none font-mono tracking-wider leading-relaxed"
                            />
                            <button
                                onClick={() => {
                                    navigator.clipboard.writeText(exportTextData);
                                    showToast('📋 已重新複製');
                                }}
                                className="w-full mt-3 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs rounded-lg flex items-center justify-center gap-1 transition-COLORS"
                            >
                                <Copy size={12} /> 重新複製到剪貼簿
                            </button>
                        </div>
                    </div>
                )}

                <div ref={containerRef} className="flex-1 relative overflow-hidden">
                    <canvas ref={canvasRef} className={`absolute inset-0 ${cursorClass}`}
                        onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp}
                        onClick={handleClick} onDoubleClick={handleDoubleClick}
                        onMouseLeave={() => {
                            isDragging.current = false;
                            isPainting.current = false;
                            draggingText.current = null;
                            hoveredHex.current = null;
                            setHoverCoordText('');   // ✅ 新增：離開畫布就隱藏
                            requestDraw();
                        }}
                        onContextMenu={e => e.preventDefault()} />

                    {!!hoverCoordText && (
                        <div className="absolute top-3 right-3 z-20 pointer-events-none">
                            <div className="px-2.5 py-1.5 rounded-lg bg-slate-950/70 border border-slate-700 backdrop-blur text-[11px] font-mono text-amber-300 shadow-lg">
                                {hoverCoordText}
                            </div>
                        </div>
                    )}

                    {textInput && (
                        <input autoFocus defaultValue={textInput.val}
                            style={{
                                position: 'absolute',
                                left: textInput.x * zoom + offsetRef.current.x,
                                top: textInput.y * zoom + offsetRef.current.y,
                                transform: 'translate(-50%, -50%)',
                                color: textInput.color,
                                fontSize: `${({ S: 14, M: 24, L: 36 }[textInput.size] || 24) * zoom}px`,
                                textShadow: '0 0 4px black'
                            }}
                            className="bg-transparent border-b border-white outline-none text-center min-w-[100px] z-20 font-bold"
                            onKeyDown={e => {
                                if (e.key === 'Enter') {
                                    const val = e.target.value.trim();
                                    if (val) {
                                        if (textInput.editId) {
                                            setCells(prev => ({ ...prev, [textInput.editId]: { ...prev[textInput.editId], label: val, color: textInput.color, size: textInput.size } }));
                                        } else {
                                            setCells(prev => ({ ...prev, [`text_${Date.now()}`]: { type: 'text', label: val, x: textInput.x, y: textInput.y, color: textInput.color, size: textInput.size } }));
                                        }
                                    } else if (textInput.editId) {
                                        setCells(prev => { const nc = { ...prev }; delete nc[textInput.editId]; return nc; });
                                    }
                                    setTextInput(null);
                                } else if (e.key === 'Escape') { setTextInput(null); }
                            }}
                            onBlur={() => setTextInput(null)} />
                    )}

                    {originInput && (
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-slate-900 border border-slate-700 p-4 rounded-xl shadow-2xl z-30 flex flex-col gap-3 min-w-[250px]">
                            <h3 className="text-white text-sm font-bold flex items-center gap-2"><MapPin size={16} className="text-amber-400" /> 校正遊戲對應座標</h3>
                            <p className="text-[10px] text-slate-400">請輸入此格在遊戲地圖上的真實 (X, Y) 座標：</p>
                            <form onSubmit={(e) => {
                                e.preventDefault();
                                const x = parseInt(e.target.x.value, 10);
                                const y = parseInt(e.target.y.value, 10);
                                if (!isNaN(x) && !isNaN(y)) {
                                    setCells(prev => ({ ...prev, origin: { q: originInput.q, r: originInput.r, x, y } }));
                                    showToast(`📍 座標已校正為 (${x}, ${y})`);
                                    setShowCoords(true);
                                }
                                setOriginInput(null);
                            }} className="flex gap-2 text-sm justify-between">
                                <input name="x" type="number" placeholder="X" required className="w-20 px-2 py-1 bg-slate-800 text-white rounded border border-slate-700 outline-none focus:border-amber-500" autoFocus />
                                <input name="y" type="number" placeholder="Y" required className="w-20 px-2 py-1 bg-slate-800 text-white rounded border border-slate-700 outline-none focus:border-amber-500" />
                                <div className="flex gap-1 ml-auto">
                                    <button type="button" onClick={() => setOriginInput(null)} className="px-3 bg-slate-700 hover:bg-slate-600 text-white rounded font-bold">X</button>
                                    <button type="submit" className="px-3 bg-amber-600 hover:bg-amber-500 text-white rounded font-bold">確定</button>
                                </div>
                            </form>
                            {cells.origin && (
                                <button onClick={() => {
                                    setCells(prev => { const nc = { ...prev }; delete nc.origin; return nc; });
                                    setOriginInput(null); showToast('🗑️ 已移除自訂座標原點');
                                }} className="mt-1 text-[10px] text-red-500 hover:text-red-400 self-end uppercase">
                                    清除座標基準點
                                </button>
                            )}
                        </div>
                    )}

                    {toast && <div className="absolute top-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-slate-800/90 text-white text-sm font-bold rounded-xl border border-slate-600 shadow-xl backdrop-blur z-20">{toast}</div>}

                    {showShared && (
                        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                            <div className="bg-slate-900 rounded-2xl border border-slate-700 shadow-2xl w-[500px] max-h-[80%] flex flex-col overflow-hidden">
                                <div className="p-4 border-b border-slate-700 flex items-center justify-between">
                                    <h3 className="text-white font-bold flex items-center gap-2">☁️ 榮耀共享地圖</h3>
                                    <button onClick={() => setShowShared(false)} className="text-slate-400 hover:text-white"><X size={18} /></button>
                                </div>
                                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                                    {sharedLoading ? (
                                        <p className="text-center text-slate-500 py-8">載入中...</p>
                                    ) : sharedMaps.length === 0 ? (
                                        <p className="text-center text-slate-500 py-8">尚無共享地圖</p>
                                    ) : sharedMaps.map(m => (
                                        <div key={m.id} className="bg-slate-800 rounded-xl p-3 flex items-center justify-between border border-slate-700 hover:border-slate-600 transition-colors">
                                            <div>
                                                <p className="text-white font-bold text-sm">{m.title}</p>
                                                <div className="flex items-center gap-3 mt-1 text-[10px] text-slate-500">
                                                    <span className="px-1.5 py-0.5 rounded bg-amber-900/50 text-amber-400">榮耀</span>
                                                    <span className="flex items-center gap-1"><Clock size={10} />{m.publishedAt?.toDate?.()?.toLocaleString('zh-TW')?.slice(0, 16) || '—'}</span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <button onClick={() => copySharedMap(m)} className="px-2.5 py-1.5 bg-amber-600 text-white rounded-lg text-[10px] font-bold hover:bg-amber-500 flex items-center gap-1">
                                                    <Copy size={12} /> 複製
                                                </button>
                                                <button onClick={() => deleteSharedMap(m.id)} className="p-1.5 text-slate-500 hover:text-red-400 rounded-lg hover:bg-red-900/20">
                                                    <Trash2 size={13} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {showHelp && (
                        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                            <div className="bg-slate-900 rounded-2xl border border-slate-700 shadow-2xl w-full max-w-2xl max-h-full flex flex-col overflow-hidden">
                                <div className="p-4 border-b border-slate-700 flex items-center justify-between bg-slate-800/50">
                                    <h3 className="text-white text-lg font-bold flex items-center gap-2">
                                        <HelpCircle className="text-amber-400" size={20} />
                                        榮耀之戰 (Glory Planner) 使用指南
                                    </h3>
                                    <button onClick={() => setShowHelp(false)} className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-700 transition-colors">
                                        <X size={20} />
                                    </button>
                                </div>
                                <div className="flex-1 overflow-y-auto p-5 text-slate-300 text-sm space-y-6">
                                    <section>
                                        <h4 className="text-amber-400 font-bold mb-2 flex items-center gap-2"><Plus size={16} /> 一、 建立與管理聯盟</h4>
                                        <ul className="list-disc pl-5 space-y-1 text-slate-400">
                                            <li><strong className="text-slate-200">新增聯盟</strong>：在左側面板點擊「+ 新增聯盟」，可以為戰場建立不同的勢力。</li>
                                            <li><strong className="text-slate-200">編輯資訊</strong>：點擊名稱即可編輯；點選旁邊的顏色圓點可自訂專屬代表色；也可輸入聯盟人數計算對應配額。</li>
                                            <li><strong className="text-slate-200">切換操作聯盟</strong>：點擊列表中的聯盟卡片使其「✦ 選中 ✦」。在此狀態下放置的「聯盟中心」、「小建築」等都會歸屬於該聯盟。</li>
                                            <li><strong className="text-slate-200">配額檢視與快捷按鈕</strong>：放置聯盟中心後，左側列表會即時顯示小建築的配額（例如 0/730）。列表內提供【填滿】(一鍵鋪滿整個領地) 與【🛡️防總】操作。</li>
                                        </ul>
                                    </section>

                                    <section>
                                        <h4 className="text-blue-400 font-bold mb-2 flex items-center gap-2"><MousePointer2 size={16} /> 二、 工具列全解析</h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-3 text-slate-400">
                                            <div><strong className="text-slate-200 flex items-center gap-1"><Hand size={14} /> 移動</strong>：平移圖板視角。</div>
                                            <div><strong className="text-slate-200 flex items-center gap-1"><Shield size={14} /> 聯盟中心</strong>：有 Lv1~Lv3 級別。放置後，周圍自動產生 27×27 專屬領地。</div>
                                            <div><strong className="text-slate-200 flex items-center gap-1">⛺ 小建築</strong>：必須放置在該聯盟的專屬領地內，按住左鍵可拖曳塗抹。</div>
                                            <div><strong className="text-slate-200 flex items-center gap-1">⛺✨ 彈性建築</strong>：無視領地範圍限制、不扣除數量配額的特殊建築。</div>
                                            <div><strong className="text-slate-200 flex items-center gap-1"><Home size={14} /> 總部 (HQ)</strong>：佔地七格的玩家基地。放置時會標示總部圖形。</div>
                                            <div><strong className="text-slate-200 flex items-center gap-1"><MapPin size={14} /> 坐標校正</strong>：點擊圖上一格並輸入對應的遊戲座標，讓圖板座標系完美與遊戲同步！</div>
                                            <div><strong className="text-slate-200 flex items-center gap-1"><Type size={14} /> 文字</strong>：有 S/M/L 大小。點擊放置文字，雙擊文字本身可編輯內容。</div>
                                            <div><strong className="text-slate-200 flex items-center gap-1"><Trash2 size={14} /> 橡皮擦</strong>：點擊刪除元素。若刪除聯盟中心，系統會一併清除其專屬小建築。</div>
                                        </div>
                                    </section>

                                    <section>
                                        <h4 className="text-emerald-400 font-bold mb-2 flex items-center gap-2"><Shield size={16} /> 三、 進階戰術 (防總部封鎖)</h4>
                                        <ul className="list-disc pl-5 space-y-1 text-slate-400">
                                            <li>在左側聯盟列表中，若該聯盟已放置中心，會出現 <strong className="text-rose-400">🛡️防總</strong> 按鈕。</li>
                                            <li>點擊後，系統會自動在該中心的 27×27 領地內，計算出<b>最少且最佳的小建築放置位置</b>，完美封鎖敵方所有能飛入總部的空地 (Anti-HQ 最佳化)！</li>
                                            <li>實時座標顯示：打開右上角「座標」開關，滑鼠移動時右上角會顯示該格的遊戲實時座標。</li>
                                        </ul>
                                    </section>

                                    <section>
                                        <h4 className="text-purple-400 font-bold mb-2 flex items-center gap-2"><Save size={16} /> 四、 存檔、座標與圖片匯出</h4>
                                        <ul className="list-disc pl-5 space-y-1 text-slate-400">
                                            <li><strong className="text-slate-200">本地與存檔</strong>：Ctrl+S 或儲存按鈕，資料會存在瀏覽器快取。可以匯出/匯入 JSON 備份。</li>
                                            <li><strong className="text-slate-200">複製座標</strong>：點擊「📋 複製座標」，左側會彈出純文字清單面板，並自動複製地圖上所有重要據點座標，方便轉發至通訊軟體。</li>
                                            <li><strong className="text-slate-200">📸 匯出圖片</strong>：自動裁切並下載當前有畫東西的戰術地圖區域成 PNG 圖檔。</li>
                                        </ul>
                                    </section>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="absolute bottom-4 right-4 bg-slate-900/70 backdrop-blur border border-slate-700 p-3 rounded-xl pointer-events-none text-[10px] text-slate-400 space-y-1">
                        <h4 className="text-amber-400 font-bold text-xs uppercase tracking-widest mb-1.5">操作指南</h4>
                        <p>✋ <b>手掌</b>：拖曳 ┃ 🔄 <b>滾輪</b>：縮放</p>
                        <p>💾 <b>Ctrl+S</b>：儲存 ┃ ↩️ <b>Ctrl+Z/Y</b>：復原</p>
                        <p>🏛️ <b>聯盟中心</b>：放置後自動產生 27×27 區域</p>
                        <p>⛺ <b>小建築</b>：拖曳快速佈置 ┃ 📁 <b>匯出/匯入</b></p>
                        <p>🔤 <b>文字</b>：點擊放置標註 ┃ 雙擊編輯內容</p>
                        <p>🛡️ <b>防總</b>：最少建築封鎖所有內部HQ位置</p>
                    </div>
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