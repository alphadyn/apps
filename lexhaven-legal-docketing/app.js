const STORAGE_KEY = 'northstar-legal-docketing-data';

const sampleData = {
  matters: [
    {
      id: crypto.randomUUID(),
      title: 'Acme Logistics v. Harbor Freight',
      client: 'Acme Logistics',
      matterType: 'Commercial Litigation',
      status: 'Open',
      court: 'Superior Court',
      nextHearing: '2026-08-15',
      assigned: 'Maya Chen',
      description: 'Breach of contract dispute involving delayed delivery and indemnity claims.'
    },
    {
      id: crypto.randomUUID(),
      title: 'Northwind Acquisition Review',
      client: 'Northwind Capital',
      matterType: 'M&A',
      status: 'Pending',
      court: 'Delaware Chancery Court',
      nextHearing: '2026-08-22',
      assigned: 'Lucas Rivera',
      description: 'Due diligence review and transaction structuring support for a strategic acquisition.'
    },
    {
      id: crypto.randomUUID(),
      title: 'Blue Peak Employment Matter',
      client: 'Blue Peak Labs',
      matterType: 'Employment',
      status: 'Closed',
      court: 'Arbitration',
      nextHearing: '2026-07-30',
      assigned: 'Ava Patel',
      description: 'Workplace dispute resolved with a negotiated settlement and final release.'
    }
  ],
  tasks: [
    {
      id: crypto.randomUUID(),
      matterId: null,
      title: 'Prepare mediation brief',
      dueDate: '2026-08-10',
      priority: 'High',
      status: 'Pending'
    },
    {
      id: crypto.randomUUID(),
      matterId: null,
      title: 'Confirm witness list',
      dueDate: '2026-08-12',
      priority: 'Medium',
      status: 'Pending'
    },
    {
      id: crypto.randomUUID(),
      matterId: null,
      title: 'Finalize settlement draft',
      dueDate: '2026-07-28',
      priority: 'Low',
      status: 'Completed'
    }
  ]
};

const state = {
  matters: [],
  tasks: [],
  selectedMatterId: null,
  taskFilter: 'all',
  matterSearch: ''
};

const elements = {
  statsGrid: document.getElementById('statsGrid'),
  matterSearch: document.getElementById('matterSearch'),
  matterList: document.getElementById('matterList'),
  matterDetail: document.getElementById('matterDetail'),
  matterForm: document.getElementById('matterForm'),
  taskForm: document.getElementById('taskForm'),
  taskList: document.getElementById('taskList'),
  taskMatterSelect: document.getElementById('taskMatterSelect'),
  newMatterBtn: document.getElementById('newMatterBtn'),
  toggleMatterFormBtn: document.getElementById('toggleMatterFormBtn'),
  cancelMatterBtn: document.getElementById('cancelMatterBtn'),
  taskFilters: [...document.querySelectorAll('.filter-pill')]
};

function init() {
  loadData();
  bindEvents();
  render();
}

function loadData() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (stored && Array.isArray(stored.matters) && Array.isArray(stored.tasks)) {
      state.matters = stored.matters;
      state.tasks = stored.tasks;
      state.selectedMatterId = stored.selectedMatterId || state.matters[0]?.id || null;
      return;
    }
  } catch (error) {
    console.warn('Could not load saved data, using sample data instead.', error);
  }

  state.matters = sampleData.matters;
  state.tasks = sampleData.tasks.map((task, index) => ({
    ...task,
    matterId: state.matters[index % state.matters.length].id
  }));
  state.selectedMatterId = state.matters[0]?.id || null;
}

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    matters: state.matters,
    tasks: state.tasks,
    selectedMatterId: state.selectedMatterId
  }));
}

function setMatterFormVisible(visible) {
  elements.matterForm.classList.toggle('hidden', !visible);
  elements.toggleMatterFormBtn.setAttribute('aria-expanded', String(visible));
  elements.newMatterBtn.setAttribute('aria-expanded', String(visible));
  if (visible) {
    elements.matterForm.querySelector('input[name="title"]').focus();
  }
}

function bindEvents() {
  elements.newMatterBtn.addEventListener('click', () => setMatterFormVisible(true));
  elements.toggleMatterFormBtn.addEventListener('click', () => {
    setMatterFormVisible(elements.matterForm.classList.contains('hidden'));
  });
  elements.cancelMatterBtn.addEventListener('click', () => {
    setMatterFormVisible(false);
    elements.toggleMatterFormBtn.focus();
  });

  elements.matterSearch.addEventListener('input', (event) => {
    state.matterSearch = event.target.value.trim().toLowerCase();
    renderMatters();
  });

  elements.matterForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const formData = new FormData(elements.matterForm);
    const matter = {
      id: crypto.randomUUID(),
      title: formData.get('title').toString().trim(),
      client: formData.get('client').toString().trim(),
      matterType: formData.get('matterType').toString().trim() || 'General',
      status: formData.get('status').toString(),
      court: formData.get('court').toString().trim(),
      nextHearing: formData.get('nextHearing').toString(),
      assigned: formData.get('assigned').toString().trim(),
      description: formData.get('description').toString().trim()
    };

    if (!matter.title || !matter.client) {
      return;
    }

    state.matters.unshift(matter);
    state.selectedMatterId = matter.id;
    elements.matterForm.reset();
    setMatterFormVisible(false);
    saveData();
    render();
  });

  elements.taskForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const formData = new FormData(elements.taskForm);
    const task = {
      id: crypto.randomUUID(),
      matterId: formData.get('matterId').toString(),
      title: formData.get('title').toString().trim(),
      dueDate: formData.get('dueDate').toString(),
      priority: formData.get('priority').toString(),
      status: 'Pending'
    };

    if (!task.title || !task.dueDate) {
      return;
    }

    state.tasks.unshift(task);
    elements.taskForm.reset();
    elements.taskForm.querySelector('input[name="title"]').focus();
    elements.taskForm.querySelector('select[name="priority"]').value = 'Medium';
    saveData();
    render();
  });

  elements.taskFilters.forEach((button) => {
    button.addEventListener('click', () => {
      state.taskFilter = button.dataset.filter;
      elements.taskFilters.forEach((pill) => {
        const active = pill === button;
        pill.classList.toggle('active', active);
        pill.setAttribute('aria-pressed', String(active));
      });
      renderTasks();
    });
  });

  elements.matterList.addEventListener('click', (event) => {
    const button = event.target.closest('[data-matter-id]');
    if (!button) return;
    state.selectedMatterId = button.dataset.matterId;
    saveData();
    render();
  });

  elements.taskList.addEventListener('click', (event) => {
    const button = event.target.closest('button');
    if (!button) return;

    const taskId = button.dataset.taskId;
    if (!taskId) return;

    if (button.dataset.action === 'toggle') {
      state.tasks = state.tasks.map((task) => task.id === taskId ? { ...task, status: task.status === 'Completed' ? 'Pending' : 'Completed' } : task);
    }

    if (button.dataset.action === 'delete') {
      state.tasks = state.tasks.filter((task) => task.id !== taskId);
    }

    saveData();
    renderTasks();
    renderStats();
  });
}

function render() {
  renderStats();
  renderMatters();
  renderDetails();
  renderTaskMatterOptions();
  renderTasks();
}

function renderStats() {
  const openMatters = state.matters.filter((matter) => matter.status === 'Open').length;
  const pendingTasks = state.tasks.filter((task) => task.status === 'Pending').length;
  const overdue = state.tasks.filter((task) => task.status === 'Pending' && new Date(task.dueDate) < new Date()).length;
  const upcomingHearings = state.matters.filter((matter) => {
    if (!matter.nextHearing) return false;
    const diff = Math.round((new Date(matter.nextHearing) - new Date()) / (1000 * 60 * 60 * 24));
    return diff >= 0 && diff <= 14;
  }).length;

  const stats = [
    { label: 'Total matters', value: state.matters.length },
    { label: 'Open matters', value: openMatters },
    { label: 'Pending tasks', value: pendingTasks },
    { label: 'Hearings in 14 days', value: upcomingHearings }
  ];
  if (overdue > 0) {
    stats.push({ label: 'Overdue tasks', value: overdue, alert: true });
  }
  elements.statsGrid.innerHTML = stats.map((stat) => `
    <article class="stat-card${stat.alert ? ' stat-card-alert' : ''}">
      <span>${stat.label}</span>
      <strong>${stat.value}</strong>
    </article>
  `).join('');
}

function renderMatters() {
  const filtered = state.matters.filter((matter) => {
    const haystack = `${matter.title} ${matter.client} ${matter.matterType}`.toLowerCase();
    return haystack.includes(state.matterSearch);
  });

  if (!filtered.length) {
    elements.matterList.innerHTML = '<div class="empty-state">No matters match your search.</div>';
    return;
  }

  elements.matterList.innerHTML = filtered.map((matter) => `
    <button type="button" class="matter-item ${matter.id === state.selectedMatterId ? 'active' : ''}" data-matter-id="${matter.id}" aria-pressed="${matter.id === state.selectedMatterId}">
      <span class="matter-title">${escapeHtml(matter.title)}</span>
      <span class="matter-meta">
        <span>${escapeHtml(matter.client)}</span>
        <span class="tag ${matter.status.toLowerCase()}">${escapeHtml(matter.status)}</span>
      </span>
      <span class="matter-meta">
        <span>${escapeHtml(matter.matterType)}</span>
        <span>${escapeHtml(formatDate(matter.nextHearing))}</span>
      </span>
    </button>
  `).join('');
}

function renderDetails() {
  const matter = state.matters.find((item) => item.id === state.selectedMatterId);
  if (!matter) {
    elements.matterDetail.innerHTML = '<div class="empty-state">Select a matter to view its workspace.</div>';
    return;
  }

  elements.matterDetail.innerHTML = `
    <h3>${escapeHtml(matter.title)}</h3>
    <div class="matter-meta">
      <span>${escapeHtml(matter.client)}</span>
      <span class="tag ${matter.status.toLowerCase()}">${escapeHtml(matter.status)}</span>
      <span>${escapeHtml(matter.matterType)}</span>
    </div>
    <p>${escapeHtml(matter.description || 'No summary provided yet.')}</p>
    <dl class="case-facts">
      <div><dt>Court / venue</dt><dd>${escapeHtml(matter.court || '—')}</dd></div>
      <div><dt>Next hearing</dt><dd>${escapeHtml(formatDate(matter.nextHearing))}</dd></div>
      <div><dt>Assigned attorney</dt><dd>${escapeHtml(matter.assigned || 'Unassigned')}</dd></div>
    </dl>
  `;
}

function renderTaskMatterOptions() {
  elements.taskMatterSelect.innerHTML = state.matters.map((matter) => `
    <option value="${matter.id}" ${matter.id === state.selectedMatterId ? 'selected' : ''}>${escapeHtml(matter.title)}</option>
  `).join('');
}

function renderTasks() {
  const selectedMatter = state.matters.find((item) => item.id === state.selectedMatterId);
  const filtered = state.tasks.filter((task) => {
    const matchesMatter = !selectedMatter || task.matterId === selectedMatter.id;
    const matchesFilter = state.taskFilter === 'all'
      || (state.taskFilter === 'pending' && task.status === 'Pending')
      || (state.taskFilter === 'completed' && task.status === 'Completed');
    return matchesMatter && matchesFilter;
  }).sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

  if (!filtered.length) {
    elements.taskList.innerHTML = '<div class="empty-state">No tasks for this view yet.</div>';
    return;
  }

  elements.taskList.innerHTML = filtered.map((task) => {
    const matter = state.matters.find((item) => item.id === task.matterId);
    return `
      <article class="task-item ${task.status === 'Completed' ? 'completed' : ''}">
        <h4>${escapeHtml(task.title)}</h4>
        <div class="task-meta">
          <span class="tag ${task.priority.toLowerCase()}">${escapeHtml(task.priority)}</span>
          <span>${escapeHtml(formatDate(task.dueDate))}</span>
          <span>${escapeHtml(matter?.title || 'Unassigned')}</span>
        </div>
        <div class="task-footer">
          <span>${task.status === 'Completed' ? 'Completed' : 'Pending'}</span>
          <div class="task-meta">
            <button class="icon-btn" data-action="toggle" data-task-id="${task.id}">${task.status === 'Completed' ? 'Undo' : 'Complete'}</button>
            <button class="icon-btn" data-action="delete" data-task-id="${task.id}">Delete</button>
          </div>
        </div>
      </article>
    `;
  }).join('');
}

function formatDate(value) {
  if (!value) return '—';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(parsed);
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

init();
