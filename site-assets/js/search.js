// 読み方・表記ゆれ・小さな誤入力を、通信せずに検索へ反映する。
globalThis.IMGUI_DOCS_SEARCH = (() => {
  'use strict';
  const normalize = value => String(value ?? '').normalize('NFKC').toLowerCase()
    .replace(/[ァ-ヶ]/g, c => String.fromCharCode(c.charCodeAt(0)-0x60))
    .replace(/[‐‑‒–—−]/g,'-').replace(/\s+/g,' ').trim();
  // 同じ用途の呼び名をまとめる。漢字全般の自動読み取りは行わない。
  const terms = [
    ['ボタン','ぼたん','button'], ['チェックボックス','ちぇっくぼっくす','チェック','checkbox'],
    ['ウィンドウ','ウインドウ','うぃんどう','ういんどう','まど','window'],
    ['子ウィンドウ','こうぃんどう','こういんどう','child'], ['パネル','ぱねる','panel'],
    ['文字','もじ','テキスト','てきすと','text'], ['文字列','もじれつ','string'],
    ['文字入力','もじにゅうりょく','テキスト入力','てきすとにゅうりょく','inputtext'],
    ['入力','にゅうりょく','input'], ['数値','すうち','numeric','number'],
    ['整数','せいすう','integer','int'], ['小数','しょうすう','浮動小数','ふどうしょうすう','float'],
    ['スライダー','すらいだー','すらいだ','slider'], ['ドラッグ','どらっぐ','drag'],
    ['色','いろ','カラー','からー','color','colour'], ['色選択','いろせんたく','カラーピッカー','colorpicker'],
    ['画像','がぞう','イメージ','いめーじ','写真','しゃしん','image'],
    ['テクスチャ','てくすちゃ','texture'], ['フォント','ふぉんと','書体','しょたい','font'],
    ['構造体','こうぞうたい','struct'], ['メンバー','めんばー','member'],
    ['文字送り幅','文字送り','もじおくり','advancex'], ['所有権','しょゆうけん','ownership'],
    ['アトラス','あとらす','atlas'], ['字形','じけい','glyph'],
    ['サイズ','さいず','大きさ','おおきさ','size'], ['幅','はば','width'], ['高さ','たかさ','height'],
    ['位置','いち','position'], ['座標','ざひょう','coordinate'], ['余白','よはく','padding','spacing'],
    ['配置','はいち','レイアウト','れいあうと','layout'], ['横並び','よこならび','sameline'],
    ['改行','かいぎょう','newline'], ['区切り','くぎり','セパレーター','separator'],
    ['表','ひょう','テーブル','てーぶる','table'], ['列','れつ','column'], ['行','ぎょう','row'],
    ['並べ替え','ならべかえ','ソート','そーと','sort'], ['選択','せんたく','select','selection','selectable'],
    ['ツリー','つりー','階層','かいそう','tree','hierarchy'], ['タブ','たぶ','tab'],
    ['コンボ','こんぼ','ドロップダウン','どろっぷだうん','combo'], ['リスト','りすと','一覧','いちらん','list'],
    ['メニュー','めにゅー','menu'], ['ポップアップ','ぽっぷあっぷ','popup'],
    ['ツールチップ','つーるちっぷ','tooltip'], ['ヘルプ','へるぷ','help'],
    ['スクロール','すくろーる','scroll'], ['折りたたみ','おりたたみ','collapse','collapsing'],
    ['フラグ','ふらぐ','flags'], ['設定','せってい','config','settings'],
    ['識別子','しきべつし','id'], ['ラベル','らべる','label'], ['名前','なまえ','name'],
    ['表示','ひょうじ','描画','びょうが','draw','render','display'], ['非表示','ひひょうじ','hidden'],
    ['無効','むこう','disabled'], ['有効','ゆうこう','enabled'], ['透明','とうめい','alpha'],
    ['枠線','わくせん','ボーダー','border'], ['角丸','かどまる','rounding'],
    ['マウス','まうす','mouse'], ['クリック','くりっく','click'], ['ホバー','ほばー','hover','hovered'],
    ['キーボード','きーぼーど','keyboard'], ['ショートカット','しょーとかっと','shortcut'],
    ['フォーカス','ふぉーかす','focus','focused'], ['入力経路','にゅうりょくけいろ','routing'],
    ['初期化','しょきか','initialize','initialization'], ['フレーム','ふれーむ','frame'],
    ['編集','へんしゅう','変更','へんこう','edit','change'], ['生成','せいせい','create'],
    ['破棄','はき','destroy'], ['コンテキスト','こんてきすと','context'],
    ['ウィジェット','うぃじぇっと','ウィジット','widget'],
    ['テーマ','てーま','スタイル','すたいる','theme','style'], ['ダーク','だーく','dark'], ['ライト','らいと','light'],
    ['状態','じょうたい','state'], ['保存','ほぞん','save'], ['保持','ほじ','persist'],
    ['戻り値','もどりち','return'], ['引数','ひきすう','parameter','argument'],
    ['ドッキング','どっきんぐ','docking','dockspace'], ['ビューポート','びゅーぽーと','viewport'],
    ['ギズモ','ぎずも','gizmo','imguizmo'], ['ノード','のーど','node'], ['ピン','ぴん','pin'],
    ['接続','せつぞく','リンク','りんく','link'], ['タイムライン','たいむらいん','timeline','sequencer','imsequencer'],
    ['回転','かいてん','rotation','rotate'], ['移動','いどう','translate','translation'],
    ['拡縮','かくしゅく','スケール','すけーる','scale'], ['行列','ぎょうれつ','matrix'],
    ['カメラ','かめら','camera'], ['射影','しゃえい','projection'], ['深度','しんど','depth'],
    ['逆深度','ぎゃくしんど','reversez','reverse-z','reverse z'],
    ['デバッグ','でばっぐ','debug'], ['ログ','ろぐ','log','console'],
    ['時間計測','じかんけいそく','プロファイラー','profiler','timing'],
    ['グラフ','ぐらふ','plot','graph'], ['進捗','しんちょく','プログレスバー','progressbar'],
    ['ゲームエンジン','げーむえんじん','engine'], ['エディター','えでぃたー','エディタ','えでぃた','editor'],
    ['インスペクター','いんすぺくたー','inspector'], ['取り消し','とりけし','元に戻す','undo'],
    ['日本語','にほんご','japanese'], ['使い方','つかいかた','usage'], ['入門','にゅうもん','基礎','きそ','basics'],
    ['エラー','えらー','error'], ['衝突','しょうとつ','collision'], ['失敗','しっぱい','failure'],
    ['サイズ変更禁止','さいずへんこうきんし','リサイズ禁止','noresize'],
    ['背景なし','はいけいなし','背景を消す','nobackground'], ['タイトルバーなし','たいとるばーなし','notitlebar'],
    ['読み取り専用','よみとりせんよう','readonly'], ['枠','わく','border'],
  ].map(group=>[...new Set(group.map(normalize))]);
  const japaneseTerms = [...new Set(terms.flat().filter(t=>/^[ぁ-ゖー一-龯々]+$/.test(t)))].sort((a,b)=>b.length-a.length);
  const latinWords = text => String(text).normalize('NFKC')
    .replace(/([A-Z]+)([A-Z][a-z])/g,'$1 $2').replace(/([a-z0-9])([A-Z])/g,'$1 $2')
    .toLowerCase().match(/[a-z][a-z0-9]*/g)||[];
  const eligible = word => word.length<=40&&(/^[a-z][a-z0-9]{3,}$/.test(word)||/^[ぁ-ゖー]{3,}$/.test(word));
  function phraseWords(word) {
    if(!/[ぁ-ゖ一-龯]/.test(word))return [word];
    const result=[];
    let rest=word.replace(/(?:について|するには|したい|する方法|のやり方)$/,'');
    while(rest){
      const term=japaneseTerms.find(t=>rest.startsWith(t));
      if(term){result.push(term);rest=rest.slice(term.length);continue;}
      if(result.length&&/^[のをがでとへに]/.test(rest)){rest=rest.slice(1);continue;}
      return [word];
    }
    return result.length?result:[word];
  }
  function distance(a,b,limit) {
    if(Math.abs(a.length-b.length)>limit)return limit+1;
    let previous=Array.from({length:b.length+1},(_,i)=>i),older=null;
    for(let i=1;i<=a.length;i++){
      const current=[i];let minimum=i;
      for(let j=1;j<=b.length;j++){
        current[j]=Math.min(current[j-1]+1,previous[j]+1,previous[j-1]+(a[i-1]===b[j-1]?0:1));
        if(older&&i>1&&j>1&&a[i-1]===b[j-2]&&a[i-2]===b[j-1])current[j]=Math.min(current[j],older[j-2]+1);
        minimum=Math.min(minimum,current[j]);
      }
      if(minimum>limit)return limit+1;
      older=previous;previous=current;
    }
    return previous[b.length];
  }
  function create() {
    const vocabulary=new Map(),queries=new Map();
    function field(value) {
      const parts=(Array.isArray(value)?value.flat(Infinity):[value]).filter(v=>v!=null).map(String);
      const raw=parts.join(' '),text=normalize(raw),words=new Set(latinWords(raw));
      for(const word of text.match(/[a-z][a-z0-9]*/g)||[])words.add(word);
      for(const word of [...words])if(/\d+$/.test(word))words.add(word.replace(/\d+$/,''));
      const aliases=new Set();
      for(const group of terms){
        if(group.some(t=>/^[a-z0-9]+$/.test(t)?words.has(t):text.includes(t))){
          group.forEach(t=>aliases.add(t));
        }
      }
      const tokens=new Set([...words,...aliases].filter(eligible));
      for(const token of tokens){if(!vocabulary.has(token.length))vocabulary.set(token.length,new Set());vocabulary.get(token.length).add(token);}
      return {text,aliases,tokens,exact:new Set(parts.map(normalize))};
    }
    function index(primary,secondary='',body='') {
      queries.clear();
      return {fields:[field(primary),field(secondary),field(body)]};
    }
    function compile(query) {
      const key=normalize(query);
      if(queries.has(key))return queries.get(key);
      const parsed=key.split(/\s+|::|_/).filter(Boolean).flatMap(phraseWords);
      const words=parsed.length?parsed:key?[key]:[];
      const alternatives=words.map(word=>{
        const close=new Set();
        if(eligible(word)){
          const limit=word.length>=9?2:1;
          for(let length=word.length-limit;length<=word.length+limit;length++){
            for(const candidate of vocabulary.get(length)||[]){
              // 数字で区別されるAPI名・フラグ値を、誤入力で相互変換しない。
              if((word.match(/\d+/g)||[]).join(',')!==(candidate.match(/\d+/g)||[]).join(','))continue;
              if(candidate!==word&&distance(word,candidate,limit)<=limit)close.add(candidate);
            }
          }
        }
        return close;
      });
      const compiled={key,words,alternatives};
      if(queries.size>80)queries.clear();
      queries.set(key,compiled);return compiled;
    }
    function score(document,query,fuzzy=false) {
      if(!query.words.length)return 0;
      let total=0;
      for(let i=0;i<query.words.length;i++){
        const word=query.words[i];let best=0;
        document.fields.forEach((f,n)=>{
          const weight=[90,35,10][n];
          if(f.text.includes(word))best=Math.max(best,weight+(f.exact.has(word)?45:0));
          else if([...f.aliases].some(t=>t.includes(word)))best=Math.max(best,weight*.65);
          else if(fuzzy&&[...query.alternatives[i]].some(t=>f.tokens.has(t)))best=Math.max(best,weight*.3);
        });
        if(!best)return null;
        total+=best;
      }
      if(document.fields[0].exact.has(query.key))total+=400;
      return total;
    }
    function rank(items,getIndex,query) {
      const compiled=compile(query);
      function collect(fuzzy){return items.flatMap((item,order)=>{const value=score(getIndex(item),compiled,fuzzy);return value==null?[]:[{item,score:value,fuzzy,order}];});}
      let matches=collect(false);
      // そのままの語や言い換えで見つからないときだけ、打ち間違いの候補を出す。
      if(!matches.length&&compiled.words.length)matches=collect(true);
      return matches.sort((a,b)=>b.score-a.score||a.order-b.order);
    }
    return {index,rank,normalize};
  }
  return {create,normalize};
})();
