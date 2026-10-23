// 読む目的と到達点を示し、長い記事でも必要な節へ進めるようにする。
window.IMGUI_READER=(()=>{
  'use strict';
  const detail=document.querySelector('#detail-dialog');
  let focused=false;
  try{focused=localStorage.getItem('imgui-docs-reading-focus')==='true';}catch{}
  document.body.dataset.readingFocus=String(focused);
  function toggleFocus(){
    focused=!focused;document.body.dataset.readingFocus=String(focused);
    try{localStorage.setItem('imgui-docs-reading-focus',String(focused));}catch{}
    const button=detail.querySelector('[data-reader-focus]');
    if(button){button.setAttribute('aria-pressed',String(focused));button.textContent=focused?'通常の表示へ':'集中して読む';}
    window.IMGUI_DOCS_UI.refresh();
  }
  function decorate(guide,container,{esc,prose,points=[]}){
    const reading=guide.reading,body=container.querySelector('.guide-body'),header=container.querySelector('.detail-header');
    container.querySelector('.documentation-layout').classList.add('reader-document');
    header.insertAdjacentHTML('beforeend',`<div class="reader-toolbar"><button type="button" data-reader-focus aria-pressed="${focused}">${focused?'通常の表示へ':'集中して読む'}</button><a href="#reader-help" data-reader-help>この資料の読み方</a></div>`);
    if(reading){
      header.querySelector('.guide-meta-line').insertAdjacentHTML('afterend',`<p class="reader-when">${esc(reading.when)}</p>`);
      body.querySelector('.guide-summary').insertAdjacentHTML('afterend',`<aside class="reader-goal" aria-label="この記事でできるようになること"><p class="reader-label">この記事でできるようになること</p><p class="reader-goal-text">${prose(reading.goal)}</p>${points.length?`<ul>${points.map(p=>`<li>${prose(p)}</li>`).join('')}</ul>`:''}</aside>`);
      const last=document.getElementById(guide.sections.at(-1).id);
      last.insertAdjacentHTML('afterend',`<section class="reader-check" id="reader-check"><h3>確かめてみよう</h3><p>${prose(reading.question)}</p><details><summary>答えと理由を読む</summary><p>${prose(reading.answer)}</p></details></section>`);
      for(const outline of container.querySelectorAll('.doc-outline,.mobile-doc-outline')){
        const button=document.createElement('button');button.dataset.docAnchor='reader-check';button.textContent='確かめてみよう';
        const before=outline.querySelector('[data-doc-anchor="guide-next"],[data-doc-anchor="course-next"],[data-doc-anchor="guide-related"],[data-doc-anchor="guide-sources"]');
        outline.insertBefore(button,before);
      }
    }
    // 小さい画面でも、記事の題名と読む目的を確認してから目次を開ける位置に置く。
    const mobile=container.querySelector('.mobile-doc-outline');
    const entry=body.querySelector('.guide-before,.reader-goal,.guide-brief')||body.querySelector('.guide-summary');
    entry.insertAdjacentElement('afterend',mobile);
    for(const section of guide.sections){
      const heading=document.getElementById(section.id)?.querySelector('h3');
      if(!heading)continue;
      const link=document.createElement('a');link.className='reader-permalink';
      link.href='#guide-'+guide.id+'@'+section.id;link.textContent='#';
      link.setAttribute('aria-label',section.title+'へのリンク');heading.append(link);
    }
    const outline=container.querySelector('.doc-outline>p');
    outline.insertAdjacentHTML('afterend','<p class="reader-position" aria-label="現在の節"></p><progress class="reader-progress" max="100" value="0" aria-label="記事のスクロール位置"></progress>');
    if(!document.querySelector('#reader-help'))createHelp();
  }
  function createHelp(){
    const help=document.createElement('dialog');help.id='reader-help';help.setAttribute('aria-labelledby','reader-help-title');
    help.innerHTML=`<div class="dialog-bar"><strong id="reader-help-title">この資料の読み方</strong><button class="close" data-reader-help-close aria-label="読み方案内を閉じる">×</button></div><div class="reader-help-body"><p>関数名が分かるときは一覧から。作りたいものや困った症状から調べるときは「目的から探す」を使います。</p><ol><li><strong>最初に用途をつかむ</strong><p>記事の導入と要点を読み、自分の場面に合うか確認します。前提が分かるなら、準備の案内は飛ばして構いません。</p></li><li><strong>例と表示を対にする</strong><p>コードの直下に、そのコードの実行画像があります。長い例は「先に、このコードの表示を見る」から結果を確認できます。</p></li><li><strong>守る条件を確かめる</strong><p>太字は要点、下線は呼び出す順番やデータの寿命、赤系の強調は重要な注意です。色だけでなく、本文の言葉でも説明します。</p></li><li><strong>必要になったら詳しく調べる</strong><p>関連するAPIから、正確な宣言・引数・戻り値へ進めます。記事末尾の問いでは、使い方を説明できるか確かめられます。</p></li></ol><div class="reader-help-note"><strong>版と使用頻度について</strong><p>この図鑑はv1.93.0を基準にします。Dockingと外部拡張はラベルで区別します。使用頻度は一般的なUI制作での目安で、実測の利用率や速度の評価ではありません。</p></div><p class="reader-help-shortcuts">Ctrl+K：全体検索 ／ /：一覧を検索 ／ Esc：表示中の案内を閉じる</p></div>`;
    document.body.append(help);
    help.addEventListener('click',event=>{if(event.target.closest('[data-reader-help-close]'))help.close();});
    help.addEventListener('cancel',event=>{event.stopPropagation();});
    help.addEventListener('keydown',event=>{if(event.key==='Escape')event.stopPropagation();});
  }
  document.addEventListener('click',event=>{
    if(event.target.closest('[data-reader-focus]'))toggleFocus();
    if(event.target.closest('[data-reader-help]')){event.preventDefault();document.querySelector('#reader-help').showModal();}
  });
  return {decorate};
})();
