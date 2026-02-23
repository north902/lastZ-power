import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
    MousePointer2, Trash2, Download, ZoomIn, ZoomOut, Maximize,
    Map as MapIcon, Sword, Home, MapPin, Navigation, Fish, Hand, Pen, Type,
    Undo2, Redo2, Save, Upload, Share2, Copy, X, Clock, Shield
} from 'lucide-react';
import { db } from '../../config/firebase';
import { doc, setDoc, getDocs, deleteDoc, collection, query, orderBy, serverTimestamp } from 'firebase/firestore';
import { GloryPlanner } from './GloryPlanner';

// ═══════════════════════════════════════════════════════════════
//  Constants
// ═══════════════════════════════════════════════════════════════
const HEX_R = 25;
const SVS_RADIUS = 55;
const SVS_ICE = 17;
const SVS_SOIL = 35;
const FISH_RADIUS = 27;
const FISH_RED = 10;
const MAX_HISTORY = 30;

const HQ_SHAPE = [[0, 0], [1, -1], [1, 0], [0, 1], [-1, 1], [-1, 0], [0, -1]];
const CANNON_SHAPE = [[0, 0], [0, -1], [0, 1]];
const BATTERY_SHAPE = (() => {
    const s = [];
    for (let q = -3; q <= 3; q++) for (let r = -3; r <= 3; r++) if (Math.abs(-q - r) <= 3) s.push([q, r]);
    return s;
})();

const DRAGON_RADIUS = 4;
const DRAGON_ZONE = new Set();
for (let q = -DRAGON_RADIUS; q <= DRAGON_RADIUS; q++)
    for (let r = -DRAGON_RADIUS; r <= DRAGON_RADIUS; r++)
        if (Math.abs(-q - r) <= DRAGON_RADIUS) DRAGON_ZONE.add(`${q},${r}`);

const SVS_BATTERIES = [
    { id: '1', cq: -16, cr: 16 },
    { id: '2', cq: 0, cr: -16 },
    { id: '3', cq: 16, cr: 0 },
];

// ═══════════════════════════════════════════════════════════════
//  Hex Math
// ═══════════════════════════════════════════════════════════════
const S3 = Math.sqrt(3);
const hex2px = (q, r) => [HEX_R * (S3 * q + S3 / 2 * r), HEX_R * 1.5 * r];
const hexDist = (q, r) => Math.max(Math.abs(q), Math.abs(r), Math.abs(-q - r));
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

// 6 hex edge vertex pairs: [vertexA, vertexB] for each edge
const EDGE_VERTS = [[5, 0], [0, 1], [1, 2], [2, 3], [3, 4], [4, 5]];

// Fishpond default territory borders (always rendered, not part of cells state)
const FISHPOND_BORDERS = {
    '-2,5': [3], '-3,6': [5, 0], '-3,7': [5], '-2,7': [3], '-3,8': [5], '-2,8': [3], '-3,9': [5], '-2,9': [1, 2, 3], '-1,9': [1, 2], '-1,10': [5], '0,9': [1], '1,9': [2],
    '1,10': [4, 5, 0], '1,11': [5], '2,11': [3, 1], '1,12': [5], '2,12': [5], '3,11': [1], '3,12': [5], '4,11': [1], '5,11': [2],
    '5,12': [3, 2], '5,13': [3, 2], '5,14': [3, 2], '5,15': [3, 2], '5,16': [3, 2], '5,17': [4, 5], '6,17': [4], '7,16': [2], '7,17': [4], '8,16': [2],
    '8,17': [3, 2], '8,18': [3, 1], '7,19': [5], '9,18': [2],
    '5,-3': [4], '6,-3': [4], '6,-4': [2], '7,-4': [4, 3], '8,-4': [5, 4], '8,-5': [2], '9,-4': [4], '10,-5': [4, 3, 5], '11,-5': [4, 5],
    '12,-6': [1], '13,-6': [2, 1, 0], '14,-6': [4], '15,-7': [2, 1], '15,-6': [5], '16,-6': [4], '17,-7': [3, 4], '18,-8': [3, 4],
    '19,-9': [3, 4, 5], '20,-9': [4], '20,-10': [0], '21,-11': [1, 0], '22,-11': [4], '23,-12': [3, 4], '24,-13': [3, 4], '25,-14': [4, 3], '26,-15': [3, 4], '27,-16': [3, 4],
    '-5,3': [3, 4], '-6,4': [3, 4], '-7,5': [4], '-8,5': [3, 4, 5], '-9,5': [2, 1], '-10,5': [2, 1], '-11,5': [2], '-11,6': [4],
    '-12,5': [1, 2], '-13,5': [1, 2], '-14,5': [1, 2], '-15,5': [1], '-16,6': [0, 1], '-17,6': [2], '-17,7': [5, 4], '-18,6': [2], '-18,7': [4],
    '-19,6': [2, 1], '-20,6': [1], '-21,7': [0, 1], '-22,8': [5, 4], '-23,7': [1], '-23,8': [5], '-24,8': [5, 4], '-25,8': [0, 1, 2], '-26,9': [4], '-27,9': [5, 4]
};

// ═══════════════════════════════════════════════════════════════
//  Shared draw logic (used by both viewport + full-map export)
// ═══════════════════════════════════════════════════════════════
function drawMap(ctx, mode, cs, radius, showCoords, hoveredHex, tool = 'hand', color = '#ffffff') {
    for (let q = -radius; q <= radius; q++) {
        for (let r = -radius; r <= radius; r++) {
            if (Math.abs(-q - r) > radius) continue;
            const [cx, cy] = hex2px(q, r);
            const key = `${q},${r}`, cell = cs[key], dist = hexDist(q, r);

            let fill, stroke, sw = 0.6;
            if (mode === 'fishpond') {
                if (DRAGON_ZONE.has(key)) { fill = 'rgba(30,58,138,0.75)'; stroke = 'rgba(59,130,246,0.4)'; }
                else if (dist <= FISH_RED) {
                    fill = 'rgba(56,189,248,0.18)'; stroke = 'rgba(56,189,248,0.25)';
                    if (dist === FISH_RED) { stroke = 'rgba(14,165,233,0.6)'; sw = 2.5; }
                } else { fill = 'rgba(248,250,252,0.3)'; stroke = 'rgba(186,230,253,0.2)'; }
            } else {
                if (dist <= SVS_ICE) {
                    fill = 'rgba(30,58,138,0.6)'; stroke = 'rgba(59,130,246,0.3)';
                    if (dist === SVS_ICE) { stroke = '#06b6d4'; sw = 2.5; }
                } else if (dist <= SVS_SOIL) {
                    fill = 'rgba(120,113,108,0.4)'; stroke = 'rgba(168,162,158,0.2)';
                    if (dist === SVS_SOIL) { stroke = '#d97706'; sw = 2.5; }
                } else { fill = 'rgba(248,250,252,0.3)'; stroke = 'rgba(186,230,253,0.2)'; }
            }
            if (cell && cell.type !== 'border') { fill = cell.color; stroke = 'rgba(255,255,255,0.8)'; if (cell.isCenter) sw = 2; }

            ctx.beginPath();
            for (let i = 0; i < 6; i++) {
                const vx = cx + HEX_VERTS[i][0], vy = cy + HEX_VERTS[i][1];
                i === 0 ? ctx.moveTo(vx, vy) : ctx.lineTo(vx, vy);
            }
            ctx.closePath();
            ctx.fillStyle = fill; ctx.globalAlpha = cell?.type === 'color' ? 0.5 : 1;
            ctx.fill(); ctx.globalAlpha = 1;
            ctx.strokeStyle = stroke; ctx.lineWidth = sw; ctx.stroke();

            if (hoveredHex && hoveredHex[0] === q && hoveredHex[1] === r) {
                ctx.fillStyle = 'rgba(255,255,255,0.2)'; ctx.fill();
            }
        }
    }
    // Default fishpond territory borders (always visible)
    if (mode === 'fishpond') {
        ctx.lineCap = 'round'; ctx.lineWidth = 2.5;
        ctx.strokeStyle = '#86efac';
        for (const [bk, edges] of Object.entries(FISHPOND_BORDERS)) {
            const [bq, br] = bk.split(',').map(Number);
            const [bcx, bcy] = hex2px(bq, br);
            for (const ei of edges) {
                const [va, vb] = EDGE_VERTS[ei];
                ctx.beginPath();
                ctx.moveTo(bcx + HEX_VERTS[va][0], bcy + HEX_VERTS[va][1]);
                ctx.lineTo(bcx + HEX_VERTS[vb][0], bcy + HEX_VERTS[vb][1]);
                ctx.stroke();
            }
        }
    }
    // User-drawn border lines (additional custom borders)
    ctx.lineCap = 'round'; ctx.lineWidth = 2.5;
    for (const bk of Object.keys(cs)) {
        const bc = cs[bk];
        if (bc?.type !== 'border') continue;
        const [bq, br] = bk.split(',').map(Number);
        const [bcx, bcy] = hex2px(bq, br);
        ctx.strokeStyle = bc.color || 'rgba(144,238,144,0.8)';
        for (const ei of bc.edges || []) {
            const [va, vb] = EDGE_VERTS[ei];
            ctx.beginPath();
            ctx.moveTo(bcx + HEX_VERTS[va][0], bcy + HEX_VERTS[va][1]);
            ctx.lineTo(bcx + HEX_VERTS[vb][0], bcy + HEX_VERTS[vb][1]);
            ctx.stroke();
        }
    }
    // Labels & icons
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0,0,0,0.8)'; ctx.shadowBlur = 3;
    for (let q = -radius; q <= radius; q++) {
        for (let r = -radius; r <= radius; r++) {
            if (Math.abs(-q - r) > radius) continue;
            const key = `${q},${r}`, cell = cs[key], [cx, cy] = hex2px(q, r);
            if (showCoords && !cell?.label) {
                // If calibrated, show actual game coords, else relative q,r
                let text = `${q},${r}`;
                if (cs.origin) {
                    const q0 = cs.origin.q, r0 = cs.origin.r, x0 = cs.origin.x, y0 = cs.origin.y;
                    const gy = r - r0 + y0;
                    const gx = q - q0 + Math.floor(gy / 2) - Math.floor(y0 / 2) + x0;
                    text = `${gx},${gy}`;
                }
                ctx.font = '7px sans-serif'; ctx.fillStyle = 'rgba(100,180,255,0.45)';
                ctx.fillText(text, cx, cy);
            }
            if (cell?.label) {
                const fontSize = cell.type === 'text' ? 12 : 14;
                ctx.font = `bold ${fontSize}px sans-serif`; ctx.fillStyle = 'white';

                // HQ label
                const labelY = cy + HEX_R * 0.8;
                ctx.fillText(cell.label, cx, labelY);
            }
            if (cell?.isCenter && cell.type === 'hq') { ctx.font = '14px serif'; ctx.fillText('🏠', cx, cy); }
            if (cell?.isCenter && cell.type === 'cannon') { ctx.font = '14px serif'; ctx.fillText('⚔️', cx, cy); }
            if (mode === 'fishpond' && q === 0 && r === 0 && !cell) { ctx.font = '20px serif'; ctx.fillText('🐉', cx, cy); }
        }
    }
    ctx.shadowBlur = 0;
    // Floating ghost for placement (Hover preview)
    if (hoveredHex && tool && tool !== 'hand' && tool !== 'eraser' && tool !== 'border' && tool !== 'text') {
        const [hq, hr] = hoveredHex;
        let ghostShape = [];
        if (tool === 'hq') ghostShape = HQ_SHAPE;
        else if (tool === 'cannon') ghostShape = CANNON_SHAPE;
        else if (tool === 'brush') ghostShape = [[0, 0]];

        if (ghostShape.length > 0) {
            // Check if blocked
            const blocked = ghostShape.some(([oq, or]) => {
                const tq = hq + oq, tr = hr + or, tk = `${tq},${tr}`;
                if (cs[tk] && cs[tk].type !== 'color' && cs[tk].type !== 'border') return true;
                if (mode === 'svs' && hexDist(tq, tr) <= SVS_ICE) return true;
                if (mode === 'fishpond' && DRAGON_ZONE.has(tk)) return true;
                return false;
            });

            ctx.save();
            ctx.globalAlpha = 0.55;
            const ghostColor = blocked ? 'rgba(239, 68, 68, 0.8)' : color;
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
                    if (tool === 'cannon') ctx.fillText('⚔️', cx, cy);
                    ctx.globalAlpha = 0.55;
                }
            }
            ctx.restore();
        }
    }

    // Render floating text
    const TEXT_SIZES = { S: 14, M: 24, L: 36 };
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0,0,0,0.8)'; ctx.shadowBlur = 4;
    for (const key of Object.keys(cs)) {
        if (!key.startsWith('text_')) continue;
        const cell = cs[key];
        const isHovered = key === hoveredHex; // reuse hoveredHex argument as hoveredTextId if tool is hand

        ctx.save();
        if (isHovered) {
            ctx.shadowColor = 'rgba(59, 130, 246, 0.8)';
            ctx.shadowBlur = 8;
            ctx.fillStyle = 'rgba(59, 130, 246, 0.2)';
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

// ═══════════════════════════════════════════════════════════════
//  Component
// ═══════════════════════════════════════════════════════════════
export const SvsPlanner = ({ isAdmin = false }) => {
    const [mapMode, setMapMode] = useState('svs');
    const [cells, setCells] = useState({});
    const [tool, setTool] = useState('hand');
    const [color, setColor] = useState('#3b82f6');
    const [showCoords, setShowCoords] = useState(false);
    const [zoom, setZoom] = useState(1);
    const [toast, setToast] = useState('');
    const [showShared, setShowShared] = useState(false);
    const [sharedMaps, setSharedMaps] = useState([]);
    const [sharedLoading, setSharedLoading] = useState(false);

    const canvasRef = useRef(null);
    const containerRef = useRef(null);
    const offsetRef = useRef({ x: 0, y: 0 });
    const zoomRef = useRef(1);
    const cellsRef = useRef({});
    const mapModeRef = useRef('svs');
    const showCoordsRef = useRef(false);
    const toolRef = useRef('hand');
    const colorRef = useRef('#3b82f6');
    const isDragging = useRef(false);
    const lastPos = useRef({ x: 0, y: 0 });
    const dragStart = useRef({ x: 0, y: 0 });
    const hoveredHex = useRef(null);
    const rafId = useRef(null);
    const dprRef = useRef(1);
    const draggingText = useRef(null);
    const textSizeRef = useRef('M');
    const [textSize, setTextSize] = useState('M');
    const [textInput, setTextInput] = useState(null);
    const [originInput, setOriginInput] = useState(null);
    const [isPanning, setIsPanning] = useState(false);
    const [hoveredTextId, setHoveredTextId] = useState(null);

    // History
    const historyRef = useRef([{}]);
    const historyIdx = useRef(0);
    const skipHistory = useRef(false);

    const pushHistory = (nc) => {
        if (skipHistory.current) { skipHistory.current = false; return; }
        const h = historyRef.current.slice(0, historyIdx.current + 1);
        h.push(JSON.parse(JSON.stringify(nc)));
        if (h.length > MAX_HISTORY) h.shift();
        historyRef.current = h; historyIdx.current = h.length - 1;
    };
    const undo = () => { if (historyIdx.current <= 0) return; historyIdx.current--; skipHistory.current = true; setCells({ ...historyRef.current[historyIdx.current] }); showToast('↩️ 復原'); };
    const redo = () => { if (historyIdx.current >= historyRef.current.length - 1) return; historyIdx.current++; skipHistory.current = true; setCells({ ...historyRef.current[historyIdx.current] }); showToast('↪️ 重做'); };

    const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 1800); };

    // Sync refs
    useEffect(() => { cellsRef.current = cells; pushHistory(cells); requestDraw(); }, [cells]);
    useEffect(() => { mapModeRef.current = mapMode; requestDraw(); }, [mapMode]);
    useEffect(() => { showCoordsRef.current = showCoords; requestDraw(); }, [showCoords]);
    useEffect(() => { toolRef.current = tool; }, [tool]);
    useEffect(() => { colorRef.current = color; }, [color]);
    useEffect(() => { textSizeRef.current = textSize; }, [textSize]);

    // --- localStorage save/load ---
    const sKey = (m) => `svs_planner_${m}`;
    const saveLocal = () => {
        localStorage.setItem(sKey(mapModeRef.current), JSON.stringify({ cells: cellsRef.current, zoom: zoomRef.current, offset: offsetRef.current }));
        showToast('💾 已儲存！');
    };
    const loadLocal = (mode) => {
        try {
            const d = JSON.parse(localStorage.getItem(sKey(mode)));
            if (!d?.cells) return false;
            let cells = d.cells;
            // Fishpond: strip out battery/cannon cells (they don't belong here)
            if (mode === 'fishpond') {
                cells = Object.fromEntries(
                    Object.entries(cells).filter(([, v]) => v.type !== 'battery' && v.type !== 'cannon')
                );
            }
            skipHistory.current = true; setCells(cells);
            if (d.zoom) { zoomRef.current = d.zoom; setZoom(d.zoom); }
            if (d.offset) offsetRef.current = d.offset;
            historyRef.current = [JSON.parse(JSON.stringify(cells))]; historyIdx.current = 0;
            return true;
        } catch { return false; }
    };

    // --- JSON export/import (for all users) ---
    const exportJSON = () => {
        const title = prompt('請輸入地圖標題：', `${mapModeRef.current === 'svs' ? 'SVS戰略圖' : '魚池防守圖'}`);
        if (!title) return;
        const data = { version: 1, mapMode: mapModeRef.current, title, cells: cellsRef.current, exportedAt: new Date().toISOString() };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const link = document.createElement('a');
        link.download = `map-${title.replace(/\s+/g, '_')}.json`;
        link.href = URL.createObjectURL(blob);
        link.click(); URL.revokeObjectURL(link.href);
        showToast('📁 已匯出 JSON！');
    };
    const importJSON = () => {
        const input = document.createElement('input');
        input.type = 'file'; input.accept = '.json';
        input.onchange = (e) => {
            const reader = new FileReader();
            reader.onload = (ev) => {
                try {
                    const d = JSON.parse(ev.target.result);
                    if (!d.cells) throw new Error();
                    if (d.mapMode && d.mapMode !== mapModeRef.current) {
                        setMapMode(d.mapMode); mapModeRef.current = d.mapMode;
                    }
                    skipHistory.current = true;
                    setCells(d.cells);
                    historyRef.current = [JSON.parse(JSON.stringify(d.cells))]; historyIdx.current = 0;
                    centerMap();
                    showToast(`📂 已載入: ${d.title || 'Untitled'}`);
                } catch { showToast('❌ 檔案格式錯誤'); }
            };
            reader.readAsText(e.target.files[0]);
        };
        input.click();
    };

    // --- Firestore cloud sharing (admin only) ---
    const publishToCloud = async () => {
        const title = prompt('請輸入共享地圖標題：');
        if (!title) return;
        try {
            const id = `${mapModeRef.current}_${Date.now()}`;
            await setDoc(doc(db, 'shared_maps', id), {
                title, mapMode: mapModeRef.current,
                cells: cellsRef.current,
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
            setSharedMaps(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch (err) { showToast('❌ 讀取失敗'); }
        setSharedLoading(false);
    };
    const copySharedMap = (map) => {
        if (map.mapMode && map.mapMode !== mapModeRef.current) {
            setMapMode(map.mapMode); mapModeRef.current = map.mapMode;
        }
        skipHistory.current = true;
        setCells(JSON.parse(JSON.stringify(map.cells)));
        historyRef.current = [JSON.parse(JSON.stringify(map.cells))]; historyIdx.current = 0;
        centerMap();
        setShowShared(false);
        showToast(`📋 已複製: ${map.title}`);
    };
    const deleteSharedMap = async (id) => {
        if (!window.confirm('確定刪除此共享地圖？')) return;
        await deleteDoc(doc(db, 'shared_maps', id));
        setSharedMaps(prev => prev.filter(m => m.id !== id));
        showToast('🗑️ 已刪除');
    };

    // --- Init ---
    const buildSvsCells = () => {
        const c = {};
        SVS_BATTERIES.forEach(b => {
            BATTERY_SHAPE.forEach(([oq, or]) => {
                const q = b.cq + oq, r = b.cr + or;
                c[`${q},${r}`] = { type: 'battery', color: 'rgba(153,27,27,0.7)', parent: `bat_${b.id}`, isCenter: oq === 0 && or === 0, label: oq === 0 && or === 0 ? b.id : null };
            });
        });
        return c;
    };
    const buildFishpondCells = () => ({});
    useEffect(() => { if (!loadLocal('svs')) { skipHistory.current = true; setCells(buildSvsCells()); historyRef.current = [buildSvsCells()]; } }, []);

    const switchMap = (mode) => {
        if (mode === mapMode) return;
        // Save current map to localStorage (only for svs/fishpond)
        if (mapModeRef.current !== 'glory') {
            localStorage.setItem(sKey(mapModeRef.current), JSON.stringify({ cells: cellsRef.current, zoom: zoomRef.current, offset: offsetRef.current }));
        }
        // Glory mode is handled by its own component
        if (mode === 'glory') { setMapMode('glory'); return; }
        // Immediately sync refs BEFORE any drawing/loading
        mapModeRef.current = mode;
        setMapMode(mode); setTool('hand');
        historyRef.current = [{}]; historyIdx.current = 0;
        if (!loadLocal(mode)) {
            skipHistory.current = true;
            const nc = mode === 'svs' ? buildSvsCells() : buildFishpondCells();
            setCells(nc); historyRef.current = [JSON.parse(JSON.stringify(nc))]; historyIdx.current = 0;
            const z = mode === 'svs' ? 0.8 : 1.2; zoomRef.current = z; setZoom(z);
            centerMap();
        }
    };
    const resetMap = () => { if (!window.confirm('確定要重置地圖？')) return; const nc = mapModeRef.current === 'svs' ? buildSvsCells() : buildFishpondCells(); skipHistory.current = true; setCells(nc); historyRef.current = [JSON.parse(JSON.stringify(nc))]; historyIdx.current = 0; };
    const centerMap = () => { if (!containerRef.current) return; const r = containerRef.current.getBoundingClientRect(); offsetRef.current = { x: r.width / 2, y: r.height / 2 }; requestDraw(); };

    // --- Full-map PNG export ---
    const exportImage = () => {
        const mode = mapModeRef.current;
        const radius = mode === 'svs' ? SVS_RADIUS : FISH_RADIUS;
        // Calculate map bounding box
        const padding = HEX_R * 2;
        const [minX, minY] = hex2px(-radius, 0);
        const [maxX, maxY] = hex2px(radius, 0);
        const [, topY] = hex2px(0, -radius);
        const [, botY] = hex2px(0, radius);
        const w = (maxX - minX) + padding * 2;
        const h = (botY - topY) + padding * 2;
        const centerX = (minX + maxX) / 2;
        const centerY = (topY + botY) / 2;

        const tmpCanvas = document.createElement('canvas');
        tmpCanvas.width = w * 2; tmpCanvas.height = h * 2; // 2x for crisp
        const ctx = tmpCanvas.getContext('2d');
        ctx.scale(2, 2);
        // Dark background
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, w, h);
        ctx.translate(w / 2 - centerX, h / 2 - centerY);
        drawMap(ctx, mode, cellsRef.current, radius, false, null);
        ctx.restore();

        const link = document.createElement('a');
        link.download = `strategy-${mode}-${new Date().toISOString().slice(0, 10)}.png`;
        link.href = tmpCanvas.toDataURL('image/png');
        link.click();
        showToast('📸 已匯出完整地圖！');
    };

    // --- Canvas setup ---
    useEffect(() => {
        const resize = () => {
            const canvas = canvasRef.current, cont = containerRef.current;
            if (!canvas || !cont) return;
            const dpr = window.devicePixelRatio || 1; dprRef.current = dpr;
            const rect = cont.getBoundingClientRect();
            canvas.width = rect.width * dpr; canvas.height = rect.height * dpr;
            canvas.style.width = `${rect.width}px`; canvas.style.height = `${rect.height}px`;
            if (offsetRef.current.x === 0) offsetRef.current = { x: rect.width / 2, y: rect.height / 2 };
            requestDraw();
        };
        // Small delay to let the DOM settle after switching from Glory
        const timer = setTimeout(resize, 50);
        window.addEventListener('resize', resize);
        return () => { clearTimeout(timer); window.removeEventListener('resize', resize); };
    }, [mapMode]);

    useEffect(() => {
        const cont = containerRef.current; if (!cont) return;
        const onWheel = (e) => { e.preventDefault(); zoomRef.current = Math.min(3, Math.max(0.15, zoomRef.current + (e.deltaY > 0 ? -0.08 : 0.08))); setZoom(zoomRef.current); requestDraw(); };
        cont.addEventListener('wheel', onWheel, { passive: false });
        return () => cont.removeEventListener('wheel', onWheel);
    }, []);

    useEffect(() => {
        const onKey = (e) => {
            if (e.ctrlKey && e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
            if (e.ctrlKey && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); redo(); }
            if (e.ctrlKey && e.key === 's') { e.preventDefault(); saveLocal(); }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, []);

    // --- Draw ---
    const requestDraw = useCallback(() => {
        if (rafId.current) cancelAnimationFrame(rafId.current);
        rafId.current = requestAnimationFrame(draw);
    }, []);

    const draw = () => {
        const canvas = canvasRef.current; if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const dpr = dprRef.current;
        const mode = mapModeRef.current;
        const radius = mode === 'svs' ? SVS_RADIUS : FISH_RADIUS;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.save();
        ctx.scale(dpr, dpr);
        ctx.translate(offsetRef.current.x, offsetRef.current.y);
        ctx.scale(zoomRef.current, zoomRef.current);
        const hId = toolRef.current === 'hand' ? hoveredTextId : null;
        drawMap(ctx, mode, cellsRef.current, radius, showCoordsRef.current, hoveredHex.current || hId, toolRef.current, colorRef.current);
        ctx.restore();
    };

    // --- Mouse ---
    const getWorldPos = (e) => {
        const rect = canvasRef.current.getBoundingClientRect();
        return [(e.clientX - rect.left - offsetRef.current.x) / zoomRef.current, (e.clientY - rect.top - offsetRef.current.y) / zoomRef.current];
    };
    const handleMouseDown = (e) => {
        dragStart.current = { x: e.clientX, y: e.clientY };
        const [wx, wy] = getWorldPos(e);

        // Check for text hit if tool is hand
        if (toolRef.current === 'hand' && e.button === 0) {
            const hitText = Object.keys(cellsRef.current).find(k => k.startsWith('text_') && Math.hypot(cellsRef.current[k].x - wx, cellsRef.current[k].y - wy) < 20);
            if (hitText) {
                draggingText.current = { id: hitText, startX: wx, startY: wy, initialX: cellsRef.current[hitText].x, initialY: cellsRef.current[hitText].y };
                e.preventDefault();
                return;
            }
        }

        if (e.button === 2 || e.button === 1 || (e.button === 0 && toolRef.current === 'hand')) {
            isDragging.current = true; setIsPanning(true); lastPos.current = { x: e.clientX, y: e.clientY }; e.preventDefault();
        }
    };
    const handleMouseMove = (e) => {
        const [wx, wy] = getWorldPos(e);

        // Text dragging
        if (draggingText.current) {
            const dragInfo = draggingText.current;
            const dx = wx - dragInfo.startX;
            const dy = wy - dragInfo.startY;
            setCells(prev => {
                if (!dragInfo.id || !prev[dragInfo.id]) return prev;
                return {
                    ...prev,
                    [dragInfo.id]: {
                        ...prev[dragInfo.id],
                        x: dragInfo.initialX + dx,
                        y: dragInfo.initialY + dy
                    }
                };
            });
            return;
        }

        if (isDragging.current) {
            const dx = e.clientX - lastPos.current.x, dy = e.clientY - lastPos.current.y;
            lastPos.current = { x: e.clientX, y: e.clientY };
            offsetRef.current = { x: offsetRef.current.x + dx, y: offsetRef.current.y + dy };
            requestDraw(); return;
        }

        // Hover effects
        if (toolRef.current === 'hand') {
            const hitText = Object.keys(cellsRef.current).find(k => k.startsWith('text_') && Math.hypot(cellsRef.current[k].x - wx, cellsRef.current[k].y - wy) < 20);
            if (hitText !== hoveredTextId) {
                setHoveredTextId(hitText);
                requestDraw();
            }
        }

        const [hq, hr] = px2hex(wx, wy);
        const p = hoveredHex.current;
        if (!p || p[0] !== hq || p[1] !== hr) { hoveredHex.current = [hq, hr]; requestDraw(); }
    };
    const handleMouseUp = (e) => {
        if (draggingText.current) { draggingText.current = null; requestDraw(); }
        if (isDragging.current) { isDragging.current = false; setIsPanning(false); }
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

        // Edit Origin directly on double click if tool is origin
        if (toolRef.current === 'origin') {
            setOriginInput({ q, r });
            return;
        }

        const key = `${q},${r}`;
        const cell = cellsRef.current[key];
        // Only allow renaming HQ center cells
        if (cell?.isCenter && cell.type === 'hq') {
            const name = prompt('輸入總部名稱（留空清除）', cell.label || '');
            if (name === null) return; // cancelled
            setCells(prev => {
                const nc = { ...prev };
                if (name.trim()) {
                    nc[key] = { ...nc[key], label: name.trim() };
                } else {
                    const { label, ...rest } = nc[key];
                    nc[key] = rest;
                }
                return nc;
            });
        }
    };
    const applyTool = (q, r, wx, wy) => {
        const t = toolRef.current, c = colorRef.current, mode = mapModeRef.current;
        setCells(prev => {
            const key = `${q},${r}`, nc = { ...prev };
            if (mode === 'fishpond' && DRAGON_ZONE.has(key) && t !== 'eraser') return prev;
            if (t === 'brush') nc[key] = { type: 'color', color: c };
            else if (t === 'origin') {
                setOriginInput({ q, r });
                return prev;
            }
            else if (t === 'border') {
                // Detect which edge was clicked based on angle from hex center
                const [cx, cy] = hex2px(q, r);
                let ang = Math.atan2(wy - cy, wx - cx) * 180 / Math.PI;
                if (ang < 0) ang += 360;
                const edgeIdx = Math.round(ang / 60) % 6;
                const existing = nc[key];
                if (existing?.type === 'border') {
                    const edges = new Set(existing.edges);
                    if (edges.has(edgeIdx)) edges.delete(edgeIdx);
                    else edges.add(edgeIdx);
                    if (edges.size === 0) delete nc[key];
                    else nc[key] = { ...existing, edges: [...edges], color: c };
                } else {
                    nc[key] = { type: 'border', edges: [edgeIdx], color: c };
                }
            }
            else if (t === 'text') {
                setTextInput({ x: wx, y: wy, val: '', color: c, size: textSizeRef.current, editId: null });
            }
            else if (t === 'eraser') {
                // Earle floating text first
                const textKey = Object.keys(nc).find(k => k.startsWith('text_') && Math.hypot(nc[k].x - wx, nc[k].y - wy) < 15);
                if (textKey) delete nc[textKey];
                else {
                    const tgt = nc[key];
                    if (tgt?.parent) { Object.keys(nc).forEach(k => { if (nc[k].parent === tgt.parent) delete nc[k]; }); }
                    else delete nc[key];
                }
            } else if (t === 'hq' || t === 'cannon') {
                const shape = t === 'hq' ? HQ_SHAPE : CANNON_SHAPE;
                const blocked = shape.some(([oq, or]) => {
                    const tq = q + oq, tr = r + or, tk = `${tq},${tr}`;
                    if (nc[tk] && nc[tk].type !== 'color' && nc[tk].type !== 'border') return true;
                    if (mode === 'svs' && hexDist(tq, tr) <= SVS_ICE) return true;
                    if (mode === 'fishpond' && DRAGON_ZONE.has(tk)) return true;
                    return false;
                });
                if (blocked) return prev;
                shape.forEach(([oq, or]) => { nc[`${q + oq},${r + or}`] = { type: t, color: c, parent: key, isCenter: oq === 0 && or === 0 }; });
            }
            return nc;
        });
    };



    // Reset cursor when tool changes
    useEffect(() => { document.body.style.cursor = 'default'; }, [tool]);

    const cursorClass = tool === 'hand'
        ? (draggingText.current ? 'cursor-move' : (isPanning ? 'cursor-grabbing' : (hoveredTextId ? 'cursor-move' : 'cursor-grab')))
        : (isPanning ? 'cursor-grabbing' : (tool === 'eraser' ? 'cursor-crosshair' : 'cursor-cell'));

    // Glory mode: render dedicated component
    if (mapMode === 'glory') {
        return <GloryPlanner onSwitchMap={switchMap} isAdmin={isAdmin} />;
    }

    return (
        <div className="flex flex-col h-full min-h-0 w-full bg-slate-900 overflow-hidden border-t border-slate-700 shadow-2xl relative z-50">
            {/* Toolbar */}
            <div className="p-3 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 flex items-center justify-between z-10 flex-wrap gap-2">
                <div className="flex items-center gap-2.5 flex-wrap">
                    <div className="flex bg-slate-800 rounded-lg p-1">
                        <TabBtn active={mapMode === 'svs'} onClick={() => switchMap('svs')} icon={<MapIcon size={14} />} label="SVS" ac="bg-blue-600" />
                        <TabBtn active={mapMode === 'fishpond'} onClick={() => switchMap('fishpond')} icon={<Fish size={14} />} label="魚池" ac="bg-rose-600" />
                        <TabBtn active={false} onClick={() => switchMap('glory')} icon={<Shield size={14} />} label="榮耀" ac="bg-amber-600" />
                    </div>
                    <div className="h-6 w-px bg-slate-700" />
                    <div className="flex bg-slate-800 rounded-lg p-1">
                        <ToolBtn active={tool === 'hand'} onClick={() => setTool('hand')} icon={<Hand size={16} />} label="移動" />
                        <ToolBtn active={tool === 'brush'} onClick={() => setTool('brush')} icon={<MousePointer2 size={16} />} label="筆刷" />
                        <ToolBtn active={tool === 'hq'} onClick={() => setTool('hq')} icon={<Home size={16} />} label="總部" />
                        {mapMode === 'svs' && <ToolBtn active={tool === 'cannon'} onClick={() => setTool('cannon')} icon={<Sword size={16} />} label="哨塔" />}
                        <ToolBtn active={tool === 'border'} onClick={() => setTool('border')} icon={<Pen size={16} />} label="邊界" />
                        <ToolBtn active={tool === 'origin'} onClick={() => setTool('origin')} icon={<MapPin size={16} />} label="坐標校正 (點擊格子設為原點)" />
                        <ToolBtn active={tool === 'text'} onClick={() => setTool('text')} icon={<Type size={16} />} label="文字" />
                        <ToolBtn active={tool === 'eraser'} onClick={() => setTool('eraser')} icon={<Trash2 size={16} />} label="橡皮擦" />
                    </div>
                    <div className="h-6 w-px bg-slate-700" />
                    <div className="flex gap-1.5">
                        {['#ffffff', '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6'].map(c => (
                            <button key={c} onClick={() => setColor(c)}
                                className={`w-6 h-6 rounded-full border-2 ${color === c ? 'border-white scale-110' : 'border-transparent opacity-50 hover:opacity-100'}`}
                                style={{ backgroundColor: c }} />
                        ))}
                    </div>
                    {tool === 'text' && (
                        <div className="flex bg-slate-800 rounded-lg p-0.5 gap-0.5">
                            {[['S', '小'], ['M', '中'], ['L', '大']].map(([k, label]) => (
                                <button key={k} onClick={() => setTextSize(k)}
                                    className={`px-2 py-1 rounded-md text-[10px] font-bold transition-colors ${textSize === k ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}>
                                    {label}
                                </button>
                            ))}
                        </div>
                    )}
                    <div className="h-6 w-px bg-slate-700" />
                    <div className="flex bg-slate-800 rounded-lg p-1">
                        <ToolBtn onClick={undo} icon={<Undo2 size={15} />} label="復原 Ctrl+Z" />
                        <ToolBtn onClick={redo} icon={<Redo2 size={15} />} label="重做 Ctrl+Y" />
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={() => setShowCoords(!showCoords)} className={`px-2 py-1.5 rounded-lg text-[10px] font-medium flex items-center gap-1 ${showCoords ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}>
                        <Navigation size={12} /> 座標
                    </button>
                    <div className="flex items-center gap-1.5 bg-slate-800/60 px-2 py-1 rounded-xl border border-slate-700/50">
                        <button onClick={() => { zoomRef.current = Math.max(0.15, zoomRef.current - 0.1); setZoom(zoomRef.current); requestDraw(); }} className="text-slate-400 hover:text-white"><ZoomOut size={13} /></button>
                        <input type="range" min="0.15" max="2.5" step="0.05" value={zoom} onChange={e => { zoomRef.current = parseFloat(e.target.value); setZoom(zoomRef.current); requestDraw(); }}
                            className="w-14 h-1 bg-slate-700 rounded cursor-pointer accent-blue-500" />
                        <button onClick={() => { zoomRef.current = Math.min(2.5, zoomRef.current + 0.1); setZoom(zoomRef.current); requestDraw(); }} className="text-slate-400 hover:text-white"><ZoomIn size={13} /></button>
                        <span className="text-[9px] font-mono text-blue-400 w-7 text-center">{Math.round(zoom * 100)}%</span>
                    </div>
                    <button onClick={centerMap} title="置中" className="p-1.5 bg-slate-800 text-slate-400 rounded-lg hover:text-white border border-slate-700"><Maximize size={13} /></button>
                    <button onClick={saveLocal} title="儲存 Ctrl+S" className="p-1.5 bg-slate-800 text-slate-400 rounded-lg hover:text-emerald-400 border border-slate-700"><Save size={13} /></button>
                    <button onClick={resetMap} className="p-1.5 bg-slate-800 text-slate-400 rounded-lg hover:text-red-400 border border-slate-700" title="重設"><Trash2 size={13} /></button>
                    <div className="h-6 w-px bg-slate-700" />
                    {/* JSON Export / Import (all users) */}
                    <button onClick={exportJSON} title="匯出 JSON" className="p-1.5 bg-slate-800 text-slate-400 rounded-lg hover:text-cyan-400 border border-slate-700"><Download size={13} /></button>
                    <button onClick={importJSON} title="匯入 JSON" className="p-1.5 bg-slate-800 text-slate-400 rounded-lg hover:text-yellow-400 border border-slate-700"><Upload size={13} /></button>
                    {/* Cloud sharing (admin) */}
                    {isAdmin && <>
                        <button onClick={publishToCloud} title="發佈到共享區" className="p-1.5 bg-slate-800 text-slate-400 rounded-lg hover:text-violet-400 border border-slate-700"><Share2 size={13} /></button>
                        <button onClick={() => { setShowShared(true); loadSharedList(); }} title="共享列表" className="px-2 py-1.5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-lg text-[10px] font-bold">
                            ☁️ 共享
                        </button>
                    </>}
                    <div className="h-6 w-px bg-slate-700" />
                    <button onClick={exportImage} className="px-2.5 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg text-[10px] font-bold shadow-lg hover:from-blue-500">
                        📸 匯出圖片
                    </button>
                </div>
            </div>

            {/* Canvas */}
            <div ref={containerRef} className="flex-1 relative overflow-hidden">
                <canvas ref={canvasRef} className={`absolute inset-0 ${cursorClass}`}
                    onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp}
                    onClick={handleClick} onDoubleClick={handleDoubleClick}
                    onMouseLeave={() => { isDragging.current = false; draggingText.current = null; hoveredHex.current = null; requestDraw(); }}
                    onContextMenu={e => e.preventDefault()} />

                {textInput && (
                    <input
                        autoFocus
                        defaultValue={textInput.val}
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
                            } else if (e.key === 'Escape') {
                                setTextInput(null);
                            }
                        }}
                        onBlur={() => setTextInput(null)}
                    />
                )}

                {/* Origin Input Box */}
                {originInput && (
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-slate-900 border border-slate-700 p-4 rounded-xl shadow-2xl z-30 flex flex-col gap-3 min-w-[250px]">
                        <h3 className="text-white text-sm font-bold flex items-center gap-2"><MapPin size={16} className="text-blue-400" /> 校正遊戲對應座標</h3>
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
                            <input name="x" type="number" placeholder="X" required className="w-20 px-2 py-1 bg-slate-800 text-white rounded border border-slate-700 outline-none focus:border-blue-500" autoFocus />
                            <input name="y" type="number" placeholder="Y" required className="w-20 px-2 py-1 bg-slate-800 text-white rounded border border-slate-700 outline-none focus:border-blue-500" />
                            <div className="flex gap-1 ml-auto">
                                <button type="button" onClick={() => setOriginInput(null)} className="px-3 bg-slate-700 hover:bg-slate-600 text-white rounded font-bold">X</button>
                                <button type="submit" className="px-3 bg-blue-600 hover:bg-blue-500 text-white rounded font-bold">確定</button>
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

                {toast && (
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-slate-800/90 text-white text-sm font-bold rounded-xl border border-slate-600 shadow-xl backdrop-blur z-20">
                        {toast}
                    </div>
                )}

                {/* Shared maps modal (admin) */}
                {showShared && (
                    <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                        <div className="bg-slate-900 rounded-2xl border border-slate-700 shadow-2xl w-[500px] max-h-[80%] flex flex-col overflow-hidden">
                            <div className="p-4 border-b border-slate-700 flex items-center justify-between">
                                <h3 className="text-white font-bold flex items-center gap-2">☁️ 共享地圖列表</h3>
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
                                                <span className={`px-1.5 py-0.5 rounded ${m.mapMode === 'svs' ? 'bg-blue-900/50 text-blue-400' : 'bg-rose-900/50 text-rose-400'}`}>
                                                    {m.mapMode === 'svs' ? 'SVS' : '魚池'}
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <Clock size={10} />
                                                    {m.publishedAt?.toDate?.()?.toLocaleString('zh-TW')?.slice(0, 16) || '—'}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <button onClick={() => copySharedMap(m)} className="px-2.5 py-1.5 bg-blue-600 text-white rounded-lg text-[10px] font-bold hover:bg-blue-500 flex items-center gap-1">
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

                {/* Legend */}
                <div className="absolute bottom-4 right-4 bg-slate-900/70 backdrop-blur border border-slate-700 p-3 rounded-xl pointer-events-none text-[10px] text-slate-400 space-y-1">
                    <h4 className="text-blue-400 font-bold text-xs uppercase tracking-widest mb-1.5">操作指南</h4>
                    <p>✋ <b>手掌</b>：拖曳 ┃ 🔄 <b>滾輪</b>：縮放</p>
                    <p>💾 <b>Ctrl+S</b>：儲存 ┃ ↩️ <b>Ctrl+Z/Y</b>：復原</p>
                    <p>📁 <b>匯出/匯入 JSON</b>：分享地圖檔案</p>
                    {mapMode === 'fishpond' && (
                        <div className="mt-2 pt-2 border-t border-slate-700 space-y-1">
                            <p className="text-rose-400 font-bold">魚池圖例</p>
                            <p>🔴 限時區 ┃ 🐉 龍出生區 ┃ 🟢 領地邊界</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const ToolBtn = ({ active, onClick, icon, label }) => (
    <button onClick={onClick} title={label}
        className={`p-1.5 rounded-md transition-colors ${active ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-700 hover:text-white'}`}>
        {icon}
    </button>
);
const TabBtn = ({ active, onClick, icon, label, ac }) => (
    <button onClick={onClick}
        className={`px-2.5 py-1.5 rounded-md text-xs font-bold flex items-center gap-1 transition-colors ${active ? `${ac} text-white` : 'text-slate-400 hover:text-white'}`}>
        {icon} {label}
    </button>
);
