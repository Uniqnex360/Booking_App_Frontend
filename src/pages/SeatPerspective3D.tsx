import React, { useEffect, useRef, useState, useMemo, useCallback } from "react";
import * as THREE from "three";
import {
  X,
  Compass,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Eye,
  CheckCircle2,
  Maximize2,
  Minimize2,
  Info,
  Sparkles,
  Sun,
  Moon,
  ChevronUp,
  ChevronDown,
  Layers,
  ZoomIn,
  ZoomOut,
  Airplay,
  LayoutGrid,
} from "lucide-react";
import type { SeatPerspectiveItem } from "./SeatView360";

export type PerspectiveMode = "overview" | "from_seat" | "from_stage" | "balcony" | "birds_eye";

export interface SeatPerspective3DProps {
  movieTitle: string;
  posterUrl?: string | null;
  bannerUrl?: string | null;
  cinemaName?: string;
  screenName?: string;
  activeSeat?: SeatPerspectiveItem | null;
  allSeats: SeatPerspectiveItem[];
  selectedSeatIds?: string[];
  initialMode?: "overview" | "from_seat" | "from_stage" | "balcony" | "birds_eye" | "seat";
  requiredSeatCount?: number;
  totalAmount?: number;
  isEmbedded?: boolean;
  onSelectSeat?: (seatId: string) => void;
  onDeselectSeat?: (seatId: string) => void;
  onProceed?: () => void;
  onClose?: () => void;
  onSwitchTo2D?: () => void;
}

// Spatial dimensions for realistic Vantage auditorium
const SEAT_SPACING_X = 1.05;
const SEAT_SPACING_Z = 1.38;
const ROW_RISE = 0.34;
const SCREEN_Z = -14.0;
const SCREEN_Y = 5.2;
const SCREEN_W = 19.5;
const SCREEN_H = 8.8;

export default function SeatPerspective3D({
  movieTitle,
  posterUrl,
  bannerUrl,
  cinemaName = "Vantage Cinema",
  screenName = "Grand Screen 1",
  activeSeat,
  allSeats,
  selectedSeatIds = [],
  initialMode = "overview",
  requiredSeatCount = 1,
  totalAmount = 0,
  isEmbedded = false,
  onSelectSeat,
  onDeselectSeat,
  onProceed,
  onClose,
  onSwitchTo2D,
}: SeatPerspective3DProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Group all seats by row label for navigation & spatial indexing
  const { rowLabels, seatsByRow, maxCols, seatMapById } = useMemo(() => {
    const rowsMap = new Map<string, SeatPerspectiveItem[]>();
    const byId = new Map<string, SeatPerspectiveItem>();
    let maxC = 1;

    allSeats.forEach((s) => {
      byId.set(s.id, s);
      if (s.seatRef) byId.set(s.seatRef, s);

      if (!rowsMap.has(s.rowLabel)) rowsMap.set(s.rowLabel, []);
      rowsMap.get(s.rowLabel)!.push(s);
      if (s.seatNumber > maxC) maxC = s.seatNumber;
    });

    const sortedRows = Array.from(rowsMap.keys()).sort();
    sortedRows.forEach((r) => {
      rowsMap.get(r)!.sort((a, b) => a.seatNumber - b.seatNumber);
    });

    return {
      rowLabels: sortedRows,
      seatsByRow: rowsMap,
      maxCols: Math.max(maxC, 12),
      seatMapById: byId,
    };
  }, [allSeats]);

  const totalRows = Math.max(rowLabels.length, 6);
  const totalCols = maxCols;

  // Selected seats objects
  const selectedSeats = useMemo(() => {
    return allSeats.filter((s) => selectedSeatIds.includes(s.id) || (s.seatRef && selectedSeatIds.includes(s.seatRef)));
  }, [allSeats, selectedSeatIds]);

  // Current anchor seat for "From my seat" view
  const [currentSeat, setCurrentSeat] = useState<SeatPerspectiveItem>(() => {
    if (activeSeat) return activeSeat;
    if (selectedSeats.length > 0) return selectedSeats[0];
    return allSeats[Math.floor(allSeats.length / 2)] || allSeats[0];
  });

  // Keep currentSeat updated when activeSeat prop changes
  useEffect(() => {
    if (activeSeat) {
      setCurrentSeat(activeSeat);
    }
  }, [activeSeat]);

  // If current seat is deselected and other selected seats exist, pick one
  useEffect(() => {
    if (selectedSeats.length > 0) {
      const stillSelected = selectedSeats.some((s) => s.id === currentSeat?.id);
      if (!stillSelected) {
        setCurrentSeat(selectedSeats[0]);
      }
    }
  }, [selectedSeats, currentSeat]);

  // Map initialMode prop
  const normalizedInitialMode: PerspectiveMode = useMemo(() => {
    if (initialMode === "seat") return "from_seat";
    if (["overview", "from_seat", "from_stage", "balcony", "birds_eye"].includes(initialMode)) {
      return initialMode as PerspectiveMode;
    }
    return "overview";
  }, [initialMode]);

  const [viewMode, setViewMode] = useState<PerspectiveMode>(normalizedInitialMode);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [curtainsOpen, setCurtainsOpen] = useState(true);
  const [houseLights, setHouseLights] = useState(false);
  const [hoveredSeat, setHoveredSeat] = useState<SeatPerspectiveItem | null>(null);

  const currentRowIndex = currentSeat ? rowLabels.indexOf(currentSeat.rowLabel) : 0;
  const currentColIndex = currentSeat ? currentSeat.seatNumber - 1 : 0;

  // Interaction refs
  const mouseRef = useRef({
    x: 0,
    y: 0,
    startX: 0,
    startY: 0,
    lastX: 0,
    lastY: 0,
    isDragging: false,
    hasMoved: false,
  });

  const lookTargetRef = useRef({ yaw: 0, pitch: 0 });
  const lookCurrentRef = useRef({ yaw: 0, pitch: 0 });
  const zoomLevelRef = useRef(1.0); // 1 = default, clamped 0.65 to 1.6

  // Curtain & lights animated values refs
  const curtainCurRef = useRef(1.0);
  const curtainOpenRef = useRef(1.0);
  const lightsIntensityRef = useRef(0.25);

  // Camera flight state
  const cameraModeRef = useRef<PerspectiveMode | "flight">(normalizedInitialMode);
  const flightRef = useRef<{
    startTime: number;
    duration: number;
    startPos: THREE.Vector3;
    endPos: THREE.Vector3;
    startQuat: THREE.Quaternion;
    endQuat: THREE.Quaternion;
    onComplete?: () => void;
  } | null>(null);

  // Calculate chair X position including central aisle gap and block corridor aisle shifts
  const getSeatChairX = useCallback(
    (colIdx: number, seat?: SeatPerspectiveItem) => {
      let x = (colIdx - (totalCols - 1) / 2) * SEAT_SPACING_X;
      // Dedicated central aisle corridor separating left and right seating banks
      const midCol = (totalCols - 1) / 2;
      if (colIdx < midCol) {
        x -= 0.75;
      } else {
        x += 0.75;
      }
      if (seat && typeof seat.blockIndex === "number" && seat.totalBlocks && seat.totalBlocks > 1) {
        const centerBlock = (seat.totalBlocks - 1) / 2;
        x += (seat.blockIndex - centerBlock) * 1.35;
      }
      return x;
    },
    [totalCols]
  );

  // Calculate natural seated eye position (seated forward on cushion, in front of backrest)
  const getSeatEyePosition = useCallback(
    (rowIdx: number, colIdx: number, seat?: SeatPerspectiveItem) => {
      const x = getSeatChairX(colIdx, seat);
      const safeRow = rowIdx >= 0 ? rowIdx : 3;
      const tierFloorY = safeRow * ROW_RISE - 0.5;
      const tierZ = safeRow * SEAT_SPACING_Z;

      // Eye is seated naturally on the cushion, eye level y = tierFloorY + 1.18m
      const z = tierZ - 0.08;
      const y = tierFloorY + 1.18;
      return new THREE.Vector3(x, y, z);
    },
    [getSeatChairX]
  );

  // Camera target calculators for all 5 perspectives
  const getPerspectiveConfig = useCallback(
    (mode: PerspectiveMode, seat?: SeatPerspectiveItem) => {
      const activeS = seat || currentSeat;
      const rIdx = activeS ? rowLabels.indexOf(activeS.rowLabel) : 0;
      const cIdx = activeS ? activeS.seatNumber - 1 : 0;

      let pos = new THREE.Vector3();
      let lookAt = new THREE.Vector3();

      switch (mode) {
        case "overview":
          // Default wide view of full auditorium, screen, seating tiers & aisles
          pos.set(0, totalRows * ROW_RISE + 4.2, totalRows * SEAT_SPACING_Z + 5.2);
          lookAt.set(0, SCREEN_Y * 0.65, SCREEN_Z + 2.0);
          break;

        case "from_seat":
          // Approximate on-screen view from currently selected seat without showing a person
          pos = getSeatEyePosition(rIdx, cIdx, activeS);
          lookAt.set(0, SCREEN_Y, SCREEN_Z);
          break;

        case "from_stage":
          // Looking outward from the stage toward the audience and seating arrangement
          pos.set(0, 2.2, SCREEN_Z + 2.6);
          lookAt.set(0, totalRows * ROW_RISE * 0.45 + 1.4, (totalRows * SEAT_SPACING_Z) * 0.48);
          break;

        case "balcony":
          // Elevated balcony-level perspective communicating steep viewing angle
          pos.set(0, totalRows * ROW_RISE + 8.8, totalRows * SEAT_SPACING_Z + 9.5);
          lookAt.set(0, SCREEN_Y * 0.48, SCREEN_Z + 1.0);
          break;

        case "birds_eye":
          // Top-down view of complete seating plan, rows, aisles, and blocks
          pos.set(0, 23.5, (totalRows * SEAT_SPACING_Z) * 0.46);
          lookAt.set(0, 0, (totalRows * SEAT_SPACING_Z) * 0.46);
          break;
      }

      const rotMatrix = new THREE.Matrix4().lookAt(pos, lookAt, mode === "birds_eye" ? new THREE.Vector3(0, 0, -1) : new THREE.Vector3(0, 1, 0));
      const quat = new THREE.Quaternion().setFromRotationMatrix(rotMatrix);

      return { pos, quat, lookAt };
    },
    [currentSeat, rowLabels, totalRows, getSeatEyePosition]
  );

  // Sightline metrics formula for "From my seat"
  const viewMetrics = useMemo(() => {
    if (!currentSeat) {
      return { distanceM: 0, hAngle: 0, vAngle: 0, score: 0, label: "Select a seat", badgeColor: "bg-gray-500/20 text-gray-300" };
    }
    const eye = getSeatEyePosition(currentRowIndex, currentColIndex, currentSeat);
    const screenCenter = new THREE.Vector3(0, SCREEN_Y, SCREEN_Z);
    const dist = eye.distanceTo(screenCenter);

    const hAngleRad = Math.atan2(Math.abs(eye.x), Math.max(0.1, eye.z - SCREEN_Z));
    const hAngleDeg = (hAngleRad * 180) / Math.PI;

    const vAngleRad = Math.atan2(SCREEN_Y - eye.y, Math.max(0.1, eye.z - SCREEN_Z));
    const vAngleDeg = (vAngleRad * 180) / Math.PI;

    const idealDist = SCREEN_W * 0.95;
    const distScore = 1 - Math.min(1, Math.max(0, Math.abs(dist - idealDist) / idealDist));
    const hScore = 1 - Math.min(1, Math.max(0, hAngleRad / 0.65));
    const vScore = 1 - Math.min(1, Math.max(0, (vAngleRad - 0.12) / 0.42));

    const totalScore = Math.round(100 * (0.42 * hScore + 0.32 * distScore + 0.26 * vScore));

    let label = "Standard Sightline";
    let badgeColor = "bg-amber-500/20 text-amber-300 border-amber-500/30";
    if (totalScore >= 92) {
      label = "Sweet Spot";
      badgeColor = "bg-emerald-500/20 text-emerald-300 border-emerald-500/30";
    } else if (totalScore >= 84) {
      label = "Excellent View";
      badgeColor = "bg-teal-500/20 text-teal-300 border-teal-500/30";
    } else if (totalScore >= 75) {
      label = "Prime Sightline";
      badgeColor = "bg-blue-500/20 text-blue-300 border-blue-500/30";
    }

    return {
      distanceM: Number(dist.toFixed(1)),
      hAngle: Number(hAngleDeg.toFixed(1)),
      vAngle: Number(vAngleDeg.toFixed(1)),
      score: totalScore,
      label,
      badgeColor,
    };
  }, [currentSeat, currentRowIndex, currentColIndex, getSeatEyePosition]);

  // Sync state refs
  useEffect(() => {
    curtainOpenRef.current = curtainsOpen ? 1.0 : 0.0;
  }, [curtainsOpen]);

  useEffect(() => {
    lightsIntensityRef.current = houseLights ? 1.0 : 0.25;
  }, [houseLights]);

  // Smooth camera flight transition helper
  const triggerCameraFlight = useCallback(
    (targetMode: PerspectiveMode, seat?: SeatPerspectiveItem, duration = 750) => {
      const { pos: endPos, quat: endQuat } = getPerspectiveConfig(targetMode, seat);

      // Start position from current flight or from previous mode
      const startPos = flightRef.current ? flightRef.current.endPos.clone() : getPerspectiveConfig(viewMode, currentSeat).pos;
      const startQuat = flightRef.current ? flightRef.current.endQuat.clone() : getPerspectiveConfig(viewMode, currentSeat).quat;

      flightRef.current = {
        startTime: performance.now(),
        duration,
        startPos,
        endPos,
        startQuat,
        endQuat,
        onComplete: () => {
          cameraModeRef.current = targetMode;
          flightRef.current = null;
        },
      };

      cameraModeRef.current = "flight";
      lookTargetRef.current = { yaw: 0, pitch: 0 };
      lookCurrentRef.current = { yaw: 0, pitch: 0 };
      setViewMode(targetMode);
    },
    [getPerspectiveConfig, viewMode, currentSeat]
  );

  // Switch perspective mode
  const handlePerspectiveSelect = (newMode: PerspectiveMode) => {
    if (newMode === viewMode && cameraModeRef.current === newMode) return;
    triggerCameraFlight(newMode, currentSeat);
  };

  // Switch selected seat preview in "From my seat"
  const handleSelectSeatPreview = (seat: SeatPerspectiveItem) => {
    setCurrentSeat(seat);
    if (viewMode === "from_seat") {
      triggerCameraFlight("from_seat", seat, 600);
    }
  };

  // Reset View Control
  const handleResetView = () => {
    lookTargetRef.current = { yaw: 0, pitch: 0 };
    zoomLevelRef.current = 1.0;
    triggerCameraFlight(viewMode, currentSeat, 500);
  };

  // Fullscreen toggle
  const handleToggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  useEffect(() => {
    const onFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  // Keyboard navigation shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (isFullscreen) {
          document.exitFullscreen().catch(() => {});
        } else if (onClose) {
          onClose();
        }
      } else if (e.key === "1") {
        handlePerspectiveSelect("overview");
      } else if (e.key === "2") {
        handlePerspectiveSelect("from_seat");
      } else if (e.key === "3") {
        handlePerspectiveSelect("from_stage");
      } else if (e.key === "4") {
        handlePerspectiveSelect("balcony");
      } else if (e.key === "5") {
        handlePerspectiveSelect("birds_eye");
      } else if (e.key === "r" || e.key === "R") {
        handleResetView();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isFullscreen, onClose, viewMode, currentSeat]);

  // Main Three.js Scene Setup & Render Loop
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    let width = container.clientWidth || 800;
    let height = container.clientHeight || 550;

    // 1. WebGL Renderer
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: "high-performance",
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.35;

    // 2. Scene Atmosphere
    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#ffffff");
    scene.fog = new THREE.FogExp2("#f8fafc", 0.003);

    // 3. Perspective Camera
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.15, 160);
    const { pos: initialPos, quat: initialQuat } = getPerspectiveConfig(viewMode, currentSeat);
    camera.position.copy(initialPos);
    camera.quaternion.copy(initialQuat);

    // 4. Balanced Cinema Auditorium Lighting
    const ambientLight = new THREE.AmbientLight("#ffffff", 1.25);
    scene.add(ambientLight);

    // Downlights
    const downLightFront = new THREE.PointLight("#ffedd5", 14, 35, 1.2);
    downLightFront.position.set(0, 10.5, 2.5);
    scene.add(downLightFront);

    const downLightBack = new THREE.PointLight("#ffedd5", 12, 35, 1.2);
    downLightBack.position.set(0, 11.5, totalRows * SEAT_SPACING_Z + 1.0);
    scene.add(downLightBack);

    // Screen glow bouncing into hall
    const screenGlowLight = new THREE.PointLight("#fed7aa", 16, 48, 1.3);
    screenGlowLight.position.set(0, SCREEN_Y, SCREEN_Z + 1.8);
    scene.add(screenGlowLight);

    // Projector beam from booth
    const projectorBeam = new THREE.SpotLight("#dbeafe", 12, 80, 0.38, 0.35, 1.1);
    projectorBeam.position.set(0, 12, totalRows * SEAT_SPACING_Z + 7);
    projectorBeam.target.position.set(0, SCREEN_Y, SCREEN_Z);
    scene.add(projectorBeam);
    scene.add(projectorBeam.target);

    // 5. Curved Cinema Screen
    const screenGroup = new THREE.Group();
    screenGroup.position.set(0, SCREEN_Y, SCREEN_Z);

    const screenRadius = 34;
    const screenAngle = SCREEN_W / screenRadius;

    const screenGeo = new THREE.CylinderGeometry(
      screenRadius,
      screenRadius,
      SCREEN_H,
      48,
      1,
      true,
      Math.PI * 1.5 - screenAngle / 2,
      screenAngle
    );

    let screenMat: THREE.Material;
    const textureUrl = bannerUrl || posterUrl;
    if (textureUrl) {
      const loader = new THREE.TextureLoader();
      const texture = loader.load(textureUrl);
      texture.colorSpace = THREE.SRGBColorSpace;
      screenMat = new THREE.MeshStandardMaterial({
        map: texture,
        emissiveMap: texture,
        emissive: new THREE.Color("#ffffff"),
        emissiveIntensity: 0.75,
        roughness: 0.25,
        metalness: 0.0,
        side: THREE.BackSide,
      });
    } else {
      screenMat = new THREE.MeshStandardMaterial({
        color: "#ffffff",
        emissive: "#3b82f6",
        emissiveIntensity: 0.5,
        roughness: 0.25,
        side: THREE.BackSide,
      });
    }

    const screenMesh = new THREE.Mesh(screenGeo, screenMat);
    screenMesh.scale.set(1, 1, -1);
    screenGroup.add(screenMesh);

    // Screen frame border with brushed gold trim
    const frameGeo = new THREE.BoxGeometry(SCREEN_W + 0.8, SCREEN_H + 0.8, 0.12);
    const frameMat = new THREE.MeshStandardMaterial({
      color: "#d4af37",
      metalness: 0.75,
      roughness: 0.25,
    });
    const frameMesh = new THREE.Mesh(frameGeo, frameMat);
    frameMesh.position.set(0, 0, -0.15);
    screenGroup.add(frameMesh);

    // Stage Platform in front of screen
    const stageGeo = new THREE.BoxGeometry(SCREEN_W + 6, 0.8, 3.8);
    const stageMat = new THREE.MeshStandardMaterial({ color: "#171720", roughness: 0.7 });
    const stageMesh = new THREE.Mesh(stageGeo, stageMat);
    stageMesh.position.set(0, -SCREEN_Y + 0.4, 1.8);
    screenGroup.add(stageMesh);

    // Pleated Velvet Proscenium Stage Curtains
    const curtainMat = new THREE.MeshStandardMaterial({
      color: "#991b1b", // Rich theatre crimson
      roughness: 0.85,
      metalness: 0.05,
    });

    const curtainFoldGeo = new THREE.CylinderGeometry(0.35, 0.44, SCREEN_H + 2.4, 14);
    const foldCount = 9;
    const foldSpacing = (SCREEN_W / 2 + 0.6) / foldCount;

    const curtainLGroup = new THREE.Group();
    curtainLGroup.position.set(-SCREEN_W / 2 - 0.2, 0, 0.35);
    for (let c = 0; c < foldCount; c++) {
      const cMesh = new THREE.Mesh(curtainFoldGeo, curtainMat);
      cMesh.position.set(c * foldSpacing, 0, 0);
      curtainLGroup.add(cMesh);
    }
    screenGroup.add(curtainLGroup);

    const curtainRGroup = new THREE.Group();
    curtainRGroup.position.set(SCREEN_W / 2 + 0.2, 0, 0.35);
    for (let c = 0; c < foldCount; c++) {
      const cMesh = new THREE.Mesh(curtainFoldGeo, curtainMat);
      cMesh.position.set(-c * foldSpacing, 0, 0);
      curtainRGroup.add(cMesh);
    }
    screenGroup.add(curtainRGroup);

    // Top velvet valance
    const valanceGeo = new THREE.BoxGeometry(SCREEN_W + 4.5, 1.3, 0.5);
    const valanceMesh = new THREE.Mesh(valanceGeo, curtainMat);
    valanceMesh.position.set(0, SCREEN_H / 2 + 0.65, 0.38);
    screenGroup.add(valanceMesh);

    scene.add(screenGroup);

    // 6. Tiered Stadium Floors with Central Illuminated Aisle Stairs
    const hallWidth = Math.max(totalCols * SEAT_SPACING_X + 6, 22);
    const floorGroup = new THREE.Group();

    for (let r = 0; r < totalRows; r++) {
      const y = r * ROW_RISE - 0.5;
      const z = r * SEAT_SPACING_Z;

      const slabGeo = new THREE.BoxGeometry(hallWidth, 0.26, SEAT_SPACING_Z + 0.06);
      const slabMat = new THREE.MeshStandardMaterial({
        color: r % 2 === 0 ? "#111827" : "#0f172a",
        roughness: 0.85,
      });
      const slab = new THREE.Mesh(slabGeo, slabMat);
      slab.position.set(0, y - 0.13, z);
      floorGroup.add(slab);

      // Central illuminated aisle staircase (wide center walkway matching reference photos)
      const aisleStepGeo = new THREE.BoxGeometry(1.5, 0.04, SEAT_SPACING_Z * 0.88);
      const aisleStepMat = new THREE.MeshStandardMaterial({
        color: "#1c1917",
        roughness: 0.75,
      });
      const aisleStep = new THREE.Mesh(aisleStepGeo, aisleStepMat);
      aisleStep.position.set(0, y + 0.01, z);
      floorGroup.add(aisleStep);

      // Radiant Warm Amber LED step edge strip in the center aisle
      const centerAisleLedGeo = new THREE.BoxGeometry(1.5, 0.04, 0.08);
      const centerAisleLedMat = new THREE.MeshStandardMaterial({
        color: "#fbbf24",
        emissive: "#f59e0b",
        emissiveIntensity: 3.2,
      });
      const centerLed = new THREE.Mesh(centerAisleLedGeo, centerAisleLedMat);
      centerLed.position.set(0, y + 0.03, z - SEAT_SPACING_Z / 2 + 0.06);
      floorGroup.add(centerLed);

      // Ambient low-intensity step outline across tiers
      const ledGeo = new THREE.PlaneGeometry(hallWidth * 0.92, 0.03);
      const ledMat = new THREE.MeshStandardMaterial({
        color: "#f59e0b",
        emissive: "#d97706",
        emissiveIntensity: 1.2,
        transparent: true,
        opacity: 0.6,
      });
      const led = new THREE.Mesh(ledGeo, ledMat);
      led.rotation.x = -Math.PI / 2;
      led.position.set(0, y + 0.005, z - SEAT_SPACING_Z / 2 + 0.05);
      floorGroup.add(led);
    }
    scene.add(floorGroup);

    // 7. Seat Materials Specification
    // Available: Vibrant Cinema Teal (#0d9488 / #14b8a6) matching reference photos
    const availableCushionMat = new THREE.MeshStandardMaterial({
      color: "#0f766e",
      emissive: "#0d9488",
      emissiveIntensity: 0.25,
      roughness: 0.42,
    });
    const availableBackMat = new THREE.MeshStandardMaterial({
      color: "#14b8a6",
      emissive: "#0f766e",
      emissiveIntensity: 0.18,
      roughness: 0.48,
    });

    // Balcony Category: Amber / Orange (#f59e0b)
    const balconyCushionMat = new THREE.MeshStandardMaterial({
      color: "#d97706",
      emissive: "#b45309",
      emissiveIntensity: 0.32,
      roughness: 0.42,
    });
    const balconyBackMat = new THREE.MeshStandardMaterial({
      color: "#f59e0b",
      emissive: "#d97706",
      emissiveIntensity: 0.25,
      roughness: 0.45,
    });

    // Selected: Highlighted Yellow (#facc15)
    const selectedCushionMat = new THREE.MeshStandardMaterial({
      color: "#facc15",
      emissive: "#eab308",
      emissiveIntensity: 0.85,
      roughness: 0.25,
    });
    const selectedBackMat = new THREE.MeshStandardMaterial({
      color: "#fde047",
      emissive: "#eab308",
      emissiveIntensity: 0.7,
      roughness: 0.3,
    });

    // Unavailable / Disabled: Grey (#475569)
    const unavailableCushionMat = new THREE.MeshStandardMaterial({
      color: "#334155",
      roughness: 0.95,
      metalness: 0.1,
    });
    const unavailableBackMat = new THREE.MeshStandardMaterial({
      color: "#475569",
      roughness: 0.95,
      metalness: 0.1,
    });

    const armMat = new THREE.MeshStandardMaterial({ color: "#1f2937", roughness: 0.6 });
    const baseMat = new THREE.MeshStandardMaterial({ color: "#111827", metalness: 0.6, roughness: 0.3 });

    // Chair Geometries
    const coupleBackGeo = new THREE.BoxGeometry(1.65, 0.88, 0.16);
    const coupleCushionGeo = new THREE.BoxGeometry(1.60, 0.18, 0.56);
    const standardBackGeo = new THREE.BoxGeometry(0.74, 0.88, 0.14);
    const standardCushionGeo = new THREE.BoxGeometry(0.72, 0.16, 0.54);
    const armGeo = new THREE.BoxGeometry(0.12, 0.35, 0.5);
    const baseGeo = new THREE.CylinderGeometry(0.04, 0.05, 0.45, 8);

    // 8. Build Seats Group with Raycastable Interactivity
    const seatsGroup = new THREE.Group();
    const raycastMeshes: THREE.Mesh[] = [];
    const processedCouplePairs = new Set<string>();

    allSeats.forEach((seat) => {
      const rIdx = rowLabels.indexOf(seat.rowLabel);
      const safeRow = rIdx >= 0 ? rIdx : 3;
      const tierFloorY = safeRow * ROW_RISE - 0.5;
      const tierZ = safeRow * SEAT_SPACING_Z;

      const isSelected = selectedSeatIds.includes(seat.id) || (seat.seatRef && selectedSeatIds.includes(seat.seatRef));
      const isUnavailable = seat.status === "BOOKED" || seat.status === "UNAVAILABLE";
      const isBalcony = Boolean(seat.isBalcony);

      let cMat = availableCushionMat;
      let bMat = availableBackMat;

      if (isUnavailable) {
        cMat = unavailableCushionMat;
        bMat = unavailableBackMat;
      } else if (isSelected) {
        cMat = selectedCushionMat;
        bMat = selectedBackMat;
      } else if (isBalcony) {
        cMat = balconyCushionMat;
        bMat = balconyBackMat;
      }

      if (seat.isCouple) {
        const pairId = Math.floor((seat.seatNumber - 1) / 2);
        const pairKey = `${seat.rowLabel}-pair-${pairId}`;
        if (processedCouplePairs.has(pairKey)) return;
        processedCouplePairs.add(pairKey);

        const partnerNumber = seat.seatNumber % 2 === 1 ? seat.seatNumber + 1 : seat.seatNumber - 1;
        const partner = allSeats.find((s) => s.rowLabel === seat.rowLabel && s.seatNumber === partnerNumber);

        const x1 = getSeatChairX(seat.seatNumber - 1, seat);
        const x2 = partner ? getSeatChairX(partner.seatNumber - 1, partner) : x1;
        const midX = (x1 + x2) / 2;

        const coupleChair = new THREE.Group();
        coupleChair.position.set(midX, tierFloorY, tierZ);
        coupleChair.userData = { seat, isAvailable: !isUnavailable };

        const back = new THREE.Mesh(coupleBackGeo, bMat);
        back.position.set(0, 0.68, 0.22);
        back.rotation.x = -0.08;
        back.userData = { seat, isAvailable: !isUnavailable };
        coupleChair.add(back);
        raycastMeshes.push(back);

        const cushion = new THREE.Mesh(coupleCushionGeo, cMat);
        cushion.position.set(0, 0.36, -0.06);
        cushion.userData = { seat, isAvailable: !isUnavailable };
        coupleChair.add(cushion);
        raycastMeshes.push(cushion);

        const leftArm = new THREE.Mesh(armGeo, armMat);
        leftArm.position.set(-0.82, 0.46, -0.06);
        coupleChair.add(leftArm);

        const rightArm = new THREE.Mesh(armGeo, armMat);
        rightArm.position.set(0.82, 0.46, -0.06);
        coupleChair.add(rightArm);

        const legL = new THREE.Mesh(baseGeo, baseMat);
        legL.position.set(-0.55, 0.2, -0.06);
        coupleChair.add(legL);

        const legR = new THREE.Mesh(baseGeo, baseMat);
        legR.position.set(0.55, 0.2, -0.06);
        coupleChair.add(legR);

        seatsGroup.add(coupleChair);
      } else {
        const chairX = getSeatChairX(seat.seatNumber - 1, seat);
        const chair = new THREE.Group();
        chair.position.set(chairX, tierFloorY, tierZ);
        chair.userData = { seat, isAvailable: !isUnavailable };

        const back = new THREE.Mesh(standardBackGeo, bMat);
        back.position.set(0, 0.68, 0.22);
        back.rotation.x = -0.08;
        back.userData = { seat, isAvailable: !isUnavailable };
        chair.add(back);
        raycastMeshes.push(back);

        const cushion = new THREE.Mesh(standardCushionGeo, cMat);
        cushion.position.set(0, 0.36, -0.06);
        cushion.userData = { seat, isAvailable: !isUnavailable };
        chair.add(cushion);
        raycastMeshes.push(cushion);

        const leftArm = new THREE.Mesh(armGeo, armMat);
        leftArm.position.set(-0.4, 0.46, -0.06);
        chair.add(leftArm);

        const rightArm = new THREE.Mesh(armGeo, armMat);
        rightArm.position.set(0.4, 0.46, -0.06);
        chair.add(rightArm);

        const leg = new THREE.Mesh(baseGeo, baseMat);
        leg.position.set(0, 0.2, -0.06);
        chair.add(leg);

        seatsGroup.add(chair);
      }
    });

    scene.add(seatsGroup);

    // 9. Side Walls with Pleated Red Theatre Velvet Curtains & Architectural Downlights
    const wallHalfW = hallWidth / 2;
    const wallDepth = totalRows * SEAT_SPACING_Z + 14;
    const wallGeo = new THREE.BoxGeometry(0.3, 16, wallDepth);
    const wallMat = new THREE.MeshStandardMaterial({
      color: "#450a0a", // Deep theatre maroon base
      roughness: 0.9,
    });

    const leftWall = new THREE.Mesh(wallGeo, wallMat);
    leftWall.position.set(-wallHalfW, 6, wallDepth / 2 - 8);
    scene.add(leftWall);

    const rightWall = new THREE.Mesh(wallGeo, wallMat);
    rightWall.position.set(wallHalfW, 6, wallDepth / 2 - 8);
    scene.add(rightWall);

    // Pleated vertical crimson curtains along side walls (matching cinema reference photograph)
    const sideCurtainMat = new THREE.MeshStandardMaterial({
      color: "#881337", // Rich cinema crimson
      roughness: 0.82,
      metalness: 0.04,
    });
    const sideFoldGeo = new THREE.CylinderGeometry(0.24, 0.32, 15, 10);
    const sideFoldSpacing = 0.92;
    const sideFoldCount = Math.floor(wallDepth / sideFoldSpacing);

    for (let f = 0; f < sideFoldCount; f++) {
      const zF = -7 + f * sideFoldSpacing;
      const foldL = new THREE.Mesh(sideFoldGeo, sideCurtainMat);
      foldL.position.set(-wallHalfW + 0.22, 6, zF);
      scene.add(foldL);

      const foldR = new THREE.Mesh(sideFoldGeo, sideCurtainMat);
      foldR.position.set(wallHalfW - 0.22, 6, zF);
      scene.add(foldR);
    }

    // Warm Architectural Sconces along upper walls casting light down the red drapery
    const sconceGeo = new THREE.BoxGeometry(0.22, 0.65, 0.28);
    const sconceMat = new THREE.MeshStandardMaterial({
      color: "#fbbf24",
      emissive: "#d97706",
      emissiveIntensity: 2.5,
    });
    for (let i = 0; i < totalRows; i += 2) {
      const zSconce = i * SEAT_SPACING_Z;
      const ySconce = i * ROW_RISE + 3.2;

      const sL = new THREE.Mesh(sconceGeo, sconceMat);
      sL.position.set(-wallHalfW + 0.28, ySconce, zSconce);
      scene.add(sL);

      const sR = new THREE.Mesh(sconceGeo, sconceMat);
      sR.position.set(wallHalfW - 0.28, ySconce, zSconce);
      scene.add(sR);
    }

    // 10. Animation & Render Loop
    let animationFrameId: number;
    const raycaster = new THREE.Raycaster();
    const mouseVec = new THREE.Vector2();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      // Smooth curtain opening / closing
      const curtainDiff = curtainOpenRef.current - curtainCurRef.current;
      curtainCurRef.current += curtainDiff * 0.08;
      const scaleX = Math.max(0.12, 1.0 - curtainCurRef.current * 0.82);
      curtainLGroup.scale.set(scaleX, 1, 1);
      curtainRGroup.scale.set(scaleX, 1, 1);

      // Dimmable house lights
      const targetIntensity = lightsIntensityRef.current;
      downLightFront.intensity = THREE.MathUtils.lerp(downLightFront.intensity, targetIntensity * 14, 0.08);
      downLightBack.intensity = THREE.MathUtils.lerp(downLightBack.intensity, targetIntensity * 12, 0.08);

      // Camera flight interpolation
      if (flightRef.current) {
        const flight = flightRef.current;
        const elapsed = performance.now() - flight.startTime;
        const progress = Math.min(1, Math.max(0, elapsed / flight.duration));
        // Ease-out cubic
        const t = 1 - Math.pow(1 - progress, 3);

        camera.position.lerpVectors(flight.startPos, flight.endPos, t);
        camera.quaternion.slerpQuaternions(flight.startQuat, flight.endQuat, t);

        if (progress >= 1) {
          if (flight.onComplete) flight.onComplete();
          flightRef.current = null;
        }
      } else if (cameraModeRef.current === "from_seat") {
        // Seated head gaze pan
        const activeS = currentSeat;
        const rIdx = activeS ? rowLabels.indexOf(activeS.rowLabel) : 0;
        const cIdx = activeS ? activeS.seatNumber - 1 : 0;
        const seatEye = getSeatEyePosition(rIdx, cIdx, activeS);
        camera.position.copy(seatEye);

        lookCurrentRef.current.yaw = THREE.MathUtils.lerp(lookCurrentRef.current.yaw, lookTargetRef.current.yaw, 0.18);
        lookCurrentRef.current.pitch = THREE.MathUtils.lerp(lookCurrentRef.current.pitch, lookTargetRef.current.pitch, 0.18);

        const screenTarget = new THREE.Vector3(0, SCREEN_Y, SCREEN_Z);
        const baseRotM = new THREE.Matrix4().lookAt(seatEye, screenTarget, new THREE.Vector3(0, 1, 0));
        const baseQuat = new THREE.Quaternion().setFromRotationMatrix(baseRotM);

        const yawQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), lookCurrentRef.current.yaw);
        const pitchQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), lookCurrentRef.current.pitch);

        camera.quaternion.copy(baseQuat).multiply(yawQuat).multiply(pitchQuat);
      } else if (cameraModeRef.current === "overview" || cameraModeRef.current === "from_stage" || cameraModeRef.current === "balcony") {
        // Orbit drag pan for overview & stage views
        lookCurrentRef.current.yaw = THREE.MathUtils.lerp(lookCurrentRef.current.yaw, lookTargetRef.current.yaw, 0.15);
        lookCurrentRef.current.pitch = THREE.MathUtils.lerp(lookCurrentRef.current.pitch, lookTargetRef.current.pitch, 0.15);

        const { pos: basePos, quat: baseQuat } = getPerspectiveConfig(cameraModeRef.current as PerspectiveMode, currentSeat);
        camera.position.copy(basePos);

        const yawQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), lookCurrentRef.current.yaw);
        const pitchQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), lookCurrentRef.current.pitch);
        camera.quaternion.copy(baseQuat).multiply(yawQuat).multiply(pitchQuat);
      }

      // Apply zoom level to camera FOV
      const targetFov = 75 / zoomLevelRef.current;
      if (Math.abs(camera.fov - targetFov) > 0.1) {
        camera.fov = THREE.MathUtils.lerp(camera.fov, targetFov, 0.12);
        camera.updateProjectionMatrix();
      }

      renderer.render(scene, camera);
    };

    animate();

    // 11. Mouse & Touch Raycasting & Drag Interaction
    const domElement = renderer.domElement;

    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      mouseRef.current.isDragging = true;
      mouseRef.current.hasMoved = false;

      const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
      const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;

      mouseRef.current.startX = clientX;
      mouseRef.current.startY = clientY;
      mouseRef.current.lastX = clientX;
      mouseRef.current.lastY = clientY;
    };

    const handlePointerMove = (e: MouseEvent | TouchEvent) => {
      const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
      const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;

      if (mouseRef.current.isDragging) {
        const deltaX = clientX - mouseRef.current.lastX;
        const deltaY = clientY - mouseRef.current.lastY;

        if (Math.abs(clientX - mouseRef.current.startX) > 5 || Math.abs(clientY - mouseRef.current.startY) > 5) {
          mouseRef.current.hasMoved = true;
        }

        mouseRef.current.lastX = clientX;
        mouseRef.current.lastY = clientY;

        const sensitivity = cameraModeRef.current === "from_seat" ? 0.0035 : 0.004;
        lookTargetRef.current.yaw = THREE.MathUtils.clamp(
          lookTargetRef.current.yaw - deltaX * sensitivity,
          -Math.PI / 2.2,
          Math.PI / 2.2
        );
        lookTargetRef.current.pitch = THREE.MathUtils.clamp(
          lookTargetRef.current.pitch + deltaY * sensitivity,
          -Math.PI / 3.5,
          Math.PI / 3.5
        );
      } else if (!("touches" in e)) {
        // Hover raycast for desktop tooltip
        const rect = domElement.getBoundingClientRect();
        mouseVec.x = ((clientX - rect.left) / rect.width) * 2 - 1;
        mouseVec.y = -((clientY - rect.top) / rect.height) * 2 + 1;

        raycaster.setFromCamera(mouseVec, camera);
        const hits = raycaster.intersectObjects(raycastMeshes, false);
        if (hits.length > 0 && hits[0].object.userData?.seat) {
          setHoveredSeat(hits[0].object.userData.seat);
        } else {
          setHoveredSeat(null);
        }
      }
    };

    const handlePointerUp = (e: MouseEvent | TouchEvent) => {
      if (!mouseRef.current.isDragging) return;
      mouseRef.current.isDragging = false;

      // If user clicked/tapped without dragging, perform Raycast Seat Selection
      if (!mouseRef.current.hasMoved) {
        const clientX = "changedTouches" in e ? (e as TouchEvent).changedTouches[0].clientX : (e as MouseEvent).clientX;
        const clientY = "changedTouches" in e ? (e as TouchEvent).changedTouches[0].clientY : (e as MouseEvent).clientY;

        const rect = domElement.getBoundingClientRect();
        mouseVec.x = ((clientX - rect.left) / rect.width) * 2 - 1;
        mouseVec.y = -((clientY - rect.top) / rect.height) * 2 + 1;

        raycaster.setFromCamera(mouseVec, camera);
        const hits = raycaster.intersectObjects(raycastMeshes, false);

        if (hits.length > 0) {
          const hitSeat: SeatPerspectiveItem = hits[0].object.userData?.seat;
          const isAvail: boolean = hits[0].object.userData?.isAvailable;

          if (hitSeat && isAvail) {
            const isAlreadySelected = selectedSeatIds.includes(hitSeat.id) || (hitSeat.seatRef && selectedSeatIds.includes(hitSeat.seatRef));

            if (isAlreadySelected) {
              if (onDeselectSeat) onDeselectSeat(hitSeat.id);
            } else {
              if (onSelectSeat) onSelectSeat(hitSeat.id);
            }

            // In "from_seat" view mode, click anchors camera to that seat
            if (cameraModeRef.current === "from_seat") {
              setCurrentSeat(hitSeat);
            }
          }
        }
      }
    };

    // Zoom on wheel
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const zoomDelta = e.deltaY * -0.0012;
      zoomLevelRef.current = THREE.MathUtils.clamp(zoomLevelRef.current + zoomDelta, 0.65, 1.8);
    };

    domElement.addEventListener("mousedown", handlePointerDown);
    domElement.addEventListener("wheel", handleWheel, { passive: false });
    window.addEventListener("mousemove", handlePointerMove);
    window.addEventListener("mouseup", handlePointerUp);

    domElement.addEventListener("touchstart", handlePointerDown, { passive: true });
    window.addEventListener("touchmove", handlePointerMove, { passive: true });
    window.addEventListener("touchend", handlePointerUp);

    // 12. Resize Listener
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth || 800;
      const h = container.clientHeight || 550;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", handleResize);

    // Cleanup
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", handleResize);

      domElement.removeEventListener("mousedown", handlePointerDown);
      domElement.removeEventListener("wheel", handleWheel);
      window.removeEventListener("mousemove", handlePointerMove);
      window.removeEventListener("mouseup", handlePointerUp);

      domElement.removeEventListener("touchstart", handlePointerDown);
      window.removeEventListener("touchmove", handlePointerMove);
      window.removeEventListener("touchend", handlePointerUp);

      renderer.dispose();
      screenGeo.dispose();
      screenMat.dispose();
      frameGeo.dispose();
      frameMat.dispose();
      stageGeo.dispose();
      stageMat.dispose();
    };
  }, [
    bannerUrl,
    posterUrl,
    rowLabels,
    totalRows,
    totalCols,
    selectedSeatIds,
    allSeats,
    currentSeat,
    getSeatChairX,
    getSeatEyePosition,
    getPerspectiveConfig,
    onSelectSeat,
    onDeselectSeat,
  ]);

  const isCurrentSeatSelected = currentSeat
    ? selectedSeatIds.includes(currentSeat.id) || (currentSeat.seatRef && selectedSeatIds.includes(currentSeat.seatRef))
    : false;

  return (
    <div
      ref={containerRef}
      className={`relative w-full ${
        isEmbedded
          ? "h-full min-h-[600px] overflow-hidden bg-white flex flex-col"
          : "fixed inset-0 z-50 flex flex-col bg-white text-gray-900"
      } font-sans select-none`}
    >
      {/* Top Header Bar (When in fullscreen or modal overlay mode) */}
      {!isEmbedded && (
        <div className="absolute top-0 inset-x-0 z-30 flex items-center justify-between px-3 sm:px-4 pt-[calc(0.75rem+env(safe-area-inset-top,0px))] pb-3 sm:pb-4 bg-gradient-to-b from-white/95 via-white/80 to-transparent pointer-events-none">
          <div className="flex items-center gap-2 pointer-events-auto">
            {onSwitchTo2D && (
              <div className="flex items-center bg-white/95 border border-gray-200 rounded-xl p-0.5 shadow-md backdrop-blur-md">
                <button
                  type="button"
                  onClick={onSwitchTo2D}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-600 hover:text-gray-900 transition cursor-pointer flex items-center gap-1.5"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span>Seat Overview</span>
                </button>
                <button
                  type="button"
                  className="px-3 py-1.5 rounded-lg text-xs font-bold bg-[#7B1E3D] text-white shadow-xs flex items-center gap-1.5 cursor-default"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>3D Model</span>
                </button>
              </div>
            )}

            {!onSwitchTo2D && (
              <div>
                <h2 className="text-sm sm:text-base font-extrabold text-gray-900 leading-tight flex items-center gap-2">
                  <span>{movieTitle}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#7B1E3D]/10 text-[#7B1E3D] border border-[#7B1E3D]/20">
                    3D Auditorium
                  </span>
                </h2>
                <p className="text-[11px] text-gray-500">
                  {cinemaName} • {screenName}
                </p>
              </div>
            )}
          </div>

          {/* Top Right Quick Actions */}
          <div className="flex items-center gap-1.5 pointer-events-auto">
            <button
              type="button"
              onClick={handleResetView}
              className="p-2 rounded-xl bg-white/90 hover:bg-gray-100 text-gray-700 hover:text-black border border-gray-200 transition shadow-sm cursor-pointer"
              title="Reset View"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleToggleFullscreen}
              className="p-2 rounded-xl bg-white/90 hover:bg-gray-100 text-gray-700 hover:text-black border border-gray-200 transition shadow-sm cursor-pointer"
              title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-xl bg-white/90 hover:bg-rose-50 text-gray-700 hover:text-rose-600 border border-gray-200 transition shadow-sm cursor-pointer ml-1"
                title="Close 3D View"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Embedded Quick Action Reset & Fullscreen Buttons */}
      {isEmbedded && (
        <div className="absolute top-3 right-3 sm:right-4 z-30 flex items-center gap-1.5 pointer-events-auto">
          <button
            type="button"
            onClick={handleResetView}
            className="p-1.5 rounded-lg bg-white/95 hover:bg-gray-100 text-gray-700 hover:text-black border border-gray-200 transition shadow-sm cursor-pointer"
            title="Reset View"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={handleToggleFullscreen}
            className="p-1.5 rounded-lg bg-white/95 hover:bg-gray-100 text-gray-700 hover:text-black border border-gray-200 transition shadow-sm cursor-pointer"
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      )}

      {/* 1. View Selector: Horizontal 5-Perspective Bar directly above the auditorium visual */}
      <div className={`absolute ${isEmbedded ? "top-3 sm:top-4" : "top-[calc(3.75rem+env(safe-area-inset-top,0px))] sm:top-[calc(4rem+env(safe-area-inset-top,0px))]"} inset-x-0 z-30 flex justify-center px-2 pointer-events-none`}>
        <div className="flex items-center gap-1 sm:gap-1.5 bg-white/95 backdrop-blur-md p-1 sm:p-1.5 rounded-2xl border border-gray-200 shadow-md pointer-events-auto max-w-full overflow-x-auto scrollbar-none">
          {/* Overview */}
          <button
            type="button"
            onClick={() => handlePerspectiveSelect("overview")}
            className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
              viewMode === "overview"
                ? "bg-[#7B1E3D] text-white shadow-xs font-extrabold"
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Overview</span>
          </button>

          {/* From my seat */}
          <button
            type="button"
            onClick={() => handlePerspectiveSelect("from_seat")}
            className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
              viewMode === "from_seat"
                ? "bg-[#7B1E3D] text-white shadow-xs font-extrabold"
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>From my seat</span>
          </button>

          {/* From stage */}
          <button
            type="button"
            onClick={() => handlePerspectiveSelect("from_stage")}
            className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
              viewMode === "from_stage"
                ? "bg-[#7B1E3D] text-white shadow-xs font-extrabold"
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            }`}
          >
            <Airplay className="w-3.5 h-3.5" />
            <span>From stage</span>
          </button>

          {/* Balcony */}
          <button
            type="button"
            onClick={() => handlePerspectiveSelect("balcony")}
            className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
              viewMode === "balcony"
                ? "bg-[#7B1E3D] text-white shadow-xs font-extrabold"
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Balcony</span>
          </button>

          {/* Bird's eye */}
          <button
            type="button"
            onClick={() => handlePerspectiveSelect("birds_eye")}
            className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
              viewMode === "birds_eye"
                ? "bg-[#7B1E3D] text-white shadow-xs font-extrabold"
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>Bird's eye</span>
          </button>
        </div>
      </div>

      {/* Floating Sightline Badge (When in "From my seat" view) */}
      {viewMode === "from_seat" && currentSeat && (
        <div className="absolute top-28 left-4 z-20 pointer-events-none hidden sm:block animate-in fade-in duration-200">
          <div className="bg-white/95 backdrop-blur-md border border-gray-200 rounded-2xl p-3 shadow-md text-gray-900 space-y-1.5 pointer-events-auto max-w-[240px]">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-[#7B1E3D] font-bold uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> Sightline View
              </span>
              <span className="text-xs font-black text-[#7B1E3D]">{viewMetrics.score}%</span>
            </div>
            <div className="text-sm font-black text-gray-900">
              Seat {currentSeat.label}
              {currentSeat.tierName && <span className="text-gray-500 font-medium text-xs ml-1.5">({currentSeat.tierName})</span>}
            </div>
            <div className="flex items-center justify-between text-[11px] text-gray-500 pt-1 border-t border-gray-100">
              <span>Distance to screen</span>
              <span className="font-mono font-bold text-gray-900">~{viewMetrics.distanceM}m</span>
            </div>
          </div>
        </div>
      )}

      {/* Floating Hover Tooltip */}
      {hoveredSeat && (
        <div className="absolute top-[calc(7rem+env(safe-area-inset-top,0px))] right-4 z-20 pointer-events-none animate-in fade-in duration-150">
          <div className="bg-white/95 backdrop-blur-md border border-gray-200 rounded-xl px-3 py-1.5 shadow-md text-gray-900 text-xs">
            <span className="font-bold text-[#7B1E3D]">Seat {hoveredSeat.label}</span>
            {hoveredSeat.tierName && <span className="text-gray-500 ml-1">({hoveredSeat.tierName})</span>}
            {hoveredSeat.price && hoveredSeat.price > 0 && (
              <span className="text-emerald-700 font-mono font-bold ml-1.5">• ₹{hoveredSeat.price}</span>
            )}
          </div>
        </div>
      )}

      {/* Canvas for 3D View */}
      <div className="flex-1 w-full h-full relative cursor-grab active:cursor-grabbing">
        <canvas ref={canvasRef} className="w-full h-full block outline-none" />

        {/* Hint Pill */}
        <div className="absolute left-4 bottom-24 z-20 pointer-events-none hidden sm:flex items-center gap-2 text-[11px] text-gray-600 bg-white/85 backdrop-blur-xs px-3 py-1.5 rounded-full border border-gray-200 shadow-sm">
          <span>Click any seat to select/deselect • Drag to look around</span>
        </div>
      </div>

      {/* Multi-seat switcher in "From my seat" mode */}
      {viewMode === "from_seat" && selectedSeats.length > 1 && (
        <div className="absolute bottom-20 inset-x-0 z-30 flex justify-center px-4 pointer-events-none">
          <div className="flex items-center gap-1.5 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-full border border-gray-200 shadow-md pointer-events-auto max-w-full overflow-x-auto">
            <span className="text-[10px] text-gray-500 uppercase font-bold mr-1 shrink-0">Viewing from:</span>
            {selectedSeats.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => handleSelectSeatPreview(s)}
                className={`px-2.5 py-1 rounded-full text-xs font-bold transition cursor-pointer shrink-0 ${
                  currentSeat?.id === s.id
                    ? "bg-[#7B1E3D] text-white shadow-xs"
                    : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                }`}
              >
                Seat {s.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* "From my seat" Empty Prompt if no seat is selected */}
      {viewMode === "from_seat" && selectedSeats.length === 0 && (
        <div className="absolute bottom-20 inset-x-0 z-30 flex justify-center px-4 pointer-events-none">
          <div className="bg-white/95 backdrop-blur-md px-4 py-2 rounded-2xl border border-amber-300 text-center shadow-md pointer-events-auto">
            <p className="text-xs text-amber-800 font-medium">
              Click any seat in 3D to preview your view from that seat
            </p>
          </div>
        </div>
      )}

      {/* 2. Bottom Interactive Navigation, Legend & Booking Summary Bar */}
      <div className="absolute bottom-0 inset-x-0 z-30 p-2.5 sm:p-4 bg-gradient-to-t from-white via-white/90 to-transparent pointer-events-none">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 pointer-events-auto bg-white/95 backdrop-blur-md p-3 sm:p-3.5 rounded-2xl border border-gray-200 shadow-lg">
          {/* Legend */}
          <div className="flex items-center gap-3 sm:gap-4 text-xs font-semibold text-gray-700">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-md bg-[#10b981]" />
              <span>Available</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-md bg-[#f59e0b]" />
              <span>Balcony</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-md bg-[#facc15] ring-2 ring-yellow-400/50" />
              <span>Selected</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-md bg-[#94a3b8]" />
              <span>Unavailable</span>
            </div>
          </div>

          {/* Booking Summary & Proceed CTA */}
          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
            <div className="text-left sm:text-right">
              {selectedSeats.length > 0 ? (
                <>
                  <div className="text-sm font-extrabold text-gray-900">
                    ₹{totalAmount > 0 ? totalAmount.toLocaleString("en-IN") : "0"}
                  </div>
                  <div className="text-[11px] text-gray-500">
                    {selectedSeats.length} {selectedSeats.length === 1 ? "seat" : "seats"} selected
                  </div>
                </>
              ) : (
                <div className="text-xs text-gray-500">
                  Select {requiredSeatCount} {requiredSeatCount === 1 ? "seat" : "seats"}
                </div>
              )}
            </div>

            <button
              type="button"
              disabled={selectedSeats.length === 0}
              onClick={onProceed}
              className={`px-6 py-2.5 rounded-xl font-bold text-xs transition cursor-pointer flex items-center gap-1.5 shadow-md active:scale-95 ${
                selectedSeats.length > 0
                  ? "bg-[#7B1E3D] hover:bg-[#60162f] text-white font-extrabold cursor-pointer"
                  : "bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200"
              }`}
            >
              <span>Proceed</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
