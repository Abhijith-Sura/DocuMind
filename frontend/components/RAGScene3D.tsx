/**
 * RAGScene3D — Interactive 3D RAG Pipeline Visualization (Light Theme)
 *
 * Vanilla Three.js (no @react-three/fiber — avoids reconciler crash)
 *
 * Visualizes the document intelligence pipeline:
 *  • Translucent document pages floating left    → uploaded PDFs
 *  • Central AI processing sphere                → BGE-M3 embedder
 *  • Vector nodes (octahedrons) floating right   → ChromaDB knowledge store
 *  • Particle streams flowing docs→orb→nodes     → data pipeline
 *  • Soft connection lines between all elements
 *
 * Colors: Teal (#0d9488), Blue (#3b82f6), Indigo (#6366f1), Light
 * Mouse parallax: Camera follows cursor smoothly
 */
"use client";
import { useEffect, useRef } from "react";
import * as THREE from "three";

export default function RAGScene3D({
  style,
  className,
}: {
  style?: React.CSSProperties;
  className?: string;
}) {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    /* ── Renderer ─────────────────────────────── */
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.8));
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setClearColor(0x000000, 0); // transparent — lets light BG show through
    container.appendChild(renderer.domElement);

    /* ── Scene & Camera ───────────────────────── */
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, container.clientWidth / container.clientHeight, 0.1, 100);
    camera.position.set(0, 0, 9);

    /* ── Lights (soft, diffused for light theme) ─ */
    scene.add(new THREE.AmbientLight(0xffffff, 0.6));

    const keyLight = new THREE.DirectionalLight(0xffffff, 0.7);
    keyLight.position.set(2, 3, 5);
    scene.add(keyLight);

    const tealLight = new THREE.PointLight(0x0d9488, 3, 14);
    tealLight.position.set(-3, 1, 3);
    scene.add(tealLight);

    const blueLight = new THREE.PointLight(0x3b82f6, 3, 14);
    blueLight.position.set(3, -1, 2);
    scene.add(blueLight);

    const indigoLight = new THREE.PointLight(0x6366f1, 2, 12);
    indigoLight.position.set(0, 2, 4);
    scene.add(indigoLight);

    /* ── Helper: translucent material ─────────── */
    const softMat = (hex: number, opacity = 0.35, emissiveI = 0.15) =>
      new THREE.MeshStandardMaterial({
        color: hex,
        emissive: hex,
        emissiveIntensity: emissiveI,
        roughness: 0.6,
        metalness: 0.05,
        transparent: true,
        opacity,
        side: THREE.DoubleSide,
      });

    /* ── Document Pages (left cluster) ────────── */
    const DOC_CONFIGS = [
      { pos: [-3.4, 0.8, -0.3], color: 0x0d9488, scale: 1.0 },
      { pos: [-2.6, -0.5, 0.5], color: 0x14b8a6, scale: 0.9 },
      { pos: [-3.8, -0.2, 0.9], color: 0x2dd4bf, scale: 0.85 },
      { pos: [-2.9, 1.1, -0.9], color: 0x0d9488, scale: 0.95 },
      { pos: [-3.2, -1.1, -0.1], color: 0x5eead4, scale: 0.8 },
    ];

    const docGroup: { mesh: THREE.Group; offset: number; baseY: number }[] = [];
    for (const cfg of DOC_CONFIGS) {
      const group = new THREE.Group();
      group.position.set(...(cfg.pos as [number, number, number]));

      // Main page
      const page = new THREE.Mesh(
        new THREE.PlaneGeometry(0.7 * cfg.scale, 0.95 * cfg.scale),
        softMat(cfg.color, 0.3, 0.1)
      );
      group.add(page);

      // Page lines (fake text lines)
      for (let i = 0; i < 5; i++) {
        const line = new THREE.Mesh(
          new THREE.PlaneGeometry(0.45 * cfg.scale * (0.5 + Math.random() * 0.5), 0.012),
          new THREE.MeshBasicMaterial({ color: cfg.color, transparent: true, opacity: 0.2 })
        );
        line.position.set(-0.05 * cfg.scale, 0.28 * cfg.scale - i * 0.12 * cfg.scale, 0.001);
        group.add(line);
      }

      // Soft edge glow
      const edges = new THREE.LineSegments(
        new THREE.EdgesGeometry(new THREE.PlaneGeometry(0.7 * cfg.scale, 0.95 * cfg.scale)),
        new THREE.LineBasicMaterial({ color: cfg.color, transparent: true, opacity: 0.25 })
      );
      group.add(edges);

      scene.add(group);
      docGroup.push({ mesh: group, offset: Math.random() * Math.PI * 2, baseY: cfg.pos[1] });
    }

    /* ── Central AI Orb ───────────────────────── */
    const orbMat = new THREE.MeshStandardMaterial({
      color: 0x6366f1,
      emissive: 0x4f46e5,
      emissiveIntensity: 0.3,
      roughness: 0.15,
      metalness: 0.2,
      transparent: true,
      opacity: 0.45,
    });
    const orb = new THREE.Mesh(new THREE.SphereGeometry(0.5, 48, 48), orbMat);
    scene.add(orb);

    // Inner bright core
    const core = new THREE.Mesh(
      new THREE.SphereGeometry(0.2, 32, 32),
      new THREE.MeshStandardMaterial({ color: 0x0d9488, emissive: 0x0d9488, emissiveIntensity: 0.8, transparent: true, opacity: 0.6 })
    );
    scene.add(core);

    // Orbital ring 1
    const ring1 = new THREE.Mesh(
      new THREE.TorusGeometry(0.78, 0.008, 8, 80),
      new THREE.MeshStandardMaterial({ color: 0x0d9488, emissive: 0x0d9488, emissiveIntensity: 0.6, transparent: true, opacity: 0.35 })
    );
    ring1.rotation.x = Math.PI / 2;
    scene.add(ring1);

    // Orbital ring 2
    const ring2 = new THREE.Mesh(
      new THREE.TorusGeometry(1.0, 0.006, 8, 80),
      new THREE.MeshStandardMaterial({ color: 0x3b82f6, emissive: 0x3b82f6, emissiveIntensity: 0.5, transparent: true, opacity: 0.25 })
    );
    ring2.rotation.set(Math.PI / 3, 0.5, 0);
    scene.add(ring2);

    /* ── Knowledge Nodes (right cluster) ──────── */
    const KNOW_CONFIGS = [
      { pos: [3.0, 0.7, 0.2], color: 0x3b82f6, r: 0.13 },
      { pos: [2.5, -0.4, -0.5], color: 0x2563eb, r: 0.10 },
      { pos: [3.6, -0.2, 0.7], color: 0x60a5fa, r: 0.12 },
      { pos: [2.8, 1.1, -0.8], color: 0x3b82f6, r: 0.09 },
      { pos: [3.2, -1.0, 0.1], color: 0x93c5fd, r: 0.11 },
      { pos: [2.3, 0.2, 1.0], color: 0x2563eb, r: 0.08 },
    ];

    const knowGroup: { mesh: THREE.Mesh; offset: number; baseY: number }[] = [];
    for (const cfg of KNOW_CONFIGS) {
      const mesh = new THREE.Mesh(
        new THREE.OctahedronGeometry(cfg.r, 0),
        softMat(cfg.color, 0.5, 0.3)
      );
      mesh.position.set(...(cfg.pos as [number, number, number]));
      scene.add(mesh);
      knowGroup.push({ mesh, offset: Math.random() * Math.PI * 2, baseY: cfg.pos[1] });
    }

    /* ── Connection Lines ─────────────────────── */
    const lineMat = (hex: number, op: number) =>
      new THREE.LineBasicMaterial({ color: hex, transparent: true, opacity: op });

    const addLine = (a: number[], b: number[], hex: number, op = 0.1) => {
      const geo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(...(a as [number, number, number])),
        new THREE.Vector3(...(b as [number, number, number])),
      ]);
      scene.add(new THREE.Line(geo, lineMat(hex, op)));
    };

    // Docs → orb
    for (const cfg of DOC_CONFIGS) addLine(cfg.pos, [0, 0, 0], 0x0d9488, 0.08);
    // Orb → knowledge
    for (const cfg of KNOW_CONFIGS) addLine([0, 0, 0], cfg.pos, 0x3b82f6, 0.08);
    // Knowledge internal
    const pairs = [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [0, 3], [1, 4]];
    for (const [a, b] of pairs) addLine(KNOW_CONFIGS[a].pos, KNOW_CONFIGS[b].pos, 0x60a5fa, 0.06);

    /* ── Particle Streams ─────────────────────── */
    const PCOUNT = 12;

    interface StreamDef { from: number[]; to: number[]; color: number }
    const STREAMS: StreamDef[] = [
      ...DOC_CONFIGS.slice(0, 3).map(d => ({ from: d.pos, to: [0, 0, 0], color: 0x0d9488 })),
      ...KNOW_CONFIGS.slice(0, 4).map(k => ({ from: [0, 0, 0], to: k.pos, color: 0x3b82f6 })),
    ];

    const streamData = STREAMS.map(s => {
      const offsets = Array.from({ length: PCOUNT }, () => Math.random());
      const positions = new Float32Array(PCOUNT * 3);
      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      const pts = new THREE.Points(
        geo,
        new THREE.PointsMaterial({ color: s.color, size: 0.04, transparent: true, opacity: 0.55, sizeAttenuation: true })
      );
      scene.add(pts);
      return { ...s, offsets, geo };
    });

    /* ── Ambient Dust Particles ───────────────── */
    const dustCount = 160;
    const dustPos = new Float32Array(dustCount * 3);
    for (let i = 0; i < dustCount; i++) {
      dustPos[i * 3] = (Math.random() - 0.5) * 16;
      dustPos[i * 3 + 1] = (Math.random() - 0.5) * 10;
      dustPos[i * 3 + 2] = (Math.random() - 0.5) * 6 - 2;
    }
    const dustGeo = new THREE.BufferGeometry();
    dustGeo.setAttribute("position", new THREE.BufferAttribute(dustPos, 3));
    scene.add(new THREE.Points(dustGeo, new THREE.PointsMaterial({
      color: 0x94a3b8, size: 0.02, transparent: true, opacity: 0.3, sizeAttenuation: true
    })));

    /* ── Mouse Parallax ───────────────────────── */
    const mouse = { x: 0, y: 0 };
    const onMouseMove = (e: MouseEvent) => {
      mouse.x = (e.clientX / window.innerWidth - 0.5) * 2;
      mouse.y = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    window.addEventListener("mousemove", onMouseMove);

    /* ── Resize ───────────────────────────────── */
    const onResize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", onResize);

    /* ── Animation Loop ───────────────────────── */
    let rafId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      rafId = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();

      // Camera parallax
      camera.position.x += (mouse.x * 1.2 - camera.position.x) * 0.035;
      camera.position.y += (-mouse.y * 0.8 - camera.position.y) * 0.035;
      camera.lookAt(0, 0, 0);

      // Orb slow rotation + float
      orb.rotation.y = t * 0.18;
      orb.rotation.z = t * 0.06;
      orb.position.y = Math.sin(t * 0.5) * 0.1;
      core.position.y = orb.position.y;

      // Rings
      ring1.rotation.z = t * 0.25;
      ring2.rotation.y = t * 0.15;

      // Doc pages float + gentle tilt
      for (const { mesh, offset, baseY } of docGroup) {
        mesh.position.y = baseY + Math.sin(t * 0.35 + offset) * 0.18;
        mesh.rotation.y = Math.sin(t * 0.22 + offset) * 0.12;
        mesh.rotation.x = Math.sin(t * 0.18 + offset + 1) * 0.06;
        mesh.rotation.z = Math.sin(t * 0.15 + offset) * 0.04;
      }

      // Knowledge nodes float + pulse + spin
      for (const { mesh, offset, baseY } of knowGroup) {
        mesh.position.y = baseY + Math.sin(t * 0.42 + offset) * 0.12;
        mesh.rotation.y = t * 0.35 + offset;
        const s = 1 + Math.sin(t * 1.0 + offset) * 0.06;
        mesh.scale.setScalar(s);
      }

      // Particle streams
      for (const sd of streamData) {
        const pos = sd.geo.attributes.position.array as Float32Array;
        for (let i = 0; i < PCOUNT; i++) {
          const p = ((t * 0.38 + sd.offsets[i]) % 1);
          const arc = Math.sin(p * Math.PI) * 0.15;
          pos[i * 3] = sd.from[0] + (sd.to[0] - sd.from[0]) * p;
          pos[i * 3 + 1] = sd.from[1] + (sd.to[1] - sd.from[1]) * p + arc;
          pos[i * 3 + 2] = sd.from[2] + (sd.to[2] - sd.from[2]) * p;
        }
        sd.geo.attributes.position.needsUpdate = true;
      }

      // Dust drift
      const dp = dustGeo.attributes.position.array as Float32Array;
      for (let i = 0; i < dustCount; i++) {
        dp[i * 3 + 1] += 0.0006;
        if (dp[i * 3 + 1] > 5) dp[i * 3 + 1] = -5;
      }
      dustGeo.attributes.position.needsUpdate = true;

      renderer.render(scene, camera);
    };

    animate();

    /* ── Cleanup ──────────────────────────────── */
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("resize", onResize);
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div
      ref={mountRef}
      className={className}
      style={{ width: "100%", height: "100%", ...style }}
    />
  );
}
