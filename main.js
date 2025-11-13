import * as THREE from 'three';
import { Sky } from 'three/examples/jsm/objects/Sky.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader.js';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { EffectComposer, RenderPass, EffectPass, BloomEffect, DepthOfFieldEffect, VignetteEffect, NoiseEffect, SMAAEffect } from 'postprocessing';
import { GUI } from 'lil-gui';

// Scene setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 10000);
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });

renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.getElementById('canvas-container').appendChild(renderer.domElement);

// Post-processing setup for stunning visual effects (TEMPORARILY DISABLED FOR DEBUGGING)
let composer, bloomEffect, depthOfFieldEffect;
const USE_POST_PROCESSING = false; // Toggle this to enable/disable post-processing

if (USE_POST_PROCESSING) {
    try {
        composer = new EffectComposer(renderer, {
            frameBufferType: THREE.HalfFloatType,
            multisampling: 8
        });

        // Add render pass
        const renderPass = new RenderPass(scene, camera);
        composer.addPass(renderPass);

        // Create stunning bloom effect for glowing elements
        bloomEffect = new BloomEffect({
            intensity: 2.0,
            luminanceThreshold: 0.4,
            luminanceSmoothing: 0.3,
            mipmapBlur: true,
            radius: 0.85,
            levels: 8
        });

        // Cinematic depth of field
        depthOfFieldEffect = new DepthOfFieldEffect(camera, {
            focusDistance: 0.0,
            focalLength: 0.05,
            bokehScale: 3.0,
            height: 480
        });

        // Film grain for atmosphere
        const noiseEffect = new NoiseEffect({
            premultiply: true
        });
        noiseEffect.blendMode.opacity.value = 0.15;

        // Vignette for cinematic framing
        const vignetteEffect = new VignetteEffect({
            offset: 0.35,
            darkness: 0.6
        });

        // Anti-aliasing
        const smaaEffect = new SMAAEffect();

        // Combine all effects
        const effectPass = new EffectPass(
            camera,
            bloomEffect,
            depthOfFieldEffect,
            noiseEffect,
            vignetteEffect,
            smaaEffect
        );
        composer.addPass(effectPass);

        // Debug GUI for tweaking effects in real-time
        const gui = new GUI();
        const effectsFolder = gui.addFolder('Visual Effects');
        effectsFolder.add(bloomEffect, 'intensity', 0, 5, 0.1).name('Bloom Intensity');
        effectsFolder.add(bloomEffect, 'luminanceThreshold', 0, 1, 0.01).name('Bloom Threshold');
        effectsFolder.add(depthOfFieldEffect.bokehScale, 'value', 0, 10, 0.1).name('Bokeh Scale');
        effectsFolder.add(noiseEffect.blendMode.opacity, 'value', 0, 1, 0.01).name('Film Grain');
        effectsFolder.add(vignetteEffect.uniforms.get('offset'), 'value', 0, 1, 0.01).name('Vignette Offset');
        effectsFolder.add(vignetteEffect.uniforms.get('darkness'), 'value', 0, 2, 0.01).name('Vignette Darkness');
        effectsFolder.close();

        console.log('🎨 Post-processing effects initialized!');
    } catch (error) {
        console.error('Failed to initialize post-processing:', error);
    }
}

// Sky setup
const sky = new Sky();
sky.scale.setScalar(10000);
scene.add(sky);

const skyUniforms = sky.material.uniforms;
skyUniforms['turbidity'].value = 10;
skyUniforms['rayleigh'].value = 2;
skyUniforms['mieCoefficient'].value = 0.005;
skyUniforms['mieDirectionalG'].value = 0.8;

// Sun setup for sky
const sun = new THREE.Vector3();

function updateSun(elevation, azimuth) {
    const phi = THREE.MathUtils.degToRad(90 - elevation);
    const theta = THREE.MathUtils.degToRad(azimuth);

    sun.setFromSphericalCoords(1, phi, theta);
    skyUniforms['sunPosition'].value.copy(sun);
}

// Initialize sun at high noon
updateSun(70, 180);

// Variables
let scrollProgress = 0;
let pig, balloonGroup;
const particles = [];
const atmosphereLayers = [];
const sparkles = [];
const explosions = [];
const atmosphericParticles = []; // Beautiful layered atmospheric particles
let pigLanded = false;
let pigWalkingAway = false;
let balloonsReleased = false;
let landingTime = 0;
let journeyStarted = false;
let pigVelocityY = 0; // Pig's falling velocity
const gravity = -0.5; // Gravity strength
let pigTrailParticles = []; // Beautiful particle trail behind pig
let atmosphericParticlesCreated = false; // Track if atmospheric particles have been created
let lastScrollProgress = 0; // Track if pig is actually moving

// Preload ALL textures immediately to prevent lag spike
const textureLoader = new THREE.TextureLoader();
const earthTexturesPreload = {
    albedo: textureLoader.load('/59-earth/textures/earth albedo.jpg',
        () => console.log('Earth albedo loaded'),
        undefined,
        (err) => console.error('Earth albedo error:', err)
    ),
    bump: textureLoader.load('/59-earth/textures/earth bump.jpg',
        () => console.log('Earth bump loaded'),
        undefined,
        (err) => console.error('Earth bump error:', err)
    ),
    clouds: textureLoader.load('/59-earth/textures/clouds earth.png',
        () => console.log('Earth clouds loaded'),
        undefined,
        (err) => console.error('Earth clouds error:', err)
    )
};
const moonTexturesPreload = {
    diffuse: textureLoader.load('/44-moon-photorealistic-2k (extract.me)/Textures/Diffuse_2K.png', (texture) => {
        texture.wrapS = THREE.ClampToEdgeWrapping;
        texture.wrapT = THREE.ClampToEdgeWrapping;
        texture.minFilter = THREE.LinearFilter;
        console.log('Moon diffuse loaded');
    }, undefined, (err) => console.error('Moon diffuse error:', err)),
    bump: textureLoader.load('/44-moon-photorealistic-2k (extract.me)/Textures/Bump_2K.png', (texture) => {
        texture.wrapS = THREE.ClampToEdgeWrapping;
        texture.wrapT = THREE.ClampToEdgeWrapping;
        texture.minFilter = THREE.LinearFilter;
        console.log('Moon bump loaded');
    }, undefined, (err) => console.error('Moon bump error:', err))
};
const sunTexturePreload = textureLoader.load('/sol/2k_sun.jpg',
    () => console.log('Sun texture loaded'),
    undefined,
    (err) => console.error('Sun texture error:', err)
);
const starsTexturePreload = textureLoader.load('/8k_stars_milky_way.jpg',
    () => console.log('Stars texture loaded'),
    undefined,
    (err) => console.error('Stars texture error:', err)
);
const aerialCloudTexturePreload = textureLoader.load('/aerial_view_of_clouds_under_light_blue_sky_4k_hd_light_blue-3840x2160.jpg',
    () => console.log('Aerial cloud texture loaded'),
    undefined,
    (err) => console.error('Aerial cloud texture error:', err)
);

// Layer information - extended cloud layer
const layerInfo = [
    { name: "Outer Space", desc: "The vast blackness filled with distant stars", start: 0, end: 0.15 },
    { name: "Thermosphere", desc: "Shimmering auroras dance in the sky", start: 0.15, end: 0.30 },
    { name: "Mesosphere", desc: "Shooting stars streak by in the darkness", start: 0.30, end: 0.45 },
    { name: "Stratosphere", desc: "Weather balloons and jets pass by", start: 0.45, end: 0.60 },
    { name: "Troposphere", desc: "Clouds, birds, and mountains below", start: 0.60, end: 0.90 },
    { name: "Green Meadow", desc: "A soft landing on Earth", start: 0.90, end: 1.0 }
];

// Create cute pig model from FBX
function createPig() {
    const pigGroup = new THREE.Group();

    const fbxLoader = new FBXLoader();
    fbxLoader.load(
        'cute-pig/source/Cute Pig.fbx',
        (object) => {
            console.log('Cute pig model loaded successfully');

            // Load the texture
            const textureLoader = new THREE.TextureLoader();
            const pigTexture = textureLoader.load('cute-pig/textures/Pig_Color_Base_Color.png');

            object.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;

                    // Apply the texture
                    child.material = new THREE.MeshStandardMaterial({
                        map: pigTexture,
                        roughness: 0.5,
                        metalness: 0.1
                    });
                }
            });

            // Scale and rotate the model to match the old pig orientation
            object.scale.set(0.02, 0.02, 0.02); // FBX models are usually large
            object.rotation.y = Math.PI; // Face forward

            pigGroup.add(object);
            console.log('Cute pig added to scene');
        },
        undefined,
        (error) => {
            console.error('Error loading cute pig FBX:', error);
            // Fallback: create a simple pink sphere if model fails to load
            const fallbackGeo = new THREE.SphereGeometry(2, 32, 32);
            const fallbackMat = new THREE.MeshStandardMaterial({ color: 0xffb6d9 });
            const fallback = new THREE.Mesh(fallbackGeo, fallbackMat);
            pigGroup.add(fallback);
        }
    );

    return pigGroup;
}

// Create balloons with MORE detail
function createBalloons() {
    balloonGroup = new THREE.Group();

    // Position balloonGroup high above the pig's head
    balloonGroup.position.set(0, 3, 0.5); // At pig's head level, slightly forward

    const colors = [0xff1493, 0x00bfff, 0xffd700, 0xff4500, 0x00ff7f, 0xff69b4, 0x9370db, 0xff6347];
    const bundlePoint = new THREE.Vector3(0, 3, 0); // Bundle point in local space

    for (let i = 0; i < 8; i++) {
        // Balloon (simplified for performance)
        const balloonGeometry = new THREE.SphereGeometry(0.5, 16, 16); // Lower poly
        balloonGeometry.scale(0.9, 1.2, 0.9);
        const balloonMaterial = new THREE.MeshStandardMaterial({
            color: colors[i],
            roughness: 0.2,
            metalness: 0.1,
            emissive: colors[i],
            emissiveIntensity: 0.8, // Much brighter glow for bloom effect
            clearcoat: 0.8,
            clearcoatRoughness: 0.2
        });
        const balloon = new THREE.Mesh(balloonGeometry, balloonMaterial);

        const angle = (i / 8) * Math.PI * 2;
        const radius = 1.5 + Math.random() * 0.5;
        balloon.position.set(
            Math.cos(angle) * radius,
            12 + Math.random() * 2, // High above the bundle point
            Math.sin(angle) * radius
        );

        // Balloon knot
        const knotGeo = new THREE.SphereGeometry(0.08, 8, 8);
        const knotMat = new THREE.MeshStandardMaterial({ color: colors[i] });
        const knot = new THREE.Mesh(knotGeo, knotMat);
        knot.position.copy(balloon.position);
        knot.position.y -= 0.6;

        // Individual string from balloon to bundle point
        const stringCurve = new THREE.CatmullRomCurve3([
            new THREE.Vector3(balloon.position.x, balloon.position.y - 0.6, balloon.position.z),
            new THREE.Vector3(balloon.position.x * 0.7, balloon.position.y - 3, balloon.position.z * 0.7),
            new THREE.Vector3(balloon.position.x * 0.4, balloon.position.y - 6, balloon.position.z * 0.4),
            bundlePoint
        ]);
        const stringGeometry = new THREE.TubeGeometry(stringCurve, 20, 0.02, 8, false);
        const stringMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const string = new THREE.Mesh(stringGeometry, stringMaterial);
        string.userData.originalCurve = stringCurve;
        string.userData.balloonIndex = i;

        balloonGroup.add(balloon, knot, string);
    }

    // Main string from bundle point down to origin (pig's mouth)
    const mainStringCurve = new THREE.CatmullRomCurve3([
        bundlePoint,
        new THREE.Vector3(0, 1.5, -0.2),
        new THREE.Vector3(0, 0, -0.5) // Attach at origin (mouth position)
    ]);
    const mainStringGeometry = new THREE.TubeGeometry(mainStringCurve, 15, 0.04, 8, false);
    const mainStringMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const mainString = new THREE.Mesh(mainStringGeometry, mainStringMaterial);
    balloonGroup.add(mainString);

    return balloonGroup;
}

// Create sun with enhanced glow
function createSun() {
    const sunGeometry = new THREE.SphereGeometry(150, 32, 32);

    // Enhanced sun material with strong emissive glow for bloom
    const sunMaterial = new THREE.MeshStandardMaterial({
        map: sunTexturePreload,
        color: 0xffffaa,
        emissive: 0xffff66,
        emissiveIntensity: 2.5,
        emissiveMap: sunTexturePreload,
        fog: false,
        toneMapped: false // Prevent tone mapping to allow bloom to work properly
    });

    const sun = new THREE.Mesh(sunGeometry, sunMaterial);
    sun.position.set(400, 200, -200);
    scene.add(sun);

    console.log('Sun created at position:', sun.position);

    // Enhanced sun light with warmer color
    const sunLight = new THREE.PointLight(0xffd700, 4, 6000);
    sunLight.position.copy(sun.position);
    sunLight.castShadow = false; // Don't cast shadows for performance
    scene.add(sunLight);

    // Removed sun glow ring - user didn't like it
}

// Create moon
function createMoon() {
    const moonGeometry = new THREE.SphereGeometry(50, 32, 32); // Lower poly for performance
    const moonMaterial = new THREE.MeshStandardMaterial({
        map: moonTexturesPreload.diffuse,
        bumpMap: moonTexturesPreload.bump,
        bumpScale: 2,
        roughness: 1.0,
        metalness: 0,
        fog: false // Disable fog on moon so it stays visible
    });
    const moon = new THREE.Mesh(moonGeometry, moonMaterial);
    moon.position.set(-350, 150, -500);
    scene.add(moon);

    console.log('Moon created at position:', moon.position);
    console.log('Moon textures loaded:', moonTexturesPreload.diffuse, moonTexturesPreload.bump);
}

// Create starfield with 8k texture - optimized for performance
function createStars() {
    // Add 8k stars texture as background sphere (using preloaded texture)
    const starSphereGeometry = new THREE.SphereGeometry(2500, 64, 64);
    const starSphereMaterial = new THREE.MeshBasicMaterial({
        map: starsTexturePreload,
        side: THREE.BackSide,
        transparent: true,
        opacity: 1
    });
    const starSphere = new THREE.Mesh(starSphereGeometry, starSphereMaterial);
    starSphere.userData.isStarSphere = true;
    scene.add(starSphere);
    particles.push(starSphere);

    // Add aerial cloud photo sphere for atmosphere
    const aerialSphereGeometry = new THREE.SphereGeometry(2400, 64, 64);
    const aerialSphereMaterial = new THREE.MeshBasicMaterial({
        map: aerialCloudTexturePreload,
        side: THREE.BackSide,
        transparent: true,
        opacity: 0
    });
    const aerialSphere = new THREE.Mesh(aerialSphereGeometry, aerialSphereMaterial);
    aerialSphere.userData.isAerialSphere = true;
    scene.add(aerialSphere);
    particles.push(aerialSphere);

    // Also create some additional particle stars for depth
    createFallbackStars();
}

function createFallbackStars() {
    const starGeometry = new THREE.BufferGeometry();
    const starVertices = [];
    const starColors = [];
    const starSizes = [];

    for (let i = 0; i < 8000; i++) {
        const x = (Math.random() - 0.5) * 3000;
        const y = (Math.random() - 0.5) * 3000;
        const z = (Math.random() - 0.5) * 3000;
        starVertices.push(x, y, z);

        const color = new THREE.Color();
        color.setHSL(Math.random() * 0.3 + 0.5, 0.8, 0.8);
        starColors.push(color.r, color.g, color.b);

        starSizes.push(Math.random() * 3 + 1);
    }

    starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starVertices, 3));
    starGeometry.setAttribute('color', new THREE.Float32BufferAttribute(starColors, 3));
    starGeometry.setAttribute('size', new THREE.Float32BufferAttribute(starSizes, 1));

    const starMaterial = new THREE.PointsMaterial({
        size: 3,
        transparent: true,
        opacity: 0.6,
        vertexColors: true,
        sizeAttenuation: true,
        blending: THREE.AdditiveBlending
    });

    const stars = new THREE.Points(starGeometry, starMaterial);
    scene.add(stars);
    particles.push(stars);
}

// Create stars that form the word "RESUMES"

// Create rocket with welcome banner and pig image
function createRocketWithBanner() {
    const rocketGroup = new THREE.Group();

    // Rocket body
    const bodyGeo = new THREE.CylinderGeometry(2, 2, 10, 16);
    const bodyMat = new THREE.MeshStandardMaterial({
        color: 0xff0000,
        metalness: 0.9,
        roughness: 0.2
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 5;
    body.rotation.z = Math.PI / 2;
    rocketGroup.add(body);

    // Rocket nose cone
    const noseGeo = new THREE.ConeGeometry(2, 4, 16);
    const noseMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        metalness: 0.8,
        roughness: 0.2
    });
    const nose = new THREE.Mesh(noseGeo, noseMat);
    nose.position.set(10, 5, 0);
    nose.rotation.z = -Math.PI / 2;
    rocketGroup.add(nose);

    // Flames
    const flameGeo = new THREE.ConeGeometry(1.5, 4, 8);
    const flameMat = new THREE.MeshBasicMaterial({
        color: 0xff6600,
        transparent: true,
        opacity: 0.8
    });
    const flame = new THREE.Mesh(flameGeo, flameMat);
    flame.position.set(-2, 5, 0);
    flame.rotation.z = Math.PI / 2;
    rocketGroup.add(flame);

    // Banner with pig.jpg texture
    const textureLoader = new THREE.TextureLoader();
    const pigTexture = textureLoader.load('/pig.jpg');

    const bannerGeo = new THREE.PlaneGeometry(60, 20);
    const bannerMat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        side: THREE.DoubleSide
    });
    const banner = new THREE.Mesh(bannerGeo, bannerMat);
    banner.position.set(-35, 5, 0);
    rocketGroup.add(banner);

    // Add pig image to banner (left side)
    const pigPlaneGeo = new THREE.PlaneGeometry(15, 15);
    const pigPlaneMat = new THREE.MeshBasicMaterial({
        map: pigTexture,
        transparent: true,
        side: THREE.DoubleSide
    });
    const pigPlane = new THREE.Mesh(pigPlaneGeo, pigPlaneMat);
    pigPlane.position.set(-45, 5, 0.1);
    rocketGroup.add(pigPlane);

    // Create text using canvas
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ff0000';
    ctx.font = 'bold 80px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('WELCOME TO MY WEBSITE!', 512, 128);

    const textTexture = new THREE.CanvasTexture(canvas);
    const textGeo = new THREE.PlaneGeometry(50, 12);
    const textMat = new THREE.MeshBasicMaterial({
        map: textTexture,
        transparent: true,
        side: THREE.DoubleSide
    });
    const textMesh = new THREE.Mesh(textGeo, textMat);
    textMesh.position.set(-25, 5, 0.1);
    rocketGroup.add(textMesh);

    // Position to shoot across screen early in journey
    rocketGroup.position.set(-400, -100, 100);
    rocketGroup.rotation.y = Math.PI / 6;

    rocketGroup.userData.isRocketBanner = true;
    rocketGroup.userData.velocity = new THREE.Vector3(15, 2, -3);

    scene.add(rocketGroup);
    atmosphereLayers.push({ type: 'rocketBanner', group: rocketGroup });
}

// Create rocket ship in space!
function createRocket() {
    const rocketGroup = new THREE.Group();

    // Position rocket - FAR in background of space
    const positions = [
        [-200, 150, -400],
        [250, 100, -450],
        [-150, 200, -500],
        [180, 80, -420]
    ];

    const rocketIndex = scene.children.filter(c => c.userData.isRocket).length;
    const pos = positions[rocketIndex % positions.length];

    // Load Saturn V rocket model
    const mtlLoader = new MTLLoader();
    mtlLoader.load(
        'Space_Rocket_SaturnV/Saturn V/3d files/Saturn V.mtl',
        (materials) => {
            materials.preload();
            console.log('Saturn V materials loaded successfully');

            const objLoader = new OBJLoader();
            objLoader.setMaterials(materials);
            objLoader.load(
                'Space_Rocket_SaturnV/Saturn V/3d files/Saturn V.obj',
                (object) => {
                    console.log('Saturn V model loaded successfully', object);
                    object.traverse((child) => {
                        if (child.isMesh) {
                            child.castShadow = true;
                            child.receiveShadow = true;
                        }
                    });

                    rocketGroup.add(object);
                    rocketGroup.position.set(...pos);

                    // Make rocket point towards the moon at (-350, 150, -500)
                    const moonPosition = new THREE.Vector3(-350, 150, -500);
                    const rocketPosition = new THREE.Vector3(...pos);
                    const direction = new THREE.Vector3().subVectors(moonPosition, rocketPosition).normalize();

                    // Create rotation to point towards moon
                    const up = new THREE.Vector3(0, 1, 0);
                    const quaternion = new THREE.Quaternion().setFromUnitVectors(up, direction);
                    rocketGroup.quaternion.copy(quaternion);

                    rocketGroup.scale.set(0.8 + Math.random() * 0.4, 0.8 + Math.random() * 0.4, 0.8 + Math.random() * 0.4);
                    rocketGroup.userData.isRocket = true;

                    scene.add(rocketGroup);
                    atmosphereLayers.push({ type: 'rocket', group: rocketGroup });
                    console.log('Saturn V added to scene at', pos);
                },
                undefined,
                (error) => {
                    console.error('Error loading Saturn V OBJ:', error);
                }
            );
        },
        undefined,
        (error) => {
            console.error('Error loading Saturn V MTL:', error);
        }
    );
}

// Meteors removed per user request

// Create floating text in 3D space
function createFloatingText(text, position, size = 8) {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${size * 10}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 512, 128);

    const texture = new THREE.CanvasTexture(canvas);
    const geometry = new THREE.PlaneGeometry(size * 5, size * 1.25);
    const material = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        opacity: 0.9,
        side: THREE.DoubleSide
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(position);
    scene.add(mesh);
    atmosphereLayers.push({ type: 'floatingText', group: mesh });

    return mesh;
}

// Create clickable 3D button
function create3DButton(text, position, url, size = 6) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');

    // Button background
    ctx.fillStyle = '#4a90e2';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Border
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 8;
    ctx.strokeRect(4, 4, canvas.width - 8, canvas.height - 8);

    // Text
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${size * 8}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);

    const texture = new THREE.CanvasTexture(canvas);
    const geometry = new THREE.PlaneGeometry(size * 4, size);
    const material = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        opacity: 0.95,
        side: THREE.DoubleSide
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(position);
    mesh.userData.isClickable = true;
    mesh.userData.url = url;
    scene.add(mesh);
    atmosphereLayers.push({ type: 'button', group: mesh });

    return mesh;
}

// Create planes with banners
function createPlaneWithBanner(message, position, rotation) {
    const planeGroup = new THREE.Group();

    // Load airplane model
    const mtlLoader = new MTLLoader();
    mtlLoader.load('Airplane_v1_L1.123c4a6fedec-1680-4a36-a228-b0d440a4f280/11803_Airplane_v1_l1.mtl', (materials) => {
        materials.preload();

        const objLoader = new OBJLoader();
        objLoader.setMaterials(materials);
        objLoader.load('Airplane_v1_L1.123c4a6fedec-1680-4a36-a228-b0d440a4f280/11803_Airplane_v1_l1.obj', (object) => {
            object.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
            });

            planeGroup.add(object);

            // Banner
            const bannerGeo = new THREE.PlaneGeometry(20, 4);
            const bannerCanvas = document.createElement('canvas');
            bannerCanvas.width = 512;
            bannerCanvas.height = 128;
            const bannerCtx = bannerCanvas.getContext('2d');
            bannerCtx.fillStyle = '#ffffff';
            bannerCtx.fillRect(0, 0, bannerCanvas.width, bannerCanvas.height);
            bannerCtx.strokeStyle = '#ff0000';
            bannerCtx.lineWidth = 8;
            bannerCtx.strokeRect(4, 4, bannerCanvas.width - 8, bannerCanvas.height - 8);
            bannerCtx.fillStyle = '#000000';
            bannerCtx.font = 'bold 60px Arial';
            bannerCtx.textAlign = 'center';
            bannerCtx.textBaseline = 'middle';
            bannerCtx.fillText(message, bannerCanvas.width / 2, bannerCanvas.height / 2);

            const bannerTexture = new THREE.CanvasTexture(bannerCanvas);
            const bannerMat = new THREE.MeshBasicMaterial({
                map: bannerTexture,
                side: THREE.DoubleSide
            });
            const banner = new THREE.Mesh(bannerGeo, bannerMat);
            banner.position.set(-15, 0, 0);
            planeGroup.add(banner);

            // Connecting string
            const stringGeo = new THREE.CylinderGeometry(0.05, 0.05, 10, 8);
            const stringMat = new THREE.MeshBasicMaterial({ color: 0x333333 });
            const string1 = new THREE.Mesh(stringGeo, stringMat);
            string1.rotation.z = Math.PI / 2;
            string1.position.set(-5, 0, 1.5);
            planeGroup.add(string1);

            const string2 = new THREE.Mesh(stringGeo, stringMat);
            string2.rotation.z = Math.PI / 2;
            string2.position.set(-5, 0, -1.5);
            planeGroup.add(string2);

            planeGroup.position.copy(position);
            planeGroup.rotation.set(-Math.PI / 2, 0, rotation); // Rotate to fix orientation - belly down, flying forward
            planeGroup.scale.set(0.075, 0.075, 0.075); // 1.5x bigger

            scene.add(planeGroup);
            atmosphereLayers.push({ type: 'bannerPlane', group: planeGroup });
        });
    });
}

// Create UFO in space
function createUFO() {
    const gltfLoader = new GLTFLoader();
    gltfLoader.load(
        'Baked_Animations_UFO_Empty GLTF/UFO_Empty.glb',
        (gltf) => {
            const ufo = gltf.scene;
            ufo.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
            });

            // Position UFO lower and bigger
            ufo.position.set(-200, -800, -300);
            ufo.scale.set(8, 8, 8); // Much bigger
            ufo.rotation.y = Math.PI / 4;
            console.log('👽 UFO positioned at:', ufo.position);

            // Add glow for UFO
            const glowLight = new THREE.PointLight(0x00ff00, 3, 100);
            glowLight.position.copy(ufo.position);
            scene.add(glowLight);

            scene.add(ufo);
            atmosphereLayers.push({ type: 'ufo', group: ufo });
            console.log('🛸 UFO loaded in space');
        },
        undefined,
        (error) => console.error('Error loading UFO:', error)
    );
}

// Create Hermes spacecraft in space
function createHermes() {
    const objLoader = new OBJLoader();
    const hermesGroup = new THREE.Group();

    // Load main modules
    const modules = ['CmdModule.obj', 'FuelModule.obj', 'DishAnt.obj', 'IonDrive.obj',
                     'HabWheel.obj', 'SolarPanels.obj', 'SolarModules.obj'];

    let loadedCount = 0;
    modules.forEach(moduleName => {
        objLoader.load(
            `Hermes/${moduleName}`,
            (object) => {
                hermesGroup.add(object);
                loadedCount++;

                if (loadedCount === modules.length) {
                    // Position Hermes way up in space - far from sun, visible size
                    hermesGroup.position.set(-600, 800, -700);
                    hermesGroup.scale.set(0.3, 0.3, 0.3); // Visible but small
                    hermesGroup.rotation.y = Math.PI / 6;

                    scene.add(hermesGroup);
                    atmosphereLayers.push({ type: 'hermes', group: hermesGroup });
                    console.log('🚀 Hermes spacecraft loaded');
                }
            },
            undefined,
            (error) => console.warn(`Hermes module ${moduleName} error:`, error)
        );
    });
}

// Create hot air balloon towards the top
function createHotAirBalloon() {
    const mtlLoader = new MTLLoader();
    mtlLoader.load(
        'Hot_air_balloon_v1_L2.123c69a97f0e-9977-45dd-9570-457189ce2941/11809_Hot_air_balloon_l2.mtl',
        (materials) => {
            materials.preload();

            const objLoader = new OBJLoader();
            objLoader.setMaterials(materials);
            objLoader.load(
                'Hot_air_balloon_v1_L2.123c69a97f0e-9977-45dd-9570-457189ce2941/11809_Hot_air_balloon_l2.obj',
                (object) => {
                    object.traverse((child) => {
                        if (child.isMesh) {
                            child.castShadow = true;
                            child.receiveShadow = true;
                        }
                    });

                    // Position hot air balloon - Tiny in background, basket pointing down
                    object.position.set(120, -1500, 0); // Mid-atmosphere level, clearly visible
                    object.scale.set(0.01, 0.01, 0.01); // Super tiny
                    // Basket pointing DOWN: rotate on X to stand up, then flip on Z
                    object.rotation.x = -Math.PI / 2;
                    object.rotation.y = 0;
                    object.rotation.z = Math.PI;

                    console.log('🎈 Hot air balloon position:', object.position);
                    console.log('🎈 Hot air balloon scale:', object.scale);
                    console.log('🎈 Hot air balloon rotation:', object.rotation);

                    scene.add(object);
                    atmosphereLayers.push({ type: 'hotAirBalloon', group: object });
                    console.log('🎈 Hot air balloon loaded');
                },
                undefined,
                (error) => console.error('Error loading hot air balloon:', error)
            );
        },
        undefined,
        (error) => console.error('Error loading hot air balloon materials:', error)
    );
}

// Create Up house with balloons
function createUpHouse() {
    const house = new THREE.Group();

    // Load UP.glb with balloons already attached
    const gltfLoader = new GLTFLoader();
    console.log('🔍 Attempting to load UP.glb...');
    gltfLoader.load(
        'UP.glb',
        (gltf) => {
            const object = gltf.scene;
            console.log('✅ UP.glb loaded successfully!', object);

            object.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                    console.log('Found mesh in UP.glb:', child.name);
                }
            });

            // Scale and position the house model - HUGE so it's visible
            object.scale.set(5.0, 5.0, 5.0); // Way bigger
            object.position.y = 0;
            house.add(object);
            console.log('🏠 Up house with balloons added to scene!');
            console.log('House bounding box:', object);

            // Fix materials - make fully opaque and visible
            object.traverse((child) => {
                if (child.isMesh && child.material) {
                    child.material.transparent = false;
                    child.material.opacity = 1.0;
                    child.material.side = THREE.DoubleSide;
                    child.material.depthWrite = true;
                    child.material.depthTest = true;
                    child.material.needsUpdate = true;
                }
            });
        },
        (progress) => {
            console.log('Loading UP.glb:', (progress.loaded / progress.total * 100).toFixed(2) + '%');
        },
        (error) => {
            console.error('❌ ERROR loading UP.glb:', error);
            console.error('Error details:', error.message);
        }
    );

    // Position Up house - under the plane, closer to camera
    house.position.set(-120, -1200, 0); // Same X as plane, Z: 0 (closer!), lower Y
    house.scale.set(5.0, 5.0, 5.0); // HUGE so you can see it
    console.log('🏠 Up house positioned at:', house.position);

    scene.add(house);
    atmosphereLayers.push({ type: 'upHouse', group: house });
}

// Create airplane flying in the distance
function createAirplane() {
    const planeGroup = new THREE.Group();

    // Multiple positions for airplanes
    const positions = [
        [-150, -800, -200],
        [180, -750, -250],
        [-200, -850, -180],
        [100, -820, -230],
        [-250, -780, -210]
    ];

    const airplaneIndex = scene.children.filter(c => c.userData.isAirplane).length;
    const pos = positions[airplaneIndex % positions.length];

    // Load airplane model
    const mtlLoader = new MTLLoader();
    mtlLoader.load('Airplane_v1_L1.123c4a6fedec-1680-4a36-a228-b0d440a4f280/11803_Airplane_v1_l1.mtl', (materials) => {
        materials.preload();

        const objLoader = new OBJLoader();
        objLoader.setMaterials(materials);
        objLoader.load('Airplane_v1_L1.123c4a6fedec-1680-4a36-a228-b0d440a4f280/11803_Airplane_v1_l1.obj', (object) => {
            object.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
            });

            planeGroup.add(object);

            // Position plane in stratosphere
            planeGroup.position.set(...pos);
            planeGroup.rotation.set(-Math.PI / 2, 0, Math.PI / 4 + Math.random() * 0.3); // Fix orientation - belly down, flying forward
            planeGroup.scale.set(0.05, 0.05, 0.05); // Much smaller
            planeGroup.userData.isAirplane = true;

            scene.add(planeGroup);
            atmosphereLayers.push({ type: 'airplane', group: planeGroup });
        });
    });
}

// Create birds flying in troposphere
function createBirds() {
    const birdGroup = new THREE.Group();

    for (let i = 0; i < 20; i++) { // Increased from 8 to 20 birds
        const bird = new THREE.Group();

        // Simple bird shape - two triangular wings
        const wingGeo = new THREE.ConeGeometry(0.3, 1, 3);
        const wingMat = new THREE.MeshStandardMaterial({ color: 0x333333 });

        const leftWing = new THREE.Mesh(wingGeo, wingMat);
        leftWing.rotation.z = Math.PI / 2;
        leftWing.position.set(-0.5, 0, 0);
        bird.add(leftWing);

        const rightWing = new THREE.Mesh(wingGeo, wingMat);
        rightWing.rotation.z = -Math.PI / 2;
        rightWing.position.set(0.5, 0, 0);
        bird.add(rightWing);

        // Body
        const bodyGeo = new THREE.SphereGeometry(0.2, 8, 8);
        bodyGeo.scale(1, 1, 1.5);
        const body = new THREE.Mesh(bodyGeo, wingMat);
        bird.add(body);

        // Position birds in troposphere - spread out more
        const angle = (i / 20) * Math.PI * 2;
        const radius = 80 + Math.random() * 200; // Wider spread
        bird.position.set(
            Math.cos(angle) * radius,
            -1400 + Math.random() * 200,
            Math.sin(angle) * radius
        );
        bird.rotation.y = -angle;
        bird.scale.set(3, 3, 3);

        bird.userData.wingPhase = i * 0.5; // Offset animation
        birdGroup.add(bird);
    }

    scene.add(birdGroup);
    atmosphereLayers.push({ type: 'birds', group: birdGroup });
}

// Load cloud OBJ model - DISABLED to reduce lag
function loadCloudObj() {
    // Commented out to improve performance and reduce lag spikes
    // Using procedural clouds only
    console.log('Cloud OBJ loading disabled for performance');
}

// Create volumetric clouds with better detail - OPTIMIZED
function createClouds() {
    const cloudGroup = new THREE.Group();

    // Reduced from 40 to 25 for better performance
    for (let i = 0; i < 25; i++) {
        const cloud = new THREE.Group();

        // Reduced puff count for performance
        const puffCount = 4 + Math.floor(Math.random() * 3);
        for (let j = 0; j < puffCount; j++) {
            const size = 16 + Math.random() * 22;
            const cloudGeometry = new THREE.SphereGeometry(size, 8, 8); // Even lower poly
            const cloudMaterial = new THREE.MeshLambertMaterial({ // Cheaper material
                color: 0xffffff,
                transparent: true,
                opacity: 0.7 + Math.random() * 0.2,
                fog: true
            });

            const puff = new THREE.Mesh(cloudGeometry, cloudMaterial);
            puff.position.set(
                (Math.random() - 0.5) * 40,
                (Math.random() - 0.5) * 15,
                (Math.random() - 0.5) * 35
            );
            puff.scale.set(
                0.9 + Math.random() * 0.4,
                0.7 + Math.random() * 0.3,
                0.9 + Math.random() * 0.4
            );
            // No shadows on clouds for performance
            cloud.add(puff);
        }

        cloud.position.set(
            (Math.random() - 0.5) * 600,
            Math.random() * 100,
            (Math.random() - 0.5) * 600
        );
        cloud.scale.set(1.2, 0.9, 1.1); // Flatten slightly for realistic shape
        cloudGroup.add(cloud);
    }

    cloudGroup.position.y = -1200; // Move clouds higher for longer time in them
    scene.add(cloudGroup);
    atmosphereLayers.push({ type: 'clouds', group: cloudGroup });

    // Add ground-level clouds - reduced from 20 to 12
    const groundClouds = new THREE.Group();
    for (let i = 0; i < 12; i++) {
        const cloud = new THREE.Group();

        const puffCount = 4 + Math.floor(Math.random() * 2);
        for (let j = 0; j < puffCount; j++) {
            const size = 22 + Math.random() * 28;
            const cloudGeometry = new THREE.SphereGeometry(size, 8, 8); // Lower poly
            const cloudMaterial = new THREE.MeshLambertMaterial({ // Cheaper material
                color: 0xffffff,
                transparent: true,
                opacity: 0.65 + Math.random() * 0.2,
                fog: true
            });

            const puff = new THREE.Mesh(cloudGeometry, cloudMaterial);
            puff.position.set(
                (Math.random() - 0.5) * 40,
                (Math.random() - 0.5) * 15,
                (Math.random() - 0.5) * 35
            );
            puff.scale.set(
                0.85 + Math.random() * 0.4,
                0.65 + Math.random() * 0.3,
                0.85 + Math.random() * 0.4
            );
            // No shadows on clouds for performance
            cloud.add(puff);
        }

        const angle = Math.random() * Math.PI * 2;
        const radius = 200 + Math.random() * 250;
        cloud.position.set(
            Math.cos(angle) * radius,
            -1700 + Math.random() * 50, // Floating above ground
            Math.sin(angle) * radius
        );
        cloud.scale.set(1.3, 0.85, 1.15); // Flatten for realistic shape
        groundClouds.add(cloud);
    }
    scene.add(groundClouds);
    atmosphereLayers.push({ type: 'groundClouds', group: groundClouds });
}

// Create TREES with actual trunks and foliage!
function createTrees() {
    const treeGroup = new THREE.Group();

    // Load realistic bark texture (local file)
    const textureLoader = new THREE.TextureLoader();
    const barkTexture = textureLoader.load(
        '/textures/bark.jpg',
        (texture) => {
            texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
            texture.repeat.set(1, 2);
        }
    );

    for (let i = 0; i < 25; i++) {
        const tree = new THREE.Group();

        // Trunk with realistic bark texture
        const trunkGeometry = new THREE.CylinderGeometry(0.5, 0.8, 8, 16);
        const trunkMaterial = new THREE.MeshStandardMaterial({
            map: barkTexture,
            roughness: 0.95,
            metalness: 0
        });
        const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
        trunk.position.y = 4;
        trunk.castShadow = true;
        tree.add(trunk);

        // Foliage (multiple spheres for bushy look) - more vibrant green
        const foliageMaterial = new THREE.MeshStandardMaterial({
            color: 0x2d7a2d,
            roughness: 0.85,
            metalness: 0
        });

        // Bottom layer
        for (let j = 0; j < 3; j++) {
            const foliageGeo = new THREE.SphereGeometry(3 + Math.random(), 8, 8);
            const foliage = new THREE.Mesh(foliageGeo, foliageMaterial);
            foliage.position.set(
                (Math.random() - 0.5) * 2,
                7 + j * 2,
                (Math.random() - 0.5) * 2
            );
            foliage.castShadow = true;
            tree.add(foliage);
        }

        // Place tree on ground - avoid water and buildings
        let angle, radius, x, z;
        let attempts = 0;
        do {
            angle = Math.random() * Math.PI * 2;
            radius = 320 + Math.random() * 150; // Beyond buildings
            x = Math.cos(angle) * radius;
            z = Math.sin(angle) * radius;
            attempts++;
        } while (isInWater(x, z) && attempts < 20);

        tree.position.set(x, -1800, z);
        tree.scale.set(2.5 + Math.random() * 1.5, 2.5 + Math.random() * 1.5, 2.5 + Math.random() * 1.5);

        treeGroup.add(tree);
    }

    scene.add(treeGroup);
    return treeGroup;
}

// Helper function to check if position is in water
function isInWater(x, z) {
    for (const water of waterLocations) {
        const dist = Math.sqrt((x - water.x) ** 2 + (z - water.z) ** 2);
        if (dist < water.radius + 30) { // Add 30 unit buffer
            return true;
        }
    }
    return false;
}

// Create CITY with various buildings!
function createHouses() {
    const houseGroup = new THREE.Group();

    for (let i = 0; i < 40; i++) { // More buildings (40 instead of 20)
        const buildingType = Math.floor(Math.random() * 3); // 0=house, 1=office, 2=shop (NO TOWERS)

        if (buildingType === 0) {
            // HOUSE
            createHouse(houseGroup, i, 40);
        } else if (buildingType === 1) {
            // OFFICE BUILDING
            createOfficeBuilding(houseGroup, i, 40);
        } else {
            // SHOP
            createShop(houseGroup, i, 40);
        }
    }

    scene.add(houseGroup);
    return houseGroup;
}

function createHouse(group, i, total) {
    const house = new THREE.Group();

    // Load brick texture for house
    const textureLoader = new THREE.TextureLoader();
    const brickTexture = textureLoader.load('/textures/brick.jpg', (texture) => {
        texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(2, 2);
    });

    const baseGeo = new THREE.BoxGeometry(12, 12, 12); // 2x bigger
    const baseMat = new THREE.MeshStandardMaterial({
        map: brickTexture,
        roughness: 0.85,
        metalness: 0
    });
    const base = new THREE.Mesh(baseGeo, baseMat);
    base.position.y = 6;
    base.castShadow = true;
    house.add(base);

    const roofGeo = new THREE.ConeGeometry(10, 8, 4); // 2x bigger
    const roofMat = new THREE.MeshStandardMaterial({
        color: 0x8b4513,
        roughness: 0.9
    });
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.position.y = 16;
    roof.rotation.y = Math.PI / 4;
    roof.castShadow = true;
    house.add(roof);

    // Find position not in water
    let angle, radius, x, z;
    let attempts = 0;
    do {
        angle = (i / total + Math.random() * 0.1) * Math.PI * 2;
        radius = 180 + Math.random() * 120;
        x = Math.cos(angle) * radius;
        z = Math.sin(angle) * radius;
        attempts++;
    } while (isInWater(x, z) && attempts < 20);

    house.position.set(x, -1800, z);
    house.rotation.y = -angle;

    group.add(house);
}

function createTower(group, i, total) {
    const tower = new THREE.Group();

    const towerGeo = new THREE.CylinderGeometry(8, 10, 50, 12); // 2x bigger
    const towerMat = new THREE.MeshStandardMaterial({ color: 0xaaaaaa, roughness: 0.6 });
    const towerMesh = new THREE.Mesh(towerGeo, towerMat);
    towerMesh.position.y = 25;
    towerMesh.castShadow = true;
    tower.add(towerMesh);

    // Windows on tower
    for (let floor = 0; floor < 8; floor++) {
        const winGeo = new THREE.BoxGeometry(1.6, 2.4, 0.2); // 2x bigger
        const winMat = new THREE.MeshStandardMaterial({
            color: 0xffff88,
            emissive: 0xffff00,
            emissiveIntensity: 0.5
        });
        const win = new THREE.Mesh(winGeo, winMat);
        win.position.set(0, 4 + floor * 6, 8.2);
        tower.add(win);
    }

    const angle = (i / total) * Math.PI * 2;
    const radius = 180 + Math.random() * 120;
    tower.position.set(Math.cos(angle) * radius, -1800, Math.sin(angle) * radius);
    tower.rotation.y = -angle;

    group.add(tower);
}

function createOfficeBuilding(group, i, total) {
    const building = new THREE.Group();

    // Load concrete texture for office building
    const textureLoader = new THREE.TextureLoader();
    const concreteTexture = textureLoader.load('/textures/concrete.jpg', (texture) => {
        texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(2, 4);
    });

    const buildGeo = new THREE.BoxGeometry(20, 36, 20); // 2x bigger
    const buildMat = new THREE.MeshStandardMaterial({
        map: concreteTexture,
        roughness: 0.8,
        metalness: 0.1
    });
    const buildMesh = new THREE.Mesh(buildGeo, buildMat);
    buildMesh.position.y = 18;
    buildMesh.castShadow = true;
    building.add(buildMesh);

    // Grid of windows on ALL FOUR SIDES
    for (let floor = 0; floor < 6; floor++) {
        for (let w = 0; w < 3; w++) {
            const winGeo = new THREE.BoxGeometry(3, 4, 0.4);
            const winMat = new THREE.MeshStandardMaterial({
                color: 0xffffcc,
                emissive: 0xffff00,
                emissiveIntensity: 1.5, // Stronger glow for bloom
                toneMapped: false, // Allow bloom to work properly
                roughness: 0.1,
                metalness: 0.1
            });

            // Front side
            const winFront = new THREE.Mesh(winGeo, winMat);
            winFront.position.set((w - 1) * 6, floor * 6, 10.2);
            building.add(winFront);

            // Back side
            const winBack = new THREE.Mesh(winGeo, winMat);
            winBack.position.set((w - 1) * 6, floor * 6, -10.2);
            building.add(winBack);

            // Left side
            const winLeft = new THREE.Mesh(winGeo, winMat);
            winLeft.position.set(-10.2, floor * 6, (w - 1) * 6);
            building.add(winLeft);

            // Right side
            const winRight = new THREE.Mesh(winGeo, winMat);
            winRight.position.set(10.2, floor * 6, (w - 1) * 6);
            building.add(winRight);
        }
    }

    // Find position not in water
    let angle, radius, x, z;
    let attempts = 0;
    do {
        angle = (i / total + Math.random() * 0.1) * Math.PI * 2;
        radius = 180 + Math.random() * 120;
        x = Math.cos(angle) * radius;
        z = Math.sin(angle) * radius;
        attempts++;
    } while (isInWater(x, z) && attempts < 20);

    building.position.set(x, -1800, z);
    building.rotation.y = -angle;

    group.add(building);
}

function createShop(group, i, total) {
    const shop = new THREE.Group();

    // Load brick texture for shops
    const textureLoader = new THREE.TextureLoader();
    const brickTexture = textureLoader.load('/textures/brick.jpg', (texture) => {
        texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(2, 1);
    });

    const shopGeo = new THREE.BoxGeometry(16, 10, 12); // 2x bigger
    const shopMat = new THREE.MeshStandardMaterial({
        map: brickTexture,
        color: [0xffffff, 0xffeeee, 0xeeeeff, 0xffffee][Math.floor(Math.random() * 4)], // Tint the texture
        roughness: 0.8
    });
    const shopMesh = new THREE.Mesh(shopGeo, shopMat);
    shopMesh.position.y = 5;
    shopMesh.castShadow = true;
    shop.add(shopMesh);

    // Flat Roof
    const roofGeo = new THREE.BoxGeometry(18, 1, 14);
    const roofMat = new THREE.MeshStandardMaterial({ color: 0x666666 });
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.position.y = 10.5;
    roof.castShadow = true;
    shop.add(roof);

    // Awning
    const awningGeo = new THREE.BoxGeometry(17, 0.6, 4);
    const awningMat = new THREE.MeshStandardMaterial({ color: 0xff8844 });
    const awning = new THREE.Mesh(awningGeo, awningMat);
    awning.position.set(0, 8, 8);
    shop.add(awning);

    // Store front window
    const winGeo = new THREE.BoxGeometry(12, 6, 0.2);
    const winMat = new THREE.MeshStandardMaterial({
        color: 0xaaffff,
        transparent: true,
        opacity: 0.7
    });
    const win = new THREE.Mesh(winGeo, winMat);
    win.position.set(0, 5, 6.2);
    shop.add(win);

    // Find position not in water
    let angle, radius, x, z;
    let attempts = 0;
    do {
        angle = (i / total + Math.random() * 0.1) * Math.PI * 2;
        radius = 180 + Math.random() * 120;
        x = Math.cos(angle) * radius;
        z = Math.sin(angle) * radius;
        attempts++;
    } while (isInWater(x, z) && attempts < 20);

    shop.position.set(x, -1800, z);
    shop.rotation.y = -angle;

    group.add(shop);
}

// Create sparkle particle effect
function createSparkle(position) {
    const geometry = new THREE.SphereGeometry(0.1, 8, 8);
    const material = new THREE.MeshBasicMaterial({
        color: new THREE.Color().setHSL(Math.random(), 1, 0.7),
        transparent: true,
        opacity: 1
    });
    const sparkle = new THREE.Mesh(geometry, material);
    sparkle.position.copy(position);
    sparkle.velocity = new THREE.Vector3(
        (Math.random() - 0.5) * 0.5,
        (Math.random() - 0.5) * 0.5,
        (Math.random() - 0.5) * 0.5
    );
    sparkle.life = 1.0;
    scene.add(sparkle);
    sparkles.push(sparkle);
}

// Create explosion effect
function createExplosion(position) {
    for (let i = 0; i < 30; i++) {
        const geometry = new THREE.SphereGeometry(0.3, 8, 8);
        const material = new THREE.MeshBasicMaterial({
            color: new THREE.Color().setHSL(Math.random() * 0.3, 1, 0.6),
            transparent: true,
            opacity: 1
        });
        const particle = new THREE.Mesh(geometry, material);
        particle.position.copy(position);
        particle.velocity = new THREE.Vector3(
            (Math.random() - 0.5) * 3,
            Math.random() * 3,
            (Math.random() - 0.5) * 3
        );
        particle.life = 1.0;
        scene.add(particle);
        explosions.push(particle);
    }
}

// Create beautiful trail particle behind pig
function createTrailParticle(position) {
    const geometry = new THREE.SphereGeometry(0.2, 8, 8);
    const hue = Math.random() * 0.3 + 0.5; // Blue to pink range
    const color = new THREE.Color().setHSL(hue, 1.0, 0.7);

    const material = new THREE.MeshBasicMaterial({
        color: color,
        transparent: true,
        opacity: 0.8,
        blending: THREE.AdditiveBlending
    });

    const particle = new THREE.Mesh(geometry, material);
    particle.position.copy(position);
    particle.position.x += (Math.random() - 0.5) * 2;
    particle.position.y += (Math.random() - 0.5) * 2;
    particle.position.z += (Math.random() - 0.5) * 2;

    particle.velocity = new THREE.Vector3(
        (Math.random() - 0.5) * 0.3,
        Math.random() * 0.5 - 0.2,
        (Math.random() - 0.5) * 0.3
    );
    particle.life = 1.0;
    particle.scale.set(1, 1, 1);

    scene.add(particle);
    pigTrailParticles.push(particle);
}

// Create atmospheric particles based on altitude
function createAtmosphericParticles() {
    // Create floating particles for different atmospheric layers
    for (let i = 0; i < 200; i++) {
        const geometry = new THREE.SphereGeometry(0.5 + Math.random() * 1, 6, 6);

        // Determine particle type based on altitude
        const altitude = (Math.random() - 0.5) * 4000;
        let color, emissiveIntensity;

        if (altitude > 1000) {
            // Space - bright blue/white stardust
            color = new THREE.Color().setHSL(0.6, 0.8, 0.9);
            emissiveIntensity = 0.8;
        } else if (altitude > 0) {
            // Upper atmosphere - aurora colors
            color = new THREE.Color().setHSL(Math.random() * 0.3 + 0.5, 0.9, 0.7);
            emissiveIntensity = 0.6;
        } else if (altitude > -1200) {
            // Mid atmosphere - wispy white
            color = new THREE.Color(0xffffff);
            emissiveIntensity = 0.3;
        } else {
            // Lower atmosphere - soft glowing particles
            color = new THREE.Color().setHSL(0.1, 0.3, 0.8);
            emissiveIntensity = 0.4;
        }

        const material = new THREE.MeshStandardMaterial({
            color: color,
            emissive: color,
            emissiveIntensity: emissiveIntensity,
            transparent: true,
            opacity: 0.6,
            blending: THREE.AdditiveBlending,
            fog: false
        });

        const particle = new THREE.Mesh(geometry, material);
        particle.position.set(
            (Math.random() - 0.5) * 1000,
            altitude,
            (Math.random() - 0.5) * 1000
        );

        particle.userData.velocity = new THREE.Vector3(
            (Math.random() - 0.5) * 0.2,
            (Math.random() - 0.5) * 0.1,
            (Math.random() - 0.5) * 0.2
        );
        particle.userData.baseAltitude = altitude;
        particle.userData.floatPhase = Math.random() * Math.PI * 2;
        particle.userData.baseEmissiveIntensity = emissiveIntensity; // Store original intensity

        scene.add(particle);
        atmosphericParticles.push(particle);
    }

    console.log('✨ Created', atmosphericParticles.length, 'atmospheric particles');
}

// Create Earth globe - OPTIMIZED FOR PERFORMANCE
function createGround() {
    console.log('Creating Earth...');
    // MUCH lower poly count to eliminate lag - 32 segments instead of 64
    const earthGeometry = new THREE.SphereGeometry(500, 32, 32);

    // Use preloaded earth textures - use MeshStandardMaterial to respond to lighting and fog
    const earthMaterial = new THREE.MeshStandardMaterial({
        map: earthTexturesPreload.albedo,
        roughness: 0.8,
        metalness: 0.1,
        fog: false // Disable fog on Earth so it stays blue
    });

    const earth = new THREE.Mesh(earthGeometry, earthMaterial);
    earth.position.y = -2200; // Raised from -2300 to hide bottom seam

    // Rotate Earth so California is on top (37°N, 119°W)
    earth.rotation.y = -Math.PI * (119 / 180) + Math.PI;
    earth.rotation.x = -Math.PI * (53 / 180);

    scene.add(earth);
    console.log('Earth added to scene');

    // Add cloud layer - also simplified
    const cloudGeometry = new THREE.SphereGeometry(510, 32, 32);
    const cloudMaterial = new THREE.MeshStandardMaterial({
        map: earthTexturesPreload.clouds,
        transparent: true,
        opacity: 0.4,
        depthWrite: false,
        fog: false, // Disable fog on clouds
        roughness: 1.0,
        metalness: 0.0
    });
    const clouds = new THREE.Mesh(cloudGeometry, cloudMaterial);
    clouds.position.y = -2200; // Raised to match earth
    clouds.rotation.y = earth.rotation.y;
    clouds.rotation.x = earth.rotation.x;
    scene.add(clouds);
    console.log('Earth clouds added to scene');
}

// Lighting
function setupLighting() {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xffd700, 2.5);
    sunLight.position.set(200, 300, 200);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    scene.add(sunLight);

    const fillLight = new THREE.DirectionalLight(0x87ceeb, 1);
    fillLight.position.set(-150, 100, -150);
    scene.add(fillLight);

    // Rim lights on pig
    const rimLight1 = new THREE.PointLight(0xffb6c1, 3, 50);
    rimLight1.position.set(0, 5, -10);
    scene.add(rimLight1);

    const rimLight2 = new THREE.PointLight(0xff69b4, 2, 40);
    rimLight2.position.set(-10, 0, 10);
    scene.add(rimLight2);
}

// Initialize scene
function init() {
    pig = createPig();
    pig.add(createBalloons());
    pig.position.y = 0;
    pig.visible = false; // Hide pig until journey starts
    scene.add(pig);

    createSun();
    createMoon();
    createRocket();
    createRocket(); // Add second rocket
    createRocket(); // Add third rocket
    createUFO(); // UFO in space
    createHermes(); // Hermes spacecraft way up in space
    createHotAirBalloon(); // Small hot air balloon in background
    createUpHouse(); // Up house with actual 3D model and balloons
    // createAirplane(); // Removed - user saw two objects that looked similar
    createBirds();
    createClouds();
    createGround();

    // Create rocket with banner
    createRocketWithBanner();
    createPlaneWithBanner('PORTFOLIO 2024', new THREE.Vector3(-120, -800, -250), Math.PI / 2); // Even further back in background

    // Info and buttons are now in HTML overlay, not 3D space

    setupLighting();

    camera.position.set(0, 0, 25);
    camera.lookAt(0, 0, 0);

    // Hide loading screen
    document.getElementById('loading').style.display = 'none';

    // Listen for journey start event
    window.addEventListener('journeyStart', () => {
        journeyStarted = true;
        pig.visible = true;
        // Music is already playing from HTML audio element

        // Create stars when journey starts (background only, not particles)
        createStars();
        console.log('🎬 Journey started!');
    });

    // Listen for start descent event (automatic descent)
    window.addEventListener('startDescent', () => {
        isDescending = true;
        console.log('🚀 Auto-descent started!');
    });
}

// Update layer info - now handled by time-based timeline in index.html
function updateLayerInfo() {
    // Layer info and career items now appear on a time-based schedule
    // synced with the music (5 second intervals)
    // See showCareerInfoTimeline() in index.html
}

// Click interaction
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

window.addEventListener('click', (event) => {
    if (!journeyStarted) return;

    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);

    // Check for clickable 3D buttons
    const clickableButtons = scene.children.filter(obj => obj.userData.isClickable);
    const intersects = raycaster.intersectObjects(clickableButtons);

    if (intersects.length > 0) {
        const url = intersects[0].object.userData.url;
        if (url) {
            window.open(url, '_blank');
        }
    }
});

// Animation loop
function animate() {
    requestAnimationFrame(animate);

    const time = Date.now() * 0.001;


    // Pig animations with spinning as it falls
    if (pig && journeyStarted) {
        // Position based on scroll - pig lands on top of Earth sphere
        // Earth radius is 500, center at -2200, so surface is at -1700
        const earthSurfaceY = -1700;
        const targetY = -scrollProgress * 2300;

        // No deceleration - constant speed all the way down
        // ONLY control position with scroll when not floating back up
        if (!pigWalkingAway) {
            pig.position.y = Math.max(targetY, earthSurfaceY); // Direct position, no smoothing
        }

        // Check if pig is actually moving
        const isMoving = Math.abs(scrollProgress - lastScrollProgress) > 0.0001;
        lastScrollProgress = scrollProgress;

        // Create atmospheric particles ONCE when pig first starts moving
        if (isMoving && !pigLanded && !atmosphericParticlesCreated) {
            createAtmosphericParticles();
            atmosphericParticlesCreated = true;
            console.log('✨ Pig is moving - atmospheric particles spawned!');
        }

        // Create beautiful trail particles ONLY when pig is moving
        if (isMoving && !pigLanded && Math.random() > 0.7) {
            createTrailParticle(pig.position);
        }

        // Check if just landed (when touching surface)
        if (pig.position.y <= earthSurfaceY + 2 && !pigLanded) {
            pigLanded = true;
            pigWalkingAway = false;
            balloonsReleased = false;
            landingTime = time;
            createExplosion(pig.position);
            pig.rotation.set(0, 0, 0);
        }

        // Once pig starts floating back to space, it stays floating - don't reset!
        // (Removed reset logic that was causing glitching)

        // Spinning animation when falling
        if (!pigLanded) {
            pig.rotation.y += 0.02;
            pig.rotation.x = Math.sin(time * 0.5) * 0.2 + scrollProgress * 0.5;
            pig.rotation.z = Math.cos(time * 0.3) * 0.15;
        }

        // Pig floats away IMMEDIATELY after landing (held by balloons)
        if (pigLanded && !pigWalkingAway && (time - landingTime) > 0.1) {
            pigWalkingAway = true;
        }

        if (pigWalkingAway) {
            // Float QUICKLY UP to space! (balloons lifting pig away)
            const floatTime = time - landingTime - 0.1; // Time since starting to float
            pig.position.y = earthSurfaceY + floatTime * 5; // Start at ground, float up quickly
            pig.rotation.y += 0.02; // Gentle spin

            // Gentle swaying motion as it rises
            pig.position.x = Math.sin(time * 0.8) * 3; // Gentle drift side to side
            pig.rotation.x = Math.sin(time * 2) * 0.1;
            pig.rotation.z = Math.cos(time * 1.5) * 0.1;

            // Let it float far into the sky!
        }

        // Balloon animations - keep floating throughout
        pig.children.forEach((child, i) => {
            if (child.type === 'Group') { // Balloon group
                let balloonIndex = 0;
                child.children.forEach((meshOrObj, j) => {
                    // Animate balloons
                    if (meshOrObj.geometry && meshOrObj.geometry.type === 'SphereGeometry') {
                        const baseY = 4 + (balloonIndex % 8) * 0.2;
                        meshOrObj.position.y = baseY + Math.sin(time * 3 + j) * 0.5;
                        meshOrObj.rotation.y += 0.01;
                        balloonIndex++;
                    }

                    // Update string geometry to follow balloon
                    if (meshOrObj.geometry && meshOrObj.geometry.type === 'TubeGeometry' && meshOrObj.userData.balloonIndex !== undefined) {
                        const balloonIdx = meshOrObj.userData.balloonIndex;
                        const correspondingBalloon = child.children.find((c, idx) =>
                            c.geometry && c.geometry.type === 'SphereGeometry' && idx < j && Math.floor(idx / 3) === balloonIdx
                        );

                        if (correspondingBalloon) {
                            // Recreate string curve to follow balloon
                            const angle = (balloonIdx / 8) * Math.PI * 2;
                            const radius = 2 + 0.25;
                            const stringCurve = new THREE.CatmullRomCurve3([
                                new THREE.Vector3(correspondingBalloon.position.x, correspondingBalloon.position.y - 0.6, correspondingBalloon.position.z),
                                new THREE.Vector3(correspondingBalloon.position.x * 0.8 + Math.sin(balloonIdx) * 0.3, correspondingBalloon.position.y - 1.5, correspondingBalloon.position.z * 0.8 + Math.cos(balloonIdx) * 0.3),
                                new THREE.Vector3(correspondingBalloon.position.x * 0.5 + Math.sin(balloonIdx * 2) * 0.5, correspondingBalloon.position.y - 2.5, correspondingBalloon.position.z * 0.5 + Math.cos(balloonIdx * 2) * 0.5),
                                new THREE.Vector3(Math.sin(balloonIdx * 3) * 0.3, correspondingBalloon.position.y - 3.5, Math.cos(balloonIdx * 3) * 0.3),
                                new THREE.Vector3(0, 0.5, 0)
                            ]);
                            meshOrObj.geometry.dispose();
                            meshOrObj.geometry = new THREE.TubeGeometry(stringCurve, 30, 0.03, 8, false);
                        }
                    }
                });
            }
        });

        // No sparkles - removed per user request
    }

    // Camera - SPIRAL FALLING perspective looking down towards ground
    const cameraDistance = 35;
    let cameraOffset;
    let lookAtTarget;

    if (pigLanded && !pigWalkingAway) {
        // Fixed camera position when just landed (brief moment)
        cameraOffset = new THREE.Vector3(0, -1450, 100); // Pulled back and elevated overhead view
        lookAtTarget = new THREE.Vector3(0, -1600, 0); // Look at landing spot, tilted up to avoid horizon
    } else if (pigWalkingAway) {
        // Camera pans out as pig floats back to space - NO LOCK, keep following
        const floatTime = time - landingTime - 0.1;
        const panDistance = 100 + floatTime * 30; // Keep panning out continuously
        const heightBoost = floatTime * 20; // Keep rising with pig

        cameraOffset = new THREE.Vector3(0, pig.position.y + heightBoost, panDistance);
        lookAtTarget = new THREE.Vector3(pig.position.x, pig.position.y, pig.position.z);
    } else {
        // SPIRAL DESCENT - multiple rotations as you fall
        const spiralRotations = 3; // 3 full rotations during descent
        const spiralAngle = scrollProgress * Math.PI * 2 * spiralRotations;

        // Pan out much more as you get closer to ground (starts when blue atmosphere visible)
        let spiralRadius;
        let heightOffset;
        if (scrollProgress < 0.75) {
            spiralRadius = 30 + (1 - scrollProgress) * 20; // Normal distance
            heightOffset = 15 - scrollProgress * 10; // Start above, get level/below
        } else {
            // Pan out significantly in last 25% AND tilt up (when blue atmosphere visible)
            const endProgress = (scrollProgress - 0.75) / 0.25;
            spiralRadius = 40 + endProgress * 100; // Pan out to 140 units
            heightOffset = 5 + endProgress * 120; // Tilt camera WAY up (raise height significantly)
        }

        // Camera angle tilts to look down more as you descend (but less at the end)
        let lookAheadY;
        if (scrollProgress < 0.75) {
            lookAheadY = pig.position.y - scrollProgress * 50; // Look further down as you fall
        } else {
            // At the end, look more level/up to avoid horizon and show earth from above
            const endProgress = (scrollProgress - 0.75) / 0.25;
            lookAheadY = pig.position.y - 37.5 + endProgress * 80; // Tilt view way up
        }

        cameraOffset = new THREE.Vector3(
            Math.sin(spiralAngle) * spiralRadius,
            pig.position.y + heightOffset,
            Math.cos(spiralAngle) * spiralRadius + 15
        );
        lookAtTarget = new THREE.Vector3(pig.position.x, lookAheadY, pig.position.z);
    }

    // Use constant lerp speed - no slowdown
    camera.position.lerp(cameraOffset, 0.15);
    camera.lookAt(lookAtTarget);

    // Animate layers - ALWAYS RUNS
    if (pigWalkingAway && time - landingTime > 7) {
        // Log every 60 frames when camera is locked
        if (Math.floor(time * 60) % 60 === 0) {
            console.log('🚨 ANIMATION LOOP STILL RUNNING AFTER LOCK! Layers:', atmosphereLayers.length);
        }
    }

    atmosphereLayers.forEach(layer => {
        if (layer.type === 'rocket') {
            // Animate rocket exhaust flame
            layer.group.children.forEach((child, i) => {
                if (child.material && child.material.color && child.material.color.getHex() === 0xff6600) {
                    child.scale.y = 1 + Math.sin(time * 10) * 0.3;
                    child.material.opacity = 0.6 + Math.sin(time * 10) * 0.2;
                }
            });
        }

        if (layer.type === 'clouds') {
            layer.group.children.forEach((cloud, i) => {
                // ALWAYS move clouds - continuously drift
                cloud.position.x += 0.5; // Constant drift speed
                cloud.rotation.y += 0.001;
                if (cloud.position.x > 300) cloud.position.x = -300;

                // Debug every 100 frames
                if (Math.floor(time * 10) % 100 === 0 && i === 0) {
                    console.log('☁️ Cloud moving! X:', cloud.position.x.toFixed(2));
                }
            });
        }

        if (layer.type === 'groundClouds') {
            layer.group.children.forEach((cloud, i) => {
                cloud.position.x += Math.sin(time * 0.5 + i) * 0.1;
                cloud.rotation.y += 0.0005;
            });
        }

        if (layer.type === 'birds') {
            layer.group.children.forEach((bird, i) => {
                // Flapping wings animation
                const flap = Math.sin(time * 5 + bird.userData.wingPhase) * 0.5;
                bird.children.forEach(child => {
                    if (child.position.x < 0) {
                        // Left wing
                        child.rotation.y = flap;
                    } else if (child.position.x > 0) {
                        // Right wing
                        child.rotation.y = -flap;
                    }
                });

                // Gentle circular flight path
                bird.position.x += Math.sin(time * 0.3 + i) * 0.2;
                bird.position.z += Math.cos(time * 0.3 + i) * 0.2;
            });
        }
    });

    // Rotate and manage particles (stars and aerial sky)
    particles.forEach(p => {
        p.rotation.y += 0.0003;
        p.rotation.x += 0.0001;

        // Star sphere - only in space
        if (p.userData.isStarSphere) {
            if (scrollProgress < 0.08) {
                p.visible = true;
                p.material.opacity = 0.9;
            } else if (scrollProgress < 0.12) {
                p.visible = true;
                const fadeOut = (scrollProgress - 0.08) / 0.04;
                p.material.opacity = 0.9 * (1 - fadeOut);
            } else {
                p.visible = false;
            }
        }

        // Aerial cloud sphere - only in atmosphere
        if (p.userData.isAerialSphere) {
            if (scrollProgress < 0.15) {
                p.visible = false;
            } else if (scrollProgress < 0.25) {
                p.visible = true;
                const fadeIn = (scrollProgress - 0.15) / 0.10;
                p.material.opacity = fadeIn * 0.8;
            } else if (scrollProgress < 0.90) {
                p.visible = true;
                p.material.opacity = 0.8;
            } else {
                p.visible = true;
                const fadeOut = (scrollProgress - 0.90) / 0.10;
                p.material.opacity = 0.8 * (1 - fadeOut);
            }
        }

        // Particle stars - only in space
        if (!p.userData.isStarSphere && !p.userData.isAerialSphere) {
            if (scrollProgress < 0.08) {
                p.visible = true;
                if (p.material.opacity !== undefined) p.material.opacity = 0.9;
            } else if (scrollProgress < 0.12) {
                p.visible = true;
                const fadeOut = (scrollProgress - 0.08) / 0.04;
                if (p.material.opacity !== undefined) p.material.opacity = 0.9 * (1 - fadeOut);
            } else {
                p.visible = false;
            }
        }
    });

    // Update sky based on altitude - SMOOTH gradual transitions
    if (scrollProgress < 0.10) {
        // In space - hide sky
        sky.visible = false;
    } else if (scrollProgress < 0.25) {
        // Thermosphere - sky VERY gradually starts appearing
        sky.visible = true;
        const fadeIn = (scrollProgress - 0.10) / 0.15; // 0 to 1
        sky.material.opacity = fadeIn * 0.15; // Very subtle
        sky.material.transparent = true;
        updateSun(88, 180); // Sun very high
        skyUniforms['turbidity'].value = 1 + fadeIn;
        skyUniforms['rayleigh'].value = 0.3 + fadeIn * 0.5;
    } else if (scrollProgress < 0.40) {
        // Mesosphere - sky gradually becomes clearer
        sky.visible = true;
        const fadeIn = (scrollProgress - 0.25) / 0.15; // 0 to 1
        sky.material.opacity = 0.15 + fadeIn * 0.25; // 0.15 to 0.4
        sky.material.transparent = true;
        updateSun(85 - fadeIn * 8, 180);
        skyUniforms['turbidity'].value = 2 + fadeIn * 3;
        skyUniforms['rayleigh'].value = 0.8 + fadeIn * 0.7;
    } else if (scrollProgress < 0.55) {
        // Stratosphere - clear blue sky emerging
        sky.visible = true;
        const fadeIn = (scrollProgress - 0.40) / 0.15; // 0 to 1
        sky.material.opacity = 0.4 + fadeIn * 0.35; // 0.4 to 0.75
        sky.material.transparent = true;
        updateSun(77 - fadeIn * 10, 180);
        skyUniforms['turbidity'].value = 5 + fadeIn * 3;
        skyUniforms['rayleigh'].value = 1.5 + fadeIn * 0.5;
    } else if (scrollProgress < 0.75) {
        // Upper Troposphere - sky gets brighter
        sky.visible = true;
        const fadeIn = (scrollProgress - 0.55) / 0.20; // 0 to 1
        sky.material.opacity = 0.75 + fadeIn * 0.25; // 0.75 to 1.0
        sky.material.transparent = fadeIn < 1;
        updateSun(67 - fadeIn * 12, 180);
        skyUniforms['turbidity'].value = 8 + fadeIn * 2;
        skyUniforms['rayleigh'].value = 2 + fadeIn * 0.5;
    } else {
        // Lower Troposphere & Ground - full bright sky
        sky.visible = true;
        const fadeIn = (scrollProgress - 0.75) / 0.25; // 0 to 1
        sky.material.opacity = 1;
        sky.material.transparent = false;
        updateSun(55 - fadeIn * 10, 180); // Sun gradually lower
        skyUniforms['turbidity'].value = 10 + fadeIn * 2;
        skyUniforms['rayleigh'].value = 2.5 + fadeIn * 0.5;
    }


    // Update sparkles
    for (let i = sparkles.length - 1; i >= 0; i--) {
        const sparkle = sparkles[i];
        sparkle.position.add(sparkle.velocity);
        sparkle.life -= 0.02;
        sparkle.material.opacity = sparkle.life;
        sparkle.scale.setScalar(sparkle.life);

        if (sparkle.life <= 0) {
            scene.remove(sparkle);
            sparkles.splice(i, 1);
        }
    }

    // Update explosions
    for (let i = explosions.length - 1; i >= 0; i--) {
        const particle = explosions[i];
        particle.position.add(particle.velocity);
        particle.velocity.y -= 0.05; // Gravity
        particle.life -= 0.015;
        particle.material.opacity = particle.life;
        particle.scale.setScalar(particle.life * 2);

        if (particle.life <= 0) {
            scene.remove(particle);
            explosions.splice(i, 1);
        }
    }

    // Update beautiful trail particles
    for (let i = pigTrailParticles.length - 1; i >= 0; i--) {
        const particle = pigTrailParticles[i];
        particle.position.add(particle.velocity);
        particle.velocity.multiplyScalar(0.98); // Drag
        particle.life -= 0.02;
        particle.material.opacity = particle.life * 0.8;
        particle.scale.setScalar(particle.life * 1.5);

        if (particle.life <= 0) {
            scene.remove(particle);
            particle.geometry.dispose();
            particle.material.dispose();
            pigTrailParticles.splice(i, 1);
        }
    }

    // Animate atmospheric particles with floating motion
    atmosphericParticles.forEach((particle, i) => {
        // Gentle floating motion
        particle.userData.floatPhase += 0.01;
        particle.position.add(particle.userData.velocity);

        // Oscillate around base altitude
        particle.position.y = particle.userData.baseAltitude +
            Math.sin(particle.userData.floatPhase) * 5;

        // Wrap around edges for infinite field
        if (particle.position.x > 500) particle.position.x = -500;
        if (particle.position.x < -500) particle.position.x = 500;
        if (particle.position.z > 500) particle.position.z = -500;
        if (particle.position.z < -500) particle.position.z = 500;

        // Pulse emissive intensity
        const baseIntensity = particle.userData.baseEmissiveIntensity;
        particle.material.emissiveIntensity = baseIntensity +
            Math.sin(time * 2 + i) * 0.2;

        // Gentle rotation
        particle.rotation.y += 0.005;
        particle.rotation.x += 0.003;
    });

    // Reduced fog to minimize grey seam visibility
    scene.fog = new THREE.FogExp2(0x000000, 0.0003); // Much less fog
    renderer.setClearColor(0x000000);

    // Update depth of field focus to follow the pig
    if (USE_POST_PROCESSING && pig && journeyStarted && depthOfFieldEffect) {
        const distance = camera.position.distanceTo(pig.position);
        depthOfFieldEffect.uniforms.get('focusDistance').value = distance / 1000;

        // Adjust bokeh intensity based on altitude for dramatic effect
        const altitudeProgress = Math.abs(pig.position.y / 2300);
        const bokehIntensity = THREE.MathUtils.lerp(2.0, 5.0, altitudeProgress);
        depthOfFieldEffect.bokehScale.value = bokehIntensity;
    }

    // Render with post-processing (with fallback)
    if (USE_POST_PROCESSING && composer) {
        try {
            composer.render();
        } catch (error) {
            console.error('Post-processing error:', error);
            renderer.render(scene, camera);
        }
    } else {
        renderer.render(scene, camera);
    }
}

// Auto-descend - now starts automatically
let isDescending = false;
let descentSpeed = 0.00015; // 2x slower for better sync with music

// Note: Auto-descent now starts automatically via 'startDescent' event
// Click to pause/resume
window.addEventListener('click', (e) => {
    if (!journeyStarted) return;
    if (pigLanded) return;

    // Toggle descent on click
    isDescending = !isDescending;
    console.log(isDescending ? '▶️ Resumed' : '⏸️ Paused');
});

// Also allow scroll wheel for manual control
let scrollVelocity = 0;
window.addEventListener('wheel', (e) => {
    if (!journeyStarted) return;
    if (pigLanded) return;

    // Manual scroll pauses auto-descent
    isDescending = false;

    scrollVelocity += e.deltaY * 0.00002; // Slower scroll wheel speed
    scrollVelocity = Math.max(-0.01, Math.min(0.01, scrollVelocity));
});

function updateScroll() {
    // Auto-descent when active
    if (isDescending && !pigLanded) {
        scrollProgress += descentSpeed;
    }

    // Manual scroll
    scrollProgress += scrollVelocity;

    // Lock at ground level once landed
    if (pigLanded) {
        scrollProgress = 1;
        scrollVelocity = 0;
        isDescending = false;
    } else {
        scrollProgress = Math.max(0, Math.min(1, scrollProgress));
    }

    scrollVelocity *= 0.95;

    updateLayerInfo();

    requestAnimationFrame(updateScroll);
}

// Handle window resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    if (USE_POST_PROCESSING && composer) {
        composer.setSize(window.innerWidth, window.innerHeight);
    }
});

// Start
init();
animate();
updateScroll();

console.log('🎈🐷 CRAZY Pig\'s Atmospheric Journey! 🌍✨🎆');
