let people = [];
let map = {};

const DEFAULT_OPEN_IDS = new Set([0, 1, 2, 7, 39, 40]);

fetch('family.json')
  .then(res => res.json())
  .then(data => {
    people = data.people;
    people.forEach(p => map[p.id] = p);

    const root = map[0];
    const rootDiv = document.getElementById('tree-root');
    rootDiv.innerHTML = '';
    rootDiv.appendChild(buildNode(root, true));
  })
  .catch(() => {
    document.getElementById('tree-root').innerHTML =
      '<p style="color:var(--accent);text-align:center;padding:40px">ডাটা লোড হয়নি।</p>';
  });

// ===== Build Node =====
function buildNode(person, forceOpen = false) {
  const isOpen = forceOpen || DEFAULT_OPEN_IDS.has(person.id);
  const hasChildren = person.children && person.children.length > 0;
  const hasSpouse = person.spouse && person.spouse.length > 0 &&
                    person.spouse.some(id => map[id]);

  const nodeDiv = document.createElement('div');
  nodeDiv.className = 'tree-node';
  nodeDiv.dataset.id = person.id;

  // ===== Couple Row (person + spouse পাশাপাশি) =====
  const coupleWrap = document.createElement('div');
  coupleWrap.className = 'couple-wrap';

  // main card
  const mainCardWrap = document.createElement('div');
  mainCardWrap.className = 'card-wrap';
  mainCardWrap.appendChild(buildCard(person));
  coupleWrap.appendChild(mainCardWrap);

  // spouse card পাশে — data থাকলে
  if (hasSpouse) {
    person.spouse.forEach(sid => {
      const sp = map[sid];
      if (!sp) return;

      // connector line (=)
      const connector = document.createElement('div');
      connector.className = 'spouse-connector';
      connector.innerHTML = '<span class="heart-icon">💍</span>';
      coupleWrap.appendChild(connector);

      // spouse card
      const spouseCardWrap = document.createElement('div');
      spouseCardWrap.className = 'card-wrap';
      const spCard = buildCard(sp);
      spCard.classList.add('spouse-card');
      spouseCardWrap.appendChild(spCard);
      coupleWrap.appendChild(spouseCardWrap);
    });
  }

  nodeDiv.appendChild(coupleWrap);

  // ===== Expand buttons =====
  const btnWrap = document.createElement('div');
  btnWrap.className = 'btn-wrap';

  if (hasChildren && !isOpen) {
    const btn = document.createElement('button');
    btn.className = 'expand-btn';
    btn.innerHTML = `▼ সন্তান (${person.children.length})`;
    btn.onclick = (e) => {
      e.stopPropagation();
      btn.remove();
      if (!btnWrap.hasChildNodes()) btnWrap.remove();
      nodeDiv.appendChild(buildChildrenSection(person));
    };
    btnWrap.appendChild(btn);
  }

  if (btnWrap.hasChildNodes()) {
    nodeDiv.appendChild(btnWrap);
  }

  // default open এ children দেখাও
  if (hasChildren && isOpen) {
    nodeDiv.appendChild(buildChildrenSection(person));
  }

  return nodeDiv;
}

// ===== Children Section =====
function buildChildrenSection(person) {
  const wrap = document.createElement('div');
  wrap.className = 'children-section';

  // vertical line নিচে
  const vline = document.createElement('div');
  vline.className = 'v-line';
  wrap.appendChild(vline);

  const count = person.children.length;
  const row = document.createElement('div');
  row.className = 'children-row ' + (count === 1 ? 'single' : 'multi');

  person.children.forEach((id, index) => {
    const child = map[id];
    if (!child) return;

    const col = document.createElement('div');
    col.className = 'child-col';

    if (count > 1 && index === 0)            col.classList.add('first-child');
    if (count > 1 && index === count - 1)    col.classList.add('last-child');
    if (count > 1 && index > 0 && index < count - 1) col.classList.add('mid-child');

    col.appendChild(buildNode(child, DEFAULT_OPEN_IDS.has(child.id)));
    row.appendChild(col);
  });

  wrap.appendChild(row);
  return wrap;
}

// ===== Card =====
function buildCard(person) {
  const card = document.createElement('div');
  card.className = 'person-card ' + (person.gender === 'male' ? 'male' : 'female');

  const img = document.createElement('img');
  img.className = 'card-photo';
  img.alt = person.name;
  img.loading = 'lazy';
  setPhoto(img, person);

  const nameDiv = document.createElement('div');
  nameDiv.className = 'card-name';
  nameDiv.innerText = person.name;

  card.appendChild(img);
  card.appendChild(nameDiv);
  card.addEventListener('click', () => showModal(person));
  return card;
}

// ===== Photo =====
function setPhoto(img, person) {
  const def = person.gender === 'male'
    ? 'assets/images/default_male.png'
    : 'assets/images/default_female.png';
  if (person.photo && person.photo.trim()) {
    img.src = 'assets/images/persons/' + person.photo;
    img.onerror = () => { img.src = def; };
  } else {
    img.src = def;
  }
}

// ===== Modal =====
function showModal(person) {
  const modalPhoto = document.getElementById('modalPhoto');
  setPhoto(modalPhoto, person);

  document.getElementById('modalName').innerText = person.name;

  const badge = document.getElementById('modalGenderBadge');
  badge.className = 'gender-badge ' + (person.gender === 'male' ? 'male' : 'female');
  badge.innerText = person.gender === 'male' ? '♂ পুরুষ' : '♀ মহিলা';

  const fieldsDiv = document.getElementById('modalFields');
  fieldsDiv.innerHTML = '';

  if (person.mobile) {
    const field = makeField('📱', 'মোবাইল', maskMobile(person.mobile), true);
    field.addEventListener('click', () => copyMobile(person.mobile));
    const hint = document.createElement('div');
    hint.className = 'copy-hint';
    hint.innerText = '👆 ট্যাপ করলে কপি হবে';
    field.querySelector('.field-content').appendChild(hint);
    fieldsDiv.appendChild(field);
  }

  if (person.address)    fieldsDiv.appendChild(makeField('🏠', 'ঠিকানা', person.address));
  if (person.profession) fieldsDiv.appendChild(makeField('💼', 'পেশা', person.profession));
  if (person.workplace)  fieldsDiv.appendChild(makeField('🏢', 'কর্মস্থান', person.workplace));

  if (person.father !== null && map[person.father])
    fieldsDiv.appendChild(makeField('👨', 'বাবা', map[person.father].name));

  if (person.mother !== null && map[person.mother])
    fieldsDiv.appendChild(makeField('👩', 'মা', map[person.mother].name));

  if (person.spouse && person.spouse.length > 0) {
    const names = person.spouse.map(id => map[id]?.name).filter(Boolean).join(', ');
    if (names) {
      const label = person.gender === 'male' ? 'স্ত্রী' : 'স্বামী';
      fieldsDiv.appendChild(makeField('💍', label, names));
    }
  }

  if (person.children && person.children.length > 0) {
    const names = person.children.map(id => map[id]?.name).filter(Boolean).join(', ');
    fieldsDiv.appendChild(makeField('👶', `সন্তান (${person.children.length})`, names));
  }

  if (fieldsDiv.children.length === 0) {
    fieldsDiv.innerHTML = `<p style="color:var(--text-muted);text-align:center;
    font-size:0.85rem;padding:16px 0">কোনো তথ্য যোগ করা হয়নি</p>`;
  }

  new bootstrap.Modal(document.getElementById('personModal')).show();
}

function makeField(icon, label, value, isMobile = false) {
  const div = document.createElement('div');
  div.className = 'modal-field' + (isMobile ? ' mobile-field' : '');
  div.innerHTML = `
    <div class="field-icon">${icon}</div>
    <div class="field-content">
      <div class="field-label">${label}</div>
      <div class="field-value">${value}</div>
    </div>`;
  return div;
}

function maskMobile(num) {
  const str = String(num).trim();
  if (str.startsWith('01') && str.length === 11)
    return str.slice(0, 3) + '×××××××' + str.slice(10);
  return str;
}

function copyMobile(num) {
  const text = String(num);
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(() => showToast('নম্বর কপি হয়েছে ✓'));
  } else {
    const el = document.createElement('textarea');
    el.value = text;
    el.style.cssText = 'position:fixed;opacity:0';
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
    showToast('নম্বর কপি হয়েছে ✓');
  }
}

function showToast(msg) {
  const toast = document.getElementById('toast');
  toast.innerText = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2500);
}

// ===== Main Search =====
function searchMain() {
  const q = document.getElementById('mainSearch').value.trim();
  const resultsBox = document.getElementById('mainSearchResults');
  const clearBtn = document.getElementById('searchClear');

  clearBtn.style.display = q ? 'block' : 'none';

  document.querySelectorAll('.person-card.highlighted')
    .forEach(c => c.classList.remove('highlighted'));

  if (!q) { resultsBox.innerHTML = ''; return; }

  const results = people.filter(p =>
    p.name.includes(q) ||
    p.name.toLowerCase().includes(q.toLowerCase())
  ).slice(0, 10);

  if (results.length === 0) {
    resultsBox.innerHTML = `
      <div class="main-search-item">
        <span class="search-item-name" style="color:var(--text-muted)">
          কোনো ফলাফল নেই
        </span>
      </div>`;
    return;
  }

  resultsBox.innerHTML = results.map(p => {
    let sub = '';
    if (p.father && map[p.father]) sub = `বাবা: ${map[p.father].name}`;
    else if (p.mother && map[p.mother]) sub = `মা: ${map[p.mother].name}`;

    return `
      <div class="main-search-item" onclick="selectSearchResult(${p.id})">
        <div class="search-gender-dot ${p.gender}"></div>
        <div class="search-item-info">
          <div class="search-item-name">${p.name}</div>
          ${sub ? `<div class="search-item-sub">${sub}</div>` : ''}
        </div>
      </div>`;
  }).join('');
}

function selectSearchResult(id) {
  document.getElementById('mainSearchResults').innerHTML = '';
  document.getElementById('mainSearch').value = map[id]?.name || '';
  document.getElementById('searchClear').style.display = 'block';

  // tree-node এ খোঁজো — spouse card ও হতে পারে
  let card = document.querySelector(`.tree-node[data-id="${id}"] .person-card`);

  if (card) {
    card.classList.add('highlighted');
    card.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
    setTimeout(() => card.classList.remove('highlighted'), 3000);
  } else {
    expandPathToId(id);
    setTimeout(() => {
      let c = document.querySelector(`.tree-node[data-id="${id}"] .person-card`);
      if (c) {
        c.classList.add('highlighted');
        c.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
        setTimeout(() => c.classList.remove('highlighted'), 3000);
      }
    }, 400);
  }
}

function expandPathToId(targetId) {
  const path = findPath(0, targetId, []);
  if (!path) return;

  path.forEach(id => {
    const node = document.querySelector(`.tree-node[data-id="${id}"]`);
    if (!node) return;
    const btn = node.querySelector(':scope > .btn-wrap > .expand-btn');
    if (btn) btn.click();
  });
}

function findPath(currentId, targetId, path) {
  if (currentId === targetId) return path;
  const person = map[currentId];
  if (!person || !person.children) return null;

  for (const childId of person.children) {
    const result = findPath(childId, targetId, [...path, currentId]);
    if (result) return result;
  }
  return null;
}

function clearSearch() {
  document.getElementById('mainSearch').value = '';
  document.getElementById('mainSearchResults').innerHTML = '';
  document.getElementById('searchClear').style.display = 'none';
  document.querySelectorAll('.person-card.highlighted')
    .forEach(c => c.classList.remove('highlighted'));
}

document.addEventListener('click', (e) => {
  if (!e.target.closest('.search-bar-wrap')) {
    document.getElementById('mainSearchResults').innerHTML = '';
  }
});