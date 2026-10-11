const V = require('../lib/views');
const D = require('../lib/discord');

const esc = V.esc;

function md(s) {
  const lines = String(s == null ? '' : s).split('\n');
  const out = [];
  let q = [];
  const flush = () => { if (q.length) { out.push('<div class="dc-quote">' + q.join('<br>') + '</div>'); q = []; } };
  lines.forEach(l => {
    const m = /^> ?(.*)$/.exec(l);
    const t = esc(m ? m[1] : l).replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>').replace(/\*([^*\n]+)\*/g, '<i>$1</i>').replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, '<a class="dc-link" href="$2">$1</a>');
    if (m) q.push(t); else { flush(); out.push(t); }
  });
  flush();
  return out.join('<br>').replace(/<br><div class="dc-quote">/g, '<div class="dc-quote">').replace(/<\/div><br>/g, '</div>');
}

function preview(p) {
  const e = p.embeds[0];
  const color = '#' + (e.color || 0).toString(16).padStart(6, '0');
  const time = new Date(e.timestamp).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  return `<div class="dc-msg">
    <div class="dc-ava"><img src="/discord/seal.png" alt=""></div>
    <div class="dc-body">
      <div class="dc-head"><span class="dc-name">${esc(p.username)}</span><span class="dc-bot">APP</span><span class="dc-time">Today at ${esc(time)}</span></div>
      <div class="dc-embed" style="border-left-color:${color}">
        <div class="dc-emain">
          ${e.author ? `<div class="dc-author">${esc(e.author.name)}</div>` : ''}
          <div class="dc-title${e.url ? ' link' : ''}">${esc(e.title)}</div>
          ${e.description ? `<div class="dc-desc">${md(e.description)}</div>` : ''}
          ${e.fields && e.fields.length ? `<div class="dc-fields">${e.fields.map(f => `<div class="dc-field${f.inline ? '' : ' wide'}"><div class="dc-fname">${esc(f.name)}</div><div class="dc-fval">${md(f.value)}</div></div>`).join('')}</div>` : ''}
          <div class="dc-foot">${esc(e.footer.text)} • Today at ${esc(time)}</div>
        </div>
        ${e.thumbnail ? `<img class="dc-thumb" src="${esc(e.thumbnail.url)}" alt="">` : (/faces\//.test(JSON.stringify(e)) ? '<span class="dc-thumb ph"></span>' : '')}
        ${e.image ? `<img class="dc-banner" src="${esc(e.image.url.replace(/^https?:\/\/[^/]+/, ''))}" alt="">` : ''}
      </div>
    </div>
  </div>`;
}

module.exports = function (app, { checkCsrf, need }) {
  app.get('/discord', need('discord'), (req, res) => {
    const st = D.status();
    const set = D.settings();
    const csrf = req.session.csrf;
    const live = st.slots.filter(x => x.url);
    const chan = x => `<div class="card tight dcchan">
      <div class="dchead"><input name="name_${esc(x.id)}" form="dcform" value="${esc(x.name)}" maxlength="40" aria-label="Channel name" class="dcname">${x.url ? '<span class="tag in">Connected</span>' + (D.looksDiscord(x.url) ? '' : ' <span class="tag gold">Not a Discord address</span>') : '<span class="tag out">Not set</span>'}</div>
      ${x.url ? `<p class="hint" style="margin:6px 0 0"><code>${esc(x.masked)}</code><br>${x.from === 'site' ? 'Set here on the site.' : 'From <code>' + esc(x.env) + '</code> in Railway.'}</p>` : `<p class="hint" style="margin:6px 0 0">Paste a webhook address below, or set <code>${esc(x.env)}</code> in Railway.</p>`}
      ${x.info ? (x.info.bad ? `<p class="hint" style="margin:4px 0 0"><span class="tag out">Not checked</span> ${esc(x.info.bad)}</p>` : `<p class="hint" style="margin:4px 0 0">Discord calls this webhook <b>${esc(x.info.name || 'unnamed')}</b>${x.info.channel ? ' · channel <code>' + esc(x.info.channel) + '</code>' : ''}. Send a test to see which channel that is.</p>`) : ''}
      ${x.url ? `<form method="post" action="/discord/test" class="inline" style="margin-top:8px">${V.hidden(csrf)}<input type="hidden" name="channel" value="${esc(x.id)}"><button class="btn ghost small" type="submit">Send a test message</button></form>` : ''}
      <details class="dchook" style="margin-top:8px"><summary>${x.url ? 'Change the address' : 'Add the address'}</summary>
        <input type="url" name="hook_${esc(x.id)}" form="dcform" placeholder="https://discord.com/api/webhooks/…" autocomplete="off" style="margin-top:6px">
        <div class="btnrow" style="margin-top:8px"><button class="btn go small" type="submit" form="dcform">Save the address</button></div>
        <p class="hint">In Discord: the channel’s settings → Integrations → Webhooks → New Webhook → Copy Webhook URL. It is kept on the site’s own disk and never shown again in full.</p>
        ${x.from === 'site' ? `<label class="check"><input type="checkbox" name="drop_${esc(x.id)}" value="1" form="dcform"> Forget this address</label>` : ''}
      </details>
    </div>`;
    const body = `
<section class="card">
  <div class="eyebrow">The County on Discord</div>
  <h2>Announcements</h2>
  <p class="lede">What happens in Bruma, posted to Discord as it happens. Each kind of post goes to a channel of your choosing. Up to eight channels: paste each one’s webhook address here, name it, and send a test to see it land.</p>
</section>
<div class="grid three" style="margin-top:22px">${st.slots.filter((x, i) => x.url || i < 2 || st.slots.slice(0, i).every(y => y.url)).map(chan).join('')}</div>
<p class="hint" style="margin:10px 0 0">Each card is one Discord channel. Give it the name you use for it, paste its webhook address, press Save, then send a test to be sure it lands where you think. Up to eight channels; the next empty card appears when the last is filled.</p>
<section class="card tight" style="margin-top:22px">
  <p style="margin:0">${st.base ? `Posts link back to <code>${esc(st.base)}</code> and carry the County’s banners.` : 'The site has not learned its own address yet. It learns it from the first visit, or set <code>SITE_URL</code> in Railway. Until then posts carry no links, banners or portraits.'}</p>
</section>
<form method="post" action="/discord" id="dcform">${V.hidden(csrf)}<button class="btn hiddenbtn" type="submit" tabindex="-1" aria-hidden="true">Save</button>
${D.EVENTS.map(([group, list]) => `<section class="card dcgroup">
  <h3 style="margin-top:0">${esc(group)}</h3>
  ${list.map(([id, def, name, note]) => { const cur = D.channelFor(id); return `<div class="dcev">
    <label class="check"><input type="checkbox" name="on_${id}" value="1"${set.on[id] === false ? '' : ' checked'}> <b>${esc(name)}</b></label>
    <select name="ch_${id}" aria-label="Channel" class="dcsel${st.slots.find(x => x.id === cur && x.url) ? '' : ' off'}">${st.slots.filter(x => x.url || x.id === cur).map(x => `<option value="${esc(x.id)}"${x.id === cur ? ' selected' : ''}>${esc(x.name)}${x.url ? '' : ' (not set)'}</option>`).join('')}</select>
    <p class="hint">${esc(note)}</p>
    <details class="dcprev"><summary>See how it looks</summary>${preview(D.payload(id))}
      <button class="btn ghost small" type="submit" formaction="/discord/sample/${id}">Post this sample to its channel</button></details>
  </div>`; }).join('')}
</section>`).join('')}
<div class="btnrow" style="margin-top:18px"><button class="btn go" type="submit">Save</button><span class="hint">Saves the ticks, the channels and the channel names.</span></div>
</form>
<section class="card" style="margin-top:22px">
  <h3 style="margin-top:0">Lately sent</h3>
  ${st.recent.length ? `<ul class="procl">${st.recent.map(r => `<li><span>${r.ok ? '<span class="tag in">Sent</span>' : '<span class="tag out">Failed</span>'} ${esc(r.title || r.event)}${r.err ? ' <span class="hint">' + esc(r.err) + '</span>' : ''}</span><span>${esc(D.slotName(r.channel || ''))} · ${esc(V.when(r.at))}</span></li>`).join('')}</ul>` : V.empty('Nothing sent since the site last started.')}
</section>`;
    res.page({ title: 'Announcements', body, active: 'discord', wide: true });
  });

  app.post('/discord', checkCsrf, need('discord'), async (req, res) => {
    const b = req.body || {};
    const map = {};
    D.EVENT_LIST.forEach(e => { map[e.id] = b['on_' + e.id] === '1'; });
    D.setOn(map);
    const chans = {}, names = {};
    D.EVENT_LIST.forEach(e => { if (b['ch_' + e.id]) chans[e.id] = String(b['ch_' + e.id]); });
    D.SLOTS.forEach(x => { if (b['name_' + x[0]] !== undefined) names[x[0]] = b['name_' + x[0]]; });
    D.setChannels(chans, names);
    const bad = [], learned = [];
    for (const x of D.SLOTS) {
      const id = x[0];
      if (b['drop_' + id] === '1') { D.setHook(id, ''); continue; }
      const u = String(b['hook_' + id] || '').trim();
      if (!u) continue;
      if (!D.looksDiscord(u)) { bad.push(D.slotName(id)); continue; }
      D.setHook(id, u);
      const info = await D.learnHook(id);
      if (info && !info.bad) learned.push(D.slotName(id) + (info.name ? ' (Discord calls it ' + info.name + ')' : ''));
    }
    req.session.flash = bad.length
      ? { err: true, text: 'Not a Discord webhook address, so not saved: ' + bad.join(', ') + '. It should begin https://discord.com/api/webhooks/. The rest was saved.' }
      : { text: 'Saved.' + (learned.length ? ' Connected: ' + learned.join('; ') + '.' : '') + ' Those ticked will be announced.' };
    res.redirect('/discord');
  });

  app.post('/discord/test', checkCsrf, need('discord'), (req, res) => {
    try { D.testSend(String((req.body || {}).channel || 'public')); req.session.flash = { text: 'Sent. Look in the channel.' }; }
    catch (e) { req.session.flash = { err: true, text: e.message }; }
    res.redirect('/discord');
  });

  app.post('/discord/sample/:id', checkCsrf, need('discord'), (req, res) => {
    const id = String(req.params.id);
    const ev = D.EVENT_BY_ID[id];
    if (!ev) return res.redirect('/discord');
    const ok = D.send(id, null, { force: true });
    req.session.flash = ok ? { text: 'The sample is on its way to ' + D.slotName(D.channelFor(id)) + '.' } : { err: true, text: 'No webhook is set for ' + D.slotName(D.channelFor(id)) + '.' };
    res.redirect('/discord');
  });
};
module.exports.preview = preview;
