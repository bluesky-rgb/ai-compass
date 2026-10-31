/* 小型 Markdown 渲染器：覆盖本仓库用到的语法（标题、段落、粗斜体、行内代码、链接、引用、列表、任务列表、表格、分隔线、代码块）。 */
(function () {
  const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  function inline(text, linkFn) {
    const codes = [];
    text = text.replace(/`([^`]+)`/g, (_, c) => { codes.push(c); return '\u0000' + (codes.length - 1) + '\u0000'; });
    text = esc(text);
    text = text.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, t, u) => {
      const { href, external } = linkFn(u.replace(/&amp;/g, '&'));
      return `<a href="${esc(href)}"${external ? ' target="_blank" rel="noopener"' : ''}>${t}</a>`;
    });
    text = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    text = text.replace(/(^|[^*])\*([^*\s][^*]*?)\*(?!\*)/g, '$1<em>$2</em>');
    text = text.replace(/\u0000(\d+)\u0000/g, (_, i) => `<code>${esc(codes[+i])}</code>`);
    return text;
  }

  function render(src, linkFn) {
    const lines = src.replace(/\r/g, '').split('\n');
    const out = [];
    let i = 0;
    const isBlank = l => /^\s*$/.test(l);
    const isList = l => /^\s*([-*]|\d+\.)\s+/.test(l);
    const isTable = l => /^\s*\|.*\|\s*$/.test(l);
    const startsBlock = l => /^(#{1,6}\s|>|```|---\s*$)/.test(l) || isList(l) || isTable(l);

    while (i < lines.length) {
      let l = lines[i];
      if (isBlank(l)) { i++; continue; }

      if (/^```/.test(l)) {
        const buf = []; i++;
        while (i < lines.length && !/^```/.test(lines[i])) buf.push(lines[i++]);
        i++; out.push(`<pre><code>${esc(buf.join('\n'))}</code></pre>`); continue;
      }
      const h = l.match(/^(#{1,6})\s+(.*)$/);
      if (h) {
        const n = h[1].length, txt = h[2].trim();
        const id = 'h-' + txt.replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '').toLowerCase();
        out.push(`<h${n} id="${esc(id)}">${inline(txt, linkFn)}</h${n}>`); i++; continue;
      }
      if (/^---\s*$/.test(l)) { out.push('<hr>'); i++; continue; }

      if (/^>/.test(l)) {
        const buf = [];
        while (i < lines.length && /^>/.test(lines[i])) buf.push(lines[i++].replace(/^>\s?/, ''));
        out.push(`<blockquote>${render(buf.join('\n'), linkFn)}</blockquote>`); continue;
      }

      if (isTable(l) && i + 1 < lines.length && /^\s*\|[\s:|-]+\|\s*$/.test(lines[i + 1])) {
        const cells = r => r.trim().replace(/^\||\|$/g, '').split('|').map(c => c.trim());
        const head = cells(l); i += 2;
        const rows = [];
        while (i < lines.length && isTable(lines[i])) rows.push(cells(lines[i++]));
        out.push('<div class="table-wrap"><table><thead><tr>' + head.map(c => `<th>${inline(c, linkFn)}</th>`).join('') +
          '</tr></thead><tbody>' + rows.map(r => '<tr>' + r.map(c => `<td>${inline(c, linkFn)}</td>`).join('') + '</tr>').join('') +
          '</tbody></table></div>');
        continue;
      }

      if (isList(l)) {
        const ordered = /^\s*\d+\./.test(l);
        const items = [];
        while (i < lines.length && (isList(lines[i]) || (!isBlank(lines[i]) && /^\s{2,}\S/.test(lines[i]) && items.length))) {
          if (isList(lines[i])) items.push(lines[i].replace(/^\s*([-*]|\d+\.)\s+/, ''));
          else items[items.length - 1] += '\n' + lines[i].trim();
          i++;
        }
        const tag = ordered ? 'ol' : 'ul';
        const hasTask = items.some(t => /^\[[ xX]\]\s/.test(t));
        out.push(`<${tag}${hasTask ? ' class="tasks"' : ''}>` + items.map(t => {
          const m = t.match(/^\[([ xX])\]\s+([\s\S]*)$/);
          if (m) {
            const label = m[2];
            return `<li class="task"><label><input type="checkbox" data-task="${esc(label.split('\n')[0])}"${m[1] !== ' ' ? ' checked' : ''}><span>${inline(label, linkFn)}</span></label></li>`;
          }
          return '<li>' + t.split('\n').map(x => inline(x, linkFn)).join('<br>') + '</li>';
        }).join('') + `</${tag}>`);
        continue;
      }

      const buf = [];
      while (i < lines.length && !isBlank(lines[i]) && !startsBlock(lines[i])) buf.push(lines[i++]);
      if (!buf.length) { buf.push(lines[i++]); }
      out.push(`<p>${buf.map(x => inline(x, linkFn)).join('<br>')}</p>`);
    }
    return out.join('\n');
  }

  window.MD = { render };
})();
