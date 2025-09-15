"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";

/** --------- Types --------- */
type Settings = {
  particleCount: number;
  velocityCap: number;
  repulsionRadius: number;
  attractionRadius: number;
  cohesionForce: number;
  friction: number;
  randomForce: number;
  rotationSpeed: number;
  trailOpacity: number;
  backgroundColor: string;
  swarmColor: string;
  shape: "circle" | "square" | "line" | "customSVG";
  svgPathData: string;
};

type PresetMap = Record<string, Settings>;

/** --------- Local Storage Helpers --------- */
const LS_KEY = "swarm_presets_v1";

function loadPresetMap(): PresetMap {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? (JSON.parse(raw) as PresetMap) : {};
  } catch {
    return {};
  }
}

function savePresetMap(map: PresetMap) {
  localStorage.setItem(LS_KEY, JSON.stringify(map));
}

/** --------- Component --------- */
const SwarmApp = () => {
  // Simulation settings state
  const [particleCount, setParticleCount] = useState(2222);
  const [velocityCap, setVelocityCap] = useState(1.5);
  const [repulsionRadius, setRepulsionRadius] = useState(40.0);
  const [attractionRadius, setAttractionRadius] = useState(120.0);
  const [cohesionForce, setCohesionForce] = useState(0.005);
  const [friction, setFriction] = useState(0.98);
  const [randomForce, setRandomForce] = useState(0.01);
  const [rotationSpeed, setRotationSpeed] = useState(0.02);
  const [trailOpacity, setTrailOpacity] = useState(0.05);
  const [backgroundColor, setBackgroundColor] = useState("#000000");
  const [swarmColor, setSwarmColor] = useState("#FF69B4");
  const [shape, setShape] = useState<Settings["shape"]>("line");
  const [svgPathData, setSvgPathData] = useState("M0 -1 L1 0 L0 1");
  const [svgError, setSvgError] = useState("");

  function Toggle({
    checked,
    onChange,
    label,
  }: { checked: boolean; onChange: () => void; label?: string }) {
    return (
      <label className="flex items-center gap-2 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={checked}
          onChange={onChange}
          className="h-4 w-4 rounded border-gray-300 text-indigo-600"
        />
        {label ? <span className="text-xs text-gray-400">{label}</span> : null}
      </label>
    );
  }

  function NumberField({
    label,
    value,
    setValue,
    min,
    max,
    step,
    randomizable,
    onToggleRandom,
    defaultValue,
  }: {
    label: string;
    value: number;
    setValue: (n: number) => void;
    min: number;
    max: number;
    step: number;
    randomizable: boolean;
    onToggleRandom: () => void;
    defaultValue: number;
  }) {
    return (
      <div className="mb-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-400">{label}</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setValue(defaultValue)}
              className="text-xs text-gray-300 hover:text-white px-2 py-1 rounded border border-zinc-700 hover:border-zinc-500"
              title="Reset to default"
            >
              Reset
            </button>
            <Toggle checked={randomizable} onChange={onToggleRandom} label="Randomize" />
          </div>
        </div>

        <div className="mt-2 grid grid-cols-[1fr,5rem] gap-3">
          <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={(e) => setValue(Number(e.target.value))}
            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:bg-indigo-600 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:-mt-1"
          />
          <input
            type="number"
            value={Number.isFinite(value) ? value : 0}
            min={min}
            max={max}
            step={step}
            onChange={(e) => setValue(Number(e.target.value))}
            className="w-full bg-zinc-800 text-white text-sm rounded px-2 py-1 border border-zinc-700"
          />
        </div>
      </div>
    );
  }

  const DEFAULTS = {
    particleCount: 2222,
    velocityCap: 1.5,
    repulsionRadius: 40.0,
    attractionRadius: 120.0,
    cohesionForce: 0.005,
    friction: 0.98,
    randomForce: 0.01,
    rotationSpeed: 0.02,
    trailOpacity: 0.05,
    backgroundColor: "#000000",
    swarmColor: "#FF69B4",
    shape: "line" as const,
    svgPathData: "M0 -1 L1 0 L0 1",
  };

  // UI state
  const [activeTab, setActiveTab] =
    useState<"presets" | "motion" | "forces" | "visuals">("presets");
  const [isSaving, setIsSaving] = useState(false);
  const [isMessageVisible, setIsMessageVisible] = useState(false);
  const [message, setMessage] = useState("");
  const [presetName, setPresetName] = useState("");
  const [presets, setPresets] = useState<{ id: string }[]>([]);
  const [randomizerOptions, setRandomizerOptions] = useState({
    particleCount: true,
    velocityCap: true,
    repulsionRadius: true,
    attractionRadius: true,
    cohesionForce: true,
    friction: true,
    randomForce: true,
    rotationSpeed: true,
    trailOpacity: true,
    backgroundColor: true,
    swarmColor: true,
    shape: true,
    svgPathData: true,
  });

  // Canvas and animation state
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const particles = useRef<
    { x: number; y: number; vx: number; vy: number; rotation: number }[]
  >([]);
  const animationFrameId = useRef<number | null>(null);
  const customSVGPath2D = useRef<Path2D | null>(null);

  /** ------- Messaging ------- */
  const showMessage = (msg: string, duration = 3000) => {
    setMessage(msg);
    setIsMessageVisible(true);
    window.setTimeout(() => setIsMessageVisible(false), duration);
  };

  /** ------- Presets (LocalStorage) ------- */
  const currentSettings = useCallback((): Settings => {
    return {
      particleCount,
      velocityCap,
      repulsionRadius,
      attractionRadius,
      cohesionForce,
      friction,
      randomForce,
      rotationSpeed,
      trailOpacity,
      backgroundColor,
      swarmColor,
      shape,
      svgPathData,
    };
  }, [
    particleCount,
    velocityCap,
    repulsionRadius,
    attractionRadius,
    cohesionForce,
    friction,
    randomForce,
    rotationSpeed,
    trailOpacity,
    backgroundColor,
    swarmColor,
    shape,
    svgPathData,
  ]);

  const applyPreset = useCallback((s: Settings) => {
    setParticleCount(s.particleCount);
    setVelocityCap(s.velocityCap);
    setRepulsionRadius(s.repulsionRadius);
    setAttractionRadius(s.attractionRadius);
    setCohesionForce(s.cohesionForce);
    setFriction(s.friction);
    setRandomForce(s.randomForce);
    setRotationSpeed(s.rotationSpeed);
    setTrailOpacity(s.trailOpacity);
    setBackgroundColor(s.backgroundColor);
    setSwarmColor(s.swarmColor);
    setShape(s.shape);
    setSvgPathData(s.svgPathData);
  }, []);

  const refreshPresetList = () => {
    const map = loadPresetMap();
    const ids = Object.keys(map).sort((a, b) => a.localeCompare(b));
    setPresets(ids.map((id) => ({ id })));
  };

  useEffect(() => {
    refreshPresetList();
    const map = loadPresetMap();
    if (map.default) {
      applyPreset(map.default);
      showMessage("Loaded default preset.");
    }
  }, [applyPreset]);

  const saveSettings = useCallback(async () => {
    if (!presetName.trim()) {
      showMessage("Please enter a preset name.");
      return;
    }
    setIsSaving(true);
    try {
      const map = loadPresetMap();
      map[presetName.trim()] = currentSettings();
      savePresetMap(map);
      refreshPresetList();
      setPresetName("");
      showMessage(`Preset "${presetName}" saved!`);
    } catch {
      showMessage("Error saving preset.");
    } finally {
      setIsSaving(false);
    }
  }, [presetName, currentSettings]);

  const loadPreset = useCallback(
    (id: string) => {
      const map = loadPresetMap();
      const p = map[id];
      if (p) {
        applyPreset(p);
        showMessage(`Loaded preset: ${id}`);
      } else {
        showMessage("Preset not found.");
      }
    },
    [applyPreset]
  );

  const deletePreset = useCallback((id: string) => {
    const map = loadPresetMap();
    if (map[id]) {
      delete map[id];
      savePresetMap(map);
      refreshPresetList();
      showMessage(`Preset "${id}" deleted.`);
    }
  }, []);

  const exportPresets = () => {
    const map = loadPresetMap();
    const blob = new Blob([JSON.stringify(map, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "swarm-presets.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const importPresets = async (file: File | null) => {
    if (!file) return;
    try {
      const text = await file.text();
      const incoming = JSON.parse(text) as PresetMap;
      const map = loadPresetMap();
      const merged: PresetMap = { ...map, ...incoming };
      savePresetMap(merged);
      refreshPresetList();
      showMessage("Presets imported.");
    } catch {
      showMessage("Import failed. Not a valid JSON presets file.");
    }
  };

  /** ------- SVG Path validation ------- */
  const handleSvgChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const pathData = e.target.value;
    setSvgPathData(pathData);
    try {
      new Path2D(pathData);
      setSvgError("");
    } catch {
      setSvgError("Invalid SVG path data. Example: M0 -1 L1 0 L0 1");
    }
  };

  useEffect(() => {
    if (shape === "customSVG") {
      try {
        const path = new Path2D(svgPathData);
        customSVGPath2D.current = path;
        setSvgError("");
      } catch {
        customSVGPath2D.current = null;
        setSvgError("Invalid SVG path data. Example: M0 -1 L1 0 L0 1");
      }
    }
  }, [shape, svgPathData]);

  /** ------- Randomize ------- */
  const randomizeSettings = useCallback(() => {
    const randHex = () =>
      "#" + Math.floor(Math.random() * 16777215).toString(16).padStart(6, "0");

    const newSettings: Settings = {
      particleCount: randomizerOptions.particleCount
        ? Math.floor(Math.random() * 4000) + 1000
        : particleCount,
      velocityCap: randomizerOptions.velocityCap
        ? Math.random() * 2 + 0.5
        : velocityCap,
      repulsionRadius: randomizerOptions.repulsionRadius
        ? Math.random() * 80 + 20
        : repulsionRadius,
      attractionRadius: randomizerOptions.attractionRadius
        ? Math.random() * 200 + 80
        : attractionRadius,
      cohesionForce: randomizerOptions.cohesionForce
        ? Math.random() * 0.01 + 0.001
        : cohesionForce,
      friction: randomizerOptions.friction ? Math.random() * 0.1 + 0.9 : friction,
      randomForce: randomizerOptions.randomForce
        ? Math.random() * 0.02 + 0.005
        : randomForce,
      rotationSpeed: randomizerOptions.rotationSpeed
        ? Math.random() * 0.05
        : rotationSpeed,
      trailOpacity: randomizerOptions.trailOpacity
        ? Math.random() * 0.1
        : trailOpacity,
      backgroundColor: randomizerOptions.backgroundColor ? randHex() : backgroundColor,
      swarmColor: randomizerOptions.swarmColor ? randHex() : swarmColor,
      shape: randomizerOptions.shape
        ? (["circle", "square", "line", "customSVG"][
            Math.floor(Math.random() * 4)
          ] as Settings["shape"])
        : shape,
      svgPathData: randomizerOptions.svgPathData
        ? `M${Math.random() * 2} ${Math.random() * 2} L${
            Math.random() * 2
          } ${Math.random() * 2} L${Math.random() * 2} ${Math.random() * 2}`
        : svgPathData,
    };

    applyPreset(newSettings);
  }, [
    randomizerOptions,
    particleCount,
    velocityCap,
    repulsionRadius,
    attractionRadius,
    cohesionForce,
    friction,
    randomForce,
    rotationSpeed,
    trailOpacity,
    backgroundColor,
    swarmColor,
    shape,
    svgPathData,
    applyPreset,
  ]);

  /** ------- Canvas & Animation ------- */
  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    let dpr = window.devicePixelRatio || 1;
    let width = 0,
      height = 0;

    const resizeCanvas = () => {
      dpr = window.devicePixelRatio || 1;
      width = canvas.parentElement!.clientWidth;
      height = canvas.parentElement!.clientHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = width + "px";
      canvas.style.height = height + "px";
    };

    const initParticles = () => {
      particles.current = Array.from({ length: particleCount }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: 0,
        vy: 0,
        rotation: Math.random() * Math.PI * 2,
      }));
    };

    const draw = () => {
      // background trail fade
      const r = parseInt(backgroundColor.slice(1, 3), 16);
      const g = parseInt(backgroundColor.slice(3, 5), 16);
      const b = parseInt(backgroundColor.slice(5, 7), 16);
      ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${trailOpacity})`;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      for (let i = 0; i < particles.current.length; i++) {
        const p1 = particles.current[i];
        let fx = 0,
          fy = 0;

        for (let j = 0; j < particles.current.length; j++) {
          if (i === j) continue;
          const p2 = particles.current[j];
          const dx = p2.x - p1.x;
          const dy = p2.y - p1.y;
          const d = Math.hypot(dx, dy);

          if (d > 0) {
            if (d < repulsionRadius) {
              const repul = (repulsionRadius - d) / repulsionRadius;
              fx -= (dx / d) * repul;
              fy -= (dy / d) * repul;
            } else if (d < attractionRadius) {
              const attr =
                (d - repulsionRadius) / (attractionRadius - repulsionRadius);
              fx += (dx / d) * attr * cohesionForce;
              fy += (dy / d) * attr * cohesionForce;
            }
          }
        }

        // Apply forces + random jitter
        p1.vx += fx + (Math.random() - 0.5) * randomForce;
        p1.vy += fy + (Math.random() - 0.5) * randomForce;

        // Friction (damping)
        p1.vx *= friction;
        p1.vy *= friction;

        // Velocity cap
        const speed = Math.hypot(p1.vx, p1.vy);
        if (speed > velocityCap) {
          const ratio = velocityCap / speed;
          p1.vx *= ratio;
          p1.vy *= ratio;
        }

        p1.x += p1.vx;
        p1.y += p1.vy;
        p1.rotation += rotationSpeed;

        // Wrap
        if (p1.x < 0) p1.x += width;
        if (p1.x > width) p1.x -= width;
        if (p1.y < 0) p1.y += height;
        if (p1.y > height) p1.y -= height;

        // Draw
        ctx.fillStyle = swarmColor;
        ctx.save();
        ctx.translate(p1.x * dpr, p1.y * dpr);
        ctx.rotate(p1.rotation);

        const size = dpr;
        if (shape === "circle") {
          ctx.beginPath();
          ctx.arc(0, 0, size, 0, Math.PI * 2);
          ctx.fill();
        } else if (shape === "square") {
          ctx.fillRect(-size, -size, size * 2, size * 2);
        } else if (shape === "line") {
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(0, -size * 4);
          ctx.strokeStyle = swarmColor;
          ctx.lineWidth = size * 0.5;
          ctx.stroke();
        } else if (shape === "customSVG" && customSVGPath2D.current) {
          ctx.scale(size * 5, size * 5);
          ctx.fill(customSVGPath2D.current);
        }
        ctx.restore();
      }

      animationFrameId.current = requestAnimationFrame(draw);
    };

    resizeCanvas();
    initParticles();
    window.addEventListener("resize", resizeCanvas);
    animationFrameId.current = requestAnimationFrame(draw);

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
    };
  }, [
    particleCount,
    velocityCap,
    repulsionRadius,
    attractionRadius,
    cohesionForce,
    friction,
    randomForce,
    rotationSpeed,
    trailOpacity,
    backgroundColor,
    swarmColor,
    shape,
    svgPathData,
  ]);

  /** ------- RETURN UI (this was missing) ------- */
  return (
    <>
      {/* Canvas */}
      <div className="relative bg-black h-full w-full">
        <canvas ref={canvasRef} className="w-full h-full" />
      </div>

      {/* Control Panel */}
      <div className="bg-zinc-900 w-full lg:w-96 flex-shrink-0 p-6 overflow-y-auto border-l border-zinc-700">
        <h1 className="text-3xl font-bold mb-4 text-yellow-300">Swarm Controls</h1>

        {/* Tabs */}
        <div className="mb-6 grid grid-cols-3 gap-2">
          <button
            onClick={() => setActiveTab("presets")}
            className={`py-2 rounded text-sm ${
              activeTab === "presets"
                ? "bg-zinc-700 text-white"
                : "bg-zinc-800 text-gray-300 hover:bg-zinc-700"
            }`}
          >
            Presets
          </button>
          <button
            onClick={() => setActiveTab("motion")}
            className={`py-2 rounded text-sm ${
              activeTab === "motion"
                ? "bg-zinc-700 text-white"
                : "bg-zinc-800 text-gray-300 hover:bg-zinc-700"
            }`}
          >
            Motion
          </button>
          <button
            onClick={() => setActiveTab("forces")}
            className={`py-2 rounded text-sm ${
              activeTab === "forces"
                ? "bg-zinc-700 text-white"
                : "bg-zinc-800 text-gray-300 hover:bg-zinc-700"
            }`}
          >
            Forces
          </button>
          <button
            onClick={() => setActiveTab("visuals")}
            className={`col-span-3 py-2 rounded text-sm ${
              activeTab === "visuals"
                ? "bg-zinc-700 text-white"
                : "bg-zinc-800 text-gray-300 hover:bg-zinc-700"
            }`}
          >
            Visuals
          </button>
        </div>

        {/* --- PRESETS TAB --- */}
        {activeTab === "presets" && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-3 text-white">Presets</h2>
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={presetName}
                onChange={(e) => setPresetName(e.target.value)}
                placeholder="Enter preset name"
                className="flex-1 px-3 py-2 bg-zinc-800 rounded-lg text-white placeholder-zinc-500 border border-zinc-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button
                onClick={saveSettings}
                disabled={isSaving}
                className="bg-green-600 hover:bg-green-700 text-white font-bold px-3 rounded-lg disabled:bg-green-400"
              >
                Save
              </button>
            </div>

            <div className="flex items-center gap-2 mb-4">
              <button
                onClick={exportPresets}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold py-2 px-3 rounded"
              >
                Export All
              </button>
              <label className="text-xs text-white bg-zinc-800 hover:bg-zinc-700 py-2 px-3 rounded cursor-pointer">
                Import
                <input
                  type="file"
                  accept="application/json"
                  className="hidden"
                  onChange={(e) => importPresets(e.target.files?.[0] ?? null)}
                />
              </label>
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto">
              {presets.length > 0 ? (
                presets.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between bg-zinc-800 p-3 rounded-lg border border-zinc-700"
                  >
                    <span className="text-sm truncate">{p.id}</span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => loadPreset(p.id)}
                        className="text-indigo-400 hover:text-indigo-300 text-xs"
                      >
                        Load
                      </button>
                      <button
                        onClick={() => deletePreset(p.id)}
                        className="text-red-400 hover:text-red-300 text-xs"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500">No presets saved yet.</p>
              )}
            </div>
          </div>
        )}

        {/* --- MOTION TAB --- */}
        {activeTab === "motion" && (
          <div>
            <NumberField
              label="Particle Count"
              value={particleCount}
              setValue={setParticleCount}
              min={100}
              max={10000}
              step={10}
              randomizable={randomizerOptions.particleCount}
              onToggleRandom={() =>
                setRandomizerOptions({
                  ...randomizerOptions,
                  particleCount: !randomizerOptions.particleCount,
                })
              }
              defaultValue={DEFAULTS.particleCount}
            />
            <NumberField
              label="Velocity Cap"
              value={velocityCap}
              setValue={setVelocityCap}
              min={0.1}
              max={5}
              step={0.001}
              randomizable={randomizerOptions.velocityCap}
              onToggleRandom={() =>
                setRandomizerOptions({
                  ...randomizerOptions,
                  velocityCap: !randomizerOptions.velocityCap,
                })
              }
              defaultValue={DEFAULTS.velocityCap}
            />
            <NumberField
              label="Rotation Speed"
              value={rotationSpeed}
              setValue={setRotationSpeed}
              min={0}
              max={0.2}
              step={0.001}
              randomizable={randomizerOptions.rotationSpeed}
              onToggleRandom={() =>
                setRandomizerOptions({
                  ...randomizerOptions,
                  rotationSpeed: !randomizerOptions.rotationSpeed,
                })
              }
              defaultValue={DEFAULTS.rotationSpeed}
            />
            <NumberField
              label="Trail Opacity"
              value={trailOpacity}
              setValue={setTrailOpacity}
              min={0}
              max={1}
              step={0.001}
              randomizable={randomizerOptions.trailOpacity}
              onToggleRandom={() =>
                setRandomizerOptions({
                  ...randomizerOptions,
                  trailOpacity: !randomizerOptions.trailOpacity,
                })
              }
              defaultValue={DEFAULTS.trailOpacity}
            />
            <div className="mt-4">
              <button
                onClick={randomizeSettings}
                className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 px-4 rounded-lg shadow"
              >
                Randomize Selected
              </button>
            </div>
          </div>
        )}

        {/* --- FORCES TAB --- */}
        {activeTab === "forces" && (
          <div>
            <NumberField
              label="Repulsion Radius"
              value={repulsionRadius}
              setValue={setRepulsionRadius}
              min={10}
              max={100}
              step={0.001}
              randomizable={randomizerOptions.repulsionRadius}
              onToggleRandom={() =>
                setRandomizerOptions({
                  ...randomizerOptions,
                  repulsionRadius: !randomizerOptions.repulsionRadius,
                })
              }
              defaultValue={DEFAULTS.repulsionRadius}
            />
            <NumberField
              label="Attraction Radius"
              value={attractionRadius}
              setValue={setAttractionRadius}
              min={10}
              max={500}
              step={0.001}
              randomizable={randomizerOptions.attractionRadius}
              onToggleRandom={() =>
                setRandomizerOptions({
                  ...randomizerOptions,
                  attractionRadius: !randomizerOptions.attractionRadius,
                })
              }
              defaultValue={DEFAULTS.attractionRadius}
            />
            <NumberField
              label="Cohesion Force"
              value={cohesionForce}
              setValue={setCohesionForce}
              min={0.001}
              max={0.05}
              step={0.0001}
              randomizable={randomizerOptions.cohesionForce}
              onToggleRandom={() =>
                setRandomizerOptions({
                  ...randomizerOptions,
                  cohesionForce: !randomizerOptions.cohesionForce,
                })
              }
              defaultValue={DEFAULTS.cohesionForce}
            />
            <NumberField
              label="Friction"
              value={friction}
              setValue={setFriction}
              min={0.9}
              max={0.999}
              step={0.001}
              randomizable={randomizerOptions.friction}
              onToggleRandom={() =>
                setRandomizerOptions({
                  ...randomizerOptions,
                  friction: !randomizerOptions.friction,
                })
              }
              defaultValue={DEFAULTS.friction}
            />
            <NumberField
              label="Random Force"
              value={randomForce}
              setValue={setRandomForce}
              min={0.001}
              max={0.1}
              step={0.001}
              randomizable={randomizerOptions.randomForce}
              onToggleRandom={() =>
                setRandomizerOptions({
                  ...randomizerOptions,
                  randomForce: !randomizerOptions.randomForce,
                })
              }
              defaultValue={DEFAULTS.randomForce}
            />
          </div>
        )}

        {/* --- VISUALS TAB --- */}
        {activeTab === "visuals" && (
          <div>
            <div className="mb-4">
              <div className="flex justify-between items-center mb-1">
                <label className="text-sm font-medium text-gray-400">
                  Background Color
                </label>
                <Toggle
                  checked={randomizerOptions.backgroundColor}
                  onChange={() =>
                    setRandomizerOptions({
                      ...randomizerOptions,
                      backgroundColor: !randomizerOptions.backgroundColor,
                    })
                  }
                  label="Randomize"
                />
              </div>
              <input
                type="color"
                value={backgroundColor}
                onChange={(e) => setBackgroundColor(e.target.value)}
                className="w-full h-10 appearance-none rounded-lg cursor-pointer"
              />
            </div>

            <div className="mb-4">
              <div className="flex justify-between items-center mb-1">
                <label className="text-sm font-medium text-gray-400">
                  Swarm Color
                </label>
                <Toggle
                  checked={randomizerOptions.swarmColor}
                  onChange={() =>
                    setRandomizerOptions({
                      ...randomizerOptions,
                      swarmColor: !randomizerOptions.swarmColor,
                    })
                  }
                  label="Randomize"
                />
              </div>
              <input
                type="color"
                value={swarmColor}
                onChange={(e) => setSwarmColor(e.target.value)}
                className="w-full h-10 appearance-none rounded-lg cursor-pointer"
              />
            </div>

            <div className="mb-4">
              <div className="flex justify-between items-center mb-1">
                <label className="text-sm font-medium text-gray-400">Shape</label>
                <Toggle
                  checked={randomizerOptions.shape}
                  onChange={() =>
                    setRandomizerOptions({
                      ...randomizerOptions,
                      shape: !randomizerOptions.shape,
                    })
                  }
                  label="Randomize"
                />
              </div>
              <select
                value={shape}
                onChange={(e) => setShape(e.target.value as typeof DEFAULTS.shape)}
                className="w-full px-3 py-2 bg-zinc-800 rounded-lg text-white border border-zinc-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="circle">Circle</option>
                <option value="square">Square</option>
                <option value="line">Line</option>
                <option value="customSVG">Custom SVG</option>
              </select>
            </div>

            {shape === "customSVG" && (
              <div className="mb-4">
                <div className="flex justify-between items-center mb-1">
                  <label className="text-sm font-medium text-gray-400">
                    SVG Path
                  </label>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={randomizerOptions.svgPathData}
                      onChange={() =>
                        setRandomizerOptions({
                          ...randomizerOptions,
                          svgPathData: !randomizerOptions.svgPathData,
                        })
                      }
                      className="form-checkbox h-4 w-4 text-indigo-600 rounded border-gray-300"
                    />
                    <span className="ml-2 text-xs text-gray-500">Randomize</span>
                  </div>
                </div>

                <input
                  type="text"
                  value={svgPathData}
                  onChange={handleSvgChange}
                  className="w-full px-3 py-2 bg-zinc-800 rounded-lg text-white placeholder-zinc-500 border border-zinc-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="e.g., M0 -1 L1 0 L0 1"
                />
                {svgError && (
                  <p className="text-red-400 text-xs mt-2">{svgError}</p>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Message */}
      <div
        className={`fixed bottom-4 left-1/2 -translate-x-1/2 transform transition-opacity duration-300 p-4 bg-green-500 text-white rounded-lg shadow-xl ${
          isMessageVisible ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        {message}
      </div>
    </>
  );
};

export default SwarmApp;
