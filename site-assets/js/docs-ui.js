// ナビゲーションと目次の現在地をそろえ、長い文書から上部へ戻れるようにする。
window.IMGUI_DOCS_UI=(()=>{
  'use strict';
  const $=selector=>document.querySelector(selector);
  const detail=$('#detail-dialog'),topButton=$('#page-top');
  let targets=[],scheduled=false;
  function updatePosition(){
    scheduled=false;
    const scroller=detail.open?detail:document.scrollingElement;
    topButton.hidden=scroller.scrollTop<450;
    if(!detail.open||!targets.length)return;
    const boundary=detail.getBoundingClientRect().top+82;
    let current=targets[0];
    for(const item of targets)if(item.element.getBoundingClientRect().top<=boundary)current=item;
    if(detail.scrollHeight-detail.scrollTop-detail.clientHeight<8)current=targets.at(-1);
    const progress=detail.querySelector('.reader-progress'),position=detail.querySelector('.reader-position');
    if(progress)progress.value=Math.round(detail.scrollTop/Math.max(1,detail.scrollHeight-detail.clientHeight)*100);
    if(position)position.textContent=(targets.indexOf(current)+1)+' / '+targets.length+' 節';
    for(const button of detail.querySelectorAll('.doc-outline [data-doc-anchor],.mobile-doc-outline [data-doc-anchor]')){
      const active=button.dataset.docAnchor===current.id;
      button.classList.toggle('is-current',active);
      if(active)button.setAttribute('aria-current','location');else button.removeAttribute('aria-current');
    }
  }
  function schedule(){if(!scheduled){scheduled=true;requestAnimationFrame(updatePosition);}}
  function refresh(){
    const view=document.body.dataset.docsView,category=document.body.dataset.docsGuideCategory,compact=matchMedia('(max-width:1000px)').matches;
    for(const link of document.querySelectorAll('.site-nav .nav-link')){
      const active=link.dataset.learningOpen?view==='learning':link.dataset.guideCategory?
        view==='guides'&&(link.dataset.guideCategory===category||link.dataset.guideCategory==='all'&&(compact||!['docking','extensions'].includes(category)))||compact&&view==='learning'&&link.dataset.guideCategory==='all':
        !!link.dataset.view&&link.dataset.view===view;
      link.classList.toggle('active',active);
      if(active)link.setAttribute('aria-current','page');else link.removeAttribute('aria-current');
    }
    const course=$('.course-sidebar-link');
    course.classList.toggle('active',detail.open&&!!detail.querySelector('.course-location,.course-roadmap'));
    for(const active of document.querySelectorAll('.sidebar .active')){
      const group=active.closest('details.nav-section');if(group)group.open=true;
    }
    targets=[...detail.querySelectorAll('.doc-outline [data-doc-anchor]')].map(button=>({id:button.dataset.docAnchor,element:document.getElementById(button.dataset.docAnchor)})).filter(item=>item.element);
    schedule();
  }
  topButton.addEventListener('click',()=>{
    const scroller=detail.open?detail:window;
    scroller.scrollTo({top:0,behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'instant':'smooth'});
  });
  detail.addEventListener('scroll',schedule,{passive:true});
  detail.addEventListener('close',refresh);
  window.addEventListener('scroll',schedule,{passive:true});
  window.addEventListener('resize',refresh,{passive:true});
  return {refresh};
})();
