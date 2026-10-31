/* AI 探索罗盘：读取仓库里的 Markdown，按引导顺序展示。内容只改 .md 文件即可，网页自动更新。 */
(function () {
  const PAGES = [
    { id: 'core',      file: 'docs/01-核心判断.md',               title: '核心判断',       group: '方向', blurb: 'AI 是工具、数据是价值、人的价值在哪里' },
    { id: 'status',    file: 'docs/02-现状分析.md',               title: '现状分析',       group: '方向', blurb: '四个月积累的优势、短板、机会、风险' },
    { id: 'roadmap',   file: 'docs/03-长期路线.md',               title: '长期路线',       group: '方向', blurb: '三条线在 3 / 6 / 12 个月各做什么' },
    { id: 'learn',     file: 'docs/09-学习地图.md',               title: '能力线 · 学习地图', group: '三条线', blurb: '按数据闭环补短板，每一项都落到项目上' },
    { id: 'ip-think',  file: 'docs/10-个人IP构建思想.md',          title: 'IP 线 · 构建思想', group: '三条线', blurb: 'IP 的结构、三样资产、阶段叙事、构建原则' },
    { id: 'ip',        file: 'docs/04-IP线-个人IP与X运营.md',      title: 'IP 线 · 个人 IP 与 X', group: '三条线', blurb: '定位、平台分工、X 运营方案' },
    { id: 'pool',      file: 'docs/11-素材库与候选产品池.md',       title: '素材库与候选产品池', group: '三条线', blurb: 'X 内容弹药和下一个落地项目的候选' },
    { id: 'landing',   file: 'docs/05-落地线-科研新手助手.md',      title: '落地线 · 科研新手助手', group: '三条线', blurb: '第一个真实项目：用户、路径、阶段' },
    { id: 'infra',     file: 'docs/06-基础设施.md',               title: '基础设施',       group: '支撑', blurb: '服务器、域名、架构和成本' },
    { id: 'money',     file: 'docs/07-独立站与盈利.md',            title: '独立站与盈利',    group: '支撑', blurb: '先卖服务，再卖工具' },
    { id: 'todo',      file: 'docs/08-行动清单.md',               title: '行动清单',       group: '执行', blurb: '这两周要做的事，可以直接勾选' },
    { id: 'open',      file: 'docs/12-待解决问题与产出物.md',       title: '待解决问题',     group: '执行', blurb: '还没定的事，以及所有产出物在哪里' },
    { id: 'decisions', file: 'decisions/决策记录.md',             title: '决策记录',       group: '执行', blurb: '每个决定的理由和放弃的选项' },
    { id: 'log-1031',  file: 'logs/2026-10-31-整体方向讨论.md',     title: '讨论纪要 · 10-31', group: '执行', blurb: '这次讨论从哪里开始、怎么走到这里' },
    { id: 'map',       file: 'research/水生毒理学领域地图.md',       title: '水生毒理学领域地图', group: '成果', blurb: '落地线第一份交付物' },
  ];
  const EXTERNAL = [{ title: '探索档案', href: 'research/探索档案/index.html', group: '成果', blurb: '95 个仓库、650 项研究的可搜索档案' }];
  const GUIDE = ['core', 'status', 'roadmap', 'todo'];
  const byFile = Object.fromEntries(PAGES.map(p => [p.file, p]));
  const byId = Object.fromEntries(PAGES.map(p => [p.id, p]));
  const cache = {};

  const store = {
    get(k, d) { try { const v = localStorage.getItem('compass:' + k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem('compass:' + k, JSON.stringify(v)); } catch (e) {} }
  };

  async function load(file) {
    if (cache[file]) return cache[file];
    const r = await fetch(encodeURI(file), { cache: 'no-cache' });
    if (!r.ok) throw new Error(file + ' ' + r.status);
    return (cache[file] = await r.text());
  }

  function resolve(base, rel) {
    const parts = base.split('/'); parts.pop();
    rel.split('/').forEach(p => { if (p === '..') parts.pop(); else if (p !== '.') parts.push(p); });
    return parts.join('/');
  }
  const linkFor = base => u => {
    if (/^https?:/.test(u)) return { href: u, external: true };
    const [path, hash] = u.split('#');
    const full = decodeURI(resolve(base, path));
    if (byFile[full]) return { href: '#' + byFile[full].id + (hash ? '/' + hash : ''), external: false };
    return { href: encodeURI(full), external: true };
  };

  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  /* 导航 */
  function drawNav(active) {
    const groups = {};
    PAGES.forEach(p => (groups[p.group] ||= []).push(p));
    EXTERNAL.forEach(p => (groups[p.group] ||= []).push(p));
    const visited = store.get('visited', []);
    let html = `<a class="nav-home${active === '' ? ' on' : ''}" href="#">从这里开始</a>`;
    for (const [g, list] of Object.entries(groups)) {
      html += `<div class="nav-group"><span>${g}</span>` + list.map(p => p.id
        ? `<a href="#${p.id}" class="${p.id === active ? 'on' : ''}">${esc(p.title)}${visited.includes(p.id) ? '<i class="dot" title="读过"></i>' : ''}</a>`
        : `<a href="${encodeURI(p.href)}" target="_blank" rel="noopener">${esc(p.title)} ↗</a>`).join('') + '</div>';
    }
    document.getElementById('nav').innerHTML = html;
  }

  /* 首页 */
  async function home() {
    const main = document.getElementById('main');
    let site = {};
    try { site = await (await fetch('assets/site.json', { cache: 'no-cache' })).json(); } catch (e) {}
    const visited = store.get('visited', []);
    const done = GUIDE.filter(id => visited.includes(id)).length;

    let todo = { total: 0, done: 0 };
    try {
      const t = await load(byId.todo.file);
      const ticks = store.get('tasks', {});
      const items = [...t.matchAll(/^\s*-\s+\[([ xX])\]\s+(.+)$/gm)];
      todo.total = items.length;
      todo.done = items.filter(m => m[1] !== ' ' || ticks[m[2].trim()]).length;
    } catch (e) {}

    let decisions = [];
    try {
      const d = await load(byId.decisions.file);
      decisions = [...d.matchAll(/^##\s+(\d{4}-\d{2}-\d{2})\s*·\s*(.+)$/gm)].slice(0, 4).map(m => ({ date: m[1], title: m[2] }));
    } catch (e) {}

    const loop = (site.loop || []).map(s => `
      <div class="loop-node l${s.level}">
        <b>${esc(s.name)}</b>
        <span class="meter" aria-hidden="true">${'<i></i>'.repeat(4).replace(/<i><\/i>/g, (m, k) => m)}</span>
        <small>${esc(s.state)}</small>
      </div>`).join('<span class="arrow" aria-hidden="true">→</span>');

    main.innerHTML = `
      <section class="hero">
        <p class="eyebrow">长期指导与存档 · 更新于 ${esc(site.updated || '')}</p>
        <h1>一个普通人在 AI 时代，<br>从探索走向落地。</h1>
        <p class="lead">三条线同时推进：<b>能力线</b>补齐 AI 数据闭环，<b>IP 线</b>公开记录并积累信任，<b>落地线</b>用真实场景验证价值并走向盈利。</p>
        <p class="stage"><span>当前阶段</span>${esc(site.stage || '')}</p>
      </section>

      <section class="block">
        <div class="block-head"><h2>从这里开始</h2><span class="muted">按顺序读，${done}/${GUIDE.length} 已读</span></div>
        <ol class="guide">
          ${GUIDE.map((id, k) => { const p = byId[id]; return `
            <li class="${visited.includes(id) ? 'read' : ''}"><a href="#${id}">
              <span class="step">${k + 1}</span>
              <span class="g-body"><b>${esc(p.title)}</b><small>${esc(p.blurb)}</small></span>
              <span class="g-state">${visited.includes(id) ? '已读' : '去读 →'}</span>
            </a></li>`; }).join('')}
        </ol>
      </section>

      <section class="block">
        <div class="block-head"><h2>三条线，现在在做什么</h2></div>
        <div class="lines">
          ${(site.focus || []).map(f => `
            <a class="line" href="#${f.route}">
              <span class="line-name">${esc(f.line)}</span>
              <span>${esc(f.now)}</span>
            </a>`).join('')}
        </div>
      </section>

      <section class="block">
        <div class="block-head"><h2>能力现状：数据闭环</h2><a href="#learn">看学习地图 →</a></div>
        <p class="muted small">AI 的能力按它在“获取、消化、展示、交互”里替人做了什么来定义。格子越满越强。</p>
        <div class="loop">${loop}</div>
      </section>

      <section class="block two">
        <div>
          <div class="block-head"><h2>行动进度</h2><a href="#todo">打开清单 →</a></div>
          <div class="progress" role="progressbar" aria-valuemin="0" aria-valuemax="${todo.total}" aria-valuenow="${todo.done}"><i style="width:${todo.total ? (todo.done / todo.total * 100) : 0}%"></i></div>
          <p class="muted small">${todo.done} / ${todo.total} 项完成（勾选只保存在你自己的浏览器里）</p>
        </div>
        <div>
          <div class="block-head"><h2>最近的决定</h2><a href="#decisions">全部 →</a></div>
          <ul class="decisions">${decisions.map(d => `<li><time>${d.date}</time>${esc(d.title)}</li>`).join('')}</ul>
        </div>
      </section>

      <section class="block">
        <div class="block-head"><h2>成果与学习展示</h2></div>
        <div class="cards">
          <a class="card" href="#map"><b>水生毒理学领域地图</b><small>落地线第一份交付物：七个方向、入门综述、选方向对照表</small></a>
          <a class="card" href="#learn"><b>学习地图</b><small>每一环要掌握什么、已经研究过什么、下一步练什么，以及“能力前后”</small></a>
          <a class="card" href="#ip-think"><b>四个月的阶段叙事</b><small>从 3D 探索到开源拆解，再到走向真实需求，每一步为什么转向</small></a>
          <a class="card" href="#pool"><b>素材库</b><small>研究里自己扩展的代表作和独立作品，X 内容的现成弹药</small></a>
          <a class="card" href="research/探索档案/index.html" target="_blank" rel="noopener"><b>探索档案 ↗</b><small>2026 年 7～10 月：95 个仓库、约 650 项研究、400 多个演示</small></a>
        </div>
      </section>

      <footer class="foot">
        <span>内容来自仓库里的 Markdown 文件，修改文件后网页自动更新。</span>
        <a href="https://github.com/bluesky-rgb/ai-compass" target="_blank" rel="noopener">GitHub 仓库 ↗</a>
      </footer>`;
    main.querySelectorAll('.loop-node').forEach(n => {
      const lv = +n.className.match(/l(\d)/)[1];
      n.querySelector('.meter').innerHTML = [0, 1, 2, 3].map(k => `<i class="${k < lv ? 'f' : ''}"></i>`).join('');
    });
  }

  /* 文档页 */
  async function page(id, anchor) {
    const p = byId[id];
    const main = document.getElementById('main');
    main.innerHTML = '<p class="loading">正在加载…</p>';
    let md;
    try { md = await load(p.file); }
    catch (e) { main.innerHTML = `<p class="error">没能读取 ${esc(p.file)}。请检查文件是否存在，或稍后刷新。</p>`; return; }

    const idx = PAGES.indexOf(p);
    const prev = PAGES[idx - 1], next = PAGES[idx + 1];
    main.innerHTML = `
      <article class="doc">
        <p class="eyebrow">${esc(p.group)} · <a href="https://github.com/bluesky-rgb/ai-compass/blob/main/${encodeURI(p.file)}" target="_blank" rel="noopener">在 GitHub 编辑 ↗</a></p>
        ${MD.render(md, linkFor(p.file))}
      </article>
      <div class="pager">
        ${prev ? `<a href="#${prev.id}"><small>上一篇</small>${esc(prev.title)}</a>` : '<span></span>'}
        ${next ? `<a class="nx" href="#${next.id}"><small>下一篇</small>${esc(next.title)}</a>` : '<a class="nx" href="#"><small>读完了</small>回到首页</a>'}
      </div>`;

    const ticks = store.get('tasks', {});
    main.querySelectorAll('input[data-task]').forEach(cb => {
      const key = cb.dataset.task;
      if (ticks[key]) cb.checked = true;
      cb.addEventListener('change', () => { const t = store.get('tasks', {}); t[key] = cb.checked; store.set('tasks', t); });
    });

    const v = store.get('visited', []);
    if (!v.includes(id)) { v.push(id); store.set('visited', v); }
    drawNav(id);
    if (anchor) { const el = document.getElementById(anchor); if (el) el.scrollIntoView(); }
    else window.scrollTo(0, 0);
    document.title = p.title + ' · AI 探索罗盘';
  }

  async function route() {
    const h = decodeURIComponent(location.hash.slice(1));
    const [id, anchor] = h.split('/');
    document.getElementById('nav').classList.remove('open');
    document.getElementById('menuBtn').setAttribute('aria-expanded', 'false');
    if (byId[id]) await page(id, anchor);
    else { drawNav(''); await home(); window.scrollTo(0, 0); document.title = 'AI 探索罗盘'; }
  }

  document.getElementById('menuBtn').addEventListener('click', e => {
    const nav = document.getElementById('nav');
    const open = nav.classList.toggle('open');
    e.currentTarget.setAttribute('aria-expanded', String(open));
  });
  window.addEventListener('hashchange', route);
  route();
})();
