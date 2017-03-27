import * as THREE from 'three';
import OrbitControlsGenerator = require('three-orbit-controls');
import ndarray = require('ndarray');

export const generateField = (
  xCells: number, yCells: number, zCells: number, random: number = 0
): ndarray =>
  ndarray(
    new Array(xCells * yCells * zCells).fill(null).map(() => Math.random() < random ? 1 : 0),
    [xCells, yCells, zCells]
    // @TODO maybe add offset
  );

export function createNewGeneration(prev: ndarray, next: ndarray): ndarray {
  const nx = prev.shape[0],
    ny = prev.shape[1],
    nz = prev.shape[2];

  // loop all cells except the outer line
  for (let x = 1; x < nx - 1; ++x) {
    for (let y = 1; y < ny - 1; ++y) {
      if (nz > 1) {
        for (let z = 1; z < nz - 1; ++z) {

          let n = 0;

          // evaluate all neighbors
          for (let dx = -1; dx <= 1; ++dx) {
            for (let dy = -1; dy <= 1; ++dy) {
              for (let dz = -1; dz <= 1; ++dz) {

                // ignore current cell
                if (!dx && !dy && !dz) {
                  continue;
                }

                // count neighbor if set
                n += prev.get(x + dx, y + dy, z + dz) ? 1 : 0;

              }
            }
          }

          next.set(
            x, y, z,
            (prev.get(x, y, z) > 0 && (5 <= n && n <= 7)) || (prev.get(x, y, z) === 0 && (6 <= n && n <= 6))
            ? 1
            : 0,
          );
        }
      } else {
        let n = 0;

        // evaluate all neighbors
        for (let dx = -1; dx <= 1; ++dx) {
          for (let dy = -1; dy <= 1; ++dy) {

            // ignore current cell
            if (!dx && !dy) {
              continue;
            }

            // count neighbor if set
            n += prev.get(x + dx, y + dy, nz) ? 1 : 0;

          }
        }

        next.set(x, y, nz, (prev.get(x, y, nz) && (n === 2 || n === 3) || n === 3 ? 1 : 0));
      }
    }
  }

  return next;
}

interface GameOptions {
  width: number;
  height: number;
  xCells: number;
  yCells: number;
  zCells: number;
  density: number;
  size: number;
}

const defaultGameOptions: GameOptions = {
  width: 500,
  height: 500,
  size: 3,
  xCells: 75,
  yCells: 75,
  zCells: 75,
  density: 0.15,
};

let rqiHandle: number | void;
let scene: THREE.Scene | void;
let camera: THREE.Camera | void;
let renderer: THREE.WebGLRenderer | void;
let controls: THREE.OrbitControls | void;
let field: ndarray | void;
let gameOptions: GameOptions | void;
let particleSystem: THREE.ParticleSystem | void;
let particlesGeo = new THREE.Geometry();
let pMaterial: THREE.Material;
let particles: THREE.Vertex[][][];

export function start(
  canvas: HTMLCanvasElement,
  options: Partial<GameOptions> = {},
) {
  const cleanOptions: Partial<GameOptions> = JSON.parse(JSON.stringify(options));
  gameOptions = { ...defaultGameOptions, ...cleanOptions };

  scene = new THREE.Scene();

  camera = new THREE.PerspectiveCamera();
  camera.position.z = 120;

  renderer = new THREE.WebGLRenderer({ canvas });
  renderer.setSize(gameOptions.width, gameOptions.height);

  const OrbitControls = OrbitControlsGenerator(THREE);
  controls = new OrbitControls(camera);
  controls.target.set(0, 0, 0);

  setup();
  render();
}

export function stop() {
  if (rqiHandle) {
    cancelAnimationFrame(rqiHandle);
  }

  controls = undefined;
  renderer = undefined;
  camera = undefined;

  if (scene) {
    scene.children.forEach(child => scene && scene.remove(child));
  }
  scene = undefined;
}

function setup() {
  if (!scene || !gameOptions) {
    return;
  }

  field = generateField(gameOptions.xCells, gameOptions.yCells, gameOptions.zCells, gameOptions.density);

  pMaterial = new THREE.ParticleBasicMaterial({
    color: 0xFFFFCC,
    size: gameOptions.size,
    map: THREE.ImageUtils.loadTexture('./particle.png'),
    blending: THREE.AdditiveBlending,
    transparent: true
  });

  const { xCells, yCells, zCells } = gameOptions;
  const xOffset = (xCells ) / 2;
  const yOffset = (yCells ) / 2;
  const zOffset = (zCells ) / 2;

  particles = new Array(xCells).fill(null).map((a, x) =>
    new Array(yCells).fill(null).map((b, y) =>
      new Array(zCells).fill(null).map((c, z) => new THREE.Vector3(
        x  - xOffset,
        y  - yOffset,
        z  - zOffset,
      ))
    )
  );

  for (let x = 1; x < xCells; x++) {
    for (let y = 1; y < yCells; y++) {
      for (let z = 1; z < zCells; z++) {
        particlesGeo.vertices.push(particles[x][y][z]);
      }
    }
  }

  particleSystem = new THREE.ParticleSystem(particlesGeo, pMaterial);
  scene.add(particleSystem);
}

function update() {
  if (scene && field && gameOptions) {

    const { xCells, yCells, zCells } = gameOptions;
    const xOffset = (xCells ) / 2;
    const yOffset = (yCells ) / 2;
    const zOffset = (zCells ) / 2;

    let live = 0, dead = 0;
    for (let x = 1; x < xCells; x++) {
      for (let y = 1; y < yCells; y++) {
        for (let z = 1; z < zCells; z++) {
          const current = particles[x][y][z];
          if (field.get(x, y, z) > 0) {
            current.x = x  - xOffset;
            current.y = y  - yOffset;
            current.z = z  - zOffset;
            live += 1;
          } else {
            current.x = 9999;
            current.y = 9999;
            current.z = 9999;
            dead += 1;
          }
        }
      }
    }

    // console.log(`live: ${live}, dead: ${dead}`);

    particlesGeo.verticesNeedUpdate = true;
    if (particleSystem) {
      particleSystem.matrixWorldNeedsUpdate = true;
    }
  }
}

function render() {
  if (renderer && scene && camera && particleSystem && gameOptions && field) {
    renderer.render(scene, camera);

    const nextField = generateField(gameOptions.xCells, gameOptions.yCells, gameOptions.zCells);
    createNewGeneration(field, nextField);
    field = nextField;
    update();
    // console.log('verticies', particlesGeo.vertices.length);
    /* */
    particleSystem.rotation.y += 0.01;

  }
  rqiHandle = requestAnimationFrame(render);

}

/*
const cubeGeo = new THREE.BoxGeometry(size - 2, size - 2, size - 2);

// @TODO: fix colors
const colors: number[] = [
  0x000000, 0xFFFFFF, 0xFFFFFF, 0xFFFFFF, 0xFFFFFF, 0x0101A2, 0x4539C4, 0x5959DE, 0xFFFFFF, 0xFFFFFF
];

const materials: THREE.Material[] = colors.map(color => new THREE.MeshBasicMaterial({ color }));

function draw() {
  if (scene && field && gameOptions) {
    scene.children.forEach(children => scene && scene.remove(children));

    const xOffset = (gameOptions.xCells * size) / 2;
    const yOffset = (gameOptions.yCells * size) / 2;
    const zOffset = (gameOptions.zCells * size) / 2;

    // const combinedGeo = new THREE.Geometry();

    for (let x = 1; x <= gameOptions.xCells; x++) {
      for (let y = 1; y <= gameOptions.yCells; y++) {
        for (let z = 1; z <= gameOptions.zCells; z++) {
          if (field.get(x, y, z) > 0) {
            const geo = cubeGeo.clone();
            const cube = new THREE.Mesh(geo, materials[field.get(x, y, z)]);
            cube.translateX(x * size - xOffset + 1);
            cube.translateY(y * size - yOffset + 1);
            cube.translateZ(z * size - zOffset + 1);
            // combinedGeo.mergeMesh(cube);
            scene.add(cube);
          }
        }
      }
    }
  }
}

let timer = new Date().getTime();

function render() {
  rqiHandle = requestAnimationFrame(render);

  if (renderer && scene && camera && field && gameOptions) {

    renderer.render(scene, camera);

    if (new Date().getTime() - timer > (gameOptions.zCells > 1 ? 300 : 0)) {
      const nextField = generateField(gameOptions.xCells, gameOptions.yCells, gameOptions.zCells);
      createNewGeneration(field, nextField);
      field = nextField;
      draw();
      timer = new Date().getTime();
    }
  }
}
*/

/*
const cubeGeo = new THREE.BoxGeometry(size - 2, size - 2, size - 2);

const cubeMesh = new THREE.Mesh(cubeGeo);

const mergedMaterials: THREE.Material[] = [
  // 0xFFFFFF, 0xC0C0C0, 0x808080, 0x000000, 0xFF0000, 0x800000, 0xFFFF00,
  // 0x808000, 0x00FF00, 0x008000, 0x00FFFF, 0x008080, 0x0000FF, 0x000080, 0xFF00FF, 0x80008,
  0xFF0000, 0x0000FF, 0x00FF00,
].map(color =>
  new THREE.MeshBasicMaterial({ color })
);

function draw() {
  if (scene && field && gameOptions) {
    scene.children.forEach(children => scene && scene.remove(children));

    const directionalLight = new THREE.DirectionalLight(0xFFFFFF, 1);
    directionalLight.position.set(100, 100, 100);
    scene.add(directionalLight);

    const ambientLight = new THREE.AmbientLight(0xFFFFFF);
    scene.add(ambientLight);

    const xOffset = (gameOptions.xCells * size) / 2;
    const yOffset = (gameOptions.yCells * size) / 2;
    const zOffset = (gameOptions.zCells * size) / 2;


    const mergedGeometries: THREE.Geometry[] = new Array(mergedMaterials.length).fill(new THREE.Geometry());

    for (let x = 1; x <= gameOptions.xCells; x++) {
      for (let y = 1; y <= gameOptions.yCells; y++) {
        for (let z = 1; z <= gameOptions.zCells; z++) {
          if (field.get(x, y, z)) {
            const mesh = cubeMesh.clone();
            mesh.translateX(x * size - xOffset + 1);
            mesh.translateY(y * size - yOffset + 1);
            mesh.translateZ(z * size - zOffset + 1);
            mergedGeometries[(x + y + z) % mergedMaterials.length].mergeMesh(mesh);
          }
        }
      }
    }

    mergedMaterials.forEach((material, index) =>
      scene && scene.add(new THREE.Mesh(mergedGeometries[index], mergedMaterials[index]))
    );
  }
}
*/