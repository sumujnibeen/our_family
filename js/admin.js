// =============================================
// PASSWORD — SHA-256 hash
// Default: "family2024"
// নতুন hash: https://emn178.github.io/online-tools/sha256.html
// =============================================
const ADMIN_HASH = '419fa8a812dc74ea3397e57f7e34e09bf5717359ab16e0f4d3989b582f6db108';

let people = [];
let map = {};
let editingId = null;
let searchMode = 'edit';
let editModalInstance = null;
let deleteModalInstance = null;
let photoModalInstance = null;
let photoEditId = null;
let tempSpouse = [];
let tempChildren = [];

// ===== Password =====
async function checkPassword() {
  const input = document.getElementById('passwordInput').value;
  const hash = await sha256(input);
  if (hash === ADMIN_HASH) {
    sessionStorage.setItem('adminAuth', 'true');
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('adminPanel').style.display = 'block';
    loadData();
  } else {
    const err = document.getElementById('loginError');
    err.innerText = 'পাসওয়ার্ড ভুল হয়েছে ❌';
    document.getElementById('passwordInput').value = '';
    setTimeout(() => err.innerText = '', 3000);
  }
}

function logout() {
  sessionStorage.removeItem('adminAuth');
  location.reload();
}

async function sha256(message) {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

window.addEventListener('load', () => {
  if (sessionStorage.getItem('adminAuth') === 'true') {
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('adminPanel').style.display = 'block';
    loadData();
  }
});

// ===== Load =====
function loadData() {
  fetch('family.json')
    .then(res => res.json())
    .then(data => {
      people = data.people;
      people.forEach(p => map[p.id] = p);
      renderStats();
    })
    .catch(() => showToast('family.json লোড হয়নি ❌'));
}

// ===== Stats =====
function renderStats() {
  const total    = people.length;
  const male     = people.filter(p => p.gender === 'male').length;
  const female   = people.filter(p => p.gender === 'female').length;
  const hasPhoto = people.filter(p => p.photo && p.photo.trim()).length;

  document.getElementById('statsBar').innerHTML = `
    <div class="stat-card">
      <span class="stat-num">${total}</span>
      <span class="stat-label">মোট</span>
    </div>
    <div class="stat-card">
      <span class="stat-num" style="color:var(--male-color)">${male}</span>
      <span class="stat-label">পুরুষ</span>
    </div>
    <div class="stat-card">
      <span class="stat-num" style="color:var(--female-color)">${female}</span>
      <span class="stat-label">মহিলা</span>
    </div>
    <div class="stat-card">
      <span class="stat-num" style="color:var(--accent2)">${hasPhoto}</span>
      <span class="stat-label">ছবি আছে</span>
    </div>
  `;
}

// ===== Search Mode =====
function focusSearch(mode) {
  searchMode = mode;
  const input = document.getElementById('searchInput');
  const label = document.getElementById('searchModeLabel');

  const config = {
    edit:   { text: '✎ এডিট মোড',       color: 'var(--accent2)' },
    delete: { text: '✕ ডিলিট মোড',       color: 'var(--danger)' },
    photo:  { text: '🖼 ছবির নাম খোঁজা', color: 'var(--male-color)' },
  };

  label.innerText   = config[mode].text;
  label.style.color = config[mode].color;
  label.style.display = 'block';

  const placeholders = {
    edit:   'এডিট করতে নাম লিখুন...',
    delete: 'মুছতে নাম লিখুন...',
    photo:  'ছবির নাম খুঁজতে নাম লিখুন...',
  };

  input.placeholder = placeholders[mode];
  input.value = '';
  document.getElementById('searchResults').innerHTML = '';
  input.focus();
}

// ===== Search =====
function searchPerson() {
  const q   = document.getElementById('searchInput').value.trim();
  const box = document.getElementById('searchResults');

  if (!q) { box.innerHTML = ''; return; }

  const results = people.filter(p =>
    p.name.includes(q) ||
    p.name.toLowerCase().includes(q.toLowerCase())
  ).slice(0, 12);

  if (results.length === 0) {
    box.innerHTML = `<div class="search-item">
      <span class="search-item-name" style="color:var(--text-muted)">কোনো ফলাফল নেই</span>
    </div>`;
    return;
  }

  if (searchMode === 'photo') {
    box.innerHTML = results.map(p => {
      const hasPhoto = p.photo && p.photo.trim() !== '';
      return `
        <div class="search-item" onclick="showPhotoModal(${p.id})">
          <div class="gender-dot ${p.gender}"></div>
          <div style="flex:1;min-width:0">
            <div class="search-item-name">${escHtml(p.name)}</div>
            <div class="search-item-meta"
              style="color:${hasPhoto ? 'var(--accent2)' : 'var(--text-muted)'}">
              ${hasPhoto ? '📷 ' + escHtml(p.photo) : '— ছবি নেই —'}
            </div>
          </div>
        </div>`;
    }).join('');
  } else if (searchMode === 'delete') {
    box.innerHTML = results.map(p => `
      <div class="search-item" onclick="confirmDeleteById(${p.id})">
        <div class="gender-dot ${p.gender}"></div>
        <span class="search-item-name">${escHtml(p.name)}</span>
        <span class="search-item-meta" style="color:var(--danger)">✕ মুছুন</span>
      </div>`).join('');
  } else {
    box.innerHTML = results.map(p => `
      <div class="search-item" onclick="openForm(${p.id})">
        <div class="gender-dot ${p.gender}"></div>
        <span class="search-item-name">${escHtml(p.name)}</span>
        <span class="search-item-meta" style="color:var(--text-muted)">✎ এডিট</span>
      </div>`).join('');
  }
}

document.addEventListener('click', (e) => {
  if (!e.target.closest('.search-box')) {
    document.getElementById('searchResults').innerHTML = '';
  }
});

// ===== Photo Modal =====
function showPhotoModal(id) {
  document.getElementById('searchResults').innerHTML = '';
  document.getElementById('searchInput').value = '';
  photoEditId = id;
  const p = map[id];
  const hasPhoto = p.photo && p.photo.trim() !== '';

  const photoSrc = hasPhoto
    ? 'assets/images/persons/' + p.photo
    : (p.gender === 'male'
        ? 'assets/images/default_male.png'
        : 'assets/images/default_female.png');

  document.getElementById('photoModalBody').innerHTML = `
    <div class="photo-info-wrap">
      <img src="${photoSrc}" class="photo-info-img"
        onerror="this.src='assets/images/default_male.png'">
      <div class="photo-info-details">
        <div class="photo-info-name">${escHtml(p.name)}</div>
        <div class="photo-info-row">
          <span class="photo-info-label">ID</span>
          <span class="photo-info-value">${p.id}</span>
        </div>
        <div class="photo-info-row">
          <span class="photo-info-label">ছবির নাম</span>
          <span class="photo-info-value"
            style="color:${hasPhoto ? 'var(--accent2)' : 'var(--text-muted)'}">
            ${hasPhoto ? escHtml(p.photo) : '— নেই —'}
          </span>
        </div>
        <div class="photo-info-row">
          <span class="photo-info-label">পূর্ণ পাথ</span>
          <span class="photo-info-value" style="color:var(--text-muted);font-size:0.75rem">
            ${hasPhoto ? 'assets/images/persons/' + escHtml(p.photo) : '— নেই —'}
          </span>
        </div>
        ${hasPhoto ? `
        <button class="copy-path-btn"
          onclick="copyPath('assets/images/persons/${escHtml(p.photo)}')">
          📋 পাথ কপি করুন
        </button>` : ''}
      </div>
    </div>
  `;

  photoModalInstance = new bootstrap.Modal(document.getElementById('photoModal'));
  photoModalInstance.show();
}

function copyPath(path) {
  navigator.clipboard.writeText(path)
    .then(() => showToast('পাথ কপি হয়েছে ✓'))
    .catch(() => showToast('কপি হয়নি ❌'));
}

function goEditFromPhoto() {
  photoModalInstance.hide();
  setTimeout(() => openForm(photoEditId), 300);
}

// ===== Open Form =====
function openForm(id) {
  document.getElementById('searchResults').innerHTML = '';
  document.getElementById('searchInput').value = '';

  editingId = id;
  const isNew = id === null;

  const p = isNew ? {
    id: getNextId(),
    name: '', gender: 'male',
    father: null, mother: null,
    spouse: [], children: [],
    mobile: null, address: null,
    profession: null, workplace: null,
    photo: ''
  } : {
    ...map[id],
    spouse:   [...(map[id].spouse   || [])],
    children: [...(map[id].children || [])]
  };

  tempSpouse   = [...(p.spouse   || [])];
  tempChildren = [...(p.children || [])];

  document.getElementById('editModalTitle').innerText =
    isNew ? '+ নতুন ব্যক্তি যোগ' : `✎ সম্পাদনা: ${p.name}`;

  document.getElementById('deleteBtn').style.display =
    isNew ? 'none' : 'inline-flex';

  document.getElementById('editModalBody').innerHTML = buildForm(p);

  document.getElementById('photoInput').addEventListener('input', function () {
    updatePhotoPreview(this.value.trim(),
      document.getElementById('genderInput').value);
  });

  document.getElementById('genderInput').addEventListener('change', function () {
    updatePhotoPreview(
      document.getElementById('photoInput').value.trim(), this.value);
  });

  editModalInstance = new bootstrap.Modal(document.getElementById('editModal'));
  editModalInstance.show();
}

function updatePhotoPreview(filename, gender) {
  const prev = document.getElementById('photoPreview');
  if (filename) {
    prev.src = 'assets/images/persons/' + filename;
    prev.onerror = () => {
      prev.src = gender === 'male'
        ? 'assets/images/default_male.png'
        : 'assets/images/default_female.png';
    };
  } else {
    prev.src = gender === 'male'
      ? 'assets/images/default_male.png'
      : 'assets/images/default_female.png';
  }
}

// ===== Build Form =====
function buildForm(p) {
  const others = people.filter(x => x.id !== p.id);

  const fatherOpts = `<option value="">— নেই —</option>` +
    others.map(x => `
      <option value="${x.id}" ${p.father == x.id ? 'selected' : ''}>
        ${escHtml(x.name)} (${x.gender === 'male' ? 'পুরুষ' : 'মহিলা'})
      </option>`).join('');

  const motherOpts = `<option value="">— নেই —</option>` +
    others.map(x => `
      <option value="${x.id}" ${p.mother == x.id ? 'selected' : ''}>
        ${escHtml(x.name)} (${x.gender === 'male' ? 'পুরুষ' : 'মহিলা'})
      </option>`).join('');

  const allOpts = others.map(x =>
    `<option value="${x.id}">${escHtml(x.name)}</option>`).join('');

  const photoSrc = p.photo
    ? 'assets/images/persons/' + p.photo
    : (p.gender === 'male'
        ? 'assets/images/default_male.png'
        : 'assets/images/default_female.png');

  return `
    <div class="form-section">📋 মূল তথ্য</div>

    <div class="form-row-2">
      <div class="form-group">
        <label class="form-label">নাম *</label>
        <input id="nameInput" class="form-control-dark"
          type="text" value="${escHtml(p.name)}" placeholder="পুরো নাম">
      </div>
      <div class="form-group">
        <label class="form-label">লিঙ্গ</label>
        <select id="genderInput" class="form-control-dark">
          <option value="male"   ${p.gender==='male'   ? 'selected':''}>পুরুষ</option>
          <option value="female" ${p.gender==='female' ? 'selected':''}>মহিলা</option>
        </select>
      </div>
    </div>

    <div class="form-row-2">
      <div class="form-group">
        <label class="form-label">মোবাইল</label>
        <input id="mobileInput" class="form-control-dark"
          type="tel" value="${p.mobile || ''}" placeholder="01XXXXXXXXX">
      </div>
      <div class="form-group">
        <label class="form-label">পেশা</label>
        <input id="professionInput" class="form-control-dark"
          type="text" value="${escHtml(p.profession||'')}" placeholder="যেমন: কৃষক">
      </div>
    </div>

    <div class="form-group">
      <label class="form-label">ঠিকানা</label>
      <input id="addressInput" class="form-control-dark"
        type="text" value="${escHtml(p.address||'')}"
        placeholder="গ্রাম, উপজেলা, জেলা">
    </div>

    <div class="form-group">
      <label class="form-label">কর্মস্থান</label>
      <input id="workplaceInput" class="form-control-dark"
        type="text" value="${escHtml(p.workplace||'')}"
        placeholder="প্রতিষ্ঠানের নাম">
    </div>

    <div class="form-section">🖼 ছবি</div>

    <div class="photo-row">
      <img id="photoPreview" src="${photoSrc}" class="photo-preview"
        onerror="this.src='assets/images/default_male.png'">
      <div style="flex:1">
        <label class="form-label">
          ফাইলের নাম
          <span style="color:var(--text-muted);font-weight:400;font-size:0.62rem">
            (assets/images/persons/ ফোল্ডারে রাখুন)
          </span>
        </label>
        <input id="photoInput" class="form-control-dark"
          type="text" value="${escHtml(p.photo||'')}"
          placeholder="যেমন: shafi.jpg">
        <div style="font-size:0.62rem;color:var(--text-muted);margin-top:4px">
          ছবি manually ঐ ফোল্ডারে রাখুন, এখানে শুধু নাম লিখুন
        </div>
      </div>
    </div>

    <div class="form-section">👨‍👩‍👧 সম্পর্ক
      <span style="font-size:0.6rem;color:var(--text-muted);
        text-transform:none;letter-spacing:0;margin-left:6px;font-weight:400">
        (সেভ করলে অন্য দিকেও অটো আপডেট হবে)
      </span>
    </div>

    <div class="form-row-2">
      <div class="form-group">
        <label class="form-label">বাবা</label>
        <select id="fatherInput" class="form-control-dark">
          ${fatherOpts}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">মা</label>
        <select id="motherInput" class="form-control-dark">
          ${motherOpts}
        </select>
      </div>
    </div>

    <div class="form-group">
      <label class="form-label">স্বামী / স্ত্রী</label>
      <div class="relation-tags" id="spouseTags"></div>
      <select class="form-control-dark mt-2"
        onchange="addRelation('spouse', this)">
        <option value="">— যোগ করুন —</option>
        ${allOpts}
      </select>
    </div>

    <div class="form-group">
      <label class="form-label">সন্তান</label>
      <div class="relation-tags" id="childrenTags"></div>
      <select class="form-control-dark mt-2"
        onchange="addRelation('children', this)">
        <option value="">— যোগ করুন —</option>
        ${allOpts}
      </select>
    </div>

    <div class="form-group">
      <label class="form-label" style="opacity:0.4">ID (স্বয়ংক্রিয়)</label>
      <input class="form-control-dark" type="text"
        value="${p.id}" disabled style="opacity:0.35">
    </div>
  `;
}

// ===== Relation Tags =====
function renderRelationTags(type) {
  const arr = type === 'spouse' ? tempSpouse : tempChildren;
  const container = document.getElementById(
    type === 'spouse' ? 'spouseTags' : 'childrenTags');
  if (!container) return;

  if (arr.length === 0) {
    container.innerHTML =
      `<span style="color:var(--text-muted);font-size:0.75rem">কেউ নেই</span>`;
    return;
  }

  container.innerHTML = arr.map(id => {
    const person = map[id];
    return person ? `
      <div class="relation-tag">
        ${escHtml(person.name)}
        <span class="remove-tag"
          onclick="removeRelation('${type}', ${id})">✕</span>
      </div>` : '';
  }).join('');
}

function addRelation(type, sel) {
  const id = parseInt(sel.value);
  if (!id) return;
  if (type === 'spouse') {
    if (!tempSpouse.includes(id)) tempSpouse.push(id);
  } else {
    if (!tempChildren.includes(id)) tempChildren.push(id);
  }
  renderRelationTags(type);
  sel.value = '';
}

function removeRelation(type, id) {
  if (type === 'spouse') {
    tempSpouse = tempSpouse.filter(x => x !== id);
  } else {
    tempChildren = tempChildren.filter(x => x !== id);
  }
  renderRelationTags(type);
}

document.getElementById('editModal').addEventListener('shown.bs.modal', () => {
  renderRelationTags('spouse');
  renderRelationTags('children');
});

// ===== Save + Bidirectional Sync =====
function savePerson() {
  const name = document.getElementById('nameInput').value.trim();
  if (!name) { showToast('নাম দিন ❌'); return; }

  const isNew = editingId === null;
  const id    = isNew ? getNextId() : editingId;
  const fv    = document.getElementById('fatherInput').value;
  const mv    = document.getElementById('motherInput').value;

  const newFather   = fv ? parseInt(fv) : null;
  const newMother   = mv ? parseInt(mv) : null;

  const updated = {
    id,
    name,
    gender:     document.getElementById('genderInput').value,
    father:     newFather,
    mother:     newMother,
    spouse:     [...tempSpouse],
    children:   [...tempChildren],
    mobile:     document.getElementById('mobileInput').value.trim()     || null,
    address:    document.getElementById('addressInput').value.trim()    || null,
    profession: document.getElementById('professionInput').value.trim() || null,
    workplace:  document.getElementById('workplaceInput').value.trim()  || null,
    photo:      document.getElementById('photoInput').value.trim()      || '',
  };

  // JSON এ save করো
  if (isNew) {
    people.push(updated);
  } else {
    const idx = people.findIndex(p => p.id === id);
    if (idx !== -1) people[idx] = updated;
  }
  map[id] = updated;

  // ===== Bidirectional Sync =====
  syncRelations(updated, isNew ? null : map[id]);

  renderStats();
  editModalInstance.hide();
  showToast(isNew ? 'নতুন ব্যক্তি যোগ হয়েছে ✓' : 'সেভ হয়েছে ✓');
}

// ===== Sync Logic =====
function syncRelations(updated, oldData) {
  const id = updated.id;

  // --- Spouse sync ---
  // নতুন spouse list
  const newSpouseIds = updated.spouse || [];
  // আগের spouse list (যদি edit হয়)
  const oldSpouseIds = oldData ? (oldData.spouse || []) : [];

  // যোগ হওয়া spouse গুলোতে এই person কে spouse হিসেবে add করো
  newSpouseIds.forEach(sid => {
    const sp = map[sid];
    if (!sp) return;
    if (!sp.spouse.includes(id)) {
      sp.spouse.push(id);
    }
  });

  // বাদ পড়া spouse গুলো থেকে এই person কে সরাও
  oldSpouseIds.forEach(sid => {
    if (!newSpouseIds.includes(sid)) {
      const sp = map[sid];
      if (sp) {
        sp.spouse = sp.spouse.filter(x => x !== id);
      }
    }
  });

  // --- Children sync ---
  const newChildIds = updated.children || [];
  const oldChildIds = oldData ? (oldData.children || []) : [];

  // যোগ হওয়া সন্তানদের father/mother set করো
  newChildIds.forEach(cid => {
    const child = map[cid];
    if (!child) return;
    if (updated.gender === 'male') {
      if (child.father !== id) child.father = id;
    } else {
      if (child.mother !== id) child.mother = id;
    }
  });

  // বাদ পড়া সন্তানদের father/mother null করো
  oldChildIds.forEach(cid => {
    if (!newChildIds.includes(cid)) {
      const child = map[cid];
      if (child) {
        if (updated.gender === 'male' && child.father === id) child.father = null;
        if (updated.gender === 'female' && child.mother === id) child.mother = null;
      }
    }
  });

  // --- Father sync ---
  // যদি বাবা set করা হয় তাহলে বাবার children এ এই person যোগ করো
  if (updated.father !== null) {
    const father = map[updated.father];
    if (father && !father.children.includes(id)) {
      father.children.push(id);
    }
  }
  // আগের বাবার children থেকে সরাও
  if (oldData && oldData.father !== null && oldData.father !== updated.father) {
    const oldFather = map[oldData.father];
    if (oldFather) {
      oldFather.children = oldFather.children.filter(x => x !== id);
    }
  }

  // --- Mother sync ---
  if (updated.mother !== null) {
    const mother = map[updated.mother];
    if (mother && !mother.children.includes(id)) {
      mother.children.push(id);
    }
  }
  if (oldData && oldData.mother !== null && oldData.mother !== updated.mother) {
    const oldMother = map[oldData.mother];
    if (oldMother) {
      oldMother.children = oldMother.children.filter(x => x !== id);
    }
  }

  // map sync করো people array তে
  people.forEach((p, i) => {
    if (map[p.id]) people[i] = map[p.id];
  });
}

// ===== Delete =====
function confirmDelete() {
  const p = map[editingId];
  document.getElementById('deleteConfirmText').innerHTML =
    `<strong style="color:var(--accent2)">"${escHtml(p.name)}"</strong> কে সত্যিই মুছতে চান?`;
  editModalInstance.hide();
  setTimeout(() => {
    deleteModalInstance = new bootstrap.Modal(
      document.getElementById('deleteModal'));
    deleteModalInstance.show();
  }, 300);
}

function confirmDeleteById(id) {
  document.getElementById('searchResults').innerHTML = '';
  document.getElementById('searchInput').value = '';
  editingId = id;
  const p = map[id];
  document.getElementById('deleteConfirmText').innerHTML =
    `<strong style="color:var(--accent2)">"${escHtml(p.name)}"</strong> কে সত্যিই মুছতে চান?`;
  deleteModalInstance = new bootstrap.Modal(
    document.getElementById('deleteModal'));
  deleteModalInstance.show();
}

function deletePerson() {
  const id = editingId;

  // সব সম্পর্ক থেকে সরাও (bidirectional)
  people.forEach(p => {
    if (p.id === id) return;
    if (p.father   === id) p.father = null;
    if (p.mother   === id) p.mother = null;
    p.spouse   = (p.spouse   || []).filter(x => x !== id);
    p.children = (p.children || []).filter(x => x !== id);
  });

  people = people.filter(p => p.id !== id);
  delete map[id];

  renderStats();
  deleteModalInstance.hide();
  showToast('মুছে ফেলা হয়েছে ✓');
  editingId = null;
}

// ===== Download =====
function downloadJSON() {
  const blob = new Blob(
    [JSON.stringify({ people }, null, 2)],
    { type: 'application/json' }
  );
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'family.json';
  a.click();
  showToast('family.json ডাউনলোড হচ্ছে ✓');
}

// ===== Helpers =====
function getNextId() {
  return people.length > 0
    ? Math.max(...people.map(p => p.id)) + 1 : 1;
}

function escHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function showToast(msg) {
  const t = document.getElementById('adminToast');
  t.innerText = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2500);
}