// 学ぶ入口、使い分け、用語、全体検索を共通データから作る。
window.IMGUI_DOCS_LEARNING={create(context){
  'use strict';
  const {data,guides,api,types,flags,searchEngine,esc,prose,openGuide,openGroup,openFlags,openLearning}=context;
  const $=selector=>document.querySelector(selector);
  const guideMap=new Map(guides.map(g=>[g.id,g]));
  const hub=$('#learning-hub'),searchDialog=$('#global-search-dialog'),termDialog=$('#term-dialog');
  const panels=[['tasks','作りたいもの'],['choices','使い分け'],['trouble','困ったとき'],['terms','用語']];
  let hubPanel='tasks',category='ui',hubQuery='',searchKind='all',selected=0,results=[],returnFocus=null,termFocus=null;
  const categories=new Map(data.groups.map(g=>[g.id,g.title]));
  const match=(items,query,indexFor)=>searchEngine.rank(items,indexFor,query).map(m=>m.item);
  const taskIndexes=new Map(data.tasks.map(t=>[t.title,searchEngine.index(t.title,[t.answer,categories.get(t.category)],t.api)]));
  const choiceIndexes=new Map(data.choices.map(c=>[c.id,searchEngine.index(c.title,c.options.map(o=>[o.api,o.when]),c.caution)]));
  const termIndexes=new Map(data.terms.map(t=>[t.id,searchEngine.index(t.names,t.meaning,[])]));
  const symptomIndexes=new Map(data.symptoms.map(s=>[s.title,searchEngine.index(s.title,s.check,[])]));
  const apiButtons=names=>names.map(name=>`<button class="learning-api" data-open="${esc(name)}">${esc(name)}</button>`).join('');
  const guideButton=(id,label='使い方を読む')=>`<button class="related-link" data-guide="${esc(id)}">${esc(label)} →</button>`;
  hub.innerHTML=`<div class="learning-heading"><p class="eyebrow">FIND YOUR NEXT STEP</p><h1>作りたいものから、見つけよう。</h1><p>関数名が分からなくても大丈夫。目的や困っていることから、使う部品と動く例へ進めます。</p></div><nav class="learning-tabs" aria-label="探し方">${panels.map(([id,label])=>`<button data-learning-panel="${id}" aria-pressed="${id===hubPanel}">${label}</button>`).join('')}</nav><div class="learning-search-row"><label class="searchbox"><span aria-hidden="true">⌕</span><input id="learning-query" type="search" aria-label="目的・使い分け・用語を絞り込む" placeholder="やりたいこと・症状・用語で絞り込み…"></label><button class="reset" id="learning-reset">クリア</button></div><div class="learning-groups" role="group" aria-label="作るものの分野"><button data-learning-category="all">すべて</button>${data.groups.map(g=>`<button data-learning-category="${g.id}">${g.title}</button>`).join('')}</div><p class="learning-count" aria-live="polite"></p><div id="learning-results"></div><div class="learning-bottom">${guideButton('start-here','初めてなら、入門8章から')}<button class="related-link" data-guide-category="all">ガイドを一覧で見る →</button><button class="related-link" data-global-open>関数・型・フラグもまとめて検索 →</button></div>`;
  function renderHub(){
    const query=hubQuery.trim(),container=$('#learning-results');
    hub.querySelectorAll('[data-learning-panel]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.learningPanel===hubPanel)));
    hub.querySelector('.learning-groups').hidden=hubPanel!=='tasks';
    hub.querySelectorAll('[data-learning-category]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.learningCategory===category)));
    let items=[];
    if(hubPanel==='tasks'){
      items=match(data.tasks.filter(t=>category==='all'||t.category===category),query,t=>taskIndexes.get(t.title));
      container.className='learning-task-grid';
      container.innerHTML=items.map(t=>`<article class="learning-task" data-topic="${esc(t.category)}"><p class="eyebrow">${esc(categories.get(t.category))}</p><h2><button data-guide="${esc(t.guide)}">${esc(t.title)} <span aria-hidden="true">↗</span></button></h2><p>${prose(t.answer)}</p><div class="learning-api-links">${apiButtons(t.api)}</div><p class="learning-task-guide">読む記事：${esc(guideMap.get(t.guide).title)}</p></article>`).join('');
    }else if(hubPanel==='choices'){
      items=match(data.choices,query,c=>choiceIndexes.get(c.id));container.className='learning-choice-grid';
      container.innerHTML=items.map(c=>`<article class="learning-choice" id="choice-${c.id}"><h2>${esc(c.title)}</h2><dl>${c.options.map(o=>`<div><dt><button data-open="${esc(o.api)}">${esc(o.api)}</button></dt><dd>${prose(o.when)}</dd></div>`).join('')}</dl><p class="learning-caution"><strong>使うときは</strong> ${prose(c.caution)}</p>${guideButton(c.guide)}</article>`).join('');
    }else if(hubPanel==='trouble'){
      items=match(data.symptoms,query,s=>symptomIndexes.get(s.title));container.className='learning-trouble-list';
      container.innerHTML=items.map(s=>`<article><h2>${esc(s.title)}</h2><p><strong>まず確認：</strong>${prose(s.check)}</p>${guideButton(s.guide,'原因と対処を見る')}</article>`).join('');
    }else{
      items=match(data.terms,query,t=>termIndexes.get(t.id));container.className='learning-term-grid';
      container.innerHTML=items.map(t=>`<article><h2>${esc(t.names[0])}</h2>${t.names.length>1?`<p class="learning-alias">${esc(t.names.slice(1).join(' / '))}</p>`:''}<p>${prose(t.meaning)}</p>${guideButton(t.guide,'使う場面を読む')}</article>`).join('');
    }
    hub.querySelector('.learning-count').textContent=items.length+'件';
    if(!items.length)container.innerHTML='<div class="learning-no-results"><h2>一致する項目がありません</h2><p>別の言葉に変えるか、絞り込みをクリアしてみてください。</p></div>';
  }
  $('#learning-query').addEventListener('input',event=>{if(!event.isComposing){hubQuery=event.target.value;renderHub();}});
  $('#learning-query').addEventListener('compositionend',event=>{hubQuery=event.target.value;renderHub();});
  $('#learning-reset').addEventListener('click',()=>{hubQuery='';$('#learning-query').value='';renderHub();});
  hub.addEventListener('click',event=>{
    const panel=event.target.closest('[data-learning-panel]');
    if(panel){openLearning(panel.dataset.learningPanel);return;}
    const group=event.target.closest('[data-learning-category]');
    if(group){category=group.dataset.learningCategory;renderHub();}
  });
  function show(panel='tasks'){
    const next=panels.some(([id])=>id===panel)?panel:'tasks';
    if(hubPanel!==next){hubQuery='';$('#learning-query').value='';}
    hub.hidden=false;hubPanel=next;renderHub();
  }

  // すべての入口を横断する。元の一覧の検索条件は書き換えない。
  const labels={guides:'ガイド',api:'関数',types:'型',flags:'フラグ'},entries=[];
  for(const g of guides)entries.push({kind:'guides',id:g.id,title:g.title,summary:g.summary,index:searchEngine.index(g.title,[g.summary,...(g.tags||[])],g.sections.flatMap(s=>[s.title,...(s.paragraphs||[]),...(s.bullets||[])]))});
  const seen=new Set();
  for(const e of api){
    if(seen.has(e.qualified)||e.internal||e.obsolete)continue;
    seen.add(e.qualified);entries.push({kind:'api',id:e.qualified,title:e.qualified,summary:e.title,index:searchEngine.index(e.qualified,[e.title,e.description],e.signature)});
  }
  for(const t of types)if(!t.internal)entries.push({kind:'types',id:t.name,title:t.name,summary:t.title,index:searchEngine.index([t.name,...t.members.map(m=>m.name)],[t.title,t.description],t.members.map(m=>m.description))});
  for(const f of flags){
    entries.push({kind:'flags',id:f.type,title:f.type,summary:f.title,index:searchEngine.index(f.type,[f.title,f.description],[])});
    for(const v of f.values)if(!v.internal&&!v.obsolete)entries.push({kind:'flags',id:f.type,value:v.name,title:v.name,summary:v.description,index:searchEngine.index(v.name,[f.type,f.title,v.description],[])});
  }
  searchDialog.innerHTML=`<div class="global-search-heading"><h2 id="global-search-title">図鑑全体から探す</h2><button class="close" data-global-close aria-label="全体検索を閉じる">×</button></div><label class="global-search-input"><span aria-hidden="true">⌕</span><input id="global-query" type="search" placeholder="関数名・やりたいこと・日本語で検索…" autocomplete="off" aria-label="図鑑全体を検索" role="combobox" aria-expanded="true" aria-controls="global-results" aria-autocomplete="list"></label><div class="global-search-kinds" role="group" aria-label="検索する資料"><button data-global-kind="all" aria-pressed="true">すべて</button>${Object.entries(labels).map(([id,label])=>`<button data-global-kind="${id}">${label}</button>`).join('')}</div><p id="global-status" role="status"></p><div id="global-results" role="listbox" aria-label="検索結果"></div><p class="global-search-keys"><kbd>↑</kbd><kbd>↓</kbd> 選ぶ <kbd>Enter</kbd> 開く <kbd>Esc</kbd> 閉じる</p>`;
  const globalQuery=$('#global-query');
  function setSelected(index){
    selected=Math.max(0,Math.min(results.length-1,index));
    searchDialog.querySelectorAll('[data-global-result]').forEach((el,i)=>el.setAttribute('aria-selected',String(i===selected)));
    const option=$('#global-result-'+selected);
    if(option){globalQuery.setAttribute('aria-activedescendant',option.id);option.scrollIntoView({block:'nearest'});}
    else globalQuery.removeAttribute('aria-activedescendant');
  }
  function search(){
    const query=globalQuery.value.trim();
    const candidates=entries.filter(e=>searchKind==='all'||e.kind===searchKind);
    const matches=searchEngine.rank(candidates,e=>e.index,query);
    results=query?matches.slice(0,18).map(m=>m.item):searchKind==='all'||searchKind==='guides'?candidates.filter(e=>e.kind==='guides'&&['start-here','frame-state','begin-end','image-texture','extensions-overview'].includes(e.id)).slice(0,5):candidates.slice(0,8);
    $('#global-results').innerHTML=results.map((e,i)=>`<button id="global-result-${i}" role="option" aria-selected="${i===0}" data-global-result="${i}"><span class="global-result-kind">${labels[e.kind]}</span><span><strong>${esc(e.title)}</strong><small>${esc(e.summary)}</small></span><span aria-hidden="true">↗</span></button>`).join('')||'<p class="global-empty">一致する資料がありません。別の言葉でも探せます。</p>';
    $('#global-status').textContent=query?matches.length+'件'+(matches.length>18?' · 上位18件を表示':''):'よく使う入口';
    setSelected(0);
  }
  function closeSearch(focus=true){searchDialog.close();if(focus&&returnFocus?.isConnected)returnFocus.focus({preventScroll:true});}
  function openSearch(){
    if(termDialog.open)termDialog.close();
    if(searchDialog.open){closeSearch();return;}
    returnFocus=document.activeElement;searchKind='all';globalQuery.value='';
    searchDialog.querySelectorAll('[data-global-kind]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.globalKind==='all')));
    searchDialog.showModal();search();globalQuery.focus();
  }
  function navigate(entry){
    if(!entry)return;
    closeSearch(false);
    if(entry.kind==='guides')openGuide(entry.id);
    else if(entry.kind==='api')openGroup(entry.id);
    else if(entry.kind==='flags')openFlags(entry.id,entry.value||null);
    else location.hash='type-'+entry.id;
  }
  globalQuery.addEventListener('input',event=>{if(!event.isComposing)search();});
  globalQuery.addEventListener('compositionend',search);
  globalQuery.addEventListener('keydown',event=>{
    if(event.isComposing)return;
    if(['ArrowDown','ArrowUp','Enter'].includes(event.key))event.preventDefault();
    if(event.key==='ArrowDown')setSelected((selected+1)%Math.max(results.length,1));
    if(event.key==='ArrowUp')setSelected((selected-1+results.length)%Math.max(results.length,1));
    if(event.key==='Enter')navigate(results[selected]);
  });
  searchDialog.addEventListener('click',event=>{
    const kind=event.target.closest('[data-global-kind]');
    if(kind){searchKind=kind.dataset.globalKind;searchDialog.querySelectorAll('[data-global-kind]').forEach(b=>b.setAttribute('aria-pressed',String(b===kind)));search();globalQuery.focus();return;}
    const result=event.target.closest('[data-global-result]');
    if(result)navigate(results[Number(result.dataset.globalResult)]);
  });

  function openTerm(id,button){
    const term=data.terms.find(t=>t.id===id);if(!term)return;
    termFocus=button;
    termDialog.innerHTML=`<div class="global-search-heading"><p class="eyebrow">ことばの意味</p><button class="close" data-term-close aria-label="用語の説明を閉じる">×</button></div><h2 id="term-title">${esc(term.names[0])}</h2>${term.names.length>1?`<p class="learning-alias">${esc(term.names.slice(1).join(' / '))}</p>`:''}<p>${prose(term.meaning)}</p>${guideButton(term.guide,'使う場面を読む')}`;
    termDialog.showModal();termDialog.querySelector('[data-term-close]').focus();
  }
  function closeTerm(){termDialog.close();if(termFocus?.isConnected)termFocus.focus({preventScroll:true});}
  searchDialog.addEventListener('cancel',event=>{event.preventDefault();closeSearch();});
  termDialog.addEventListener('cancel',event=>{event.preventDefault();closeTerm();});
  termDialog.addEventListener('click',event=>{if(event.target.closest('[data-guide]'))termDialog.close();});
  document.addEventListener('click',event=>{
    if(event.target.closest('[data-global-open]')){openSearch();return;}
    if(event.target.closest('[data-global-close]')){closeSearch();return;}
    if(event.target.closest('[data-term-close]')){closeTerm();return;}
    const term=event.target.closest('[data-term]');if(term)openTerm(term.dataset.term,term);
  });
  document.addEventListener('keydown',event=>{
    if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='k'){event.preventDefault();event.stopImmediatePropagation();openSearch();return;}
    if(event.key==='Escape'&&(searchDialog.open||termDialog.open)){
      event.preventDefault();event.stopImmediatePropagation();if(searchDialog.open)closeSearch();else closeTerm();
    }
  },true);

  function annotate(container){
    const definitions=new Map(data.terms.flatMap(t=>t.names.map(name=>[name,t])));
    const escapeRegExp=text=>text.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
    const pattern=new RegExp('(?<![A-Za-z_])('+[...definitions.keys()].sort((a,b)=>b.length-a.length).map(escapeRegExp).join('|')+')(?![A-Za-z_])','gu');
    const walker=document.createTreeWalker(container,NodeFilter.SHOW_TEXT),nodes=[],seenTerms=new Set();
    while(walker.nextNode()){
      const node=walker.currentNode;
      if(node.parentElement.closest('p,li')&&!node.parentElement.closest('button,a,code,pre,nav,.course-navigation,.guide-recap'))nodes.push(node);
    }
    for(const node of nodes){
      const text=node.textContent,fragment=document.createDocumentFragment();let cursor=0,changed=false;
      for(const match of text.matchAll(pattern)){
        const term=definitions.get(match[0]);if(seenTerms.has(term.id)||seenTerms.size>=10)continue;
        fragment.append(text.slice(cursor,match.index));
        const button=document.createElement('button');button.className='term-link';button.dataset.term=term.id;
        button.textContent=match[0];button.title=term.meaning;button.setAttribute('aria-label','用語：'+match[0]);fragment.append(button);
        seenTerms.add(term.id);cursor=match.index+match[0].length;changed=true;
      }
      if(changed){fragment.append(text.slice(cursor));node.replaceWith(fragment);}
    }
  }
  function frameDiagram(){
    return `<div class="frame-explainer" role="group" aria-label="フレームをまたぐ値の仕組み"><p class="eyebrow">操作して分かる · 仕組みの図</p><h4>変数の値は、次のフレームへどう残る？</h4><label><input type="checkbox" data-frame-reset> 毎フレーム、変数を初期値へ戻す</label><div class="frame-stages"><div><span>① アプリの変数</span><strong data-frame-before>2</strong></div><span aria-hidden="true">→</span><div><span>② UIの操作</span><strong data-frame-action>まだ操作なし</strong></div><span aria-hidden="true">→</span><div><span>③ 次のフレームへ</span><strong data-frame-after>2</strong></div></div><p class="frame-message" role="status">「UIで5に変更」を押すと、入力によって変数を書き換えます。</p><div class="frame-actions"><button class="related-link" data-frame-edit>UIで5に変更</button><button class="related-link" data-frame-next>次のフレームへ</button><button class="reset" data-frame-start>最初から</button></div></div>`;
  }
  document.addEventListener('click',event=>{
    const diagram=event.target.closest('.frame-explainer');if(!diagram)return;
    const reset=diagram.querySelector('[data-frame-reset]').checked;
    if(event.target.closest('[data-frame-edit]')){
      diagram.querySelector('[data-frame-action]').textContent='5に変更';diagram.querySelector('[data-frame-after]').textContent='5';
      diagram.querySelector('.frame-message').textContent='UIに渡した変数が5になりました。次のフレームへ進めてみましょう。';
    }else if(event.target.closest('[data-frame-next]')){
      const value=reset?'2':diagram.querySelector('[data-frame-after]').textContent;
      diagram.querySelector('[data-frame-before]').textContent=value;diagram.querySelector('[data-frame-action]').textContent='操作なし';diagram.querySelector('[data-frame-after]').textContent=value;
      diagram.querySelector('.frame-message').textContent=reset?'初期化で2に戻りました。編集する値をフレームの外で保持すると、操作の結果を残せます。':'値は'+value+'のままです。部品を毎回描いても、変数を初期化しなければ編集結果は残ります。';
    }else if(event.target.closest('[data-frame-start]')){
      diagram.querySelector('[data-frame-before]').textContent='2';diagram.querySelector('[data-frame-after]').textContent='2';diagram.querySelector('[data-frame-action]').textContent='まだ操作なし';
      diagram.querySelector('.frame-message').textContent='「UIで5に変更」を押すと、入力によって変数を書き換えます。';
    }
  });
  function decorateGuide(guide,container){
    const brief=data.briefs[guide.id],before=data.prerequisites[guide.id]||[];
    const summary=container.querySelector('.guide-summary');
    if(brief&&!guide.reading)summary.insertAdjacentHTML('afterend',`<div class="guide-brief"><p class="learning-label">先に押さえるポイント</p><ul>${brief.map(p=>`<li>${prose(p)}</li>`).join('')}</ul></div>`);
    if(before.length&&guide.id!=='imguizmo-reverse-z'){
      const target=container.querySelector('.guide-brief')||summary;
      target.insertAdjacentHTML('afterend',`<details class="guide-before"><summary>読む前に確認しておくこと <span>${before.length}記事</span></summary><p>すでに分かる内容なら、そのまま読み進めて大丈夫です。</p><div class="related-links">${before.map(id=>guideButton(id,guideMap.get(id).title)).join('')}</div></details>`);
    }
    if(brief&&!guide.reading){
      const last=container.querySelector('#'+guide.sections.at(-1).id);
      last?.insertAdjacentHTML('afterend',`<details class="guide-recap"><summary>要点を振り返る</summary><ul>${brief.map(p=>`<li>${prose(p)}</li>`).join('')}</ul></details>`);
    }
    if(['frame-state','starter-window','starter-values'].includes(guide.id))container.querySelector('#'+guide.sections[1].id)?.insertAdjacentHTML('beforeend',frameDiagram());
    annotate(container.querySelector('.guide-body'));
  }
  function decorateApi(entry,container){
    const choice=data.choices.find(c=>c.options.some(o=>o.api===entry.qualified));
    if(!choice)return;
    const option=choice.options.find(o=>o.api===entry.qualified);
    container.querySelector('.detail-header').insertAdjacentHTML('afterend',`<details class="api-choice"><summary>似た関数との使い分け</summary><p>${prose(option.when)}</p><div class="learning-api-links">${apiButtons(choice.options.filter(o=>o!==option).map(o=>o.api))}${guideButton(choice.guide,'使い分けを読む')}</div></details>`);
  }
  return {show,hide(){hub.hidden=true;},decorateGuide,decorateApi,openSearch};
}};
