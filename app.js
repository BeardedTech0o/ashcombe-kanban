(function () {
  'use strict';

  var COLUMNS = [
    { key: 'todo', label: 'To Do' },
    { key: 'inprogress', label: 'In Progress' },
    { key: 'signoff', label: 'Awaiting Sign-Off' },
    { key: 'done', label: 'Completed' },
  ];
  var THEMES = {
    ink: { label: 'Ink', accent: '#9184d9' },
    claret: { label: 'Claret', accent: '#b5665a' },
    moss: { label: 'Moss', accent: '#7f9c72' },
    gilt: { label: 'Gilt', accent: '#c9a35c' },
  };
  var PROJECT_COLORS = ['#9c5a52', '#5f7a5a', '#5d6f96', '#7c6091', '#b08a4e', '#4f8585'];
  var STORAGE_KEY = 'ashcombe-kanban-v1';

  function uid(prefix) {
    return (prefix || 'id') + '-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function seedTemplates() {
    return [{
      id: 'tpl-example',
      name: 'Example Template',
      tiles: [{ title: 'Example task', subtasks: ['First subtask', 'Second subtask'] }],
    }];
  }

  var state = {
    projects: [],
    tiles: [],
    templates: [],
    theme: 'ink',
    expandedProjects: {},
    expandedTiles: {},
    newProjectOpen: false,
    templatePickerOpen: false,
    templatePickerMode: 'list',
    templateDraft: null,
    createDialog: null,
    settingsOpen: false,
    newSubtaskDraftByTile: {},
    addTileDraftProjectId: null,
    addTileDraftText: '',
    confirmDeleteProject: null,
    pulseTileId: null,
    draggingTileId: null,
  };

  function load() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        var data = JSON.parse(raw);
        state.projects = data.projects || [];
        state.tiles = data.tiles || [];
        state.templates = (data.templates && data.templates.length) ? data.templates : seedTemplates();
        state.theme = data.theme || 'ink';
      } else {
        state.templates = seedTemplates();
      }
    } catch (e) {
      state.templates = seedTemplates();
    }
  }

  function persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        projects: state.projects,
        tiles: state.tiles,
        templates: state.templates,
        theme: state.theme,
      }));
    } catch (e) {}
  }

  function render() {
    var root = document.getElementById('app');
    root.innerHTML = '';
    var accent = (THEMES[state.theme] || THEMES.ink).accent;
    root.style.setProperty('--accent', accent);

    var anyOverlayOpen = state.newProjectOpen || state.settingsOpen;
    if (anyOverlayOpen) {
      var catcher = el('div', 'overlay-catcher');
      catcher.addEventListener('click', function () {
        state.newProjectOpen = false;
        state.settingsOpen = false;
        render();
      });
      root.appendChild(catcher);
    }

    root.appendChild(buildTopbar(accent));

    var mainRow = el('div', 'main-row');
    mainRow.appendChild(buildSidebar(accent));
    mainRow.appendChild(buildBoard(accent));
    root.appendChild(mainRow);

    if (state.templatePickerOpen) root.appendChild(buildTemplatePickerModal(accent));
    if (state.createDialog) root.appendChild(buildCreateDialogModal(accent));
    if (state.confirmDeleteProject) root.appendChild(buildConfirmDeleteModal());
  }

  function el(tag, className, text) {
    var e = document.createElement(tag);
    if (className) e.className = className;
    if (text !== undefined) e.textContent = text;
    return e;
  }
  function icon(name, extraClass) {
    var s = el('span', 'msi' + (extraClass ? ' ' + extraClass : ''), name);
    return s;
  }

  function projectsById() {
    var map = {};
    state.projects.forEach(function (p) { map[p.id] = p; });
    return map;
  }
  function tilesByProject() {
    var map = {};
    state.tiles.forEach(function (t) {
      (map[t.projectId] = map[t.projectId] || []).push(t);
    });
    return map;
  }

  /* ---------- Top bar ---------- */
  function buildTopbar(accent) {
    var bar = el('div', 'topbar');
    var left = el('div', 'topbar-left');
    left.appendChild(el('h1', 'app-title', 'Ashcombe Board'));

    var wrap = el('div', 'new-project-wrap');
    var btn = el('button', 'new-project-btn');
    btn.appendChild(icon('add'));
    btn.appendChild(el('span', null, 'New Project'));
    btn.appendChild(icon('expand_more'));
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      state.newProjectOpen = !state.newProjectOpen;
      state.settingsOpen = false;
      render();
    });
    wrap.appendChild(btn);

    if (state.newProjectOpen) {
      var panel = el('div', 'menu-panel');
      var blankRow = el('button', 'menu-row');
      blankRow.appendChild(icon('note_add'));
      blankRow.appendChild(document.createTextNode(' Blank Project'));
      blankRow.addEventListener('click', function (e) {
        e.stopPropagation();
        openCreateDialog('blank');
      });
      var tplRow = el('button', 'menu-row');
      tplRow.appendChild(icon('dashboard_customize'));
      tplRow.appendChild(document.createTextNode(' Choose From Template'));
      tplRow.addEventListener('click', function (e) {
        e.stopPropagation();
        state.newProjectOpen = false;
        state.templatePickerOpen = true;
        state.templatePickerMode = 'list';
        render();
      });
      panel.appendChild(blankRow);
      panel.appendChild(tplRow);
      wrap.appendChild(panel);
    }
    left.appendChild(wrap);
    bar.appendChild(left);

    var meta = el('div', 'topbar-meta', state.tiles.length + ' tiles · ' + state.projects.length + ' projects');
    bar.appendChild(meta);
    return bar;
  }

  /* ---------- Sidebar ---------- */
  function buildSidebar(accent) {
    var sidebar = el('div', 'sidebar');
    var list = el('div', 'sidebar-list');
    list.appendChild(el('div', 'sidebar-heading', 'Projects'));

    var tbp = tilesByProject();

    if (state.projects.length === 0) {
      list.appendChild(el('div', 'no-projects', 'No projects yet.'));
    } else {
      state.projects.forEach(function (p) {
        list.appendChild(buildProjectRow(p, tbp[p.id] || []));
      });
    }
    sidebar.appendChild(list);
    sidebar.appendChild(buildSidebarBottom());
    return sidebar;
  }

  function buildProjectRow(p, tiles) {
    var wrap = el('div');
    var row = el('div', 'project-row');
    var dot = el('span', 'project-dot');
    dot.style.background = p.color;
    row.appendChild(dot);
    row.appendChild(el('span', 'project-name', p.name));
    row.appendChild(el('span', 'project-count', String(tiles.length)));

    var addBtn = el('button', 'icon-btn');
    addBtn.appendChild(icon('add'));
    addBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      state.addTileDraftProjectId = p.id;
      state.addTileDraftText = '';
      state.expandedProjects[p.id] = true;
      render();
    });
    row.appendChild(addBtn);

    var delBtn = el('button', 'icon-btn delete');
    delBtn.appendChild(icon('delete'));
    delBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      state.confirmDeleteProject = p.id;
      render();
    });
    row.appendChild(delBtn);

    var expanded = !!state.expandedProjects[p.id];
    var chev = icon('chevron_right', 'chevron' + (expanded ? ' expanded' : ''));
    row.appendChild(chev);

    row.addEventListener('click', function () {
      state.expandedProjects[p.id] = !state.expandedProjects[p.id];
      render();
    });
    wrap.appendChild(row);

    if (expanded) {
      var listWrap = el('div', 'project-tiles');
      tiles.forEach(function (t) {
        var mt = el('div', 'mini-tile', t.title);
        mt.style.borderLeftColor = p.color;
        mt.setAttribute('draggable', 'true');
        mt.addEventListener('dragstart', function (e) {
          state.draggingTileId = t.id;
          try { e.dataTransfer.setData('text/plain', t.id); e.dataTransfer.effectAllowed = 'move'; } catch (err) {}
        });
        mt.addEventListener('click', function () {
          state.pulseTileId = t.id;
          render();
          setTimeout(function () {
            if (state.pulseTileId === t.id) {
              state.pulseTileId = null;
              render();
            }
          }, 900);
        });
        listWrap.appendChild(mt);
      });

      if (state.addTileDraftProjectId === p.id) {
        var input = el('input', 'dark-input add-tile-input');
        input.placeholder = 'Tile title…';
        input.value = state.addTileDraftText;
        input.addEventListener('input', function (e) { state.addTileDraftText = e.target.value; });
        input.addEventListener('keydown', function (e) {
          if (e.key === 'Enter') commitAddTileDraft();
          if (e.key === 'Escape') { state.addTileDraftProjectId = null; state.addTileDraftText = ''; render(); }
        });
        input.addEventListener('blur', function () { commitAddTileDraft(); });
        listWrap.appendChild(input);
        setTimeout(function () { input.focus(); }, 0);
      }
      wrap.appendChild(listWrap);
    }
    return wrap;
  }

  function commitAddTileDraft() {
    var projectId = state.addTileDraftProjectId;
    var text = state.addTileDraftText.trim();
    if (!projectId) return;
    if (!text) {
      state.addTileDraftProjectId = null;
      state.addTileDraftText = '';
      render();
      return;
    }
    state.tiles.push({ id: uid('tile'), projectId: projectId, title: text, status: 'todo', subtasks: [] });
    state.addTileDraftProjectId = null;
    state.addTileDraftText = '';
    persist();
    render();
  }

  function buildSidebarBottom() {
    var bottom = el('div', 'sidebar-bottom');
    var btn = el('button', 'settings-btn');
    btn.appendChild(icon('settings'));
    btn.appendChild(el('span', null, 'Settings'));
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      state.settingsOpen = !state.settingsOpen;
      state.newProjectOpen = false;
      render();
    });
    bottom.appendChild(btn);

    if (state.settingsOpen) {
      var pop = el('div', 'settings-popover');
      pop.addEventListener('click', function (e) { e.stopPropagation(); });
      pop.appendChild(el('div', 'settings-label', 'Theme'));
      var row = el('div', 'theme-row');
      Object.keys(THEMES).forEach(function (key) {
        var t = THEMES[key];
        var swatch = el('button', 'theme-swatch');
        swatch.style.background = t.accent;
        swatch.title = t.label;
        var selected = state.theme === key;
        swatch.style.borderColor = selected ? '#eae8ea' : 'transparent';
        if (selected) swatch.appendChild(icon('check'));
        swatch.addEventListener('click', function () {
          state.theme = key;
          persist();
          render();
        });
        row.appendChild(swatch);
      });
      pop.appendChild(row);

      var clearBtn = el('button', 'clear-board-btn', 'Clear Board');
      clearBtn.addEventListener('click', function () {
        if (!window.confirm('Clear all projects and tiles? Templates and theme are kept.')) return;
        state.projects = [];
        state.tiles = [];
        state.expandedProjects = {};
        state.expandedTiles = {};
        persist();
        render();
      });
      pop.appendChild(clearBtn);
      bottom.appendChild(pop);
    }
    return bottom;
  }

  /* ---------- Board ---------- */
  function buildBoard(accent) {
    var board = el('div', 'board');
    COLUMNS.forEach(function (col) {
      board.appendChild(buildColumn(col, accent));
    });
    return board;
  }

  function buildColumn(col, accent) {
    var colTiles = state.tiles.filter(function (t) { return t.status === col.key; });
    var column = el('div', 'column');
    column.addEventListener('dragover', function (e) { e.preventDefault(); column.classList.add('drag-over'); });
    column.addEventListener('dragleave', function () { column.classList.remove('drag-over'); });
    column.addEventListener('drop', function (e) {
      e.preventDefault();
      column.classList.remove('drag-over');
      var tileId = state.draggingTileId;
      if (!tileId) return;
      state.tiles = state.tiles.map(function (t) {
        return t.id === tileId ? Object.assign({}, t, { status: col.key }) : t;
      });
      state.draggingTileId = null;
      persist();
      render();
    });

    var header = el('div', 'column-header');
    header.appendChild(el('span', 'column-label', col.label));
    header.appendChild(el('span', 'column-count', String(colTiles.length)));
    column.appendChild(header);

    var body = el('div', 'column-body');
    if (colTiles.length === 0) {
      body.appendChild(el('div', 'empty-col', 'Empty'));
    } else {
      var pbid = projectsById();
      colTiles.forEach(function (t) {
        body.appendChild(buildTile(t, pbid[t.projectId] || { color: '#75798c' }));
      });
    }
    column.appendChild(body);
    return column;
  }

  function buildTile(t, project) {
    var total = t.subtasks.length;
    var done = t.subtasks.filter(function (x) { return x.done; }).length;
    var expanded = !!state.expandedTiles[t.id];

    var tile = el('div', 'tile' + (state.pulseTileId === t.id ? ' tile-pulse' : ''));
    tile.style.borderLeftColor = project.color;
    tile.setAttribute('draggable', 'true');

    tile.addEventListener('dragstart', function (e) {
      state.draggingTileId = t.id;
      try { e.dataTransfer.setData('text/plain', t.id); e.dataTransfer.effectAllowed = 'move'; } catch (err) {}
    });
    tile.addEventListener('dragend', function () {
      state.draggingTileId = null;
      render();
    });
    tile.addEventListener('dragover', function (e) { e.preventDefault(); e.stopPropagation(); });
    tile.addEventListener('drop', function (e) {
      e.preventDefault();
      e.stopPropagation();
      handleDropOnTileReorder(t.id);
    });

    var head = el('div', 'tile-head');
    var titleWrap = el('div', 'tile-title-wrap');
    titleWrap.appendChild(el('div', 'tile-title', t.title));
    if (total > 0) {
      var progRow = el('div', 'tile-progress-row');
      var track = el('div', 'tile-progress-track');
      var fill = el('div', 'tile-progress-fill');
      fill.style.width = Math.round((done / total) * 100) + '%';
      fill.style.background = project.color;
      track.appendChild(fill);
      progRow.appendChild(track);
      progRow.appendChild(el('span', 'tile-progress-label', done + '/' + total));
      titleWrap.appendChild(progRow);
    }
    titleWrap.addEventListener('click', function () {
      state.expandedTiles[t.id] = !state.expandedTiles[t.id];
      render();
    });
    head.appendChild(titleWrap);
    head.appendChild(icon('drag_indicator', 'drag-indicator'));

    var delBtn = el('button', 'tile-delete');
    delBtn.appendChild(icon('close'));
    delBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      state.tiles = state.tiles.filter(function (x) { return x.id !== t.id; });
      persist();
      render();
    });
    head.appendChild(delBtn);
    tile.appendChild(head);

    if (expanded) {
      var subWrap = el('div', 'tile-subtasks');
      t.subtasks.forEach(function (sub) {
        var row = el('div', 'subtask-row');
        var cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.checked = sub.done;
        cb.style.accentColor = project.color;
        cb.addEventListener('change', function () {
          sub.done = !sub.done;
          persist();
          render();
        });
        row.appendChild(cb);
        row.appendChild(el('span', 'subtask-text' + (sub.done ? ' done' : ''), sub.text));
        var subDel = el('button', 'subtask-delete');
        subDel.appendChild(icon('close'));
        subDel.addEventListener('click', function () {
          t.subtasks = t.subtasks.filter(function (x) { return x.id !== sub.id; });
          persist();
          render();
        });
        row.appendChild(subDel);
        subWrap.appendChild(row);
      });

      var addRow = el('div', 'add-subtask-row');
      var addInput = el('input', 'add-subtask-input');
      addInput.placeholder = 'Add subtask…';
      addInput.value = state.newSubtaskDraftByTile[t.id] || '';
      addInput.addEventListener('input', function (e) {
        state.newSubtaskDraftByTile[t.id] = e.target.value;
      });
      var doAdd = function () {
        var text = (state.newSubtaskDraftByTile[t.id] || '').trim();
        if (!text) return;
        t.subtasks.push({ id: uid('sub'), text: text, done: false });
        state.newSubtaskDraftByTile[t.id] = '';
        persist();
        render();
      };
      addInput.addEventListener('keydown', function (e) { if (e.key === 'Enter') doAdd(); });
      addRow.appendChild(addInput);
      var addBtn = el('button', 'add-subtask-btn');
      addBtn.style.color = project.color;
      addBtn.appendChild(icon('add'));
      addBtn.addEventListener('click', doAdd);
      addRow.appendChild(addBtn);
      subWrap.appendChild(addRow);
      tile.appendChild(subWrap);
    }

    return tile;
  }

  function handleDropOnTileReorder(targetTileId) {
    var tileId = state.draggingTileId;
    if (!tileId || tileId === targetTileId) {
      state.draggingTileId = null;
      render();
      return;
    }
    var tiles = state.tiles.slice();
    var fromIdx = tiles.findIndex(function (t) { return t.id === tileId; });
    if (fromIdx === -1) {
      state.draggingTileId = null;
      render();
      return;
    }
    var moved = tiles.splice(fromIdx, 1)[0];
    var targetIdx = tiles.findIndex(function (t) { return t.id === targetTileId; });
    var targetStatus = tiles[targetIdx] ? tiles[targetIdx].status : moved.status;
    moved.status = targetStatus;
    var insertAt = targetIdx === -1 ? tiles.length : targetIdx;
    tiles.splice(insertAt, 0, moved);
    state.tiles = tiles;
    state.draggingTileId = null;
    persist();
    render();
  }

  /* ---------- Create Dialog ---------- */
  function openCreateDialog(source) {
    state.newProjectOpen = false;
    state.templatePickerOpen = false;
    state.createDialog = { source: source, name: '', color: PROJECT_COLORS[0] };
    render();
  }

  function buildCreateDialogModal(accent) {
    var backdrop = el('div', 'modal-backdrop modal-create');
    backdrop.addEventListener('click', function () { state.createDialog = null; render(); });
    var modal = el('div', 'modal');
    modal.addEventListener('click', function (e) { e.stopPropagation(); });

    modal.appendChild(el('h2', 'modal-title', 'New Project'));

    var nameGroup = el('div', 'field-group');
    nameGroup.appendChild(el('label', 'field-label', 'Project Name'));
    var nameInput = el('input', 'field-input');
    nameInput.placeholder = 'e.g. West Wing Renovation';
    nameInput.value = state.createDialog.name;
    nameInput.addEventListener('input', function (e) {
      state.createDialog.name = e.target.value;
      updateCreateButtons();
    });
    nameGroup.appendChild(nameInput);
    modal.appendChild(nameGroup);
    setTimeout(function () { nameInput.focus(); }, 0);

    var colorGroup = el('div', 'field-group');
    colorGroup.appendChild(el('label', 'field-label', 'Color'));
    var colorRow = el('div', 'color-row');
    PROJECT_COLORS.forEach(function (c) {
      var sw = el('button', 'color-swatch');
      sw.style.background = c;
      sw.style.borderColor = state.createDialog.color === c ? '#eae8ea' : 'transparent';
      sw.addEventListener('click', function () {
        state.createDialog.color = c;
        render();
      });
      colorRow.appendChild(sw);
    });
    colorGroup.appendChild(colorRow);
    modal.appendChild(colorGroup);

    var cd = state.createDialog;
    if (cd.source !== 'blank') {
      var tpl = state.templates.find(function (x) { return x.id === cd.source; });
      if (tpl) {
        var previewWrap = el('div');
        previewWrap.appendChild(el('div', 'field-label', 'Will create:'));
        var pl = el('div', 'preview-list');
        tpl.tiles.forEach(function (x) {
          var row = el('div', 'preview-row');
          row.appendChild(el('span', null, x.title));
          row.appendChild(el('span', 'preview-count', x.subtasks.length + ' sub'));
          pl.appendChild(row);
        });
        previewWrap.appendChild(pl);
        modal.appendChild(previewWrap);
      }
    }

    var footer = el('div', 'modal-footer');
    var cancelBtn = el('button', 'btn-outline', 'Cancel');
    cancelBtn.addEventListener('click', function () { state.createDialog = null; render(); });
    var createBtn = el('button', 'btn-accent', 'Create');
    createBtn.disabled = !cd.name.trim();
    createBtn.addEventListener('click', function () { doCreateProject(); });
    footer.appendChild(cancelBtn);
    footer.appendChild(createBtn);
    modal.appendChild(footer);

    function updateCreateButtons() {
      createBtn.disabled = !state.createDialog.name.trim();
    }

    backdrop.appendChild(modal);
    return backdrop;
  }

  function doCreateProject() {
    var cd = state.createDialog;
    if (!cd || !cd.name.trim()) return;
    var projectId = uid('proj');
    var project = { id: projectId, name: cd.name.trim(), color: cd.color };
    var newTiles = [];
    if (cd.source !== 'blank') {
      var tpl = state.templates.find(function (t) { return t.id === cd.source; });
      if (tpl) {
        tpl.tiles.forEach(function (row) {
          newTiles.push({
            id: uid('tile'), projectId: projectId, title: row.title, status: 'todo',
            subtasks: row.subtasks.map(function (txt) { return { id: uid('sub'), text: txt, done: false }; }),
          });
        });
      }
    }
    state.projects.push(project);
    state.tiles = state.tiles.concat(newTiles);
    state.expandedProjects[projectId] = true;
    state.createDialog = null;
    persist();
    render();
  }

  /* ---------- Template Picker ---------- */
  function buildTemplatePickerModal(accent) {
    var backdrop = el('div', 'modal-backdrop modal-template-picker');
    backdrop.addEventListener('click', function () {
      state.templatePickerOpen = false;
      state.templatePickerMode = 'list';
      state.templateDraft = null;
      render();
    });
    var modal = el('div', 'modal');
    modal.addEventListener('click', function (e) { e.stopPropagation(); });

    if (state.templatePickerMode === 'list') {
      var header = el('div', 'modal-header');
      header.appendChild(el('h2', 'modal-title', 'Choose a Template'));
      var closeBtn = el('button', 'modal-close');
      closeBtn.appendChild(icon('close'));
      closeBtn.addEventListener('click', function () {
        state.templatePickerOpen = false;
        state.templatePickerMode = 'list';
        render();
      });
      header.appendChild(closeBtn);
      modal.appendChild(header);

      var grid = el('div', 'template-grid');
      state.templates.forEach(function (tpl) {
        var card = el('div', 'template-card');
        card.appendChild(el('div', 'template-name', tpl.name));
        card.appendChild(el('div', 'template-count', tpl.tiles.length + ' tiles'));
        card.appendChild(el('div', 'template-preview', tpl.tiles.slice(0, 4).map(function (x) { return x.title; }).join(' · ')));
        var delBtn = el('button', 'template-delete');
        delBtn.appendChild(icon('delete'));
        delBtn.addEventListener('click', function (e) {
          e.stopPropagation();
          state.templates = state.templates.filter(function (t) { return t.id !== tpl.id; });
          persist();
          render();
        });
        card.appendChild(delBtn);
        card.addEventListener('click', function () { openCreateDialog(tpl.id); });
        grid.appendChild(card);
      });

      var addCard = el('div', 'add-template-card');
      addCard.appendChild(icon('add'));
      addCard.appendChild(el('span', null, 'Add Template'));
      addCard.addEventListener('click', function () {
        state.templatePickerMode = 'add';
        state.templateDraft = { name: '', tiles: [{ title: '', subtasksText: '' }] };
        render();
      });
      grid.appendChild(addCard);
      modal.appendChild(grid);
    } else {
      modal.appendChild(buildTemplateAddForm(accent));
    }

    backdrop.appendChild(modal);
    return backdrop;
  }

  function buildTemplateAddForm(accent) {
    var wrap = el('div');
    var header = el('div', 'modal-header');
    header.appendChild(el('h2', 'modal-title', 'New Template'));
    var closeBtn = el('button', 'modal-close');
    closeBtn.appendChild(icon('close'));
    closeBtn.addEventListener('click', function () {
      state.templatePickerMode = 'list';
      state.templateDraft = null;
      render();
    });
    header.appendChild(closeBtn);
    wrap.appendChild(header);

    var nameGroup = el('div', 'field-group');
    nameGroup.appendChild(el('label', 'field-label', 'Template Name'));
    var nameInput = el('input', 'field-input');
    nameInput.placeholder = 'e.g. Website Launch';
    nameInput.value = state.templateDraft.name;
    nameInput.addEventListener('input', function (e) {
      state.templateDraft.name = e.target.value;
      updateSaveBtn();
    });
    nameGroup.appendChild(nameInput);
    wrap.appendChild(nameGroup);

    var rows = el('div', 'template-rows');
    state.templateDraft.tiles.forEach(function (row, idx) {
      var rowEl = el('div', 'template-row');
      var titleInput = el('input', 'template-row-title');
      titleInput.placeholder = 'Tile title';
      titleInput.value = row.title;
      titleInput.addEventListener('input', function (e) {
        row.title = e.target.value;
        updateSaveBtn();
      });
      rowEl.appendChild(titleInput);

      var subTextarea = el('textarea', 'template-row-subtasks');
      subTextarea.placeholder = 'Subtasks, one per line';
      subTextarea.value = row.subtasksText;
      subTextarea.addEventListener('input', function (e) { row.subtasksText = e.target.value; });
      rowEl.appendChild(subTextarea);

      if (state.templateDraft.tiles.length > 1) {
        var rmBtn = el('button', 'template-row-remove');
        rmBtn.appendChild(icon('delete'));
        rmBtn.addEventListener('click', function () {
          state.templateDraft.tiles = state.templateDraft.tiles.filter(function (_, i) { return i !== idx; });
          if (!state.templateDraft.tiles.length) state.templateDraft.tiles = [{ title: '', subtasksText: '' }];
          render();
        });
        rowEl.appendChild(rmBtn);
      }
      rows.appendChild(rowEl);
    });
    wrap.appendChild(rows);

    var addTileBtn = el('button', 'add-tile-row-btn');
    addTileBtn.appendChild(icon('add'));
    addTileBtn.appendChild(document.createTextNode(' Add Tile'));
    addTileBtn.addEventListener('click', function () {
      state.templateDraft.tiles.push({ title: '', subtasksText: '' });
      render();
    });
    wrap.appendChild(addTileBtn);

    var footer = el('div', 'modal-footer');
    var cancelBtn = el('button', 'btn-outline', 'Cancel');
    cancelBtn.addEventListener('click', function () {
      state.templatePickerMode = 'list';
      state.templateDraft = null;
      render();
    });
    var saveBtn = el('button', 'btn-accent', 'Save Template');
    saveBtn.disabled = !canSaveTemplate();
    saveBtn.addEventListener('click', function () { doSaveTemplate(); });
    footer.appendChild(cancelBtn);
    footer.appendChild(saveBtn);
    wrap.appendChild(footer);

    function updateSaveBtn() {
      saveBtn.disabled = !canSaveTemplate();
    }

    return wrap;
  }

  function canSaveTemplate() {
    var d = state.templateDraft;
    return !!(d && d.name.trim() && d.tiles.some(function (t) { return t.title.trim(); }));
  }

  function doSaveTemplate() {
    var draft = state.templateDraft;
    if (!draft || !draft.name.trim()) return;
    var tiles = draft.tiles.filter(function (t) { return t.title.trim(); }).map(function (t) {
      return {
        title: t.title.trim(),
        subtasks: t.subtasksText.split('\n').map(function (x) { return x.trim(); }).filter(Boolean),
      };
    });
    if (!tiles.length) return;
    state.templates.push({ id: uid('tpl'), name: draft.name.trim(), tiles: tiles });
    state.templatePickerMode = 'list';
    state.templateDraft = null;
    persist();
    render();
  }

  /* ---------- Confirm delete project ---------- */
  function buildConfirmDeleteModal() {
    var backdrop = el('div', 'modal-backdrop modal-confirm-delete');
    var modal = el('div', 'modal');
    modal.addEventListener('click', function (e) { e.stopPropagation(); });

    var pbid = projectsById();
    var p = pbid[state.confirmDeleteProject];
    var count = state.tiles.filter(function (t) { return t.projectId === state.confirmDeleteProject; }).length;

    modal.appendChild(el('h2', 'modal-title', 'Delete “' + (p ? p.name : '') + '”?'));
    modal.appendChild(el('p', 'confirm-body', 'This removes the project and its ' + count + ' tiles. This cannot be undone.'));

    var footer = el('div', 'modal-footer');
    var cancelBtn = el('button', 'btn-outline', 'Cancel');
    cancelBtn.addEventListener('click', function () { state.confirmDeleteProject = null; render(); });
    var delBtn = el('button', 'btn-danger-outline', 'Delete');
    delBtn.addEventListener('click', function () {
      var id = state.confirmDeleteProject;
      state.projects = state.projects.filter(function (p) { return p.id !== id; });
      state.tiles = state.tiles.filter(function (t) { return t.projectId !== id; });
      state.confirmDeleteProject = null;
      persist();
      render();
    });
    footer.appendChild(cancelBtn);
    footer.appendChild(delBtn);
    modal.appendChild(footer);

    backdrop.appendChild(modal);
    return backdrop;
  }

  load();
  render();
})();
