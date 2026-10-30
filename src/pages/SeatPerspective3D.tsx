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
} from "lucide-react";
import type { SeatPerspectiveItem } from "./SeatView360";

interface SeatPerspective3DProps {
  movieTitle: string;
  posterUrl?: string | null;
  bannerUrl?: string | null;
  cinemaName?: string;
  screenName?: string;
  activeSeat: SeatPerspectiveItem;
  allSeats: SeatPerspectiveItem[];
  selectedSeatIds?: string[];
  initialMode?: "seat" | "overview";
  onSelectSeat?: (seatId: string) => void;
  onDeselectSeat?: (seatId: string) => void;
  onClose: () => void;
}

// Spatial dimensions for realistic Vantage multiplex auditorium
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
  initialMode = "seat",
  onSelectSeat,
  onDeselectSeat,
  onClose,
}: SeatPerspective3DProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [currentSeat, setCurrentSeat] = useState<SeatPerspectiveItem>(activeSeat);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showInfo, setShowInfo] = useState(true);
  const [mobileInfoOpen, setMobileInfoOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"seat" | "overview">(initialMode);
  const [curtainsOpen, setCurtainsOpen] = useState(initialMode !== "overview");
  const [houseLights, setHouseLights] = useState(false);

  // Group all seats by row label for navigation
  const { rowLabels, seatsByRow, maxCols } = useMemo(() => {
    const rowsMap = new Map<string, SeatPerspectiveItem[]>();
    let maxC = 1;

    allSeats.forEach((s) => {
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
    };
  }, [allSeats]);

  const totalRows = Math.max(rowLabels.length, 6);
  const totalCols = maxCols;

  const currentRowIndex = rowLabels.indexOf(currentSeat.rowLabel);
  const currentColIndex = currentSeat.seatNumber - 1;

  // Real-time camera target and head rotation refs
  const mouseRef = useRef({ x: 0, y: 0, isDragging: false, lastX: 0, lastY: 0 });
  const lookTargetRef = useRef({ yaw: 0, pitch: 0 });
  const lookCurrentRef = useRef({ yaw: 0, pitch: 0 });

  // Curtain & lights animated values refs
  const curtainCurRef = useRef(1.0); // 1 = open, 0 = closed
  const curtainOpenRef = useRef(1.0);
  const lightsIntensityRef = useRef(0.2); // ambient light multiplier

  // Camera flight state
  const cameraModeRef = useRef<"seat" | "overview" | "flight">("seat");
  const flightRef = useRef<{
    startTime: number;
    duration: number;
    startPos: THREE.Vector3;
    endPos: THREE.Vector3;
    startQuat: THREE.Quaternion;
    endQuat: THREE.Quaternion;
    onComplete?: () => void;
  } | null>(null);

  // Calculate chair X position including block corridor aisle shifts
  const getSeatChairX = useCallback(
    (colIdx: number, seat?: SeatPerspectiveItem) => {
      let x = (colIdx - (totalCols - 1) / 2) * SEAT_SPACING_X;
      if (seat && typeof seat.blockIndex === "number" && seat.totalBlocks && seat.totalBlocks > 1) {
        const centerBlock = (seat.totalBlocks - 1) / 2;
        x += (seat.blockIndex - centerBlock) * 1.3;
      }
      return x;
    },
    [totalCols]
  );

  // Calculate natural seated eye position (sitting forward on cushion, in front of backrest)
  const getSeatEyePosition = useCallback(
    (rowIdx: number, colIdx: number, seat?: SeatPerspectiveItem) => {
      const x = getSeatChairX(colIdx, seat);
      const safeRow = rowIdx >= 0 ? rowIdx : 3;
      const tierFloorY = safeRow * ROW_RISE - 0.5;
      const tierZ = safeRow * SEAT_SPACING_Z;

      // Eye is seated naturally on the cushion (z = tierZ - 0.08), eye level y = tierFloorY + 1.18m
      const z = tierZ - 0.08;
      const y = tierFloorY + 1.18;
      return new THREE.Vector3(x, y, z);
    },
    [getSeatChairX]
  );

  // Vantage Overview viewpoint: sweeping elevated panorama behind auditorium
  const getOverviewPosition = useCallback(() => {
    const z = totalRows * SEAT_SPACING_Z + 3.8;
    const y = totalRows * ROW_RISE + 3.2;
    return new THREE.Vector3(0, y, z);
  }, [totalRows]);

  // Vantage View Scoring Formula
  const viewMetrics = useMemo(() => {
    const eye = getSeatEyePosition(currentRowIndex, currentColIndex, currentSeat);
    const screenCenter = new THREE.Vector3(0, SCREEN_Y, SCREEN_Z);
    const dist = eye.distanceTo(screenCenter);

    // Horizontal angle off-center in degrees
    const hAngleRad = Math.atan2(Math.abs(eye.x), Math.max(0.1, eye.z - SCREEN_Z));
    const hAngleDeg = (hAngleRad * 180) / Math.PI;

    // Vertical elevation gaze in degrees
    const vAngleRad = Math.atan2(SCREEN_Y - eye.y, Math.max(0.1, eye.z - SCREEN_Z));
    const vAngleDeg = (vAngleRad * 180) / Math.PI;

    // Vantage scoring: ideal distance is ~0.95x screen width
    const idealDist = SCREEN_W * 0.95;
    const distScore = 1 - Math.min(1, Math.max(0, Math.abs(dist - idealDist) / idealDist));
    const hScore = 1 - Math.min(1, Math.max(0, hAngleRad / 0.65));
    const vScore = 1 - Math.min(1, Math.max(0, (vAngleRad - 0.12) / 0.42));

    const totalScore = Math.round(100 * (0.42 * hScore + 0.32 * distScore + 0.26 * vScore));

    let label = "Average";
    let badgeColor = "bg-amber-500/20 text-amber-300 border-amber-500/30";
    if (totalScore >= 94) {
      label = "Perfect Sweet Spot";
      badgeColor = "bg-emerald-500/20 text-emerald-300 border-emerald-500/30";
    } else if (totalScore >= 87) {
      label = "Excellent View";
      badgeColor = "bg-teal-500/20 text-teal-300 border-teal-500/30";
    } else if (totalScore >= 78) {
      label = "Very Good View";
      badgeColor = "bg-blue-500/20 text-blue-300 border-blue-500/30";
    } else if (totalScore >= 68) {
      label = "Good Sightline";
      badgeColor = "bg-amber-500/20 text-amber-300 border-amber-500/30";
    }

    return {
      distanceM: Number(dist.toFixed(1)),
      hAngle: Number(hAngleDeg.toFixed(1)),
      vAngle: Number(vAngleDeg.toFixed(1)),
      score: totalScore,
      label,
      badgeColor,
    };
  }, [currentRowIndex, currentColIndex, currentSeat, getSeatEyePosition]);

  // Sync curtains state to ref
  useEffect(() => {
    curtainOpenRef.current = curtainsOpen ? 1.0 : 0.0;
  }, [curtainsOpen]);

  // Sync house lights to ref
  useEffect(() => {
    lightsIntensityRef.current = houseLights ? 1.0 : 0.25;
  }, [houseLights]);

  // Seat switching trigger: start smooth camera flight
  useEffect(() => {
    if (viewMode === "seat") {
      const targetPos = getSeatEyePosition(currentRowIndex, currentColIndex, currentSeat);
      const screenCenter = new THREE.Vector3(0, SCREEN_Y, SCREEN_Z);
      const targetRotMatrix = new THREE.Matrix4().lookAt(targetPos, screenCenter, new THREE.Vector3(0, 1, 0));
      const targetQuat = new THREE.Quaternion().setFromRotationMatrix(targetRotMatrix);

      if (canvasRef.current) {
        flightRef.current = {
          startTime: performance.now(),
          duration: 650,
          startPos: flightRef.current ? flightRef.current.endPos.clone() : targetPos.clone(),
          endPos: targetPos,
          startQuat: targetQuat.clone(),
          endQuat: targetQuat,
          onComplete: () => {
            cameraModeRef.current = "seat";
            flightRef.current = null;
          },
        };
        cameraModeRef.current = "flight";
      }
      lookTargetRef.current = { yaw: 0, pitch: 0 };
    }
  }, [currentSeat, viewMode, currentRowIndex, currentColIndex, getSeatEyePosition]);

  // View Mode switching handler
  const handleToggleViewMode = () => {
    if (viewMode === "seat") {
      // Transition from Seat to Overview
      const overviewPos = getOverviewPosition();
      const screenCenter = new THREE.Vector3(0, SCREEN_Y * 0.7, SCREEN_Z + 2);
      const targetRotMatrix = new THREE.Matrix4().lookAt(overviewPos, screenCenter, new THREE.Vector3(0, 1, 0));
      const targetQuat = new THREE.Quaternion().setFromRotationMatrix(targetRotMatrix);

      flightRef.current = {
        startTime: performance.now(),
        duration: 850,
        startPos: getSeatEyePosition(currentRowIndex, currentColIndex, currentSeat),
        endPos: overviewPos,
        startQuat: targetQuat.clone(),
        endQuat: targetQuat,
        onComplete: () => {
          cameraModeRef.current = "overview";
          flightRef.current = null;
        },
      };
      cameraModeRef.current = "flight";
      setViewMode("overview");
      setCurtainsOpen(false); // Curtains close in overview
    } else {
      // Transition from Overview to Seat
      const seatPos = getSeatEyePosition(currentRowIndex, currentColIndex, currentSeat);
      const screenCenter = new THREE.Vector3(0, SCREEN_Y, SCREEN_Z);
      const targetRotMatrix = new THREE.Matrix4().lookAt(seatPos, screenCenter, new THREE.Vector3(0, 1, 0));
      const targetQuat = new THREE.Quaternion().setFromRotationMatrix(targetRotMatrix);

      flightRef.current = {
        startTime: performance.now(),
        duration: 900,
        startPos: getOverviewPosition(),
        endPos: seatPos,
        startQuat: targetQuat.clone(),
        endQuat: targetQuat,
        onComplete: () => {
          cameraModeRef.current = "seat";
          flightRef.current = null;
        },
      };
      cameraModeRef.current = "flight";
      setViewMode("seat");
      setCurtainsOpen(true); // Curtains open automatically when seated
    }
  };

  // Reset head gaze back to screen center
  const handleResetHead = () => {
    lookTargetRef.current = { yaw: 0, pitch: 0 };
  };

  // Pan gaze incrementally using D-Pad
  const handleNudgeGaze = (dYaw: number, dPitch: number) => {
    lookTargetRef.current = {
      yaw: THREE.MathUtils.clamp(lookTargetRef.current.yaw + dYaw, -Math.PI / 2.5, Math.PI / 2.5),
      pitch: THREE.MathUtils.clamp(lookTargetRef.current.pitch + dPitch, -Math.PI / 4, Math.PI / 4),
    };
  };

  // Main Three.js Scene Setup & Render Loop
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    // 1. WebGL Renderer
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: "high-performance",
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;

    // 2. Scene & Subtle Depth Fog (Vantage Cinema Atmosphere)
    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#0c0a0e");
    scene.fog = new THREE.FogExp2("#0e0a12", 0.008);

    // 3. Perspective Camera
    const camera = new THREE.PerspectiveCamera(80, width / height, 0.15, 140);
    const initPos = viewMode === "overview" ? getOverviewPosition() : getSeatEyePosition(currentRowIndex, currentColIndex, currentSeat);
    camera.position.copy(initPos);
    if (viewMode === "overview") {
      const screenTarget = new THREE.Vector3(0, SCREEN_Y * 0.65, SCREEN_Z + 1.5);
      const rotM = new THREE.Matrix4().lookAt(initPos, screenTarget, new THREE.Vector3(0, 1, 0));
      camera.quaternion.setFromRotationMatrix(rotM);
    }

    // 4. Vantage Balanced Cinema Lighting
    const ambientLight = new THREE.AmbientLight("#ffeacc", 0.85);
    scene.add(ambientLight);

    // Overhead cinema downlights (dimmable with house lights button)
    const downLight1 = new THREE.PointLight("#ffe0b2", 12, 32, 1.2);
    downLight1.position.set(0, 10, 3);
    scene.add(downLight1);

    const downLight2 = new THREE.PointLight("#ffe0b2", 10, 32, 1.2);
    downLight2.position.set(0, 11, totalRows * SEAT_SPACING_Z);
    scene.add(downLight2);

    // Screen projector glow bouncing back
    const screenGlowLight = new THREE.PointLight("#ffd1a4", 15, 45, 1.3);
    screenGlowLight.position.set(0, SCREEN_Y, SCREEN_Z + 1.8);
    scene.add(screenGlowLight);

    // Projection beam from rear booth
    const projectorBeam = new THREE.SpotLight("#d8e6ff", 10, 70, 0.38, 0.3, 1.1);
    projectorBeam.position.set(0, 11, totalRows * SEAT_SPACING_Z + 6);
    projectorBeam.target.position.set(0, SCREEN_Y, SCREEN_Z);
    scene.add(projectorBeam);
    scene.add(projectorBeam.target);

    // 5. Build Vantage Curved Cinema Screen (Cylindrical bow formula)
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

    // Screen Material (with movie banner or poster projection)
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
        emissiveIntensity: 0.7,
        roughness: 0.25,
        metalness: 0.0,
        side: THREE.BackSide,
      });
    } else {
      screenMat = new THREE.MeshStandardMaterial({
        color: "#f8f9fa",
        emissive: "#3b82f6",
        emissiveIntensity: 0.45,
        roughness: 0.3,
        metalness: 0.0,
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
      metalness: 0.72,
      roughness: 0.28,
    });
    const frameMesh = new THREE.Mesh(frameGeo, frameMat);
    frameMesh.position.set(0, 0, -0.15);
    screenGroup.add(frameMesh);

    // Vantage Proscenium: Animated Pleated Velvet Stage Curtains
    const curtainMat = new THREE.MeshStandardMaterial({
      color: "#7f1d1d", // Deep crimson velvet
      roughness: 0.9,
      metalness: 0.05,
    });

    // Left Curtain Group (pivoted on left)
    const curtainLGroup = new THREE.Group();
    curtainLGroup.position.set(-SCREEN_W / 2 - 0.2, 0, 0.32);

    const curtainFoldGeo = new THREE.CylinderGeometry(0.35, 0.44, SCREEN_H + 2.2, 14);
    const foldCount = 10;
    const foldSpacing = (SCREEN_W / 2 + 0.6) / foldCount;
    for (let c = 0; c < foldCount; c++) {
      const cMesh = new THREE.Mesh(curtainFoldGeo, curtainMat);
      cMesh.position.set(c * foldSpacing, 0, 0);
      curtainLGroup.add(cMesh);
    }
    screenGroup.add(curtainLGroup);

    // Right Curtain Group (pivoted on right)
    const curtainRGroup = new THREE.Group();
    curtainRGroup.position.set(SCREEN_W / 2 + 0.2, 0, 0.32);
    for (let c = 0; c < foldCount; c++) {
      const cMesh = new THREE.Mesh(curtainFoldGeo, curtainMat);
      cMesh.position.set(-c * foldSpacing, 0, 0);
      curtainRGroup.add(cMesh);
    }
    screenGroup.add(curtainRGroup);

    // Top velvet valance across proscenium
    const valanceGeo = new THREE.BoxGeometry(SCREEN_W + 4, 1.2, 0.5);
    const valanceMesh = new THREE.Mesh(valanceGeo, curtainMat);
    valanceMesh.position.set(0, SCREEN_H / 2 + 0.6, 0.35);
    screenGroup.add(valanceMesh);

    // Gold Proscenium Arch Trim
    const goldTrimGeo = new THREE.BoxGeometry(SCREEN_W + 4.2, 0.16, 0.55);
    const goldTrimMat = new THREE.MeshStandardMaterial({
      color: "#f59e0b",
      metalness: 0.78,
      roughness: 0.22,
    });
    const goldTrim = new THREE.Mesh(goldTrimGeo, goldTrimMat);
    goldTrim.position.set(0, SCREEN_H / 2 + 1.26, 0.38);
    screenGroup.add(goldTrim);

    scene.add(screenGroup);

    // 6. Build Stadium Risers (Floors & LED Steps)
    const hallWidth = Math.max(totalCols * SEAT_SPACING_X + 6, 22);
    const floorGroup = new THREE.Group();

    for (let r = 0; r < totalRows; r++) {
      const y = r * ROW_RISE - 0.5;
      const z = r * SEAT_SPACING_Z;

      // Tier floor slab
      const slabGeo = new THREE.BoxGeometry(hallWidth, 0.24, SEAT_SPACING_Z + 0.05);
      const slabMat = new THREE.MeshStandardMaterial({
        color: r % 2 === 0 ? "#121218" : "#0e0e14",
        roughness: 0.85,
      });
      const slab = new THREE.Mesh(slabGeo, slabMat);
      slab.position.set(0, y - 0.12, z);
      floorGroup.add(slab);

      // Glowing LED step runner on stair edge (Vantage signature amber)
      const ledGeo = new THREE.PlaneGeometry(hallWidth * 0.88, 0.04);
      const ledMat = new THREE.MeshStandardMaterial({
        color: "#ff6600",
        emissive: "#ff5500",
        emissiveIntensity: 2.8,
        transparent: true,
        opacity: 0.9,
      });
      const led = new THREE.Mesh(ledGeo, ledMat);
      led.rotation.x = -Math.PI / 2;
      led.position.set(0, y + 0.005, z - SEAT_SPACING_Z / 2 + 0.05);
      floorGroup.add(led);
    }
    scene.add(floorGroup);

    // 7. Chair Geometries & Materials
    const baseMat = new THREE.MeshStandardMaterial({ color: "#242430", metalness: 0.5, roughness: 0.3 });
    const armMat = new THREE.MeshStandardMaterial({ color: "#323240", roughness: 0.5 });

    // Standard Velvet Seat Material
    const standardCushionMat = new THREE.MeshStandardMaterial({
      color: "#991b1b", // Rich crimson
      emissive: "#450a0a",
      emissiveIntensity: 0.25,
      roughness: 0.55,
    });
    const standardBackMat = new THREE.MeshStandardMaterial({
      color: "#831818",
      roughness: 0.6,
    });

    // Active User Seat Highlight Material (Glowing Gold)
    const viewerCushionMat = new THREE.MeshStandardMaterial({
      color: "#facc15",
      emissive: "#eab308",
      emissiveIntensity: 0.65,
      roughness: 0.35,
    });
    const viewerBackMat = new THREE.MeshStandardMaterial({
      color: "#eab308",
      emissive: "#ca8a04",
      emissiveIntensity: 0.5,
      roughness: 0.4,
    });

    // Selected Seats Highlight Material (Emerald / Cyan)
    const selectedCushionMat = new THREE.MeshStandardMaterial({
      color: "#10b981",
      emissive: "#059669",
      emissiveIntensity: 0.55,
      roughness: 0.4,
    });
    const selectedBackMat = new THREE.MeshStandardMaterial({
      color: "#059669",
      roughness: 0.5,
    });

    // Couple Lounger Geometry (Double-Wide Plush Recliner)
    const coupleBackGeo = new THREE.BoxGeometry(1.65, 0.88, 0.16);
    const coupleCushionGeo = new THREE.BoxGeometry(1.60, 0.18, 0.56);
    const standardBackGeo = new THREE.BoxGeometry(0.74, 0.88, 0.14);
    const standardCushionGeo = new THREE.BoxGeometry(0.72, 0.16, 0.54);
    const armGeo = new THREE.BoxGeometry(0.12, 0.35, 0.5);
    const baseGeo = new THREE.CylinderGeometry(0.04, 0.05, 0.45, 8);

    // Build Chairs across Auditorium without any duplicate overlapping meshes
    const seatsGroup = new THREE.Group();
    const processedCouplePairs = new Set<string>();

    allSeats.forEach((seat) => {
      const rIdx = rowLabels.indexOf(seat.rowLabel);
      const safeRow = rIdx >= 0 ? rIdx : 3;
      const tierFloorY = safeRow * ROW_RISE - 0.5;
      const tierZ = safeRow * SEAT_SPACING_Z;

      if (seat.isCouple) {
        // Find couple pair (e.g. seats 1-2, 3-4, 5-6, 7-8, 9-10)
        const pairId = Math.floor((seat.seatNumber - 1) / 2);
        const pairKey = `${seat.rowLabel}-pair-${pairId}`;
        if (processedCouplePairs.has(pairKey)) return;
        processedCouplePairs.add(pairKey);

        const partnerNumber = seat.seatNumber % 2 === 1 ? seat.seatNumber + 1 : seat.seatNumber - 1;
        const partner = allSeats.find((s) => s.rowLabel === seat.rowLabel && s.seatNumber === partnerNumber);

        const isViewerPair =
          (seat.id === currentSeat.id || (seat.seatNumber === currentSeat.seatNumber && seat.rowLabel === currentSeat.rowLabel)) ||
          (partner && (partner.id === currentSeat.id || (partner.seatNumber === currentSeat.seatNumber && partner.rowLabel === currentSeat.rowLabel)));

        const isSelectedPair = selectedSeatIds.includes(seat.id) || (partner ? selectedSeatIds.includes(partner.id) : false);

        const cMat = isViewerPair ? viewerCushionMat : isSelectedPair ? selectedCushionMat : standardCushionMat;
        const bMat = isViewerPair ? viewerBackMat : isSelectedPair ? selectedBackMat : standardBackMat;

        const x1 = getSeatChairX(seat.seatNumber - 1, seat);
        const x2 = partner ? getSeatChairX(partner.seatNumber - 1, partner) : x1;
        const midX = (x1 + x2) / 2;

        const coupleChair = new THREE.Group();
        coupleChair.position.set(midX, tierFloorY, tierZ);

        // Backrest is BEHIND the cushion at +0.22z
        const back = new THREE.Mesh(coupleBackGeo, bMat);
        back.position.set(0, 0.68, 0.22);
        back.rotation.x = -0.08;
        coupleChair.add(back);

        // Cushion is FORWARD at -0.06z
        const cushion = new THREE.Mesh(coupleCushionGeo, cMat);
        cushion.position.set(0, 0.36, -0.06);
        coupleChair.add(cushion);

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
        const isViewerSeat = seat.id === currentSeat.id || (seat.seatNumber === currentSeat.seatNumber && seat.rowLabel === currentSeat.rowLabel);
        const isSelected = selectedSeatIds.includes(seat.id);

        const cMat = isViewerSeat ? viewerCushionMat : isSelected ? selectedCushionMat : standardCushionMat;
        const bMat = isViewerSeat ? viewerBackMat : isSelected ? selectedBackMat : standardBackMat;

        const seatX = getSeatChairX(seat.seatNumber - 1, seat);
        const chair = new THREE.Group();
        chair.position.set(seatX, tierFloorY, tierZ);

        // Backrest is BEHIND the cushion at +0.22z
        const back = new THREE.Mesh(standardBackGeo, bMat);
        back.position.set(0, 0.68, 0.22);
        back.rotation.x = -0.08;
        chair.add(back);

        // Cushion is FORWARD at -0.06z
        const cushion = new THREE.Mesh(standardCushionGeo, cMat);
        cushion.position.set(0, 0.36, -0.06);
        chair.add(cushion);

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

    // 8. Audience Spectators (Front rows for depth perspective)
    const audienceMat = new THREE.MeshStandardMaterial({ color: "#181822", roughness: 0.85 });
    const headGeo = new THREE.SphereGeometry(0.12, 12, 12);
    const bodyGeo = new THREE.CylinderGeometry(0.16, 0.22, 0.55, 10);
    const audienceGroup = new THREE.Group();

    allSeats.forEach((s) => {
      const rIdx = rowLabels.indexOf(s.rowLabel);
      if (rIdx < currentRowIndex && (s.seatNumber * 7) % 5 === 0) {
        const x = getSeatChairX(s.seatNumber - 1, s);
        const y = rIdx * ROW_RISE - 0.5;
        const z = rIdx * SEAT_SPACING_Z;

        const spectator = new THREE.Group();
        spectator.position.set(x, y, z - 0.06);

        const body = new THREE.Mesh(bodyGeo, audienceMat);
        body.position.set(0, 0.5, 0);
        spectator.add(body);

        const head = new THREE.Mesh(headGeo, audienceMat);
        head.position.set(0, 0.95, 0);
        spectator.add(head);

        audienceGroup.add(spectator);
      }
    });
    scene.add(audienceGroup);

    // 9. Side Walls & Architectural Acoustic Treatment
    const wallHalfW = hallWidth / 2;
    const wallDepth = totalRows * SEAT_SPACING_Z + 12;
    const wallGeo = new THREE.BoxGeometry(0.3, 14, wallDepth);
    const wallMat = new THREE.MeshStandardMaterial({
      color: "#1a1218",
      roughness: 0.85,
    });

    const leftWall = new THREE.Mesh(wallGeo, wallMat);
    leftWall.position.set(-wallHalfW, 6, wallDepth / 2 - 8);
    scene.add(leftWall);

    const rightWall = new THREE.Mesh(wallGeo, wallMat);
    rightWall.position.set(wallHalfW, 6, wallDepth / 2 - 8);
    scene.add(rightWall);

    // Vantage Luxury Acoustic Wall Slats & Gold Moldings
    const panelMat = new THREE.MeshStandardMaterial({
      color: "#3b1e28",
      roughness: 0.6,
    });
    const goldMoldingMat = new THREE.MeshStandardMaterial({
      color: "#f59e0b",
      metalness: 0.72,
      roughness: 0.28,
    });

    const panelCount = Math.max(4, Math.floor(totalRows / 1.5));
    for (let i = 0; i < panelCount; i++) {
      const zP = (i / (panelCount - 1 || 1)) * (wallDepth - 6) - 4;

      const panL = new THREE.Mesh(new THREE.BoxGeometry(0.12, 5.2, 1.4), panelMat);
      panL.position.set(-wallHalfW + 0.16, 4.0, zP);
      scene.add(panL);

      const panR = new THREE.Mesh(new THREE.BoxGeometry(0.12, 5.2, 1.4), panelMat);
      panR.position.set(wallHalfW - 0.16, 4.0, zP);
      scene.add(panR);

      const goldL = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.08, 1.45), goldMoldingMat);
      goldL.position.set(-wallHalfW + 0.18, 6.6, zP);
      scene.add(goldL);

      const goldR = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.08, 1.45), goldMoldingMat);
      goldR.position.set(wallHalfW - 0.18, 6.6, zP);
      scene.add(goldR);
    }

    // Wall Sconces - warm ambient decorative lights along the sides
    const sconceCount = Math.max(3, Math.floor(totalRows / 2));
    for (let i = 0; i < sconceCount; i++) {
      const zSconce = (i / (sconceCount - 1 || 1)) * (totalRows * SEAT_SPACING_Z) - 2;

      const sLightL = new THREE.PointLight("#ffdd99", 1.8, 12, 1.5);
      sLightL.position.set(-wallHalfW + 0.4, 4.2, zSconce);
      scene.add(sLightL);

      const sLightR = new THREE.PointLight("#ffdd99", 1.8, 12, 1.5);
      sLightR.position.set(wallHalfW - 0.4, 4.2, zSconce);
      scene.add(sLightR);
    }

    // 10. Animation & Render Loop
    let animationFrameId: number;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      // Animate curtains opening / closing smoothly
      curtainCurRef.current += (curtainOpenRef.current - curtainCurRef.current) * 0.06;
      const curtainScaleX = 1.0 - 0.9 * curtainCurRef.current;
      curtainLGroup.scale.x = curtainScaleX;
      curtainRGroup.scale.x = curtainScaleX;

      // Animate house lights
      const targetLight = lightsIntensityRef.current;
      ambientLight.intensity = THREE.MathUtils.lerp(ambientLight.intensity, targetLight, 0.05);
      downLight1.intensity = THREE.MathUtils.lerp(downLight1.intensity, targetLight * 14, 0.05);
      downLight2.intensity = THREE.MathUtils.lerp(downLight2.intensity, targetLight * 12, 0.05);

      // Screen glow scales with curtains parting
      screenGlowLight.intensity = 15 * curtainCurRef.current;

      // Handle Camera State Machine
      if (cameraModeRef.current === "flight" && flightRef.current) {
        const now = performance.now();
        const progress = THREE.MathUtils.clamp((now - flightRef.current.startTime) / flightRef.current.duration, 0, 1);
        const ease = progress < 0.5 ? 4 * progress * progress * progress : 1 - Math.pow(-2 * progress + 2, 3) / 2;

        camera.position.lerpVectors(flightRef.current.startPos, flightRef.current.endPos, ease);
        camera.quaternion.slerpQuaternions(flightRef.current.startQuat, flightRef.current.endQuat, ease);

        if (progress >= 1) {
          if (flightRef.current.onComplete) flightRef.current.onComplete();
        }
      } else if (cameraModeRef.current === "overview") {
        // Subtle overview breathing motion
        const time = performance.now() * 0.0004;
        const baseOverview = getOverviewPosition();
        camera.position.x = baseOverview.x + Math.sin(time) * 0.35;
        camera.position.y = baseOverview.y + Math.cos(time * 0.8) * 0.15;
        camera.position.z = baseOverview.z;

        const screenTarget = new THREE.Vector3(0, SCREEN_Y * 0.65, SCREEN_Z + 1.5);
        const rotM = new THREE.Matrix4().lookAt(camera.position, screenTarget, new THREE.Vector3(0, 1, 0));
        camera.quaternion.setFromRotationMatrix(rotM);
      } else {
        // First-Person Seated Mode with Neck Inertia Damping
        const seatEye = getSeatEyePosition(currentRowIndex, currentColIndex, currentSeat);
        camera.position.copy(seatEye);

        lookCurrentRef.current.yaw = THREE.MathUtils.lerp(lookCurrentRef.current.yaw, lookTargetRef.current.yaw, 0.18);
        lookCurrentRef.current.pitch = THREE.MathUtils.lerp(lookCurrentRef.current.pitch, lookTargetRef.current.pitch, 0.18);

        const screenTarget = new THREE.Vector3(0, SCREEN_Y, SCREEN_Z);
        const baseRotM = new THREE.Matrix4().lookAt(seatEye, screenTarget, new THREE.Vector3(0, 1, 0));
        const baseQuat = new THREE.Quaternion().setFromRotationMatrix(baseRotM);

        const yawQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), lookCurrentRef.current.yaw);
        const pitchQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), lookCurrentRef.current.pitch);

        camera.quaternion.copy(baseQuat).multiply(yawQuat).multiply(pitchQuat);
      }

      renderer.render(scene, camera);
    };

    animate();

    // 11. Mouse & Touch Event Handlers for Looking Around
    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      if (cameraModeRef.current !== "seat") return;
      mouseRef.current.isDragging = true;
      const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
      const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
      mouseRef.current.lastX = clientX;
      mouseRef.current.lastY = clientY;
    };

    const handlePointerMove = (e: MouseEvent | TouchEvent) => {
      if (!mouseRef.current.isDragging || cameraModeRef.current !== "seat") return;
      const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
      const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;

      const deltaX = clientX - mouseRef.current.lastX;
      const deltaY = clientY - mouseRef.current.lastY;

      mouseRef.current.lastX = clientX;
      mouseRef.current.lastY = clientY;

      const sensitivity = 0.0035;
      lookTargetRef.current.yaw = THREE.MathUtils.clamp(
        lookTargetRef.current.yaw - deltaX * sensitivity,
        -Math.PI / 2.5,
        Math.PI / 2.5
      );
      lookTargetRef.current.pitch = THREE.MathUtils.clamp(
        lookTargetRef.current.pitch + deltaY * sensitivity,
        -Math.PI / 4,
        Math.PI / 4
      );
    };

    const handlePointerUp = () => {
      mouseRef.current.isDragging = false;
    };

    const domElement = renderer.domElement;
    domElement.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("mousemove", handlePointerMove);
    window.addEventListener("mouseup", handlePointerUp);

    domElement.addEventListener("touchstart", handlePointerDown, { passive: true });
    window.addEventListener("touchmove", handlePointerMove, { passive: true });
    window.addEventListener("touchend", handlePointerUp);

    // 12. Resize Listener
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", handleResize);

    // Cleanup on unmount
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", handleResize);

      domElement.removeEventListener("mousedown", handlePointerDown);
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
    currentRowIndex,
    currentColIndex,
    getSeatChairX,
    getSeatEyePosition,
    getOverviewPosition,
  ]);

  // Keyboard navigation shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowLeft") {
        handlePrevSeat();
      } else if (e.key === "ArrowRight") {
        handleNextSeat();
      } else if (e.key === "c" || e.key === "C") {
        setCurtainsOpen((prev) => !prev);
      } else if (e.key === "l" || e.key === "L") {
        setHouseLights((prev) => !prev);
      } else if (e.key === "v" || e.key === "V") {
        handleToggleViewMode();
      } else if (e.key === " ") {
        handleToggleSelect();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentSeat, seatsByRow, rowLabels, viewMode]);

  // Previous seat navigation
  const handlePrevSeat = () => {
    const rowSeats = seatsByRow.get(currentSeat.rowLabel) || [];
    const currentIdx = rowSeats.findIndex((s) => s.id === currentSeat.id);
    if (currentIdx > 0) {
      setCurrentSeat(rowSeats[currentIdx - 1]);
    } else {
      const prevRowIdx = rowLabels.indexOf(currentSeat.rowLabel) - 1;
      if (prevRowIdx >= 0) {
        const prevRowSeats = seatsByRow.get(rowLabels[prevRowIdx]) || [];
        if (prevRowSeats.length > 0) {
          setCurrentSeat(prevRowSeats[prevRowSeats.length - 1]);
        }
      }
    }
  };

  // Next seat navigation
  const handleNextSeat = () => {
    const rowSeats = seatsByRow.get(currentSeat.rowLabel) || [];
    const currentIdx = rowSeats.findIndex((s) => s.id === currentSeat.id);
    if (currentIdx < rowSeats.length - 1) {
      setCurrentSeat(rowSeats[currentIdx + 1]);
    } else {
      const nextRowIdx = rowLabels.indexOf(currentSeat.rowLabel) + 1;
      if (nextRowIdx < rowLabels.length) {
        const nextRowSeats = seatsByRow.get(rowLabels[nextRowIdx]) || [];
        if (nextRowSeats.length > 0) {
          setCurrentSeat(nextRowSeats[0]);
        }
      }
    }
  };

  // Toggle selection for current seat
  const isSelected = selectedSeatIds.includes(currentSeat.id);
  const handleToggleSelect = () => {
    if (isSelected) {
      onDeselectSeat?.(currentSeat.id);
    } else {
      onSelectSeat?.(currentSeat.id);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col select-none overflow-hidden font-sans">
      {/* 3D Canvas Viewport */}
      <div
        ref={containerRef}
        className="relative flex-1 w-full h-full overflow-hidden bg-[#0c0a0e] cursor-grab active:cursor-grabbing"
      >
        <canvas ref={canvasRef} className="w-full h-full block" />

        {/* Responsive Header Bar */}
        <div className="absolute top-0 inset-x-0 p-2.5 sm:p-4 flex items-center justify-between bg-gradient-to-b from-black/90 via-black/50 to-transparent pointer-events-none z-30">
          {/* Mobile Header Left */}
          <div className="flex sm:hidden items-center gap-2 pointer-events-auto min-w-0">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-white truncate">
                  Seat {currentSeat.label}
                </span>
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/30 shrink-0">
                  {viewMode === "seat" ? "Seat" : "Hall"}
                </span>
              </div>
              <p className="text-[10px] text-white/50 truncate max-w-[110px]">
                {movieTitle}
              </p>
            </div>
          </div>

          {/* Desktop Header Left */}
          <div className="hidden sm:flex items-center gap-3 pointer-events-auto">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500/30 to-amber-600/10 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-lg shadow-amber-500/10">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white tracking-wide">
                  Vantage 3D Perspective
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold">
                  {viewMode === "seat" ? "Seat Eye View" : "Auditorium Mode"}
                </span>
              </div>
              <p className="text-[11px] text-white/60">
                {cinemaName} • {screenName} • {movieTitle}
              </p>
            </div>
          </div>

          {/* Mobile Header Right (Icon-only, compact & never overflows) */}
          <div className="flex sm:hidden items-center gap-1.5 pointer-events-auto shrink-0">
            <button
              type="button"
              onClick={handleToggleViewMode}
              className="p-2 rounded-lg bg-black/50 text-white/90 border border-white/15 active:scale-95 transition"
              title={viewMode === "seat" ? "Hall Overview" : "Sit in Seat"}
            >
              <Eye className="w-4 h-4 text-amber-400" />
            </button>
            <button
              type="button"
              onClick={() => setCurtainsOpen((prev) => !prev)}
              className={`p-2 rounded-lg border active:scale-95 transition ${
                curtainsOpen
                  ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                  : "bg-black/50 text-white/70 border-white/15"
              }`}
              title="Toggle Curtains"
            >
              <span className="text-[11px] font-bold">C</span>
            </button>
            <button
              type="button"
              onClick={handleResetHead}
              className="p-2 rounded-lg bg-black/50 text-white/80 border border-white/15 active:scale-95 transition"
              title="Center View"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setMobileInfoOpen((prev) => !prev)}
              className="p-2 rounded-lg bg-black/50 text-white/80 border border-white/15 active:scale-95 transition"
              title="Sightline Info"
            >
              <Info className="w-4 h-4 text-amber-300" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg bg-white/15 hover:bg-red-500/80 active:bg-red-600 text-white transition ml-1"
              title="Exit (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Desktop Header Right */}
          <div className="hidden sm:flex items-center gap-2 pointer-events-auto">
            <button
              type="button"
              onClick={handleToggleViewMode}
              className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-xs font-semibold text-white border border-white/15 transition cursor-pointer flex items-center gap-1.5"
              title="Toggle between Seat View and Overview"
            >
              <Eye className="w-3.5 h-3.5 text-amber-400" />
              <span>{viewMode === "seat" ? "Hall Overview" : "Sit in Seat"}</span>
            </button>
            <button
              type="button"
              onClick={() => setCurtainsOpen((prev) => !prev)}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition cursor-pointer flex items-center gap-1.5 ${
                curtainsOpen
                  ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                  : "bg-white/10 text-white/70 border-white/15 hover:text-white"
              }`}
              title="Toggle Curtains (C)"
            >
              <span>Curtains: {curtainsOpen ? "Open" : "Closed"}</span>
            </button>
            <button
              type="button"
              onClick={() => setHouseLights((prev) => !prev)}
              className="p-2 rounded-xl bg-black/40 hover:bg-white/10 text-white/70 hover:text-white border border-white/10 transition cursor-pointer"
              title="Toggle House Lights (L)"
            >
              {houseLights ? <Sun className="w-4 h-4 text-amber-300" /> : <Moon className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={handleResetHead}
              className="p-2 rounded-xl bg-black/40 hover:bg-white/10 text-white/70 hover:text-white border border-white/10 transition cursor-pointer flex items-center gap-1.5 text-xs font-medium"
              title="Center View to Screen"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Center</span>
            </button>
            <button
              type="button"
              onClick={() => setShowInfo((prev) => !prev)}
              className="p-2 rounded-xl bg-black/40 hover:bg-white/10 text-white/70 hover:text-white border border-white/10 transition cursor-pointer"
              title="Toggle HUD Info"
            >
              <Info className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setIsFullscreen((prev) => !prev)}
              className="p-2 rounded-xl bg-black/40 hover:bg-white/10 text-white/70 hover:text-white border border-white/10 transition cursor-pointer"
              title="Toggle Fullscreen"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-white/10 hover:bg-red-500/80 active:bg-red-600 text-white transition cursor-pointer"
              title="Exit 3D View (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Mobile Mini Floating Sightline Chip (Unobtrusive & Sleek) */}
        <div className="sm:hidden absolute top-14 left-2.5 z-20 pointer-events-auto">
          <button
            type="button"
            onClick={() => setMobileInfoOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/75 backdrop-blur-md border border-white/20 text-[11px] text-white shadow-lg active:scale-95 transition"
          >
            <Sparkles className="w-3 h-3 text-amber-400" />
            <span className="font-extrabold text-amber-400">{viewMetrics.score}%</span>
            <span className="text-white/40">•</span>
            <span className="font-semibold text-emerald-300">{viewMetrics.label}</span>
            <span className="text-white/40">•</span>
            <span className="text-white/70 font-mono">{viewMetrics.distanceM}m</span>
          </button>
        </div>

        {/* Mobile Expandable Full Sightline Sheet */}
        {mobileInfoOpen && (
          <div className="sm:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
            <div className="w-full max-w-xs bg-slate-950/95 border border-white/20 rounded-2xl p-4 text-white shadow-2xl space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-amber-400 font-bold flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    <span>Sightline Rating</span>
                  </div>
                  <div className="text-sm font-extrabold text-white mt-0.5">
                    Seat {currentSeat.label} {currentSeat.isCouple && "• Couple Lounger"}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-black text-amber-400">{viewMetrics.score}%</div>
                  <div className="text-[9px] text-white/50">Score</div>
                </div>
              </div>

              <div className={`px-2.5 py-1.5 rounded-xl border text-xs font-bold text-center ${viewMetrics.badgeColor}`}>
                {viewMetrics.label}
              </div>

              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="bg-white/5 p-2 rounded-xl">
                  <span className="text-[9px] text-white/50 block">Distance</span>
                  <span className="font-bold font-mono">{viewMetrics.distanceM}m</span>
                </div>
                <div className="bg-white/5 p-2 rounded-xl">
                  <span className="text-[9px] text-white/50 block">Off-Center</span>
                  <span className="font-bold font-mono">{viewMetrics.hAngle}°</span>
                </div>
                <div className="bg-white/5 p-2 rounded-xl">
                  <span className="text-[9px] text-white/50 block">Elevation</span>
                  <span className="font-bold font-mono">{viewMetrics.vAngle}°</span>
                </div>
              </div>

              <div className="text-[11px] text-amber-300 font-semibold text-center bg-white/5 py-1.5 rounded-xl">
                ★★★★★ Dolby Atmos Sweet Spot
              </div>

              <button
                type="button"
                onClick={() => setMobileInfoOpen(false)}
                className="w-full py-2 bg-white/10 hover:bg-white/20 active:scale-95 rounded-xl font-bold text-xs text-white transition"
              >
                Close Details
              </button>
            </div>
          </div>
        )}

        {/* Desktop Floating Vantage Sightline HUD */}
        {showInfo && (
          <div className="hidden sm:block absolute top-20 left-4 z-10 pointer-events-none max-w-sm">
            <div className="p-3.5 rounded-2xl bg-black/75 backdrop-blur-md border border-white/15 text-white shadow-2xl space-y-3 pointer-events-auto">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-amber-400 font-bold flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    <span>Vantage Sightline Rating</span>
                  </div>
                  <div className="text-base font-extrabold text-white flex items-center gap-2 mt-0.5">
                    <span>Seat {currentSeat.label}</span>
                    {currentSeat.isCouple && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-300 border border-pink-500/30 font-semibold">
                        Couple Lounger
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-2xl font-black text-amber-400 leading-none">
                    {viewMetrics.score}%
                  </div>
                  <div className="text-[10px] text-white/60 mt-0.5">Score</div>
                </div>
              </div>

              <div
                className={`px-2.5 py-1.5 rounded-xl border text-xs font-bold text-center tracking-wide ${viewMetrics.badgeColor}`}
              >
                {viewMetrics.label}
              </div>

              <div className="grid grid-cols-3 gap-2 pt-1 border-t border-white/10 text-center">
                <div className="bg-white/5 p-2 rounded-xl">
                  <span className="text-[10px] text-white/50 block font-medium">Distance</span>
                  <span className="text-xs font-bold text-white font-mono">
                    {viewMetrics.distanceM}m
                  </span>
                </div>
                <div className="bg-white/5 p-2 rounded-xl">
                  <span className="text-[10px] text-white/50 block font-medium">Off-Center</span>
                  <span className="text-xs font-bold text-white font-mono">
                    {viewMetrics.hAngle}°
                  </span>
                </div>
                <div className="bg-white/5 p-2 rounded-xl">
                  <span className="text-[10px] text-white/50 block font-medium">Elevation</span>
                  <span className="text-xs font-bold text-white font-mono">
                    {viewMetrics.vAngle}°
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] text-white/60 bg-white/5 px-2.5 py-1.5 rounded-xl">
                <span>Sound Field</span>
                <span className="text-amber-300 font-semibold">★★★★★ Atmos Sweet Spot</span>
              </div>
            </div>
          </div>
        )}

        {/* On-Screen D-Pad Navigation Overlay */}
        {viewMode === "seat" && (
          <div className="absolute right-4 bottom-20 z-10 pointer-events-auto hidden sm:flex flex-col items-center p-2 rounded-2xl bg-black/60 backdrop-blur-md border border-white/15 shadow-xl">
            <button
              type="button"
              onClick={() => handleNudgeGaze(0, -0.1)}
              className="p-1.5 rounded-lg hover:bg-white/15 active:bg-white/25 text-white/80 hover:text-white transition cursor-pointer"
              title="Look Up"
            >
              <ChevronUp className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => handleNudgeGaze(0.12, 0)}
                className="p-1.5 rounded-lg hover:bg-white/15 active:bg-white/25 text-white/80 hover:text-white transition cursor-pointer"
                title="Look Left"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={handleResetHead}
                className="w-7 h-7 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 active:scale-95 text-amber-300 flex items-center justify-center font-bold text-[10px] transition cursor-pointer border border-amber-500/40"
                title="Center Gaze"
              >
                ●
              </button>
              <button
                type="button"
                onClick={() => handleNudgeGaze(-0.12, 0)}
                className="p-1.5 rounded-lg hover:bg-white/15 active:bg-white/25 text-white/80 hover:text-white transition cursor-pointer"
                title="Look Right"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
            <button
              type="button"
              onClick={() => handleNudgeGaze(0, 0.1)}
              className="p-1.5 rounded-lg hover:bg-white/15 active:bg-white/25 text-white/80 hover:text-white transition cursor-pointer"
              title="Look Down"
            >
              <ChevronDown className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Bottom Interactive Navigation & Booking Bar */}
        <div className="absolute bottom-0 inset-x-0 p-2 sm:p-4 pb-[max(0.6rem,env(safe-area-inset-bottom))] bg-gradient-to-t from-black/95 via-black/70 to-transparent pointer-events-none z-30">
          {/* Mobile Bottom Bar: Single Unified Compact Row */}
          <div className="sm:hidden flex items-center gap-1.5 pointer-events-auto bg-black/85 backdrop-blur-md p-2 rounded-2xl border border-white/15 shadow-2xl">
            <button
              onClick={handlePrevSeat}
              className="p-2 rounded-xl bg-white/10 active:bg-white/25 text-white shrink-0"
              title="Previous Seat"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {/* Row Selector & Seat Number */}
            <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-xl px-2 py-1 shrink-0">
              <select
                value={currentSeat.rowLabel}
                onChange={(e) => {
                  const targetRow = seatsByRow.get(e.target.value);
                  if (targetRow && targetRow.length > 0) {
                    setCurrentSeat(targetRow[0]);
                  }
                }}
                className="bg-transparent text-amber-400 font-bold text-xs outline-none cursor-pointer"
              >
                {rowLabels.map((r) => (
                  <option key={r} value={r} className="bg-slate-900 text-white">
                    {r}
                  </option>
                ))}
              </select>
              <span className="text-white/40 text-[10px]">•</span>
              <span className="text-white font-mono font-black text-xs">
                {currentSeat.seatNumber}
              </span>
            </div>

            <button
              onClick={handleNextSeat}
              className="p-2 rounded-xl bg-white/10 active:bg-white/25 text-white shrink-0"
              title="Next Seat"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            {/* Select / Book Button */}
            <button
              type="button"
              onClick={handleToggleSelect}
              className={`flex-1 py-2 px-2.5 rounded-xl font-bold text-xs transition cursor-pointer flex items-center justify-center gap-1.5 truncate shadow-lg ${
                isSelected
                  ? "bg-emerald-600 active:bg-emerald-700 text-white border border-emerald-400/40"
                  : "bg-[#7B1E3D] active:bg-[#5C0F2A] text-white border border-[#7B1E3D]/50"
              }`}
            >
              {isSelected ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-200 shrink-0" />
                  <span className="truncate">Selected</span>
                </>
              ) : (
                <>
                  <Eye className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">Select {currentSeat.label}</span>
                </>
              )}
            </button>
          </div>

          {/* Desktop Bottom Bar */}
          <div className="hidden sm:flex max-w-3xl mx-auto flex-row items-center justify-between gap-3 pointer-events-auto bg-black/75 backdrop-blur-md p-3.5 rounded-2xl border border-white/15 shadow-2xl">
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrevSeat}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/15 active:bg-white/20 text-white transition cursor-pointer border border-white/10"
                title="Previous Seat (Left Arrow)"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-2">
                <div className="px-3 py-1.5 rounded-xl bg-amber-500/20 border border-amber-500/40 text-center">
                  <span className="text-[10px] text-amber-300/70 uppercase block font-semibold">
                    Row
                  </span>
                  <span className="text-base font-black text-amber-400 font-mono">
                    {currentSeat.rowLabel}
                  </span>
                </div>

                <div className="px-3 py-1.5 rounded-xl bg-amber-500/20 border border-amber-500/40 text-center">
                  <span className="text-[10px] text-amber-300/70 uppercase block font-semibold">
                    Seat
                  </span>
                  <span className="text-base font-black text-amber-400 font-mono">
                    {currentSeat.seatNumber}
                  </span>
                </div>

                <div className="pl-2 text-left">
                  <span className="text-xs font-bold text-white block">
                    Seat {currentSeat.label}
                  </span>
                  <span className="text-[11px] text-white/50">
                    {currentSeat.tierName || "Prime"}
                  </span>
                </div>
              </div>

              <button
                onClick={handleNextSeat}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/15 active:bg-white/20 text-white transition cursor-pointer border border-white/10"
                title="Next Seat (Right Arrow)"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={currentSeat.rowLabel}
                onChange={(e) => {
                  const targetRow = seatsByRow.get(e.target.value);
                  if (targetRow && targetRow.length > 0) {
                    setCurrentSeat(targetRow[0]);
                  }
                }}
                className="bg-white/10 hover:bg-white/15 text-white text-xs font-semibold px-2.5 py-2.5 rounded-xl border border-white/15 cursor-pointer outline-none"
              >
                {rowLabels.map((r) => (
                  <option key={r} value={r} className="bg-slate-900 text-white">
                    Row {r}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={handleToggleSelect}
                className={`px-6 py-2.5 rounded-xl font-bold text-xs transition cursor-pointer flex items-center justify-center gap-2 shadow-lg ${
                  isSelected
                    ? "bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-400/40"
                    : "bg-[#7B1E3D] hover:bg-[#922549] active:bg-[#5C0F2A] text-white border border-[#7B1E3D]/50"
                }`}
              >
                {isSelected ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                    <span>Selected (Tap to Remove)</span>
                  </>
                ) : (
                  <>
                    <Eye className="w-4 h-4" />
                    <span>Select Seat {currentSeat.label}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
