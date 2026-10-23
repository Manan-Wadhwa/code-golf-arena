"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";

export function GolfBallScene() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [webglSupported, setWebglSupported] = useState(true);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Check WebGL availability
    try {
      const testCanvas = document.createElement("canvas");
      const gl =
        testCanvas.getContext("webgl") ||
        testCanvas.getContext("experimental-webgl");
      if (!gl) {
        setWebglSupported(false);
        return;
      }
    } catch {
      setWebglSupported(false);
      return;
    }

    let isVisible = true;
    let animationFrameId: number;

    // Check prefers-reduced-motion
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    // Scene & Camera
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      38,
      container.clientWidth / container.clientHeight,
      0.1,
      50,
    );
    camera.position.set(0, 0, 4.4);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    container.appendChild(renderer.domElement);

    // Environment map using PMREMGenerator & studio softboxes
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    pmremGenerator.compileEquirectangularShader();

    const envScene = new THREE.Scene();
    // Warm softbox 1
    const softbox1 = new THREE.Mesh(
      new THREE.PlaneGeometry(6, 6),
      new THREE.MeshBasicMaterial({ color: 0xfffae6, side: THREE.DoubleSide }),
    );
    softbox1.position.set(4, 5, 3);
    softbox1.lookAt(0, 0, 0);
    envScene.add(softbox1);

    // Softbox 2 (cooler rim)
    const softbox2 = new THREE.Mesh(
      new THREE.PlaneGeometry(5, 5),
      new THREE.MeshBasicMaterial({ color: 0xcde0d3, side: THREE.DoubleSide }),
    );
    softbox2.position.set(-5, -2, -3);
    softbox2.lookAt(0, 0, 0);
    envScene.add(softbox2);

    // Softbox 3 (overhead gold bounce)
    const softbox3 = new THREE.Mesh(
      new THREE.PlaneGeometry(4, 4),
      new THREE.MeshBasicMaterial({ color: 0xf5df88, side: THREE.DoubleSide }),
    );
    softbox3.position.set(0, 6, 0);
    softbox3.lookAt(0, 0, 0);
    envScene.add(softbox3);

    const envTexture = pmremGenerator.fromScene(envScene).texture;
    scene.environment = envTexture;

    // Build Golf Ball with Fibonacci Dimples
    const ballRadius = 1.32;
    // Subdivision 5 gives 10242 uniformly spaced vertices
    const sphereGeo = new THREE.IcosahedronGeometry(ballRadius, 5);

    // Generate ~360 dimple centers on unit sphere via Fibonacci spiral
    const dimpleCount = 360;
    const dimpleCenters: THREE.Vector3[] = [];
    const phi = Math.PI * (3 - Math.sqrt(5)); // Golden angle

    for (let i = 0; i < dimpleCount; i++) {
      const y = 1 - (i / (dimpleCount - 1)) * 2;
      const radiusAtY = Math.sqrt(Math.max(0, 1 - y * y));
      const theta = phi * i;
      const x = Math.cos(theta) * radiusAtY;
      const z = Math.sin(theta) * radiusAtY;
      dimpleCenters.push(new THREE.Vector3(x, y, z));
    }

    // Sort dimple centers by Y for binary/window search acceleration
    dimpleCenters.sort((a, b) => a.y - b.y);

    const positions = sphereGeo.attributes.position;
    const vertex = new THREE.Vector3();
    const unitV = new THREE.Vector3();
    const dimpleRadiusAngle = 0.088; // angular radius in radians
    const maxDepth = ballRadius * 0.042; // indentation depth

    for (let i = 0; i < positions.count; i++) {
      vertex.fromBufferAttribute(positions, i);
      unitV.copy(vertex).normalize();

      // Find nearest dimple center within window
      let minAngularDist = 999;
      for (let j = 0; j < dimpleCenters.length; j++) {
        const center = dimpleCenters[j];
        if (center.y - unitV.y > dimpleRadiusAngle) break;
        if (unitV.y - center.y > dimpleRadiusAngle) continue;

        const dist = unitV.distanceTo(center);
        if (dist < minAngularDist) {
          minAngularDist = dist;
        }
      }

      // If vertex falls within a dimple, indent smoothly
      if (minAngularDist < dimpleRadiusAngle) {
        const factor = Math.cos(
          (minAngularDist / dimpleRadiusAngle) * (Math.PI / 2),
        );
        const displacement = maxDepth * (factor * factor);
        vertex.sub(unitV.multiplyScalar(displacement));
        positions.setXYZ(i, vertex.x, vertex.y, vertex.z);
      }
    }

    sphereGeo.computeVertexNormals();

    // Heavy Metal Brass / Gold Material
    const ballMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color("#d4a843"),
      metalness: 0.95,
      roughness: 0.3,
      envMapIntensity: 1.1,
    });

    const ballMesh = new THREE.Mesh(sphereGeo, ballMaterial);
    scene.add(ballMesh);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0x1a3826, 0.85); // Turf green ambient bounce
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xfff5d6, 2.4);
    keyLight.position.set(4, 5, 5);
    scene.add(keyLight);

    // Warm point light following cursor
    const pointerLight = new THREE.PointLight(0xffeed0, 2.0, 10);
    pointerLight.position.set(0, 0, 3.5);
    scene.add(pointerLight);

    // Physics / Spring Drop-in State
    let dropY = prefersReducedMotion ? 0 : 3.8;
    let dropVelocity = 0;
    const springStrength = 0.045;
    const damping = 0.82;

    // Pointer Tracking
    let targetTiltX = 0;
    let targetTiltY = 0;
    let scrollShrink = 1;

    const handlePointerMove = (event: PointerEvent) => {
      const rect = container.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width - 0.5;
      const y = (event.clientY - rect.top) / rect.height - 0.5;

      targetTiltY = x * 0.9;
      targetTiltX = y * 0.7;

      pointerLight.position.x = x * 4;
      pointerLight.position.y = -y * 4;
    };

    window.addEventListener("pointermove", handlePointerMove);

    // Scroll Effect: Shrinks slightly and moves out of the way
    const handleScroll = () => {
      const scrollY = window.scrollY;
      scrollShrink = Math.max(0.68, 1 - scrollY / 650);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });

    // Resize Observer
    const handleResize = () => {
      if (!container) return;
      const width = container.clientWidth;
      const height = container.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    // Visibility Observer
    const intersectionObserver = new IntersectionObserver(([entry]) => {
      isVisible = entry.isIntersecting;
    });
    intersectionObserver.observe(container);

    // Animation Loop
    let clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      if (!isVisible) return;

      const delta = clock.getDelta();

      // Spring drop-in physics
      if (!prefersReducedMotion && Math.abs(dropY) > 0.001) {
        const force = -springStrength * dropY;
        dropVelocity = (dropVelocity + force) * damping;
        dropY += dropVelocity;
        if (Math.abs(dropY) < 0.001 && Math.abs(dropVelocity) < 0.001) {
          dropY = 0;
        }
      }

      ballMesh.position.y = dropY;

      // Subtle slow rotation
      if (!prefersReducedMotion) {
        ballMesh.rotation.y += delta * 0.28;
      }

      // Smooth tilt toward pointer
      ballMesh.rotation.x += (targetTiltX - ballMesh.rotation.x) * 0.06;
      ballMesh.rotation.z += (-targetTiltY * 0.5 - ballMesh.rotation.z) * 0.06;

      // Scale on scroll
      ballMesh.scale.setScalar(scrollShrink);

      renderer.render(scene, camera);
    };

    animate();

    // Cleanup
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("scroll", handleScroll);
      resizeObserver.disconnect();
      intersectionObserver.disconnect();

      if (container && renderer.domElement) {
        container.removeChild(renderer.domElement);
      }

      sphereGeo.dispose();
      ballMaterial.dispose();
      softbox1.geometry.dispose();
      (softbox1.material as THREE.Material).dispose();
      softbox2.geometry.dispose();
      (softbox2.material as THREE.Material).dispose();
      softbox3.geometry.dispose();
      (softbox3.material as THREE.Material).dispose();
      envTexture.dispose();
      pmremGenerator.dispose();
      renderer.dispose();
    };
  }, []);

  if (!webglSupported) {
    return (
      <div
        className="golf-ball-fallback"
        aria-label="Gold golf ball fallback"
      >
        <div className="flat-gold-ball" />
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="golf-ball-container"
      role="img"
      aria-label="Interactive 3D heavy brass golf ball with dimples"
    />
  );
}
