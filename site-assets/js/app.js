// 同梱データだけを使い、ファイルを直接開いた場合も検索を動作させる。
(() => {
  'use strict';
  const {api, scenes, categories, stats, flags, types = [], guides = [], libraries = [], reference_notes = [], emphasis = {}} = window.IMGUI_DOCS;
  let typeView;
  const emphasisMap = new Map(Object.entries(emphasis));
  const $ = (selector, base = document) => base.querySelector(selector);
  const $$ = (selector, base = document) => [...base.querySelectorAll(selector)];
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const sceneMap = new Map(scenes.map(s => [s.id, s]));
  const labelMap = new Map(categories);
  const entryMap = new Map(api.map(e => [e.id, e]));
  const guideMap = new Map(guides.map(g => [g.id, g]));
  const guideLabels = new Map([['all','すべて'],['basics','基礎・導入'],['recipes','使い方の工夫'],['engine','ゲームエンジン'],['debugging','デバッグ道具'],['visuals','表現・カスタム描画'],['troubleshooting','注意点・トラブル対処'],['rendering','画像・描画・フォント'],['docking','Docking'],['extensions','拡張ライブラリ']]);
  const guideLevels = new Map([['beginner','入門'],['intermediate','実践'],['advanced','発展']]);
  const guidePaths = [
    {category:'basics',title:'小さなツールを、まず1つ',summary:'毎フレームの考え方から、設定画面・入力チェックへ。',steps:['frame-state','basics-first-panel','basics-form-validation','basics-keyboard-nav']},
    {category:'engine',title:'ゲームエンジンのエディターを育てる',summary:'選択したオブジェクトを見て、編集して、安全に反映する。',steps:['engine-editor-architecture','engine-hierarchy-ids','engine-transform-inspector','engine-viewport-picking']},
    {category:'debugging',title:'「何が起きた？」を見える形に',summary:'ログ、時間計測、描画情報を、調査に使える道具へ。',steps:['debug-log-console','debug-frame-timing','debug-render-statistics','debug-imgui-tools']},
    {category:'visuals',title:'キャンバスから、独自の表現へ',summary:'座標変換と入力を覚えて、ノード・時間軸・ゲージを描く。',steps:['visual-pan-zoom','visual-marquee','visual-node-canvas','visual-time-scrub']},
    {category:'extensions',title:'時間を編集する道具を作ろう',summary:'帯を1本表示するところから、再生・編集・Undo・保存へ。',steps:['sequencer-first-clip','sequencer-play-preview','sequencer-edit-clips','sequencer-undo','sequencer-save-load','sequencer-waveform']},
    {category:'extensions',title:'つないで、動かすエディターへ',summary:'ノードの結果を表示し、選んだ物をギズモで編集する。',steps:['node-color-evaluation','node-context-menu','gizmo-operation-switch','gizmo-selected-object']},
    {category:'engine',title:'動かして確かめる、ゲーム制作の道具',summary:'固定更新から、タイル・AI・粒子・攻撃の調整へ。',steps:['engine-fixed-update','engine-tile-painter','engine-waypoint-preview','engine-particle-preview','engine-hit-window']},
    {category:'extensions',title:'拡張UIを、ゲームの編集につなぐ',summary:'複数選択・親子・状態機械・ブレンド・イベント・カメラへ。',steps:['gizmo-group-translation','gizmo-parent-translation','node-state-machine','node-motion-blend','sequencer-event-track','sequencer-camera-cuts']}
  ];
  const flagGroupMap = new Map(flags.map(g => [g.type, g]));
  const flagValueMap = new Map(flags.flatMap(g => g.values.map(v => [v.name, {...v, type:g.type}])));
  const flagCategories = new Map([['all','すべてのフラグ'],['window','ウィンドウ・Docking'],['input','入力・ショートカット'],['selection','選択・ツリー・タブ'],['table','テーブル'],['drawing','描画・フォント'],['system','全体設定・状態判定']]);
  const flagCategoryTypes = {
    window:['ImGuiWindowFlags','ImGuiChildFlags','ImGuiPopupFlags','ImGuiDockNodeFlags','ImGuiViewportFlags'],
    input:['ImGuiInputTextFlags','ImGuiInputFlags','ImGuiMod','ImGuiButtonFlags','ImGuiSliderFlags','ImGuiDragDropFlags'],
    selection:['ImGuiItemFlags','ImGuiTreeNodeFlags','ImGuiSelectableFlags','ImGuiComboFlags','ImGuiTabBarFlags','ImGuiTabItemFlags','ImGuiMultiSelectFlags','ImGuiListClipperFlags'],
    table:['ImGuiTableFlags','ImGuiTableColumnFlags','ImGuiTableRowFlags'],
    drawing:['ImGuiColorEditFlags','ImDrawFlags','ImDrawListFlags','ImDrawTextFlags','ImFontAtlasFlags','ImFontFlags'],
    system:['ImGuiConfigFlags','ImGuiBackendFlags','ImGuiCond','ImGuiFocusedFlags','ImGuiHoveredFlags']
  };
  const flagCategory = g => Object.keys(flagCategoryTypes).find(id=>flagCategoryTypes[id].includes(g.type)) || 'system';
  const flagState = {type:'all', query:'', visibility:'public'};
  let flagsReturnHash = '';
  const groups = new Map();
  api.forEach(e => { if (!groups.has(e.qualified)) groups.set(e.qualified, []); groups.get(e.qualified).push(e); });
  const searchEngine=window.IMGUI_DOCS_SEARCH.create();
  const allGroups = [...groups.values()].map(entries => {
    const first = entries[0];
    const best = entries.find(e => !e.obsolete && !e.internal) || first;
    const branchOrder=first.branch==='docking'?1000000:first.branch==='extension'?2000000:0;
    return {entries, first: best, order: branchOrder+first.line, searchIndex:searchEngine.index(entries.flatMap(e=>[e.qualified,e.name]),entries.map(e=>e.title),entries.flatMap(e=>[e.description,e.signature,e.scope,labelMap.get(e.category),e.branch,e.library]))};
  });
  const guideSearch=new Map(guides.map(g=>[g.id,searchEngine.index(g.title,[g.summary,...(g.tags||[])],g.sections.flatMap(s=>[s.title,...(s.paragraphs||[]),...(s.bullets||[]),s.code,s.source_excerpt,...(s.table?.headers||s.table?.columns||[]),...(s.table?.rows||[]).flat()]))]));
  const sceneSearch=new Map(scenes.map(s=>[s.id,searchEngine.index([s.title,...s.calls],s.caption,s.code)]));
  const flagGroupSearch=new Map(),flagSearch=new Map();
  flags.forEach(g=>{
    flagGroupSearch.set(g.type,searchEngine.index(g.type,g.title,[g.description,g.note,flagCategories.get(flagCategory(g))]));
    g.values.forEach(v=>flagSearch.set(v.name,searchEngine.index([v.name,g.type],[g.title,v.description],[g.description,g.note,v.expression])));
  });
  let searchFallback=false;
  function ranked(items,indexFor,query,track=true) {
    const matches=searchEngine.rank(items,indexFor,query);
    if(track)searchFallback=matches.some(m=>m.fuzzy);
    return matches;
  }
  // 頻度は実測統計ではなく、一般的なUI実装での出番を目安にする。
  const frequencyLists = [
    ['Button','Checkbox','Text','Begin','End','SliderFloat','InputText','SameLine','TextUnformatted','SetNextWindowSize','BeginChild','EndChild','GetContentRegionAvail','Separator','DragFloat','Selectable','Combo','TreeNode','TreePop','CollapsingHeader','InputInt','SliderInt','GetIO','GetStyle','PushID','PopID','IsItemHovered','SetItemTooltip','PushStyleColor','PopStyleColor','PushStyleVar','PopStyleVar','SetNextItemWidth','Image','ColorEdit4','GetCursorScreenPos','GetWindowDrawList'],
    ['BeginTable','EndTable','TableSetupColumn','TableHeadersRow','TableNextRow','TableNextColumn','TableSetColumnIndex','BeginCombo','EndCombo','BeginTabBar','EndTabBar','BeginTabItem','EndTabItem','RadioButton','SmallButton','ArrowButton','InvisibleButton','ProgressBar','TextColored','TextDisabled','TextWrapped','BulletText','SeparatorText','InputFloat','InputDouble','InputFloat2','InputFloat3','InputFloat4','DragFloat2','DragFloat3','DragFloat4','DragInt','SliderFloat2','SliderFloat3','SliderFloat4','InputTextMultiline','InputTextWithHint','ColorEdit3','ColorPicker3','ColorPicker4','ColorButton','ImageButton','TreeNodeEx','SetNextItemOpen','BeginListBox','EndListBox','ListBox','BeginMenuBar','EndMenuBar','BeginMenu','EndMenu','MenuItem','OpenPopup','BeginPopup','BeginPopupModal','EndPopup','CloseCurrentPopup','BeginPopupContextItem','BeginTooltip','EndTooltip','BeginDisabled','EndDisabled','BeginGroup','EndGroup','Spacing','Dummy','Indent','Unindent','AlignTextToFramePadding','PushFont','PopFont','GetFont','GetFontSize','GetFrameHeight','GetTextLineHeight','CalcTextSize','GetColorU32','SetCursorScreenPos','GetItemRectMin','GetItemRectMax','GetItemRectSize','IsItemActive','IsItemClicked','IsItemDeactivatedAfterEdit','SetKeyboardFocusHere','IsKeyPressed','IsKeyDown','GetMousePos','IsMouseDown','IsMouseClicked','IsMouseDragging','GetMouseDragDelta','Shortcut','SetNextWindowPos','SetNextWindowFocus','SetScrollHereY','GetMainViewport','ShowDemoWindow','ShowMetricsWindow','NewFrame','Render','GetDrawData','CreateContext','DestroyContext','StyleColorsDark']
  ];
  const frequencyRanks = new Map();
  frequencyLists.forEach((list,tier) => list.forEach((name,index) => frequencyRanks.set('ImGui::'+name,{tier,index})));
  ['AddLine','AddRect','AddRectFilled','AddText','AddCircle','AddCircleFilled','AddImage','PushClipRect','PopClipRect'].forEach((name,index) => frequencyRanks.set('ImDrawList::'+name,{tier:1,index:200+index}));
  [['ImGuiListClipper',['Begin','Step','End']],['ImGuiTextFilter',['Draw','PassFilter']],['ImFontAtlas',['AddFontFromFileTTF','AddFontDefault']]].forEach(([scope,names]) => names.forEach((name,index) => frequencyRanks.set(scope+'::'+name,{tier:1,index:300+index})));
  const frequencyRank = g => g.entries.every(e => e.internal || e.obsolete) ? {tier:3,index:g.order} : frequencyRanks.get(g.first.qualified) || {tier:2,index:g.order};
  const state = {category:'all', filter:'all', query:'', sort:'frequency', page:1, view:'reference', branch:'all', presentation:'list', guideCategory:'all', guideLevel:'all', flagCategory:'all', flagVisibility:'public'};
  const pageSize = 24;
  const motionPreference=window.matchMedia('(prefers-reduced-motion: reduce)');
  const runningMotions=new Set();
  function enterMotion(element,distance=5,duration=180) {
    if(!element||motionPreference.matches||typeof element.animate!=='function')return;
    const animation=element.animate([{opacity:.82,transform:`translateY(${distance}px)`},{opacity:1,transform:'translateY(0)'}],{duration,easing:'cubic-bezier(.2,0,0,1)'});
    runningMotions.add(animation);
    animation.finished.catch(()=>{}).finally(()=>runningMotions.delete(animation));
  }
  motionPreference.addEventListener('change',()=>{
    if(motionPreference.matches){runningMotions.forEach(animation=>animation.cancel());runningMotions.clear();}
  });
  let openQualified = null, activeScene = null, activeGuide = null, activeFlag = null, toastTimer;
  const detail = $('#detail-dialog'), imageDialog = $('#image-dialog'), about = $('#about-dialog');
  $('#flag-type-count').textContent=stats.flag_types+' 種類収録';
  $('#flag-categories').innerHTML=[...flagCategories].map(([id,label])=>`<button class="category flag-category" data-flag-category="${id}"><span>${esc(label)}</span><span class="count">${flags.filter(g=>id==='all'||flagCategory(g)===id).length}</span></button>`).join('');
  $('#flag-category-filters').innerHTML=[...flagCategories].map(([id,label])=>`<button class="flag-category" data-flag-category="${id}">${esc(label)}</button>`).join('');
  const statMarkup = (value, label) => `<div class="stat"><strong>${value}</strong><small>${label}</small></div>`;
  $('#all-count').textContent = stats.names;
  $('#hero-stats').innerHTML = statMarkup(stats.declarations,'収録した宣言') + statMarkup(stats.captures,'実行キャプチャ') + statMarkup(categories.length,'カテゴリ');
  $('#hero-image').src = sceneMap.get('overview').url;
  $('#about-stats').innerHTML = statMarkup(stats.names,'関数名') + statMarkup(stats.declarations,'オーバーロード込み') + statMarkup(stats.captures,'実キャプチャ');
  if(reference_notes.length)$('#about-stats').insertAdjacentHTML('afterend',`<details class="about-verification-notes"><summary>バージョンと撮影条件の補足</summary>${reference_notes.map(n=>`<section><h3>${esc(n.guide_title)}：${esc(n.title)}</h3>${(n.paragraphs||[]).map(p=>`<p>${prose(p)}</p>`).join('')}${n.bullets?`<ul>${n.bullets.map(p=>`<li>${prose(p)}</li>`).join('')}</ul>`:''}${guideTable(n.table)}</section>`).join('')}</details>`);
  $('#categories').innerHTML = categories.map(([id, label]) => {
    const count = allGroups.filter(g => g.entries.some(e => e.category === id)).length;
    return `<button class="category" data-category="${id}"><span>${esc(label)}</span><span class="count">${count}</span></button>`;
  }).join('');
  const guideFilters=document.createElement('div');guideFilters.className='guide-filters';guideFilters.id='guide-filters';guideFilters.hidden=true;
  guideFilters.innerHTML=[...guideLabels].map(([id,label])=>`<button class="guide-category" data-guide-category="${id}">${esc(label)}</button>`).join('')+`<label class="guide-level-filter">難易度<select id="guide-level"><option value="all">すべて</option>${[...guideLevels].map(([id,label])=>`<option value="${id}">${esc(label)}</option>`).join('')}</select></label>`;
  $('#cards').before(guideFilters);
  const guidePathsSection=document.createElement('section');guidePathsSection.id='guide-paths';guidePathsSection.className='guide-paths';guidePathsSection.hidden=true;
  guidePathsSection.innerHTML=`<h3>目的から選ぶ、おすすめの読み順</h3><div class="guide-path-grid">${guidePaths.map(path=>`<article class="guide-path-card" data-topic="${path.category}"><p class="eyebrow">${esc(guideLabels.get(path.category))}</p><h4>${esc(path.title)}</h4><p>${esc(path.summary)}</p><ol>${path.steps.filter(id=>guideMap.has(id)).map(id=>`<li><button data-guide="${id}">${esc(guideMap.get(id).title)}</button></li>`).join('')}</ol><button class="guide-path-more" data-guide-category="${path.category}">この分野のガイドをすべて見る →</button></article>`).join('')}</div>`;
  guideFilters.before(guidePathsSection);
  function updateTheme() {
    const dark=document.documentElement.dataset.theme!=='light';
    $('#theme-toggle').textContent=dark?'☀':'☾';$('#theme-toggle').setAttribute('aria-label',dark?'ライトテーマへ切り替え':'ダークテーマへ切り替え');$('#theme-toggle').setAttribute('aria-pressed',dark);
    $('meta[name="color-scheme"]').content=dark?'dark':'light';
  }
  function updateContrast() {
    const enhanced=document.documentElement.dataset.contrast!=='normal';
    $('#contrast-toggle').setAttribute('aria-checked',enhanced);
    $('#contrast-status').textContent=enhanced?'オン':'オフ';
  }
  const mobileLayout=window.matchMedia('(max-width:1000px)');
  function closeExplorer(returnFocus=false) {
    const wasOpen=document.body.classList.contains('explorer-open');
    document.body.classList.remove('explorer-open');$('#explorer-toggle').setAttribute('aria-expanded','false');$('#explorer-backdrop').hidden=true;
    $('#explorer-toggle').setAttribute('aria-label','メニューを開く');
    $('#explorer').removeAttribute('role');$('#explorer').removeAttribute('aria-modal');
    if(returnFocus&&wasOpen&&mobileLayout.matches)$('#explorer-toggle').focus({preventScroll:true});
  }
  function openExplorer() {
    if(!mobileLayout.matches)return;
    $('#display-settings').open=false;
    document.body.classList.add('explorer-open');$('#explorer-toggle').setAttribute('aria-expanded','true');$('#explorer-toggle').setAttribute('aria-label','メニューを閉じる');$('#explorer-backdrop').hidden=false;
    $('#explorer').setAttribute('role','dialog');$('#explorer').setAttribute('aria-modal','true');$('#explorer-close').focus({preventScroll:true});
  }
  mobileLayout.addEventListener('change',()=>closeExplorer());
  updateTheme();
  updateContrast();

  function notify(message) {
    clearTimeout(toastTimer);
    $('#toast').textContent = message;
    $('#toast').classList.add('visible');
    toastTimer = setTimeout(() => $('#toast').classList.remove('visible'), 2500);
  }
  async function copy(text) {
    try {
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(text);
      else throw new Error('fallback');
      notify('コピーしました');
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.cssText = 'position:fixed;left:-9999px';
      document.body.append(textarea);
      textarea.select();
      const ok = document.execCommand('copy');
      textarea.remove();
      notify(ok ? 'コピーしました' : 'コピーできませんでした。テキストを選択してコピーしてください。');
    }
  }
  function matchesEntry(e) {
    return (state.branch==='all'||(e.branch||'core')===state.branch) && (state.category === 'all' || e.category === state.category) &&
      (state.filter === 'all' || state.filter === 'visual' && e.visual || state.filter === 'utility' && !e.visual || state.filter === 'obsolete' && e.obsolete || state.filter === 'internal' && e.internal);
  }
  function filteredGroups() {
    const matches=ranked(allGroups.filter(g=>g.entries.some(matchesEntry)),g=>g.searchIndex,state.query,state.view==='reference');
    matches.sort((a,b)=>(state.query.trim()&&state.sort==='frequency'?b.score-a.score:0)||(state.sort==='name'?a.item.first.qualified.localeCompare(b.item.first.qualified):state.sort==='frequency'?frequencyRank(a.item).tier-frequencyRank(b.item).tier||frequencyRank(a.item).index-frequencyRank(b.item).index||a.item.order-b.item.order:a.item.order-b.item.order));
    return matches.map(m=>m.item);
  }
  function branchLabel(e) {
    return e.branch==='docking'?'Docking':e.branch==='extension'?(e.library||'Extension'):'Core';
  }
  function branchBadge(e) {
    return `<span class="branch-badge ${e.branch||'core'}">${esc(branchLabel(e))}</span>`;
  }
  function libraryVersion(ids) {
    const selected=libraries.filter(l=>ids.includes(l.id));
    return selected.length?`<div class="extension-version">Dear ImGui ${esc(stats.version)} と組み合わせて確認${selected.map(l=>`<br><a href="${esc(l.source_url)}" target="_blank" rel="noopener">${esc(l.title)} · ${esc(l.version)} · ${esc(l.commit.slice(0,10))} ↗</a>`).join('')}</div>`:'';
  }
  function row(g) {
    const e=g.entries.find(matchesEntry)||g.first,tier=frequencyRank(g).tier;
    const separator=e.qualified.lastIndexOf('::');
    const symbol=separator>=0?`<span class="row-namespace">${esc(e.qualified.slice(0,separator+2))}</span><span class="row-function">${esc(e.qualified.slice(separator+2))}</span>`:`<span class="row-function">${esc(e.qualified)}</span>`;
    return `<button class="api-card api-row" data-topic="${esc(e.category)}" data-open="${esc(e.qualified)}" data-entry="${e.id}" aria-label="${esc(e.qualified)} — ${esc(e.title)}を解説"><div><div class="row-title"><span class="symbol-icon" aria-hidden="true">${e.branch==='docking'?'dk':e.branch==='extension'?'fx':'fn'}</span><code>${symbol}</code></div><p class="row-summary">${esc(e.title)}</p></div><div class="row-meta">${branchBadge(e)}${tier<2?`<span class="frequency-badge ${tier?'medium':'high'}">使用頻度：${tier?'中':'高'}</span>`:''}${g.entries.every(v=>v.internal)?'<span class="badge internal">内部用</span>':g.entries.every(v=>v.obsolete)?'<span class="badge legacy">互換</span>':''}<span>${g.entries.length} 宣言</span></div></button>`;
  }
  function guideCard(g) {
    return `<button class="guide-card" data-topic="${esc(g.category)}" data-guide="${esc(g.id)}"><p class="eyebrow">${esc(guideLabels.get(g.category)||g.category)}</p>${guideMeta(g)}<h3>${esc(g.title)}</h3><p>${prose(g.summary)}</p>${g.tags?.length?`<div class="guide-tags">${g.tags.slice(0,3).map(tag=>`<span>${esc(tag)}</span>`).join('')}</div>`:''}<div class="guide-card-footer">ガイドを読む →</div></button>`;
  }
  function guideMeta(g) {
    return `<div class="guide-meta-line"><span class="guide-level-badge ${esc(g.level||'beginner')}">${esc(guideLevels.get(g.level)||'入門')}</span>${g.minutes?`<span>約${g.minutes}分</span>`:''}</div>`;
  }
  function card(g) {
    const e = g.entries.find(matchesEntry) || g.first, s = sceneMap.get(e.scene);
    const status = g.entries.every(v => v.internal) ? '<span class="tag-internal">内部用</span>' : g.entries.every(v => v.obsolete) ? '<span class="tag-obsolete">互換API</span>' : e.visual ? '表示・ウィジェット' : '状態・補助処理';
    const categoryLabel = labelMap.get(e.category);
    const tier = frequencyRank(g).tier;
    const frequency = tier < 2 ? `<span class="frequency-badge ${tier===0?'high':'medium'}">使用頻度：${tier===0?'高':'中'}</span>` : '';
    return `<button class="api-card" data-open="${esc(e.qualified)}" data-entry="${e.id}" data-topic="${esc(e.category)}" aria-label="${esc(e.qualified)} — ${esc(e.title)}を解説">
      <div class="card-image"><img src="${s.url}" alt="${esc(s.caption)}" width="${s.run.width}" height="${s.run.height}" loading="lazy"></div>
      <div class="card-body"><div class="card-meta"><span>${esc(categoryLabel)}</span><span class="overload-count">${g.entries.length > 1 ? g.entries.length+' overloads' : '1 signature'}</span></div><span class="scope">${e.scope==='Math'?'大域の補助演算子':e.scope==='Global'?'大域の補助関数':esc(e.scope)+'::'}</span><h3 class="card-title">${esc(e.name)}</h3><p class="card-subtitle">${esc(e.title)}</p><p class="card-description">${prose(e.description)}</p>${frequency}<div class="card-bottom"><span>${status}</span><span class="arrow">↗</span></div></div></button>`;
  }
  function galleryCard(s) {
    return `<button class="api-card" data-scene="${esc(s.id)}" aria-label="${esc(s.title)}のキャプチャを確認"><div class="card-image"><img src="${s.url}" alt="${esc(s.caption)}" loading="lazy" width="${s.run.width}" height="${s.run.height}"><span class="image-badge">実行キャプチャ · ${s.run.width} × ${s.run.height}</span></div><div class="card-body"><p class="gallery-title">${esc(s.title)}</p><p class="gallery-caption">${esc(s.caption)}</p><div class="card-bottom"><span>コードと画像を見る</span><span class="arrow">↗</span></div></div></button>`;
  }
  function flagIsVisible(v, visibility) {
    return visibility==='all' || visibility==='public'&&!v.obsolete&&!v.internal || visibility==='obsolete'&&v.obsolete || visibility==='internal'&&v.internal;
  }
  function flagIndexEntries() {
    const candidates=flags.filter(g=>state.flagCategory==='all'||flagCategory(g)===state.flagCategory).flatMap(g=>[
      ...g.values.filter(v=>flagIsVisible(v,state.flagVisibility)).map(v=>({group:g,value:v})),
      ...(g.empty_reason&&['all','internal'].includes(state.flagVisibility)?[{group:g,value:null}]:[])
    ]);
    const matches=ranked(candidates,c=>c.value?flagSearch.get(c.value.name):flagGroupSearch.get(c.group.type),state.query),results=new Map();
    for(const {item:c} of matches){
      if(!results.has(c.group.type))results.set(c.group.type,{group:c.group,matches:[],emptyMatch:!c.value});
      if(c.value)results.get(c.group.type).matches.push(c.value);
    }
    return [...results.values()];
  }
  function flagTypeRow(result) {
    const g=result.group;
    const matches=state.query.trim()?`<div class="flag-match">${result.matches.slice(0,2).map(v=>`<p><code>${esc(v.name)}</code><span>${prose(v.description)}</span></p>`).join('')}</div>`:'';
    return `<button class="api-card api-row flag-type-row" data-topic="flags" data-flag-type="${esc(g.type)}" aria-label="${esc(g.type)} — ${esc(g.title)}を解説"><div><div class="row-title"><span class="symbol-icon" aria-hidden="true">fl</span><code>${esc(g.type)}</code></div><p class="row-summary">${esc(g.title)}</p><p class="flag-type-description">${prose(g.description)}</p>${matches}</div><div class="row-meta">${g.branch==='docking'?'<span class="branch-badge docking">Docking</span>':''}${g.empty_reason?'<span class="badge internal">内部用</span>':''}<span>${esc(flagCategories.get(flagCategory(g)))}</span><span>${result.matches.length} 値</span></div></button>`;
  }
  function render(withMotion=false) {
    searchFallback=false;
    const gallery = state.view === 'gallery';
    const guideMode=state.view==='guides';
    const flagMode=state.view==='flags';
    const typeMode=state.view==='types';
    const groupsResult = filteredGroups();
    const sceneIds = new Set(groupsResult.map(g => g.first.scene));
    const result = typeMode ? typeView.indexEntries() : flagMode ? flagIndexEntries() : guideMode ? ranked(guides.filter(g=>(state.guideCategory==='all'||g.category===state.guideCategory)&&(state.guideLevel==='all'||g.level===state.guideLevel)),g=>guideSearch.get(g.id),state.query).map(m=>m.item) : gallery ? ranked(scenes.filter(s=>state.category==='all'&&state.filter==='all'&&state.branch==='all'||sceneIds.has(s.id)),s=>sceneSearch.get(s.id),state.query).map(m=>m.item) : groupsResult;
    const pages = Math.max(1, Math.ceil(result.length / pageSize));
    state.page = Math.min(pages, state.page);
    const current = result.slice((state.page-1)*pageSize, state.page*pageSize);
    $('#cards').classList.toggle('list-view',typeMode||flagMode||!gallery&&!guideMode&&state.presentation==='list');
    $('#cards').classList.toggle('flags-reference',flagMode);
    $('#cards').innerHTML = current.map(typeMode?typeView.row:flagMode?flagTypeRow:guideMode?guideCard:gallery?galleryCard:state.presentation==='list'?row:card).join('');
    $('#empty').hidden = result.length > 0;
    const declarations = groupsResult.reduce((n,g) => n + g.entries.filter(matchesEntry).length, 0);
    $('#result-count').innerHTML = typeMode?`<b>${result.length}</b> 型 <span>／ <b>${result.reduce((n,t)=>n+t.members.length,0)}</b> メンバー</span>`:flagMode?`<b>${result.length}</b> 種類 <span>／ <b>${result.reduce((n,r)=>n+r.matches.length,0)}</b> 値</span>`:guideMode?`<b>${result.length}</b> 件のガイド`:gallery ? `<b>${result.length}</b> 枚のキャプチャ` : `<b>${result.length}</b> 関数名 <span>／ <b>${declarations}</b> 宣言</span>`;
    $('#result-count').dataset.fuzzy=String(searchFallback);
    if(searchFallback)$('#result-count').insertAdjacentHTML('beforeend','<span class="search-result-hint">近い候補</span>');
    if(flagMode)$('#result-count').insertAdjacentHTML('beforeend',`<small class="index-context">表示中（${esc($('#flag-index-visibility').querySelector(`[value="${state.flagVisibility}"]`).textContent)}） · 全${stats.flag_types}種類 / ${stats.flag_values}値を収録</small>`);
    if(guideMode&&state.query.trim())$('#result-count').insertAdjacentHTML('beforeend',`<button class="related-link search-api-shortcut" data-search-api>関数一覧でも「${esc(state.query.trim())}」を探す →</button>`);
    $('#reference-title').textContent = typeMode?typeView.title():flagMode?(state.flagCategory==='all'?'フラグ一覧':flagCategories.get(state.flagCategory)+'のフラグ'):guideMode?(state.guideCategory==='all'?'入門・使い方ガイド':guideLabels.get(state.guideCategory)):gallery ? 'キャプチャから探す' : state.category === 'all' ? (state.branch==='docking'?'Docking専用API':state.branch==='extension'?'外部拡張API':'関数一覧') : labelMap.get(state.category);
    $('#section-eyebrow').textContent = typeMode?'TYPES & MEMBERS':flagMode?'FLAG REFERENCE':guideMode?'GUIDES & RECIPES':gallery ? 'CAPTURE GALLERY' : 'API REFERENCE';
    $('#search').placeholder = typeMode?'型名・メンバー名・日本語で検索…':flagMode?'フラグの型名・値の名前・日本語で検索…':guideMode?'知りたいこと・エラー・使い方で検索…':gallery ? '表示例・関数名・日本語で検索…' : '関数名・日本語・引数で検索…';
    $('#search').setAttribute('aria-label',typeMode?'型とメンバーを検索':flagMode?'フラグを検索':guideMode?'ガイドを検索':'関数を検索');
    $('#empty h3').textContent=typeMode?'一致する型がありません':flagMode?'一致するフラグがありません':guideMode?'一致するガイドがありません':'一致する関数がありません';
    $('#empty p').textContent=flagMode?'フラグ名の一部や別の日本語で検索するか、表示対象を変更してください。':'名前の一部や、別の日本語でも検索できます。';
    $$('.category').forEach(b => {b.classList.toggle('active', b.dataset.category === state.category);b.setAttribute('aria-pressed',b.dataset.category === state.category);});
    $$('.filter').forEach(b => {b.classList.toggle('active', b.dataset.filter === state.filter);b.setAttribute('aria-pressed',b.dataset.filter === state.filter);});
    $$('.nav-link[data-view]').forEach(b => b.classList.toggle('active',b.dataset.view === state.view));
    $('#hero').hidden = gallery || state.category !== 'all' || !!state.query || state.filter !== 'all';
    $('#frequency-sort').hidden=gallery||guideMode||flagMode||typeMode;
    $('#frequency-sort').classList.toggle('active',state.sort==='frequency');
    $('#frequency-sort').setAttribute('aria-pressed',state.sort==='frequency');
    $('#sort').value=state.sort;
    $('.filter-row').hidden=guideMode||flagMode||typeMode;$('.reference-controls').hidden=gallery||guideMode||flagMode||typeMode;$('#guide-filters').hidden=!guideMode;
    $('#guide-paths').hidden=!guideMode||state.guideCategory!=='all'||!!state.query||state.guideLevel!=='all';$('#guide-level').value=state.guideLevel;
    $('#flag-index-controls').hidden=!flagMode;$('#api-explorer').hidden=flagMode||typeMode;$('#flags-explorer').hidden=!flagMode;
    $('#types-index-controls').hidden=!typeMode;$('#types-explorer').hidden=!typeMode;typeView.updateIndex();
    $('#flag-index-visibility').value=state.flagVisibility;
    $$('.flag-category').forEach(b=>{const active=flagMode&&b.dataset.flagCategory===state.flagCategory;b.classList.toggle('active',active);b.setAttribute('aria-pressed',active);});
    $('#branch-select').value=state.branch;$('#view-list').setAttribute('aria-pressed',state.presentation==='list');$('#view-cards').setAttribute('aria-pressed',state.presentation==='cards');
    $$('.guide-category').forEach(b=>b.classList.toggle('active',b.dataset.guideCategory===state.guideCategory));
    $$('.explorer-link[data-guide-category]').forEach(b=>b.classList.toggle('active',guideMode&&b.dataset.guideCategory===state.guideCategory));
    $$('.explorer-link[data-branch]').forEach(b=>b.classList.toggle('active',!guideMode&&!flagMode&&!typeMode&&b.dataset.branch===state.branch));
    $$('.explorer-link[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===state.view));
    $$('.workspace-tab').forEach(b=>b.classList.toggle('active',guideMode?!!b.dataset.guideCategory:b.dataset.view===state.view));
    const nums = [...new Set([1, pages, state.page-2, state.page-1, state.page, state.page+1, state.page+2])].filter(n => n > 0 && n <= pages).sort((a,b) => a-b);
    let previous = 0;
    $('#pagination').innerHTML = result.length <= pageSize ? '' : `<button data-page="${state.page-1}" ${state.page===1?'disabled':''} aria-label="前のページ">←</button>` + nums.map(n => {
      const dots = previous && n-previous > 1 ? '<span>…</span>' : ''; previous = n;
      return dots+`<button data-page="${n}" class="${n===state.page?'active':''}" ${n===state.page?'aria-current="page"':''}>${n}</button>`;
    }).join('') + `<button data-page="${state.page+1}" ${state.page===pages?'disabled':''} aria-label="次のページ">→</button><span>${state.page} / ${pages}</span>`;
    if(withMotion)enterMotion($('#cards'),4,150);
  }
  function reset() {
    state.category='all';state.filter='all';state.query='';state.page=1;state.branch='all';
    if(state.view==='guides'){state.guideCategory='all';state.guideLevel='all';}
    if(state.view==='flags'){state.flagCategory='all';state.flagVisibility='public';}
    if(state.view==='types')typeView.reset();
    $('#search').value='';render(true);
  }
  function openFlagIndex(category='all', updateHash=true) {
    closeExplorer();closeDetail(false);flagsReturnHash='';
    state.view='flags';state.flagCategory=flagCategories.has(category)?category:'all';state.query='';state.page=1;
    $('#search').value='';render(true);
    if(updateHash)history.pushState(null,'','#flags');
    document.title='フラグ一覧 — Dear ImGui 日本語ドキュメント';
    $('#reference').scrollIntoView({block:'start'});
  }
  function openGuideIndex(category='all', updateHash=true) {
    closeExplorer();
    closeDetail(false);state.view='guides';state.guideCategory=guideLabels.has(category)?category:'all';state.guideLevel='all';state.query='';state.page=1;
    $('#search').value='';render(true);
    if(updateHash)history.pushState(null,'',category==='all'?'#guides':'#guides-'+category);
    $('#reference').scrollIntoView({block:'start'});
  }
  function openBranch(branch='all', updateHash=true) {
    closeExplorer();
    closeDetail(false);state.view='reference';state.branch=branch;state.category='all';state.filter='all';state.query='';state.page=1;
    $('#search').value='';render(true);
    if(updateHash)history.pushState(null,'',branch==='all'?'#reference':'#branch-'+branch);
    $('#reference').scrollIntoView({block:'start'});
  }
  function highlight(code) {
    // 文字列を含むトークンを先に分け、HTMLタグ内を再解析しない。
    const tokens = /(\/\/[^\n]*|\/\*[\s\S]*?\*\/|"(?:\\.|[^"\\])*"|\b(?:ImGui\w*Flags|ImDraw\w*Flags|ImFont\w*Flags|ImGuiCond|ImGuiMod)_\w+\b|\b(?:ImGui|ImDrawList|ImFont|ImVec2|ImVec4|static|float|int|bool|double|const|char|nullptr|true|false|if|else|for|while|return|switch|case|break|continue|auto|void|sizeof)\b|\b\d+(?:\.\d+)?f?\b|\b[A-Za-z_][A-Za-z_0-9]*(?=\())/g;
    let out='', last=0, match;
    while ((match=tokens.exec(code))) {
      out+=esc(code.slice(last,match.index));
      const t=match[0], cls=t.startsWith('//')||t.startsWith('/*')?'cpp-comment':t.startsWith('"')?'cpp-string':/^\d/.test(t)?'cpp-number':/^(if|else|for|while|return|switch|case|break|continue|sizeof)$/.test(t)?'cpp-keyword':/^(ImGui|ImDrawList|ImFont|ImVec2|ImVec4|static|float|int|bool|double|const|char|nullptr|true|false|auto|void)$/.test(t)?'cpp-type':'cpp-call';
      out+=flagValueMap.has(t)?`<button class="code-flag" data-flag-value="${esc(t)}" title="このフラグの意味を調べる">${esc(t)}</button>`:`<span class="${cls}">${esc(t)}</span>`;last=tokens.lastIndex;
    }
    return out+esc(code.slice(last));
  }
  function sampleMarkup(s) {
    return `<div class="sample-box code-example"><h3 class="minor-heading">コード例 <button class="copy-button" data-copy="${esc(s.id)}">コピー</button></h3><pre class="code" tabindex="0" aria-label="サンプルコード。長い行は左右にスクロールできます。"><code>${highlight(s.display_code || s.code)}</code></pre></div>`;
  }
  function imageMarkup(s, caption=false) {
    return `<figure class="detail-image"><button class="image-open" data-zoom="${esc(s.id)}" aria-label="画像を拡大"><img src="${s.url}" alt="${esc(s.caption)}" width="${s.run.width}" height="${s.run.height}"><span class="zoom-label">拡大する ↗</span></button>${caption?`<figcaption>${esc(s.caption)}</figcaption>`:''}</figure>`;
  }
  function provenance(s) {
    const origin=s.capture_source==='guide-example'?'掲載ガイドのコードを個別に実行した描画結果':s.id.startsWith('docking-')?'公式 v1.93.0-docking の描画結果':s.id.startsWith('extension-')?'公式拡張ソースとDear ImGuiをビルドした描画結果':'公式 v1.93.0 タグをビルドした描画結果';
    return `<div class="provenance">CAPTURE ${esc(s.id)}<br>Dear ImGui ${esc(s.run.version)} · ${esc(s.backend||'DirectX 11 / WARP')}<br>${s.run.width} × ${s.run.height}${s.run.vertices!=null?` · ${s.run.vertices} vertices / ${s.run.indices} indices`:''}<br>${origin}</div>`;
  }
  function captureDetails(s) {
    return `<details class="capture-details"><summary>撮影情報を確認する</summary>${provenance(s)}</details>`;
  }
  function badgeMarkup(e) {
    return branchBadge(e)+`<span class="badge ${e.visual?'':'utility'}">${e.visual?'表示・ウィジェット':'状態・補助処理'}</span>${e.obsolete?'<span class="badge legacy">互換API</span>':''}${e.internal?'<span class="badge internal">内部用</span>':''}`;
  }
  function inlineProse(text) {
    const tokens=/`([^`]+)`|\*\*([^*]+)\*\*/g;
    let html='',cursor=0,match;
    while((match=tokens.exec(text))){
      html+=esc(text.slice(cursor,match.index));
      html+=match[1]!=null?`<code class="inline-code">${esc(match[1])}</code>`:`<strong>${inlineProse(match[2])}</strong>`;
      cursor=tokens.lastIndex;
    }
    return html+esc(text.slice(cursor));
  }
  function prose(text) {
    const source=String(text??''),spans=emphasisMap.get(source)||[];
    let html='',cursor=0;
    // 重要な文節だけを包み、原文・検索対象・コピーするコードは変えない。
    for(const span of spans){
      html+=inlineProse(source.slice(cursor,span.start));
      html+=`<strong class="prose-${span.kind}">${inlineProse(source.slice(span.start,span.end))}</strong>`;
      cursor=span.end;
    }
    return html+inlineProse(source.slice(cursor));
  }
  function guideTable(table) {
    if(!table)return '';
    const headers=table.headers||table.columns||[];
    return `<table class="guide-table">${headers.length?`<thead><tr>${headers.map(h=>`<th>${prose(h)}</th>`).join('')}</tr></thead>`:''}<tbody>${(table.rows||[]).map(row=>`<tr>${row.map(cell=>`<td>${prose(cell)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
  }
  function outline(items) {
    return `<aside class="doc-outline" aria-label="このページの目次"><p>ON THIS PAGE</p>${items.map(([id,title])=>`<button data-doc-anchor="${esc(id)}">${esc(title)}</button>`).join('')}</aside>`;
  }
  function wrapDocument(items) {
    const content=$('#detail-content').innerHTML;
    const mobileOutline=`<details class="mobile-doc-outline"><summary>この記事の目次</summary>${items.map(([id,title])=>`<button data-doc-anchor="${esc(id)}">${esc(title)}</button>`).join('')}</details>`;
    $('#detail-content').innerHTML=`<div class="documentation-layout"><article class="documentation-body">${mobileOutline}${content}</article>${outline(items)}</div>`;
    $$('pre.code',detail).forEach(pre=>{pre.setAttribute('aria-label','コード例。長い行は左右にスクロールできます。');pre.insertAdjacentHTML('beforebegin','<p class="code-scroll-hint">↔ 長いコードは左右にスクロールできます</p>');});
  }
  function noteMarkup(e) {
    const notes=e.beginner_notes||{},pitfalls=[...new Set([...(notes.pitfalls||[]),...(e.notes||[])])],checks=[...new Set(notes.checks||[])];
    const errors=pitfalls.filter(v=>/エラー|アサート|assert|失敗|クラッシュ|Calling PopID|Missing PopID|不正|壊れ/i.test(v));
    const cautions=pitfalls.filter(v=>!errors.includes(v));
    const related=[...new Set([...(notes.related_guides||[]),...(e.guide_links||[])])].map(id=>guideMap.get(id)).filter(Boolean);
    if(!pitfalls.length&&!checks.length&&!related.length&&!notes.example&&!notes.summary)return '';
    return `<section class="api-notes" id="api-notes"><h3>使うときの注意</h3>${notes.summary?`<p>${prose(notes.summary)}</p>`:''}${cautions.length?`<div class="api-note-box"><h4>気をつけたいこと</h4><ul>${cautions.map(v=>`<li>${prose(v)}</li>`).join('')}</ul></div>`:''}${errors.length?`<div class="api-error-box"><h4>エラーにつながるケース</h4><ul>${errors.map(v=>`<li>${prose(v)}</li>`).join('')}</ul></div>`:''}${checks.length?`<div class="api-check-box"><h4>うまく動かないときは</h4><ul>${checks.map(v=>`<li>${prose(v)}</li>`).join('')}</ul></div>`:''}${related.length?`<h4>もう少し詳しく知りたいときは</h4><div class="related-links">${related.map(g=>`<button class="related-link" data-guide="${esc(g.id)}">${esc(g.title)} →</button>`).join('')}</div>`:''}</section>`;
  }
  function openGuide(id, updateHash=true) {
    const guide=guideMap.get(id);if(!guide)return;
    activeGuide=id;activeScene=null;openQualified=null;activeFlag=null;
    if(state.view!=='guides'){state.view='guides';state.guideCategory=guide.category;state.guideLevel='all';state.query='';state.page=1;$('#search').value='';render();}
    const image=sceneMap.get(guide.image_scene);
    const sections=guide.sections.map((section,index)=>{
      const paragraphs=section.paragraphs||[],bullets=section.bullets||[];
      const tone=/エラー|失敗|動かない|つまず|困った|注意|気をつけ|間違|チェック/.test(section.title)?'warning':/まとめ|おさらい|覚えて|できた/.test(section.title)?'summary':section.code?'usage':'info';
      return `<section data-tone="${tone}" id="${esc(section.id||id+'-section-'+(index+1))}"><h3>${esc(section.title)}</h3>${section.preview_scene?`<div class="guide-preview">${imageMarkup(sceneMap.get(section.preview_scene),section.preview_caption!==false)}</div>`:''}${paragraphs.map(p=>`<p>${prose(p)}</p>`).join('')}${section.guide_links?.length?`<div class="related-links guide-prerequisites">${section.guide_links.map(id=>`<button class="related-link" data-guide="${esc(id)}">準備から確認する：${esc(guideMap.get(id).title)} →</button>`).join('')}</div>`:''}${bullets.length?`<ul>${bullets.map(b=>`<li>${prose(b)}</li>`).join('')}</ul>`:''}${guideTable(section.table)}${section.flow?`<ol class="guide-flow">${section.flow.map(p=>`<li>${prose(p)}</li>`).join('')}</ol>`:''}${section.source_excerpt?`<p class="source-excerpt-label">内部実装の抜粋（呼び出し用サンプルではありません）</p><pre class="code source-excerpt" tabindex="0"><code>${highlight(section.source_excerpt)}</code></pre>`:''}${section.scene?imageMarkup(sceneMap.get(section.scene),true):''}${section.code?`${section.capture?`<button class="related-link result-jump" data-doc-anchor="${esc(section.id)}-result">先に、このコードの表示を見る ↓</button>`:''}<div class="minor-heading"><span>試してみるコード</span><button class="copy-button" data-guide-copy="${esc(id)}" data-section-index="${index}">コピー</button></div><pre class="code" tabindex="0"><code>${highlight(section.code)}</code></pre>${guideExampleCapture(section)}`:''}</section>`;
    }).join('');
    const sources=guide.sources||[];
    const related=(guide.related_api||[]).filter(q=>groups.has(q));
    const nextGuides=(guide.related_guides||[]).map(next=>guideMap.get(next)).filter(Boolean);
    const showOverviewImage=image&&!guide.sections.some(s=>s.capture);
    $('#detail-breadcrumb').textContent='GUIDES / '+(guideLabels.get(guide.category)||guide.category);
    $('#detail-content').innerHTML=`<div class="detail-header" id="guide-overview"><p class="eyebrow">${esc(guideLabels.get(guide.category)||guide.category)}</p><h2 id="detail-title">${esc(guide.title)}</h2>${guideMeta(guide)}${guide.category==='extensions'?libraryVersion(guide.libraries||libraries.map(l=>l.id)):''}</div><div class="guide-body"><p class="guide-summary">${prose(guide.summary)}</p>${showOverviewImage?imageMarkup(image):''}${sections}${nextGuides.length?`<section class="guide-related-guides" id="guide-next"><h3>この次に読むなら</h3><div class="related-links">${nextGuides.map(g=>`<button class="related-link" data-guide="${esc(g.id)}">${esc(g.title)} →</button>`).join('')}</div></section>`:''}${related.length?`<section class="guide-related" id="guide-related"><h3>関連するAPIも見てみる</h3><div class="related-links">${related.map(q=>`<button class="related-link" data-open="${esc(q)}">${esc(q)}</button>`).join('')}</div></section>`:''}${sources.length?`<section id="guide-sources"><h3>もっと詳しく調べる</h3><ul class="guide-source-list">${sources.map(s=>`<li><a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.title||s.url)} ↗</a></li>`).join('')}</ul></section>`:''}</div>`;
    wrapDocument([['guide-overview','概要'],...guide.sections.map((s,i)=>[s.id||id+'-section-'+(i+1),s.title]),...(nextGuides.length?[['guide-next','次に読むガイド']]:[]),...(related.length?[['guide-related','関連API']]:[]),...(sources.length?[['guide-sources','参考資料']]:[])]);
    if(guide.image_caption&&showOverviewImage)$('figure',detail)?.insertAdjacentHTML('beforeend',`<figcaption>${prose(guide.image_caption)}</figcaption>`);
    $('#copy-link').hidden=false;showDetail();
    if(updateHash)history.pushState(null,'','#guide-'+id);
    document.title=guide.title+' — Dear ImGui 日本語ドキュメント';
  }
  function guideExampleCapture(section) {
    const capture=section.capture,scene=capture?sceneMap.get(capture.scene):null;
    if(!scene)return '';
    const title=capture.mode==='result'?'呼び出した結果を確認':capture.mode==='backend'?'描画処理の実行結果':'このコードの表示';
    const note=capture.caption&&!['掲載コードを実行した表示です。','掲載コードをv1.93.0-dockingで実行した表示です。','掲載コードを、対応する拡張ライブラリと一緒にビルドして実行しています。'].includes(capture.caption)?`<p class="guide-capture-note">${prose(capture.caption)}</p>`:'';
    const fixture=capture.fixture&&capture.fixture!==section.code?`<details class="guide-capture-call"><summary>表示に使った呼び出し・サンプル値</summary><pre class="code" tabindex="0"><code>${highlight(capture.fixture)}</code></pre></details>`:'';
    const comparisons=(section.compare_scenes||[]).map(id=>sceneMap.get(id)).filter(Boolean).map(s=>imageMarkup(s,true)).join('');
    return `<div class="guide-example-result" id="${esc(section.id)}-result" data-example-capture="${esc(scene.id)}"><h4>${title}：${esc(section.title)}</h4>${imageMarkup(scene)}${note}${comparisons}${fixture}</div>`;
  }
  function flagValueMarkup(v) {
    const tags=(v.branch==='docking'?'<span class="branch-badge docking">Docking</span>':'')+(v.obsolete?'<span class="badge legacy">互換名</span>':'')+(v.internal?'<span class="badge internal">内部用</span>':'')+(v.role==='status'?'<span class="badge utility">状態を読む値</span>':'')+(v.combined?'<span class="badge utility">複合値</span>':'');
    return `<article class="flag-value" id="${v.id}" data-flag-name="${esc(v.name)}"><div class="flag-value-heading"><h4>${esc(v.name)}</h4><div>${tags}</div></div><p>${prose(v.description)}</p><details class="flag-definition"><summary>値・定義式・公式ソース</summary><div><code>${esc(v.expression || String(v.value))}</code><span>${v.value} / ${v.hex}</span><a href="${v.source}" target="_blank" rel="noopener">公式の定義 ↗</a>${v.comment?`<p>${esc(v.comment)}</p>`:''}</div></details><button class="flag-permalink" data-flag-link="${esc(v.name)}" aria-label="${esc(v.name)}へのリンクをコピー">リンクをコピー</button></article>`;
  }
  function renderFlags() {
    const g=flagGroupMap.get(flagState.type);if(!g||!$('#flags-content'))return;
    const matches=ranked(g.values.filter(v=>flagIsVisible(v,flagState.visibility)),v=>flagSearch.get(v.name),flagState.query,false);
    const values=matches.map(m=>m.item);
    $('#flags-content').innerHTML=values.map(flagValueMarkup).join('')||(g.empty_reason?`<p class="flag-empty-reason">${prose(g.empty_reason)}</p>`:'<div class="empty"><h4>一致する値がありません</h4><p>検索語や表示対象を変更してください。</p></div>');
    $('#flags-count').textContent=`${values.length} 値を表示 / 全${g.values.length}値${matches.some(m=>m.fuzzy)?' · 近い表記の候補を表示':''}`;
    $('#flags-visibility').value=flagState.visibility;$('#flags-search').value=flagState.query;
  }
  function openFlags(type='all', valueName=null, updateHash=true) {
    if(type==='all'&&!valueName){openFlagIndex('all',updateHash);return;}
    if(!activeFlag)flagsReturnHash=detail.open&&!/^#flags?(?:-|$)/.test(location.hash)?location.hash:'';
    const value=valueName?flagValueMap.get(valueName):null;
    const g=flagGroupMap.get(value?value.type:type);if(!g)return;
    flagState.type=g.type;flagState.query='';
    flagState.visibility=value&&(value.internal||value.obsolete)||g.empty_reason?'all':state.view==='flags'?state.flagVisibility:'public';
    activeFlag=g.type;openQualified=null;activeGuide=null;activeScene=null;
    if(state.view!=='flags'){state.query='';state.page=1;$('#search').value='';}
    state.view='flags';render();
    const usage=[...new Set([...(g.used_by||[]),...api.filter(e=>(e.flag_types||[]).includes(g.type)||e.params.some(p=>new RegExp('\\b'+g.type+'\\b').test(p.type))).map(e=>e.qualified)])].filter(q=>groups.has(q));
    $('#detail-breadcrumb').textContent='FLAG REFERENCE / '+flagCategories.get(flagCategory(g));
    $('#detail-content').innerHTML=`<div class="detail-header flag-reference-header" data-topic="flags" data-flag-detail-type="${esc(g.type)}" id="flag-overview"><p class="eyebrow">${esc(flagCategories.get(flagCategory(g)))}</p><h2 id="detail-title">${esc(g.type)}</h2><p class="japanese-title">${esc(g.title)}</p><div class="flag-detail-navigation"><button class="related-link" data-flag-back>${flagsReturnHash?'← 元の解説に戻る':'← フラグ一覧に戻る'}</button>${g.branch==='docking'?'<span class="branch-badge docking">Docking</span>':''}${g.empty_reason?'<span class="badge internal">内部用</span>':''}</div></div><div class="flag-reference-body"><p class="detail-description">${prose(g.description)}</p><section id="flag-example" class="flag-code-example code-example"><h3 class="minor-heading">まずはこの書き方から <button class="copy-button" data-flag-example="${esc(g.type)}">コピー</button></h3><pre class="code" tabindex="0"><code>${highlight(g.example)}</code></pre></section><section id="flag-notes" class="api-note-box"><h3>組み合わせ方と注意点</h3><p>${prose(g.note)}</p></section>${usage.length?`<section id="flag-related"><h3>この型を使う関数</h3><div class="related-links">${usage.map(q=>`<button class="related-link" data-flag-api="${esc(q)}">${esc(q)}</button>`).join('')}</div></section>`:''}<section id="flag-values"><h3>各値の意味</h3><div class="flags-controls"><label class="searchbox"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"></circle><path d="m16 16 5 5"></path></svg><input id="flags-search" type="search" placeholder="この型の値を名前・日本語で検索…" aria-label="この型のフラグ値を検索"></label><label class="flags-select-label">表示対象<select id="flags-visibility" aria-label="フラグ値の表示対象"><option value="public">通常の公開値</option><option value="all">すべて</option><option value="obsolete">互換名</option><option value="internal">内部用</option></select></label></div><p id="flags-count" class="flags-count" aria-live="polite"></p><div id="flags-content" class="flag-values"></div></section></div>`;
    wrapDocument([['flag-overview','できること'],['flag-example','コード例'],['flag-notes','組み合わせ方と注意点'],...(usage.length?[['flag-related','関連する関数']]:[]),['flag-values','各値の意味']]);
    renderFlags();$('#copy-link').hidden=false;showDetail();
    document.title=g.type+' — Dear ImGui フラグ図鑑';
    if(updateHash)history.pushState(null,'',value?'#'+value.id:'#flags-'+g.type);
    if(value)requestAnimationFrame(()=>{
      const target=document.getElementById(value.id);target?.scrollIntoView({block:'center'});target?.classList.add('flag-target');
    });
  }
  function returnFromFlags() {
    const hash=flagsReturnHash;flagsReturnHash='';
    if(hash){history.pushState(null,'',hash);route();}
    else closeDetail();
  }
  function variant(e, index, selected) {
    const parameters = e.params.length ? `<table class="params"><thead><tr><th>引数</th><th>何を渡す？</th></tr></thead><tbody>${e.params.map(p => `<tr><td><code class="parameter-name">${esc(p.name || '（名前なし）')}</code><small class="parameter-type"><span>型</span> <code>${typeView.typeText(p.type)}</code></small>${p.default_value!=null?`<small class="parameter-default"><span>省略時</span> <code>${esc(p.default_value)}</code></small>`:''}</td><td>${prose(p.description)}${(p.flag_types||[]).map(t=>`<button class="flag-type-link" data-flag-type="${esc(t)}">${esc(t)} の設定を見る ↗</button>`).join('')}</td></tr>`).join('')}</tbody></table>` : '<p class="no-parameters">引数はありません。</p>';
    return `<details class="variant" id="variant-${e.id}" ${selected?'open':''}><summary><code>${esc(e.signature)}</code>${branchBadge(e)}${e.obsolete?'<span class="badge legacy">互換</span>':''}${e.internal?'<span class="badge internal">内部</span>':''}</summary><div class="variant-content">${selected?'':`<p>${prose(e.description)}</p>`}${parameters}<div class="return-line"><strong>戻り値</strong><p>${prose(e.returns)}</p></div><div class="source-row"><a href="${e.source}" target="_blank" rel="noopener">公式の定義を見る ↗</a>${e.capture_explanation?`<button class="related-link" data-open="${esc(e.qualified)}" data-entry="${e.id}">この宣言の表示例を見る ↑</button>`:''}<button class="copy-button" data-signature="${e.id}">宣言をコピー</button><button class="copy-button" data-variant-link="${e.id}">この宣言へのリンク</button></div>${e.comment?`<details class="source-comment"><summary>公式ヘッダーのコメント</summary><p>${esc(e.comment)}</p></details>`:''}</div></details>`;
  }
  function showDetail() {
    closeExplorer();$('#display-settings').open=false;
    if (!detail.open) detail.show();
    document.body.classList.add('dialog-open');
    detail.scrollTop=0;
    $('#detail-close').focus({preventScroll:true});
    enterMotion($('#detail-content'),6,190);
  }
  function openGroup(qualified, selectedId = null, updateHash = true) {
    const entries=groups.get(qualified);
    if(!entries)return;
    const previousGuide=guideMap.get(activeGuide);
    const preferredBranch=previousGuide?.category==='docking'?'docking':previousGuide?.category==='extensions'?'extension':state.branch;
    openQualified=qualified;activeScene=null;activeGuide=null;activeFlag=null;
    if(state.view==='flags'||state.view==='types'){state.view='reference';state.query='';state.page=1;$('#search').value='';render();}
    const selected=entries.find(e=>e.id===selectedId) || entries.find(e=>(e.branch||'core')===preferredBranch&&!e.obsolete&&!e.internal) || entries.find(e=>!e.obsolete&&!e.internal) || entries[0];
    const s=sceneMap.get(selected.scene);
    $('#detail-breadcrumb').textContent='REFERENCE / '+labelMap.get(selected.category);
    const related = s.calls.filter(q=>q!==qualified&&groups.has(q)).slice(0,12);
    const flagTypes=[...new Set(entries.flatMap(e=>e.flag_types||[]))];
    $('#detail-content').innerHTML=`<div class="detail-header" data-topic="${esc(selected.category)}"><p class="eyebrow">${esc(labelMap.get(selected.category))}</p><h2 id="detail-title">${esc(qualified)}</h2><p class="japanese-title">${esc(selected.title)}</p><div class="detail-badges">${badgeMarkup(selected)}</div>${selected.library?libraryVersion([selected.library]):''}</div><div class="detail-grid"><div><p class="detail-description">${prose(selected.description)}</p>${imageMarkup(s)}${selected.capture_explanation?`<p class="function-capture-explanation">${prose(selected.capture_explanation)}</p>`:''}</div><div>${sampleMarkup(s)}${related.length?`<h3 class="minor-heading related-heading" style="margin-top:22px">一緒に使うと便利な関数</h3><div class="related-links">${related.map(q=>`<button class="related-link" data-open="${esc(q)}">${esc(q)}</button>`).join('')}</div>`:''}</div></div><section class="variants"><h3>引数と戻り値 <span>${entries.length}</span></h3>${entries.map((e,i)=>variant(e,i,e.id===selected.id)).join('')}</section>`;
    const quickExample=selected.example||(selected.examples||[])[0]?.code||selected.beginner_notes?.example;
    if(quickExample){
      const sample=$('.sample-box',detail);
      sample.insertAdjacentHTML('beforebegin',`<div class="sample-box code-example"><h3 class="minor-heading">まずはこの書き方から <button class="copy-button" data-api-example="${selected.id}">コピー</button></h3><pre class="code" tabindex="0"><code>${highlight(quickExample)}</code></pre></div>`);
      const capture=document.createElement('details');capture.className='capture-code-details';sample.before(capture);capture.innerHTML='<summary>撮影時の呼び出しを確認する</summary>';capture.append(sample);
    }
    if(flagTypes.length)$('.detail-header',detail).insertAdjacentHTML('beforeend',`<div class="function-flags"><span>フラグの各値</span>${flagTypes.map(t=>`<button class="flag-type-link" data-flag-type="${esc(t)}">${esc(t)} ↗</button>`).join('')}</div>`);
    $('.detail-header',detail).id='api-overview';$('.detail-grid',detail).id='api-example';$('.variants',detail).id='api-signatures';
    $('#detail-content').insertAdjacentHTML('beforeend',noteMarkup(selected));
    const typeLink=typeView.typeButton(selected.scope);
    if(typeLink)$('#detail-content').insertAdjacentHTML('beforeend',`<section class="api-type-link"><h3>この関数を持つ型</h3>${typeLink}</section>`);
    wrapDocument([['api-overview','できること'],['api-example','表示例とコード'],['api-signatures','引数と戻り値'],...($('#api-notes',detail)?[['api-notes','使うときの注意']]:[])]);
    $('#copy-link').hidden=false;
    showDetail();
    if(updateHash)history.pushState(null,'','#'+selected.id);
    document.title=qualified+' — ImGui 1.93.0 日本語API図鑑';
  }
  function openScene(id, updateHash = true) {
    const s=sceneMap.get(id);if(!s)return;
    openQualified=null;activeScene=id;activeGuide=null;activeFlag=null;
    $('#detail-breadcrumb').textContent='CAPTURE GALLERY / '+id;
    $('#detail-content').innerHTML=`<div class="detail-header"><p class="eyebrow">表示サンプル</p><h2 id="detail-title">${esc(s.title)}</h2></div><div class="detail-grid"><div>${imageMarkup(s,true)}${captureDetails(s)}</div><div>${sampleMarkup(s)}<h3 class="minor-heading" style="margin-top:20px">使っている関数を調べる</h3><div class="related-links">${s.calls.filter(q=>groups.has(q)).map(q=>`<button class="related-link" data-open="${esc(q)}">${esc(q)}</button>`).join('')}</div></div></div>`;
    showDetail();if(updateHash)history.pushState(null,'','#capture-'+id);
    document.title=s.title+'のキャプチャ — ImGui 1.93.0';
  }
  function closeDetail(updateHash = true) {
    if(detail.open)detail.close();
    if(updateHash&&/^#(api-|docking-|extension-|guide-|capture-|type-|member-|flags?(?:-|$))/.test(location.hash))history.replaceState(null,'',state.view==='types'?'#types':state.view==='flags'?'#flags':state.view==='gallery'?'#gallery':state.view==='guides'?(state.guideCategory==='all'?'#guides':'#guides-'+state.guideCategory):state.branch==='all'?'#reference':'#branch-'+state.branch);
    openQualified=null;activeScene=null;activeGuide=null;activeFlag=null;document.title=state.view==='types'?'型・構造体一覧 — Dear ImGui 日本語ドキュメント':state.view==='flags'?'フラグ一覧 — Dear ImGui 日本語ドキュメント':'Dear ImGui 1.93.0 — 日本語ドキュメント';
  }
  function zoom(id) {
    const s=sceneMap.get(id);if(!s)return;
    $('#zoom-image').src=s.url;$('#zoom-image').alt=s.caption;
    $('#zoom-caption').textContent=s.caption;
    imageDialog.showModal();document.body.classList.add('dialog-open');
    enterMotion($('#zoom-image'),5,170);
  }
  function updateBody(){document.body.classList.toggle('dialog-open',detail.open||imageDialog.open||about.open);}
  [detail,imageDialog,about].forEach(d=>{
    d.addEventListener('close',updateBody);
    d.addEventListener('click',event=>{
      const r=d.getBoundingClientRect();
      if(event.target===d&&(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)){
        if(d===detail)closeDetail();else d.close();
      }
    });
  });
  detail.addEventListener('cancel',event=>{event.preventDefault();closeDetail();});
  function updateFlagQuery(event){if(event.target.id==='flags-search'&&!event.isComposing&&flagState.query!==event.target.value){flagState.query=event.target.value;renderFlags();}}
  document.addEventListener('input',updateFlagQuery);document.addEventListener('compositionend',updateFlagQuery);
  document.addEventListener('change',event=>{if(event.target.id==='flags-visibility'){flagState.visibility=event.target.value;renderFlags();}});
  $('#flag-index-visibility').addEventListener('change',event=>{state.flagVisibility=event.target.value;state.page=1;render(true);});
  $('#detail-close').addEventListener('click',()=>closeDetail());
  $('#image-close').addEventListener('click',()=>imageDialog.close());
  $('#about-close').addEventListener('click',()=>about.close());
  function openAbout(){closeExplorer();$('#display-settings').open=false;about.showModal();updateBody();}
  $('#about-open').addEventListener('click',openAbout);
  $('#about-footer').addEventListener('click',openAbout);
  $('#copy-link').addEventListener('click',()=>copy(location.href));
  $('#contrast-toggle').addEventListener('click',()=>{
    const contrast=document.documentElement.dataset.contrast==='normal'?'enhanced':'normal';
    document.documentElement.dataset.contrast=contrast;
    try{localStorage.setItem('imgui-docs-contrast',contrast);}catch{}
    updateContrast();
  });
  $('#theme-toggle').addEventListener('click',()=>{
    const theme=document.documentElement.dataset.theme==='light'?'dark':'light';document.documentElement.dataset.theme=theme;
    try{localStorage.setItem('imgui-docs-theme',theme);}catch{}
    updateTheme();
    if(!motionPreference.matches){
      const animation=$('#theme-toggle').animate([{transform:'rotate(-16deg) scale(.9)'},{transform:'rotate(0) scale(1)'}],{duration:180,easing:'cubic-bezier(.2,0,0,1)'});
      runningMotions.add(animation);animation.finished.catch(()=>{}).finally(()=>runningMotions.delete(animation));
    }
  });
  $('#explorer-toggle').addEventListener('click',()=>{
    if(document.body.classList.contains('explorer-open'))closeExplorer(true);else openExplorer();
  });
  $('#explorer-backdrop').addEventListener('click',()=>closeExplorer(true));
  $('#explorer-close').addEventListener('click',()=>closeExplorer(true));
  $('#branch-select').addEventListener('change',event=>{state.branch=event.target.value;state.page=1;render(true);});
  $('#view-list').addEventListener('click',()=>{state.presentation='list';render(true);});
  $('#view-cards').addEventListener('click',()=>{state.presentation='cards';render(true);});
  function updateSearchQuery(event){if(event.isComposing||state.query===event.target.value)return;state.query=event.target.value;state.page=1;render();}
  $('#search').addEventListener('input',updateSearchQuery);$('#search').addEventListener('compositionend',updateSearchQuery);
  $('#guide-level').addEventListener('change',event=>{state.guideLevel=event.target.value;state.page=1;render(true);});
  $('#sort').addEventListener('change',event=>{state.sort=event.target.value;state.page=1;render(true);});
  $('#frequency-sort').addEventListener('click',()=>{state.sort='frequency';state.page=1;render(true);});
  $('#reset').addEventListener('click',reset);$('#empty-reset').addEventListener('click',reset);
  document.addEventListener('keydown',event=>{
    if(event.key==='Tab'&&document.body.classList.contains('explorer-open')){
      const focusable=$$('button:not([disabled]),a[href],input,select,summary',$('#explorer')).filter(e=>e.getClientRects().length);
      const first=focusable[0],last=focusable.at(-1),outside=!$('#explorer').contains(document.activeElement);
      if(event.shiftKey&&(document.activeElement===first||outside)){event.preventDefault();last?.focus();return;}
      if(!event.shiftKey&&(document.activeElement===last||outside)){event.preventDefault();first?.focus();return;}
    }
    if(event.key==='Escape'&&$('#display-settings').open){event.preventDefault();event.stopPropagation();$('#display-settings').open=false;$('#display-settings summary').focus();return;}
    if(event.key==='Escape'&&!imageDialog.open&&!about.open){
      if(document.body.classList.contains('explorer-open')){event.preventDefault();closeExplorer();$('#explorer-toggle').focus();return;}
      if(detail.open){event.preventDefault();closeDetail();return;}
    }
    if(event.key==='/'&&!['INPUT','TEXTAREA','SELECT'].includes(event.target.tagName)&&!detail.open&&!about.open&&!imageDialog.open){event.preventDefault();$('#search').focus();}
  });
  document.addEventListener('click',event=>{
    if($('#display-settings').open&&!$('#display-settings').contains(event.target))$('#display-settings').open=false;
    if(event.target.closest('#display-settings>summary,.brand'))closeExplorer();
    if(event.target.closest('[data-about-open]')){openAbout();return;}
    if(event.target.closest('[data-search-api]')){const query=state.query;openBranch('all');state.query=query;$('#search').value=query;render(true);return;}
    const guide=event.target.closest('[data-guide]');if(guide){event.preventDefault();openGuide(guide.dataset.guide);return;}
    const guideCategory=event.target.closest('[data-guide-category]');if(guideCategory){event.preventDefault();openGuideIndex(guideCategory.dataset.guideCategory);return;}
    const branch=event.target.closest('[data-branch]');if(branch){openBranch(branch.dataset.branch);return;}
    const anchor=event.target.closest('[data-doc-anchor]');if(anchor){const mobile=anchor.closest('.mobile-doc-outline');if(mobile)mobile.open=false;document.getElementById(anchor.dataset.docAnchor)?.scrollIntoView({block:'start'});return;}
    const guideCopy=event.target.closest('[data-guide-copy]');if(guideCopy){copy(guideMap.get(guideCopy.dataset.guideCopy).sections[Number(guideCopy.dataset.sectionIndex)].code||'');return;}
    const apiExample=event.target.closest('[data-api-example]');if(apiExample){const e=entryMap.get(apiExample.dataset.apiExample);copy(e.example||(e.examples||[])[0]?.code||e.beginner_notes?.example||'');return;}
    const flagValue=event.target.closest('[data-flag-value]');if(flagValue){openFlags('all',flagValue.dataset.flagValue);return;}
    const flagType=event.target.closest('[data-flag-type]');if(flagType){closeExplorer();openFlags(flagType.dataset.flagType);return;}
    const flagCategoryButton=event.target.closest('[data-flag-category]');if(flagCategoryButton){closeExplorer();closeDetail(false);state.view='flags';state.flagCategory=flagCategoryButton.dataset.flagCategory;state.page=1;render(true);history.replaceState(null,'','#flags');$('#reference').scrollIntoView({block:'start'});return;}
    const flagBack=event.target.closest('[data-flag-back]');if(flagBack){returnFromFlags();return;}
    const flagExample=event.target.closest('[data-flag-example]');if(flagExample){copy(flagGroupMap.get(flagExample.dataset.flagExample).example);return;}
    const flagLink=event.target.closest('[data-flag-link]');if(flagLink){copy(location.href.split('#')[0]+'#flag-'+flagLink.dataset.flagLink);return;}
    const flagApi=event.target.closest('[data-flag-api]');if(flagApi){openGroup(flagApi.dataset.flagApi);return;}
    const open=event.target.closest('[data-open]');if(open){openGroup(open.dataset.open,open.dataset.entry||null);return;}
    const scene=event.target.closest('[data-scene]');if(scene){openScene(scene.dataset.scene);return;}
    const img=event.target.closest('[data-zoom]');if(img){zoom(img.dataset.zoom);return;}
    const c=event.target.closest('[data-copy]');if(c){const s=sceneMap.get(c.dataset.copy);copy(s.display_code||s.code);return;}
    const sig=event.target.closest('[data-signature]');if(sig){copy(entryMap.get(sig.dataset.signature).signature);return;}
    const link=event.target.closest('[data-variant-link]');if(link){copy(location.href.split('#')[0]+'#'+link.dataset.variantLink);return;}
    const category=event.target.closest('[data-category]');if(category){closeExplorer();closeDetail(false);state.view='reference';state.category=category.dataset.category;state.page=1;render(true);history.replaceState(null,'','#reference');$('#reference').scrollIntoView({block:'start'});return;}
    const filter=event.target.closest('[data-filter]');if(filter){state.filter=filter.dataset.filter;state.page=1;render(true);return;}
    const page=event.target.closest('[data-page]');if(page&&!page.disabled){state.page=Number(page.dataset.page);render(true);$('#reference').scrollIntoView({block:'start'});return;}
    const view=event.target.closest('[data-view]');if(view){event.preventDefault();if(view.dataset.view==='types'){typeView.openIndex();return;}if(view.dataset.view==='flags'){openFlagIndex();return;}closeExplorer();closeDetail(false);state.view=view.dataset.view;state.page=1;state.query='';$('#search').value='';render(true);history.pushState(null,'',state.view==='gallery'?'#gallery':'#reference');$('#reference').scrollIntoView({block:'start'});return;}
  });
  function route(){
    const hash=decodeURIComponent(location.hash.slice(1));
    if(typeView.route(hash))return;
    if(hash==='flags'){openFlagIndex('all',false);return;}
    if(hash.startsWith('flags-')&&flagGroupMap.has(hash.slice(6))){openFlags(hash.slice(6),null,false);return;}
    if(hash.startsWith('flag-')&&flagValueMap.has(hash.slice(5))){openFlags('all',hash.slice(5),false);return;}
    if(hash.startsWith('guide-')&&guideMap.has(hash.slice(6))){openGuide(hash.slice(6),false);return;}
    if(entryMap.has(hash)){const e=entryMap.get(hash);openGroup(e.qualified,e.id,false);return;}
    if(hash.startsWith('capture-')&&sceneMap.has(hash.slice(8))){openScene(hash.slice(8),false);return;}
    closeDetail(false);
    if(hash==='guides'){openGuideIndex('all',false);return;}
    if(hash.startsWith('guides-')){openGuideIndex(hash.slice(7),false);return;}
    if(hash.startsWith('branch-')){openBranch(hash.slice(7),false);return;}
    if(hash==='gallery'){state.view='gallery';state.page=1;render();$('#reference').scrollIntoView({block:'start'});}
    else if(hash==='home'){state.view='reference';reset();window.scrollTo({top:0});}
    else if(hash==='reference'){state.view='reference';render();$('#reference').scrollIntoView({block:'start'});}
  }
  window.addEventListener('hashchange',route);
  typeView=window.IMGUI_DOCS_TYPES.create({types,searchEngine,ranked,state,esc,prose,highlight,render,showDetail,closeDetail,closeExplorer,wrapDocument,copy,flagGroupMap,guideMap,onOpen(){openQualified=null;activeScene=null;activeGuide=null;activeFlag=null;}});
  render();route();
})();
