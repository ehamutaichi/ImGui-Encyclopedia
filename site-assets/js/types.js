// 型一覧とメンバー詳細。共通の検索・詳細パネルへ接続する。
window.IMGUI_DOCS_TYPES={create(context){
  'use strict';
  const {types,searchEngine,ranked,state,esc,prose,highlight,render,showDetail,closeDetail,closeExplorer,wrapDocument,copy,flagGroupMap,onOpen}=context;
  const $=selector=>document.querySelector(selector);
  const categories=new Map([['all','すべての型'],['fonts','フォント'],['settings','設定・スタイル'],['values','値・基本型'],['textures','画像・テクスチャ'],['drawing','描画データ'],['input','入力・コールバック'],['tables','テーブル'],['selection','複数選択'],['storage','配列・保存・補助'],['platform','画面・OS連携'],['internal','内部補助・前方宣言']]);
  const usages=new Map([['all','すべてのメンバー'],['setting','設定する値'],['read','読み取り用'],['edit','条件付きで編集'],['data','自分で持つ値'],['callback','コールバック'],['backend','バックエンド用'],['internal','内部状態'],['obsolete','互換用']]);
  const byName=new Map(types.map(t=>[t.name,t]));
  const byMember=new Map(types.flatMap(t=>t.members.map(m=>[m.id,{type:t,member:m}])));
  const indexes=new Map(types.map(t=>[t.name,searchEngine.index([t.name,...t.members.map(m=>t.name+'::'+m.name)], [t.title,t.description,categories.get(t.category)],t.members.flatMap(m=>[m.name,m.type,m.description]))]));
  const memberIndexes=new Map(types.flatMap(t=>t.members.map(m=>[m.id,searchEngine.index([m.name,t.name+'::'+m.name],[m.type,m.description],usages.get(m.usage))])));
  let category='all',visibility='public',active=null,memberQuery='',memberUsage='all',memberBranch='all';
  $('#type-categories').innerHTML=[...categories].map(([id,label])=>`<button class="category" data-type-category="${id}"><span>${esc(label)}</span><span class="count">${id==='all'?types.length:types.filter(t=>t.category===id).length}</span></button>`).join('');
  $('#types-index-controls').innerHTML=`<div class="flag-category-filters">${[...categories].filter(([id])=>id!=='internal').map(([id,label])=>`<button data-type-category="${id}">${esc(label)}</button>`).join('')}</div><label class="flags-select-label">収録範囲<select id="type-index-visibility"><option value="public">公開型</option><option value="all">内部補助も表示</option></select></label>`;
  $('#type-total-count').textContent=String(types.length);
  function indexEntries(){return ranked(types.filter(t=>(category==='all'||t.category===category)&&(visibility==='all'||category==='internal'||!t.internal)),t=>indexes.get(t.name),state.query).map(m=>m.item);}
  function row(t){
    const matches=state.query.trim()?searchEngine.rank(t.members,m=>memberIndexes.get(m.id),state.query).slice(0,2):[];
    return `<button class="api-card api-row type-row" data-type="${esc(t.name)}"><div><div class="row-title"><span class="symbol-icon" aria-hidden="true">T</span><code>${esc(t.name)}</code></div><p class="row-summary">${esc(t.title)}</p><p class="type-summary">${prose(t.description)}</p>${matches.length?`<div class="type-matches">${matches.map(({item:m})=>`<p><code>${esc(m.name)}</code><span>${prose(m.description)}</span></p>`).join('')}</div>`:''}</div><div class="row-meta">${t.branch==='docking'?'<span class="branch-badge docking">Docking専用</span>':''}<span>${esc(categories.get(t.category))}</span><span>${t.members.length} メンバー</span><span>${t.kind==='callback'?'コールバック':t.kind==='alias'?'型別名':t.kind==='opaque'?'前方宣言':'構造体'}</span></div></button>`;
  }
  function updateIndex(){
    $('#type-index-visibility').value=visibility;
    document.querySelectorAll('[data-type-category]').forEach(button=>{const selected=state.view==='types'&&category===button.dataset.typeCategory;button.classList.toggle('active',selected);button.setAttribute('aria-pressed',String(selected));});
  }
  function openIndex(nextCategory='all',updateHash=true){
    closeExplorer();closeDetail(false);state.view='types';category=categories.has(nextCategory)?nextCategory:'all';state.query='';state.page=1;$('#search').value='';render(true);
    if(updateHash)history.pushState(null,'','#types');
    document.title='型・構造体一覧 — Dear ImGui 日本語ドキュメント';$('#reference').scrollIntoView({block:'start'});
  }
  function typeText(text){
    let result='',last=0;
    for(const match of text.matchAll(/\bIm\w+\b/g)){
      result+=esc(text.slice(last,match.index));const name=match[0];
      result+=byName.has(name)?`<button class="type-inline-link" data-type="${esc(name)}">${esc(name)}</button>`:flagGroupMap.has(name)?`<button class="type-inline-link" data-flag-type="${esc(name)}">${esc(name)}</button>`:esc(name);last=match.index+name.length;
    }
    return result+esc(text.slice(last));
  }
  function renderMembers(){
    if(!active||!$('#type-members'))return;
    const source=active.members.filter(m=>(memberUsage==='all'||memberUsage===m.usage)&&(memberBranch==='all'||m.branch===memberBranch));
    const matches=searchEngine.rank(source,m=>memberIndexes.get(m.id),memberQuery);
    $('#type-member-count').textContent=matches.length+' / '+active.members.length+' メンバー';
    $('#type-members').innerHTML=matches.map(({item:m})=>`<article class="type-member" id="${esc(m.id)}" data-usage="${esc(m.usage)}"><div class="type-member-heading"><h4><code>${esc(m.name)}</code></h4><div><span class="member-usage ${esc(m.usage)}">${esc(usages.get(m.usage))}</span>${m.branch==='docking'?'<span class="branch-badge docking">Docking追加</span>':''}<button class="copy-button" data-type-member-link="${esc(m.id)}" aria-label="${esc(m.name)}へのリンクをコピー">#</button></div></div><pre class="type-declaration"><code>${typeText(m.declaration)}</code></pre><p>${prose(m.description)}</p><details class="type-source"><summary>公式の宣言とコメント</summary><a href="${esc(m.source)}" target="_blank" rel="noopener">${m.branch==='docking'?'Docking版':'標準版'}のimgui.h ${m.line}行目 ↗</a>${m.docking_source?`<a href="${esc(m.docking_source)}" target="_blank" rel="noopener">Docking版の宣言 ↗</a>`:''}${m.comment?`<p>${esc(m.comment)}</p>`:''}<p>C++のアクセス指定：${esc(m.access)}。設定できるかどうかは上の用途と説明を確認してください。</p></details></article>`).join('')||'<p class="type-empty">一致するメンバーがありません。</p>';
  }
  function open(name,member=null,updateHash=true){
    const type=byName.get(name);if(!type)return;
    onOpen();active=type;memberQuery='';memberUsage='all';memberBranch='all';
    if(state.view!=='types'){state.view='types';state.query='';state.page=1;$('#search').value='';render();}
    const fontFamily=['ImFontConfig','ImFontAtlas','ImFont','ImFontBaked','ImFontGlyph'];
    const family=type.category==='fonts'?`<section id="type-family"><h3>フォントの型のつながり</h3><div class="type-family">${fontFamily.map(n=>`<button data-type="${n}" ${n===type.name?'aria-current="page"':''}><code>${n}</code><span>${esc(byName.get(n).title)}</span></button>`).join('<span aria-hidden="true">→</span>')}</div><p>設定を登録し、アトラスがフォントと画像を管理します。フォントを選ぶと、そのサイズの字形データを使って描画します。</p></section>`:'';
    const declaration=type.target?typeText(type.target):esc(type.kind==='opaque'?'struct '+type.name+';':type.name==='ImVector'?'template<typename T> struct ImVector':type.name==='ImSmallStack_'?'template<typename T, int Capacity, typename SZ_T = ImU16> struct ImSmallStack_':'struct '+type.name);
    $('#detail-breadcrumb').textContent='TYPES / '+categories.get(type.category);
    $('#detail-content').innerHTML=`<div class="detail-header" id="type-overview"><p class="eyebrow">型・構造体リファレンス</p><h2 id="detail-title">${esc(type.name)}</h2><p class="japanese-title">${esc(type.title)}</p>${type.branch==='docking'?'<span class="branch-badge docking">Docking専用</span>':''}<p class="detail-description">${prose(type.description)}</p><pre class="type-declaration"><code>${declaration}</code></pre><a href="${esc(type.source)}" target="_blank" rel="noopener">公式の定義を見る ↗</a></div><div class="type-body">${family}${type.notes.length?`<section id="type-notes" class="api-note-box"><h3>使う前に押さえたいこと</h3><ul>${type.notes.map(note=>`<li>${prose(note)}</li>`).join('')}</ul></section>`:''}${type.example?`<section id="type-example"><h3>${esc(type.example.title)}</h3><div class="minor-heading"><span>コード例</span><button class="copy-button" data-type-example="${esc(type.name)}">コピー</button></div><pre class="code" tabindex="0"><code>${highlight(type.example.code)}</code></pre></section>`:''}${type.members.length?`<section id="type-member-section"><h3>データメンバー</h3><div class="type-member-controls"><label class="searchbox"><input id="type-member-search" type="search" placeholder="この型のメンバーを検索…" aria-label="この型のメンバーを検索" autocomplete="off"></label><label>用途<select id="type-member-usage">${[...usages].map(([key,label])=>`<option value="${key}">${esc(label)}</option>`).join('')}</select></label><label>版<select id="type-member-branch"><option value="all">標準・Docking追加</option><option value="core">標準のメンバー</option><option value="docking">Docking追加のみ</option></select></label></div><p id="type-member-count" aria-live="polite"></p><div id="type-members"></div></section>`:`<section id="type-member-section"><h3>メンバーについて</h3><p>${type.kind==='alias'||type.kind==='callback'?'型の別名・関数ポインター型なので、この型自身のデータメンバーはありません。下の関連する型から、受け渡すデータを調べられます。':type.kind==='opaque'?'公開ヘッダーにはデータメンバーの定義がありません。内部ヘッダー全体のメンバーを公開APIとして収録する対象ではありません。':'データメンバーを持たない補助型です。'}</p></section>`}${type.methods.length?`<section id="type-methods"><h3>この型の関数を調べる</h3><div class="related-links">${type.methods.map(q=>`<button class="related-link" data-open="${esc(q)}">${esc(q)}</button>`).join('')}</div></section>`:''}${type.related_types.length?`<section id="type-related"><h3>関連する型</h3><div class="related-links">${type.related_types.map(n=>`<button class="related-link" data-type="${esc(n)}">${esc(n)}</button>`).join('')}</div></section>`:''}${type.related_guides.length?`<section id="type-guides"><h3>使い方をガイドで読む</h3><div class="related-links">${type.related_guides.map(id=>`<button class="related-link" data-guide="${esc(id)}">${esc(context.guideMap.get(id).title)} →</button>`).join('')}</div></section>`:''}</div>`;
    wrapDocument([['type-overview','概要'],...(family?[['type-family','型のつながり']]:[]),...(type.notes.length?[['type-notes','使う前に']]:[]),...(type.example?[['type-example','コード例']]:[]),['type-member-section','メンバー'],...(type.methods.length?[['type-methods','この型の関数']]:[]),...(type.related_types.length?[['type-related','関連する型']]:[]),...(type.related_guides.length?[['type-guides','使い方ガイド']]:[])]);
    renderMembers();$('#copy-link').hidden=false;showDetail();
    const hash=member&&byMember.has(member)?member:type.id;
    if(updateHash)history.pushState(null,'','#'+hash);
    document.title=type.name+'の型・メンバー — Dear ImGui 日本語ドキュメント';
    if(member)document.getElementById(member)?.scrollIntoView({block:'start'});
  }
  document.addEventListener('click',event=>{
    const type=event.target.closest('[data-type]');if(type){event.preventDefault();open(type.dataset.type);return;}
    const categoryButton=event.target.closest('[data-type-category]');if(categoryButton){openIndex(categoryButton.dataset.typeCategory);return;}
    const link=event.target.closest('[data-type-member-link]');if(link){copy(location.href.split('#')[0]+'#'+link.dataset.typeMemberLink);return;}
    const example=event.target.closest('[data-type-example]');if(example)copy(byName.get(example.dataset.typeExample).example.code);
  });
  function searchMembers(event){if(event.target.id==='type-member-search'&&!event.isComposing&&memberQuery!==event.target.value){memberQuery=event.target.value;renderMembers();}}
  document.addEventListener('input',searchMembers);document.addEventListener('compositionend',searchMembers);
  document.addEventListener('change',event=>{
    if(event.target.id==='type-index-visibility'){visibility=event.target.value;state.page=1;render(true);}
    if(event.target.id==='type-member-usage'){memberUsage=event.target.value;renderMembers();}
    if(event.target.id==='type-member-branch'){memberBranch=event.target.value;renderMembers();}
  });
  return {indexEntries,row,updateIndex,openIndex,open,typeText,reset(){category='all';visibility='public';},title(){return category==='all'?'型・構造体一覧':categories.get(category)+'の型';},route(hash){
    if(hash==='types'){openIndex('all',false);return true;}
    if(hash.startsWith('type-')&&byName.has(hash.slice(5))){open(hash.slice(5),null,false);return true;}
    if(byMember.has(hash)){const m=byMember.get(hash);open(m.type.name,hash,false);return true;}
    return false;
  },typeButton(name){return byName.has(name)?`<button class="related-link" data-type="${esc(name)}">${esc(name)} の型・メンバー →</button>`:'';}};
}};
