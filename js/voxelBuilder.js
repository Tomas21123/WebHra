// ---------- Voxel Builder & Geometrie ----------
const VX = 0.05;

const bx = (a, x0, y0, z0, x1, y1, z1, c) => {
  for (let x = x0; x < x1; x++) {
    for (let y = y0; y < y1; y++) {
      for (let z = z0; z < z1; z++) {
        a.push([x, y, z, c]);
      }
    }
  }
};

function buildVoxGeometry(list, ox, oy, oz) {
  if (!list || !list.length) return null;
  const map = new Map(), k = (x, y, z) => x + ',' + y + ',' + z;
  for (const v of list) map.set(k(v[0], v[1], v[2]), v);

  const P = [], C = [], I = [], c = new THREE.Color();
  let n = 0;

  for (const v of map.values()) {
    const x = v[0], y = v[1], z = v[2];
    c.set(v[3]);
    const j = 0.92 + ((x * 7 + y * 13 + z * 5) & 3) * 0.027;
    for (const F of FACES) {
      const q = F.n;
      if (map.has(k(x + q[0], y + q[1], z + q[2]))) continue;
      for (const [su, sv] of CORN) {
        P.push(
          (x + 0.5 + q[0] * 0.5 + su * F.u[0] * 0.5 + sv * F.v[0] * 0.5 - ox) * VX,
          (y + 0.5 + q[1] * 0.5 + su * F.u[1] * 0.5 + sv * F.v[1] * 0.5 - oy) * VX,
          (z + 0.5 + q[2] * 0.5 + su * F.u[2] * 0.5 + sv * F.v[2] * 0.5 - oz) * VX
        );
        C.push(c.r * j, c.g * j, c.b * j);
      }
      I.push(n, n + 1, n + 2, n, n + 2, n + 3);
      n += 4;
    }
  }
  if (!P.length) return null;
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(C, 3));
  g.setIndex(I);
  g.computeVertexNormals();
  return g;
}

function setVoxGroupMesh(grp, list, ox, oy, oz, keepPos = false) {
  let mesh = grp.children.find(c => c.isMesh);
  if (mesh) {
    if (mesh.geometry) mesh.geometry.dispose();
    grp.remove(mesh);
  }
  const geom = buildVoxGeometry(list, ox, oy, oz);
  if (geom) {
    const m = new THREE.Mesh(geom, new THREE.MeshLambertMaterial({ vertexColors: true }));
    grp.add(m);
  }
  if (!keepPos) grp.position.set(ox * VX, oy * VX, oz * VX);
}

function createSingleVoxMesh(list, ox, oy, oz) {
  const g = buildVoxGeometry(list, ox, oy, oz);
  const grp = new THREE.Group();
  if (g) grp.add(new THREE.Mesh(g, new THREE.MeshLambertMaterial({ vertexColors: true })));
  grp.position.set(ox * VX, oy * VX, oz * VX);
  return grp;
}
