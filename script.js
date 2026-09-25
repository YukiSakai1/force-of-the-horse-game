(function () {
  "use strict";

  /* ===================== card data ===================== */
  var TYPE_LABEL = { force: 'フォース', horse: '馬', item: 'アイテム', jockey: '騎手', situation: '状況' };
  var uidCounter = 0;
  function uid() { uidCounter++; return 'c' + uidCounter; }
  function makeCard(type, name, icon, stat, extra) {
    var c = { id: uid(), type: type, name: name, icon: icon, stat: stat };
    if (extra) for (var k in extra) c[k] = extra[k];
    return c;
  }
  var FORCE_IMG = 'images/force-icon.png';
  function forceCard(name) {
    var c = makeCard('force', name || 'フォース', '🏇', '');
    c.img = FORCE_IMG;
    return c;
  }
  // effectType: 'run_bonus' | 'guard_bonus' | 'draw' | 'discard_opponent' など。
  // 新しいアイテムを追加するときは、effectType/effectValue を指定するだけでよい
  // （分岐を増やす必要があるのは新しい effectType を作るときだけ。applyItemEffect を参照）。
  function itemCard(name, effect, code, effectType, effectValue) {
    return makeCard('item', name, '🏏', effect, {
      code: code,
      effectType: effectType,
      effectValue: effectValue
    });
  }
  function jockeyCard(name, effect, code, effectType, effectValue) {
    return makeCard('jockey', name, '🏇', effect, { code: code, effectType: effectType, effectValue: effectValue });
  }
  function horseCard(name, en, run, guard, style, dist, fav, cost, surface) {
    return makeCard('horse', name, '🐎', '', {
      en: en, run: run, guard: guard, style: style, dist: dist, fav: fav, cost: cost || 2,
      surface: surface || ['芝']
    });
  }
  function situationCard(name, stat, img) {
    var c = makeCard('situation', name, '☀️', stat || '全馬 走破+1（仮）');
    if (img) c.img = img;
    return c;
  }
  var KANKAN_IMG = 'images/kankan-icon.png';

  function goldShip() {
    var c = horseCard('ゴールドシップ', 'GOLD SHIP', 3, 1, '先行・差し', '中・長', '中山/京都/阪神・良', 2);
    c.img = 'images/horse-goldship.jpg';
    return c;
  }
  function rousham() {
    var c = horseCard('ローシャムパーク', 'ROUSHAM PARK', 3, 2, '先行・差し', '中', '中山/函館・良', 2);
    c.img = 'images/horse-rousham.jpg';
    return c;
  }
  function seferRasiel() {
    var c = horseCard('セファーラジエル', 'SAFER RASIEL', 3, 2, '先行・差し', '中・長', '中京・良', 2);
    c.img = 'images/horse-seferrasiel.jpg';
    return c;
  }

  function silkMobius() {
    var c = horseCard('シルクメビウス', 'SILK MOBIUS', 3, 2, '先行・差し', 'マイル・中', '京都・良/不良', 2, ['ダート']);
    c.img = 'images/horse-silkmobius.jpg';
    return c;
  }
  function seiunSky() {
    var c = horseCard('セイウンスカイ', 'SEIUN SKY', 3, 1, '逃げ・先行', '中・長', '京都/中山/札幌・良/稍重', 2);
    c.img = 'images/horse-seiunsky.jpg';
    return c;
  }
  function doDeuce() {
    var c = horseCard('ドウデュース', 'DO DEUCE', 5, 3, '先行・差し', '中', '東京/中山・良', 2);
    c.img = 'images/horse-dodeuce.jpg';
    return c;
  }
  // CPU側が走破時にランダムで使用する馬カードのプール（添付カード3種）
  var CPU_HORSE_POOL = [
    silkMobius,
    seiunSky,
    doDeuce
  ];

  /* ---- アイテムカード（例。effectType/effectValue を変えるだけで種類を増やせる） ---- */
  function whip() {
    var c = itemCard('鞭', '走破数を+1する', 'SDF-074', 'run_bonus', 1);
    c.img = 'images/item-whip.png';
    return c;
  }
  function hibiscus() { return itemCard('ハイビスカス', 'ガード値を+1する', 'SDF-075', 'guard_bonus', 1); }
  function kutsuwa() {
    var c = itemCard('口輪', '使用した馬のフォース能力を使用できなくし、ガード値がプラスされていたらその効果をなくす。ガード値を-1する', 'FHS-048', 'guard_bonus', -1);
    c.img = 'images/item-kutsuwa.png';
    return c;
  }
  function recoveryPotion() { return itemCard('回復薬', '手札を1枚引く', 'SDF-076', 'draw', 1); }
  function interferenceFog() { return itemCard('妨害の霧', '相手の手札を1枚減らす', 'SDF-077', 'discard_opponent', 1); }
  function boostDrink() { return itemCard('ブーストドリンク', '走破数を+1する', 'SDF-078', 'run_bonus', 1); }
  function veteranJockey() { return jockeyCard('熟練ジョッキー', '走破値を+1する', 'JCK-001', 'run_bonus', 1); }

  var FREEPLAY_POOL = [
    function () { return forceCard(); },
    function () { return forceCard(); },
    function () { return whip(); },
    function () { return hibiscus(); },
    function () { return recoveryPotion(); },
    function () { return interferenceFog(); },
    function () { return boostDrink(); },
    function () { return veteranJockey(); },
    function () { return situationCard('かんかん照り', '馬場状態を一段階良くする', KANKAN_IMG); },
    function () { return goldShip(); },
    function () { return rousham(); },
    function () { return seferRasiel(); }
  ];

  // 次にドローするカードを強制的に指定する（1回消費すると自動でクリアされる）
  var nextDrawOverride = function () { return boostDrink(); };

  /* ===================== game state ===================== */
  var hand = [];
  var farm = [];
  var field = null;
  var fieldGuard = null; // 走破中の馬カードに対してガードが成立した時、その馬カードを重ねて表示する
  var opponentHandCount = 0;
  var LANES = [
    { key: 'nige', label: '逃げ', count: 0 },
    { key: 'senko', label: '先行', count: 0 },
    { key: 'sashi', label: '差し', count: 0 },
    { key: 'oikomi', label: '追込', count: 0 }
  ];
  function currentLane() {
    for (var i = 0; i < LANES.length; i++) { if (LANES[i].count > 0) return LANES[i]; }
    return null;
  }
  function totalDeck() {
    return LANES.reduce(function (sum, l) { return sum + l.count; }, 0);
  }
  function drawOneFromDeck() {
    var lane = currentLane();
    if (!lane) return null;
    lane.count--;
    return lane;
  }
  // 相手（CPU）自身の山札（自分の山札とは別に、4つの距離エリアを持つ）
  var CPU_LANES = [
    { key: 'nige', label: '逃げ', count: 0 },
    { key: 'senko', label: '先行', count: 0 },
    { key: 'sashi', label: '差し', count: 0 },
    { key: 'oikomi', label: '追込', count: 0 }
  ];
  function cpuCurrentLane() {
    for (var i = 0; i < CPU_LANES.length; i++) { if (CPU_LANES[i].count > 0) return CPU_LANES[i]; }
    return null;
  }
  function cpuTotalDeck() {
    return CPU_LANES.reduce(function (sum, l) { return sum + l.count; }, 0);
  }
  function cpuDrawOneFromDeck() {
    var lane = cpuCurrentLane();
    if (!lane) return null;
    lane.count--;
    return lane;
  }
  var situation = null;

  /* 本編ではこの情報を基準に、馬の適性を走破値へ反映する。 */
  var race = { racecourse: '東京', surface: '芝', distance: '中距離', trackCondition: '良' };
  function raceDistanceKey(value) {
    if (value === '短距離') return '短';
    if (value === 'マイル') return 'マイル';
    if (value === '中距離') return '中';
    return '長';
  }
  function styleMatchesCurrentArea(card) {
    var lane = currentLane();
    return !!(lane && (card.style || '').indexOf(lane.label) >= 0);
  }
  function runModifiers(card) {
    var mods = [];
    if ((card.surface || []).indexOf(race.surface) < 0) mods.push({ value: -1, label: '馬場不一致 -1' });
    if ((card.dist || '').indexOf(raceDistanceKey(race.distance)) < 0) mods.push({ value: -1, label: '距離不一致 -1' });
    if (styleMatchesCurrentArea(card)) mods.push({ value: 1, label: '脚質一致 +1' });
    return mods;
  }
  function effectiveRun(card, bonus) {
    return (card.run || 0) + (bonus || 0) + runModifiers(card).reduce(function (sum, mod) { return sum + mod.value; }, 0);
  }
  function renderRaceInfo() {
    var el = $('race-info');
    if (el) el.textContent = '🏁 ' + race.racecourse + '・' + race.surface + '・' + race.distance + '・' + race.trackCondition;
  }

  var interactionMode = null;   // 'draw' | 'select-force' | 'select-horse' | 'select-any' | 'freeplay' | null
  var selectionNeeded = 0;
  var selectionCount = 0;
  var actionResolve = null;
  var currentArrowTarget = null;

  /* ===================== Freeplay state ===================== */
  var canDraw = true;
  var runBonus = 0;
  var selectedHorse = null;
  var selectedForces = [];
  var phase = 'idle';
  var prevPhase = 'idle';
  var prevSelectedHorse = null;
  var prevSelectedForces = [];
  var cpuRunValue = 0;
  var cpuHorseCard = null; // CPU側が今の走破で使用している馬カード（自分の手札から選ばれる）
  var cpuHand = []; // CPU側の実際の手札（表には出さないが、走破できるかの判定に使う）
  var guardValue = 0;
  var itemGuardBonus = 0; // guard_bonus アイテムの効果を一時的に積んでおく変数
  var isCpuTurn = false;
  var hasRunThisTurn = false;
  var pendingFinishRun = null;
  var lastDrawer = null; // 'player' | 'cpu' — 山札を最後に引いたのはどちらか

  /* ===================== dom helpers ===================== */
  function $(id) { return document.getElementById(id); }
  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  function buildCardEl(c) {
    var el = document.createElement('div');
    el.className = 'card type-' + c.type;
    el.dataset.id = c.id;

    if (c.img) {
      el.classList.add('card-real-art');
      el.style.backgroundImage = 'url(' + c.img + ')';
      el.innerHTML = '<div class="card-shine"></div>';
      return el;
    }

    var head = '<div class="card-head"><span class="card-type-tag">' + TYPE_LABEL[c.type] + '</span><span class="head-right">';
    if (c.type === 'horse') {
      head += '<span class="cost-badge">' + c.cost + '</span><span class="turf-badge"></span>';
    }
    head += '</span></div>';

    var art = '<div class="card-art"><span class="art-icon">' + c.icon + '</span>';
    if (c.type === 'horse') art += '<span class="art-en">' + c.en + '</span>';
    art += '</div>';

    var extra = '';
    if (c.type === 'horse') {
      var distActive = (c.dist || '').split('・');
      var styleActive = (c.style || '').split('・');
      var distChips = ['短', 'マイル', '中', '長'].map(function (d) {
        return '<span class="apt-chip' + (distActive.indexOf(d) >= 0 ? ' active' : '') + '">' + d + '</span>';
      }).join('');
      var styleMap = [['逃げ', 'nige'], ['先行', 'senko'], ['差し', 'sashi'], ['追込', 'oikomi']];
      var styleChips = styleMap.map(function (s) {
        var isActive = styleActive.indexOf(s[0]) >= 0;
        return '<span class="apt-chip style-chip' + (isActive ? ' active ' + s[1] : '') + '">' + s[0] + '</span>';
      }).join('');
      extra =
        '<div class="apt-block">' +
        '<div class="apt-label">適正距離</div><div class="apt-row">' + distChips + '</div>' +
        '<div class="apt-label">脚質</div><div class="apt-row">' + styleChips + '</div>' +
        '</div>' +
        '<div class="card-fav">得意 ' + c.fav + '</div>' +
        '<div class="card-stats">' +
        '<span class="pill run">走破' + c.run + '</span>' +
        '<span class="pill guard">ガード' + c.guard + '</span>' +
        '</div>';
    } else if (c.type === 'item' || c.type === 'jockey' || c.type === 'situation') {
      extra = '<div class="card-effect">' + c.stat + '</div>';
    } else if (c.type === 'force') {
      extra = '<div class="card-flavor">走破のコストになる基本カード</div>';
    }

    el.innerHTML = head + '<div class="card-name">' + c.name + '</div>' + art + extra + '<div class="card-shine"></div>';
    return el;
  }

  function layoutHandFan() {
    var row = $('hand-row');
    var cards = row.querySelectorAll('.card');
    var n = cards.length;
    if (!n) return;
    var rowW = row.clientWidth || row.offsetWidth || 340;
    var cardW = cards[0].offsetWidth || 98;
    var maxSpread = Math.min(34, 7 * (n - 1)); // total fan spread in degrees, capped
    var angleStep = n > 1 ? maxSpread / (n - 1) : 0;
    var idealGap = cardW * 0.62;
    var totalWidthIdeal = idealGap * (n - 1) + cardW;
    var gap = idealGap;
    if (totalWidthIdeal > rowW * 0.97 && n > 1) {
      gap = Math.max(cardW * 0.2, (rowW * 0.97 - cardW) / (n - 1));
    }
    var center = (n - 1) / 2;
    cards.forEach(function (el, i) {
      var offset = i - center;
      var rot = offset * angleStep;
      var x = offset * gap;
      var y = Math.abs(offset) * Math.abs(offset) * 1.15;
      el.style.setProperty('--fan-x', x.toFixed(1) + 'px');
      el.style.setProperty('--fan-rot', rot.toFixed(2) + 'deg');
      el.style.setProperty('--fan-y', y.toFixed(1) + 'px');
      el.style.zIndex = String(Math.round(100 - Math.abs(offset) * 2));
    });
  }

  function renderHand() {
    var row = $('hand-row');
    row.innerHTML = '';
    hand.forEach(function (c) {
      var el = buildCardEl(c);
      if (interactionMode === 'select-force') {
        el.classList.add(c.type === 'force' ? 'selectable' : 'disabled');
      } else if (interactionMode === 'select-horse' || phase === 'guard_select') {
        el.classList.add(c.type === 'horse' ? 'selectable' : 'disabled');
      } else if (phase === 'select_horse') {
        el.classList.add(c.type === 'horse' ? 'selectable' : 'disabled');
      } else if (phase === 'select_force') {
        el.classList.add(c.type === 'force' ? 'selectable' : 'disabled');
      } else if (phase === 'select_item') {
        var isHorseSupport = c.type === 'item' || c.type === 'jockey';
        var isRunModifier = c.effectType === 'run_bonus' || c.effectType === 'run_penalty';
        el.classList.add(isHorseSupport && (prevPhase !== 'support_choice' || isRunModifier) ? 'selectable' : 'disabled');
      } else if (phase === 'select_item_idle') {
        var isEligibleIdleCard = c.type === 'item' &&
          c.effectType !== 'run_bonus' && c.effectType !== 'run_penalty';
        el.classList.add(isEligibleIdleCard ? 'selectable' : 'disabled');
      } else if (phase === 'select_situation') {
        el.classList.add(c.type === 'situation' ? 'selectable' : 'disabled');
      } else if (phase === 'support_choice') {
        el.classList.add('disabled');
      } else if (interactionMode === 'select-any' || interactionMode === 'freeplay') {
        el.classList.add('selectable');
      }
      row.appendChild(el);
    });
    layoutHandFan();
  }
  window.addEventListener('resize', function () { layoutHandFan(); adjustFieldDiagonalLayout(); });

  function renderFarm() {
    var pile = $('farm-pile');
    var shown = farm.slice(-2);
    if (!shown.length) {
      pile.innerHTML = '';
    } else {
      var html = '<div class="farm-stack">';
      shown.forEach(function (c, i) {
        var cls = 'farm-mini type-' + c.type + (i === shown.length - 1 ? ' farm-back-0' : ' farm-back-1');
        if (c.img) {
          html += '<div class="' + cls + ' farm-mini-img" style="background-image:url(' + c.img + ')"></div>';
        } else {
          html += '<div class="' + cls + '">' + c.icon + '</div>';
        }
      });
      html += '</div>';
      pile.innerHTML = html;
    }
    $('farm-count').textContent = String(farm.length);
  }

  function renderField() {
    var body = $('field-body');
    if (field) {
      if (field.img) {
        body.innerHTML =
          '<div class="field-mini-wrap"><div class="field-mini field-mini-img" style="background-image:url(' + field.img + ')"></div></div>';
      } else {
        body.innerHTML =
          '<div class="field-mini-wrap"><div class="field-mini type-horse">' +
          '<span class="stat-badge stat-badge-run" title="走破">' + field.run + '</span>' +
          '<span class="stat-badge stat-badge-guard" title="ガード">G' + field.guard + '</span>' +
          '<span class="fm-icon">' + field.icon + '</span>' +
          '<span class="fm-name">' + field.name + '</span>' +
          '</div></div>';
      }
    } else {
      body.innerHTML = '<div class="field-placeholder"></div>';
    }
    renderFieldOpp();
  }

  // 相手の馬カード置き場（自分の走破カード置き場とは重ならない別枠のスロット）。
  // CPUが走破に使っている馬カード、またはガードに使った馬カードをここに表示する
  function renderFieldOpp() {
    var body = $('field-body-opp');
    if (!body) return;
    var card = fieldGuard || cpuHorseCard;
    if (card) {
      var tagHtml = fieldGuard ? '<div class="field-opp-tag">🛡️ ガード G' + (fieldGuard.guard || 0) + '</div>' : '';
      if (card.img) {
        body.innerHTML = tagHtml +
          '<div class="field-mini-wrap"><div class="field-mini field-mini-img" style="background-image:url(' + card.img + ')"></div></div>';
      } else {
        body.innerHTML = tagHtml +
          '<div class="field-mini-wrap"><div class="field-mini type-horse">' +
          '<span class="stat-badge stat-badge-run" title="走破">' + card.run + '</span>' +
          '<span class="stat-badge stat-badge-guard" title="ガード">G' + card.guard + '</span>' +
          '<span class="fm-icon">' + card.icon + '</span>' +
          '<span class="fm-name">' + card.name + '</span>' +
          '</div></div>';
      }
    } else {
      body.innerHTML = '<div class="field-placeholder field-placeholder-opp"></div>';
    }
  }

  function renderSituation() {
    var body = $('situation-body');
    if (!situation) { body.innerHTML = ''; return; }
    if (situation.img) {
      body.innerHTML =
        '<div class="mini-wrap"><div class="mini-card mini-card-img" style="background-image:url(' + situation.img + ')"></div></div>';
    } else {
      body.innerHTML =
        '<div class="mini-wrap">' +
        '<div class="mini-card">' + situation.icon + '</div>' +
        '<div class="mini-label">' + situation.name + '</div>' +
        '</div>';
    }
  }

  function renderDeckLanes() {
    var wrap = $('lanes');
    var active = currentLane();
    wrap.innerHTML = LANES.map(function (lane) {
      var isActive = active && lane.key === active.key;
      var isEmpty = lane.count <= 0;
      var cls = 'lane' + (isEmpty ? ' empty' : '') + (isActive ? ' active' : '');
      var t = Math.max(0, Math.min(1, lane.count / 10));
      // カードが1枚もない状態（配布前・引き切った後）は、うっすらカード裏面が
      // 見えてしまわないよう、カード画像自体を出さない空の枠にする
      var stackHtml = isEmpty ? '' :
        '<div class="lane-stack" style="--stack-t:' + t.toFixed(2) + '">' +
        '<div class="lane-card-back lane-back-2"></div>' +
        '<div class="lane-card-back lane-back-1"></div>' +
        '<div class="lane-card-back lane-back-0"><span class="lane-badge">' + lane.count + '</span></div>' +
        '</div>';
      return (
        '<div class="' + cls + '" data-lane="' + lane.key + '">' +
        '<span class="slot-bracket tl"></span><span class="slot-bracket tr"></span>' +
        '<span class="slot-bracket bl"></span><span class="slot-bracket br"></span>' +
        stackHtml +
        '<div class="lane-label">' + lane.label + '</div>' +
        '</div>'
      );
    }).join('');
  }

  function deckSourceRect() {
    var el = document.querySelector('.lane.active .lane-stack');
    return el ? el.getBoundingClientRect() : $('lanes').getBoundingClientRect();
  }
  function cpuDeckSourceRect() {
    var el = document.querySelector('.opp-lane.active .lane-stack');
    return el ? el.getBoundingClientRect() : $('opp-lanes').getBoundingClientRect();
  }

  function renderOpponentDeck() {
    var wrap = $('opp-lanes');
    if (!wrap) return;
    var active = cpuCurrentLane();
    wrap.innerHTML = CPU_LANES.map(function (lane) {
      var isActive = active && lane.key === active.key;
      var isEmpty = lane.count <= 0;
      var cls = 'opp-lane' + (isEmpty ? ' empty' : '') + (isActive ? ' active' : '');
      var t = Math.max(0, Math.min(1, lane.count / 10));
      var stackHtml = isEmpty ? '' :
        '<div class="lane-stack" style="--stack-t:' + t.toFixed(2) + '">' +
        '<div class="lane-card-back lane-back-2"></div>' +
        '<div class="lane-card-back lane-back-1"></div>' +
        '<div class="lane-card-back lane-back-0"><span class="lane-badge">' + lane.count + '</span></div>' +
        '</div>';
      return (
        '<div class="' + cls + '" data-lane="' + lane.key + '">' +
        '<span class="slot-bracket tl"></span><span class="slot-bracket tr"></span>' +
        '<span class="slot-bracket bl"></span><span class="slot-bracket br"></span>' +
        stackHtml +
        '</div>'
      );
    }).join('');
  }

  function renderAll() {
    renderHand(); renderFarm(); renderField(); renderSituation(); renderDeckLanes(); renderOpponentDeck();
    updateOpponentHandDisplay();
    updateCommandButtons();
    adjustFieldDiagonalLayout();
  }

  // 画面サイズによっては、CSSだけで組んだ対角配置（自分／相手の馬カード置き場）が
  // 山札の列と重なってしまうことがあるため、実際の表示位置を測って重なりを検出し、
  // その分だけ追加でずらす（CSSの計算だけに頼らない安全策）
  function adjustFieldDiagonalLayout() {
    var zoneFieldEl = $('zone-field');
    var oppDeckEl = $('zone-opp-deck');
    var fieldOppEl = $('field-body-opp');
    var deckEl = $('zone-deck');
    var fieldEl = $('field-body');
    if (!zoneFieldEl || !oppDeckEl || !fieldOppEl || !deckEl || !fieldEl) return;

    // 先に補正をリセットしてから素の位置を測る（前回の補正が残ったまま測ると
    // 毎回ずれが行ったり来たりしてしまうため）
    zoneFieldEl.style.setProperty('--field-opp-extra-shift', '0px');
    zoneFieldEl.style.setProperty('--field-extra-shift', '0px');

    var oppDeckRect = oppDeckEl.getBoundingClientRect();
    var fieldOppRect = fieldOppEl.getBoundingClientRect();
    var deckRect = deckEl.getBoundingClientRect();
    var fieldRect = fieldEl.getBoundingClientRect();
    if (oppDeckRect.width === 0 || fieldOppRect.width === 0 || deckRect.width === 0 || fieldRect.width === 0) return;

    // 相手の馬カード置き場が、相手の山札列と重なっていれば下にずらす
    // （#zone-field に設定することで、枠自体とブラケット装飾の両方に伝わる）
    var overlapTop = oppDeckRect.bottom - fieldOppRect.top;
    zoneFieldEl.style.setProperty('--field-opp-extra-shift', (overlapTop > 0 ? (overlapTop + 8) : 0) + 'px');

    // 自分の馬カード置き場が、自分の山札列と重なっていれば上にずらす
    var overlapBottom = fieldRect.bottom - deckRect.top;
    zoneFieldEl.style.setProperty('--field-extra-shift', (overlapBottom > 0 ? -(overlapBottom + 8) : 0) + 'px');
  }

  function updateOpponentHandDisplay() {
    var el = $('opponent-hand-count');
    if (el) el.textContent = opponentHandCount;
  }

  function setZoneActive(zoneId, active) {
    var z = $(zoneId);
    if (!z) return;
    z.classList.toggle('zone-active', !!active);
  }
  function clearZoneActive() {
    ['zone-opponent', 'zone-situation', 'zone-deck', 'zone-field', 'field-body', 'zone-farm', 'zone-hand'].forEach(function (id) {
      setZoneActive(id, false);
    });
    $('zone-deck').classList.remove('tappable');
  }

  /* ===================== arrow coach mark ===================== */
  function pointArrowAt(targetEl) {
    if (!targetEl) return hideArrow();
    var arrow = $('arrow');
    arrow.hidden = false;
    var r = targetEl.getBoundingClientRect();
    var narratorTop = $('narrator') ? $('narrator').getBoundingClientRect().top : window.innerHeight;
    var arrowH = 64, arrowW = 42;
    var top, flip;
    if (r.top - arrowH - 12 > 56) {
      top = r.top - arrowH - 6;
      flip = false;
    } else {
      top = Math.min(r.bottom + 6, narratorTop - arrowH - 6);
      flip = true;
    }
    var left = r.left + r.width / 2 - arrowW / 2;
    left = Math.max(6, Math.min(left, window.innerWidth - arrowW - 6));
    arrow.style.top = top + 'px';
    arrow.style.left = left + 'px';
    arrow.classList.toggle('arrow-flip', flip);
    currentArrowTarget = targetEl;
  }
  function hideArrow() {
    $('arrow').hidden = true;
    currentArrowTarget = null;
  }
  window.addEventListener('resize', function () {
    if (currentArrowTarget) pointArrowAt(currentArrowTarget);
  });

  /* ===================== narrator / progress ===================== */
  var narratorHistory = [];
  var narratorHistoryIndex = -1;

  function renderNarratorAt(idx) {
    narratorHistoryIndex = idx;
    $('narrator-text').innerHTML = narratorHistory[idx] || '';
    updateNarratorNavButtons();
  }
  function updateNarratorNavButtons() {
    var backBtn = $('narrator-back');
    var fwdBtn = $('narrator-forward');
    var hasBack = narratorHistoryIndex > 0;
    var hasForward = narratorHistoryIndex < narratorHistory.length - 1;
    if (backBtn) backBtn.style.display = hasBack ? 'inline-block' : 'none';
    if (fwdBtn) fwdBtn.style.display = hasForward ? 'inline-block' : 'none';
    var narratorEl = $('narrator');
    if (narratorEl) narratorEl.classList.toggle('viewing-history', hasForward);
  }
  function setNarrator(html) {
    // 新しいメッセージが来たら、それまで過去ログを閲覧していても常にそれを
    // 「最新（現在地）」として履歴に積み、表示を最新メッセージに合わせる
    narratorHistory.push(html);
    renderNarratorAt(narratorHistory.length - 1);
    // メッセージが変わるたびに、手札の増減など盤面のレイアウト変化に合わせて
    // 位置を再計算する（ただしユーザーが手動でドラッグした後は動かさない）。
    if (!document.body.dataset.narratorMoved) {
      requestAnimationFrame(function () {
        requestAnimationFrame(positionNarratorInitial);
      });
    }
  }
  function showNextButton(show) {
    $('narrator-next').style.display = show ? 'inline-flex' : 'none';
  }
  function waitNext() {
    return new Promise(function (resolve) {
      var btn = $('narrator-next');
      showNextButton(true);
      function handler() {
        // 過去のメッセージを閲覧中なら、実際には先に進めず表示だけ1つ先に戻す
        // （最新メッセージまで進む ▶ ボタンで戻ってから、改めて「つぎへ」を押してもらう）
        if (narratorHistoryIndex < narratorHistory.length - 1) {
          renderNarratorAt(narratorHistoryIndex + 1);
          return;
        }
        btn.removeEventListener('click', handler);
        resolve();
      }
      btn.addEventListener('click', handler);
    });
  }
  // 「つぎへ」ボタンが表示されている間は、画面上のどこをタップ／クリックしても
  // 次に進めるようにする（カードやボタン、ポップアップ、盤面の各ゾーンなど
  // 個別の操作が必要な要素は優先する）
  document.addEventListener('click', function (e) {
    var nextBtn = $('narrator-next');
    if (!nextBtn || nextBtn.style.display === 'none') return;
    if (e.target.closest('button, .card, .popup-box, #settings-overlay, #banner-overlay, .drag-handle, .lane, .opp-lane, .field-body, .field-body-opp, .farm-pile, #situation-body')) return;
    nextBtn.click();
  });
  $('narrator-back').addEventListener('click', function () {
    if (narratorHistoryIndex > 0) {
      Haptics.tap();
      renderNarratorAt(narratorHistoryIndex - 1);
    }
  });
  $('narrator-forward').addEventListener('click', function () {
    if (narratorHistoryIndex < narratorHistory.length - 1) {
      Haptics.tap();
      renderNarratorAt(narratorHistoryIndex + 1);
    }
  });

  var STEP_TOTAL = 16;
  function setProgress(step) {
    var pct = Math.min(100, (step / STEP_TOTAL) * 100);
    var cur = Math.min(step, STEP_TOTAL);
    var fillEl = $('track-fill');
    var horseEl = $('track-horse');
    if (fillEl) fillEl.style.width = pct + '%';
    if (horseEl) horseEl.style.left = pct + '%';

    var curEl = $('step-current');
    if (curEl) {
      curEl.textContent = cur;
    } else {
      var labelEl = $('step-label');
      if (labelEl) labelEl.textContent = 'STEP ' + cur + ' / ' + STEP_TOTAL;
    }

    var flagEl = $('track-flag');
    if (flagEl) {
      flagEl.classList.toggle('goal-reached', cur >= STEP_TOTAL);
    }
  }

  function showBanner(text, maxWait) {
    var overlay = $('banner-overlay');
    var box = $('banner-box');
    box.innerHTML = '<span class="banner-shine"></span><span class="banner-box-text">' + text + '</span>';
    box.classList.add('show');
    overlay.classList.add('active');
    return new Promise(function (resolve) {
      var done = false;
      function finish() {
        if (done) return;
        done = true;
        overlay.removeEventListener('click', finish);
        clearTimeout(timer);
        box.classList.remove('show');
        overlay.classList.remove('active');
        setTimeout(resolve, 250);
      }
      overlay.addEventListener('click', finish);
      var timer = setTimeout(finish, maxWait || 3200);
    });
  }

  function showOpponentBubble(text) {
    var b = $('opponent-bubble');
    b.textContent = text;
    b.classList.add('show');
    return sleep(1300).then(function () { b.classList.remove('show'); });
  }

  /* ===================== fly / move animation ===================== */
  function flyGhost(sourceEl, destRect, scaleOverride) {
    return new Promise(function (resolve) {
      if (!sourceEl) { resolve(); return; }
      var srcRect = sourceEl.getBoundingClientRect();
      var ghost = sourceEl.cloneNode(true);
      ghost.className = sourceEl.className + ' ghost';
      ghost.style.position = 'fixed';
      ghost.style.left = srcRect.left + 'px';
      ghost.style.top = srcRect.top + 'px';
      ghost.style.width = srcRect.width + 'px';
      ghost.style.height = srcRect.height + 'px';
      ghost.style.margin = '0';
      ghost.style.zIndex = '90';
      ghost.style.transition = 'transform .48s cubic-bezier(.3,.7,.35,1), opacity .48s';
      document.body.appendChild(ghost);
      requestAnimationFrame(function () {
        var dx = (destRect.left + destRect.width / 2) - (srcRect.left + srcRect.width / 2);
        var dy = (destRect.top + destRect.height / 2) - (srcRect.top + srcRect.height / 2);
        var scale = scaleOverride || Math.max(0.45, Math.min(destRect.width / srcRect.width, 1));
        ghost.style.transform = 'translate(' + dx + 'px,' + dy + 'px) scale(' + scale + ')';
        ghost.style.opacity = '0.7';
      });
      setTimeout(function () { ghost.remove(); resolve(); }, 480);
    });
  }

  function cardElById(id) {
    return document.querySelector('.card[data-id="' + id + '"]');
  }

  function makeDeckDummy(deckRect) {
    var dummy = document.createElement('div');
    dummy.className = 'deck-card';
    dummy.style.position = 'fixed';
    dummy.style.left = deckRect.left + 'px';
    dummy.style.top = deckRect.top + 'px';
    dummy.style.width = deckRect.width + 'px';
    dummy.style.height = deckRect.height + 'px';
    dummy.style.transform = 'none';
    document.body.appendChild(dummy);
    return dummy;
  }

  function makeCardDummy(card, startRect) {
    var dummy = document.createElement('div');
    dummy.className = 'farm-mini type-' + card.type;
    dummy.style.position = 'fixed';
    dummy.style.left = startRect.left + 'px';
    dummy.style.top = startRect.top + 'px';
    dummy.style.width = startRect.width + 'px';
    dummy.style.height = startRect.height + 'px';
    dummy.style.borderRadius = '6px';
    dummy.style.fontSize = '16px';
    dummy.style.zIndex = '1000';
    if (card.img) {
      dummy.classList.add('farm-mini-img');
      dummy.style.backgroundImage = 'url(' + card.img + ')';
    } else {
      dummy.textContent = card.icon;
    }
    document.body.appendChild(dummy);
    return dummy;
  }

  function makeSmallCardDummy(deckRect) {
    var dummy = document.createElement('div');
    dummy.className = 'deck-card';
    dummy.style.position = 'fixed';
    dummy.style.left = deckRect.left + 'px';
    dummy.style.top = deckRect.top + 'px';
    dummy.style.width = (deckRect.width * 0.7) + 'px';
    dummy.style.height = (deckRect.height * 0.7) + 'px';
    dummy.style.transform = 'none';
    document.body.appendChild(dummy);
    return dummy;
  }

  /* ===================== explanation step ===================== */
  function explainStep(targetEl, zoneId, text) {
    if (zoneId) setZoneActive(zoneId, true);
    if (targetEl && targetEl.classList) targetEl.classList.add('highlighted');
    setNarrator(text);
    return waitNext().then(function () {
      if (targetEl && targetEl.classList) targetEl.classList.remove('highlighted');
      if (zoneId) setZoneActive(zoneId, false);
    });
  }

  /* ===================== interactive waits ===================== */
  function waitDrawTap(zoneId) {
    interactionMode = 'draw';
    setZoneActive(zoneId, true);
    $('zone-deck').classList.add('tappable');
    return new Promise(function (resolve) { actionResolve = resolve; });
  }

  function waitSelect(mode, count) {
    interactionMode = mode;
    selectionNeeded = count;
    selectionCount = 0;
    renderHand();
    return new Promise(function (resolve) { actionResolve = resolve; });
  }

  function shakeCard(id) {
    var el = cardElById(id);
    if (!el) return;
    el.classList.add('shake');
    Haptics.warn();
    setTimeout(function () { el.classList.remove('shake'); }, 400);
  }

  /* ===================== コマンドバー制御 ===================== */
  function updateFabDisplay() {
    var fab = $('cmd-fab');
    if (!fab) return;
    var badge = $('cmd-fab-badge');
    var menu = $('cmd-menu');
    var isOpen = menu && menu.classList.contains('open');

    if (isOpen) {
      if (badge) badge.textContent = 'CLOSE';
      fab.classList.add('open');
      fab.classList.remove('cpu-turn');
    } else if (isCpuTurn) {
      if (badge) badge.textContent = 'OPPONENT';
      fab.classList.remove('open');
      fab.classList.add('cpu-turn');
    } else {
      if (badge) badge.textContent = 'COMMAND';
      fab.classList.remove('open');
      fab.classList.remove('cpu-turn');
    }
  }

  function updateCommandButtons() {
    var btns = document.querySelectorAll('.cmd-menu-btn');
    if (!btns.length) return;
    btns.forEach(function (btn) {
      var cmd = btn.dataset.cmd;
      btn.disabled = false;
      if (isCpuTurn) { btn.disabled = true; return; }
      if (cmd === 'run') {
        if (phase !== 'idle') btn.disabled = true;
        if (canDraw) btn.disabled = true;
        if (hasRunThisTurn) btn.disabled = true;
        if (hand.filter(function (c) { return c.type === 'horse'; }).length === 0) btn.disabled = true;
      }
      if (cmd === 'item') {
        if (phase !== 'idle') btn.disabled = true;
        if (canDraw) btn.disabled = true;
        var hasUsableItem = hand.some(function (c) {
          return c.type === 'item' && c.effectType !== 'run_bonus' && c.effectType !== 'run_penalty';
        });
        if (!hasUsableItem) btn.disabled = true;
      }
      if (cmd === 'end') {
        if (canDraw) btn.disabled = true;
        if (phase === 'select_horse' || phase === 'select_force' || phase === 'discard_select') btn.disabled = true;
        if (isCpuTurn) btn.disabled = true;
      }
    });
    updateFabDisplay();
  }

  /* ===================== コマンドバーの初期位置（画面右下に固定） ===================== */
  function showCommandBar(show) {
    $('command-bar').style.display = show ? 'flex' : 'none';
    if (show) {
      updateCommandButtons();
    }
  }

  /* ===================== コマンド実行 ===================== */
  function cmdDraw() {
    if (!canDraw || !currentLane() || isCpuTurn) return;
    drawFreeplayCard();
    canDraw = false;
    updateCommandButtons();
  }

  function cmdRun() {
    if (phase !== 'idle' || isCpuTurn || hasRunThisTurn || canDraw) return;
    var horses = hand.filter(function (c) { return c.type === 'horse'; });
    if (horses.length === 0) { setNarrator('手札に馬カードがありません。'); return; }
    hasRunThisTurn = true;
    phase = 'select_horse';
    selectedHorse = null;
    selectedForces = [];
    runBonus = 0;
    setNarrator('走破する<b>馬カード</b>を選んでタップしてください。');
    renderAll();
  }

  function runSupportCards() {
    return hand.filter(function (c) {
      return (c.type === 'item' || c.type === 'jockey') &&
        (c.effectType === 'run_bonus' || c.effectType === 'run_penalty');
    });
  }

  function beginForceSelection() {
    phase = 'select_force';
    prevPhase = null;
    selectedForces = [];
    var cost = selectedHorse ? (selectedHorse.cost || 2) : 2;
    setNarrator('コスト分の<b>フォースカード</b>を ' + cost + ' 枚選んでタップしてください。');
    renderAll();
  }

  function offerRunSupport() {
    var supports = runSupportCards();
    if (!supports.length) { beginForceSelection(); return; }
    phase = 'support_choice';
    renderAll();
    $('run-support-desc').innerHTML =
      '<b>' + (selectedHorse ? selectedHorse.name : 'この馬') + '</b> の走破値を増減できるカードが ' + supports.length + ' 枚あります。使いますか？';
    $('run-support-popup').style.display = 'flex';
  }

  function closeRunSupportChoice(useCard) {
    $('run-support-popup').style.display = 'none';
    if (useCard) {
      prevPhase = 'support_choice';
      prevSelectedHorse = selectedHorse;
      prevSelectedForces = selectedForces.slice();
      phase = 'select_item';
      setNarrator('走破値を変える<b>アイテム／騎手カード</b>を選んでタップしてください。');
      renderAll();
    } else {
      beginForceSelection();
    }
  }

  function cmdItem() {
    if (phase !== 'select_force' || isCpuTurn || canDraw) return;
    var items = hand.filter(function (c) { return c.type === 'item' || c.type === 'jockey'; });
    if (items.length === 0) { setNarrator('手札にアイテムがありません。'); return; }
    prevPhase = phase;
    prevSelectedHorse = selectedHorse;
    prevSelectedForces = selectedForces.slice();
    phase = 'select_item';
    setNarrator('馬を支援する<b>アイテム／騎手カード</b>を選んでタップしてください。使わない場合は、フォースの選択を続けます。');
    renderAll();
  }

  function cmdSituation() {
    if (phase !== 'idle' || isCpuTurn || canDraw) return;
    var situations = hand.filter(function (c) { return c.type === 'situation'; });
    if (!situations.length) { setNarrator('手札に状況カードがありません。'); return; }
    prevPhase = phase;
    phase = 'select_situation';
    setNarrator('使う<b>状況カード</b>を選んでタップしてください。');
    renderAll();
  }

  function cmdEndTurn() {
    if (phase === 'select_horse' || phase === 'select_force' || isCpuTurn || canDraw) return;
    endTurn();
  }

  /* ===================== ターン終了 / CPUターン ===================== */
  function endTurn() {
    phase = 'idle';
    selectedHorse = null;
    selectedForces = [];
    runBonus = 0;
    canDraw = true;
    isCpuTurn = true;
    showCommandBar(false);
    setNarrator('🧠 相手のターンです…');
    renderAll();
    sleep(1200).then(function () { cpuTurn(); });
  }

  // CPU側の手札のうち、指定タイプの枚数を数える
  function cpuHandCountOfType(type) {
    return cpuHand.filter(function (c) { return c.type === type; }).length;
  }

  // CPU側が自分のターンの初めに1枚引く（自分自身の山札の残りが無ければ引かない）
  // CPU が走破しやすくなるよう、フォースカードと馬カードを重点的に引かせる
  var CPU_HORSE_DRAW_POOL = [goldShip, rousham, seferRasiel, silkMobius, seiunSky, doDeuce];
  function cpuDrawOneCard() {
    if (!cpuCurrentLane()) return null;
    var maker;
    var roll = Math.random();
    if (roll < 0.45) {
      maker = forceCard;
    } else if (roll < 0.85) {
      maker = CPU_HORSE_DRAW_POOL[Math.floor(Math.random() * CPU_HORSE_DRAW_POOL.length)];
    } else {
      maker = FREEPLAY_POOL[Math.floor(Math.random() * FREEPLAY_POOL.length)];
    }
    var card = maker();
    cpuHand.push(card);
    opponentHandCount = cpuHand.length;
    cpuDrawOneFromDeck();
    return card;
  }

  // CPU の手札の中から、コスト分のフォースカードも揃っている馬カードを選ぶ（無ければ null）
  function cpuPickRunnableHorse() {
    var horses = cpuHand.filter(function (c) { return c.type === 'horse'; });
    if (!horses.length) return null;
    horses.sort(function (a, b) { return (b.run || 0) - (a.run || 0); }); // 走破値が高い馬を優先
    for (var i = 0; i < horses.length; i++) {
      var h = horses[i];
      if (cpuHandCountOfType('force') >= (h.cost || 2)) return h;
    }
    return null;
  }

  function cpuTurn() {
    itemGuardBonus = 0;
    cpuDrawOneCard();
    renderAll();

    // 手札に走破できる馬（コスト分のフォースも揃っている）がいなければ、
    // 何もできずにターンを終える（相手の手札枚数・カード構成に応じて走破できないこともある）
    var horseCard = cpuPickRunnableHorse();
    if (!horseCard) {
      setNarrator('🧠 相手は走破できる馬がいないため、ターンを終了しました。（相手の手札: ' + cpuHand.length + '枚）');
      sleep(900).then(function () {
        showCommandBar(true);
        isCpuTurn = false;
        canDraw = true;
        phase = 'idle';
        hasRunThisTurn = false;
        cpuHorseCard = null;
        renderAll();
        checkVictory();
        if (!victoryShown) cmdDraw(); // 自分のターンの初めに自動でカードを1枚引く
      });
      return;
    }

    // 選んだ馬とコスト分のフォースカードを、CPUの手札から消費する
    var cost = horseCard.cost || 2;
    cpuHand = cpuHand.filter(function (c) { return c.id !== horseCard.id; });
    for (var i = 0; i < cost; i++) {
      var idx = -1;
      for (var j = 0; j < cpuHand.length; j++) { if (cpuHand[j].type === 'force') { idx = j; break; } }
      if (idx >= 0) cpuHand.splice(idx, 1);
    }
    opponentHandCount = cpuHand.length;

    cpuHorseCard = horseCard;
    cpuRunValue = effectiveRun(horseCard, 0);
    var cpuMods = runModifiers(horseCard).map(function (mod) { return mod.label; }).join(' / ') || '適性補正なし';
    setNarrator('🧠 相手が「<b>' + horseCard.name + '</b>」で走破を宣言！ 基礎 ' + horseCard.run + '、' + cpuMods + ' → 実効走破 <b>' + cpuRunValue + '</b>');
    renderAll();
    /* フォース支払い後、馬カードがフィールドに出た瞬間の演出として拡大表示 */
    CardCloseup.show(horseCard, { label: '🏇 走破！', autoHideMs: 1800 });
    sleep(1800).then(function () {
      if (cpuRunValue <= 0) {
        setNarrator('🧠 相手の実効走破値が0以下のため走破失敗。あなたの番です。');
        isCpuTurn = false; hasRunThisTurn = false; cpuHorseCard = null; showCommandBar(true); renderAll();
        cmdDraw(); // 自分のターンの初めに自動でカードを1枚引く
      } else {
        // 自分の手札に馬カードが1枚もなければ、そもそもガードできないのでポップアップは出さない
        var canGuard = hand.some(function (c) { return c.type === 'horse'; });
        if (canGuard) {
          showGuardPopup(cpuRunValue);
        } else {
          guardValue = 0;
          itemGuardBonus = 0;
          executeCpuDraw(cpuRunValue);
        }
      }
    });
  }

  function showGuardPopup(runValue) {
    var popup = $('guard-popup');
    $('guard-desc').innerHTML =
      '相手の走破を手札の馬カードでガードしますか？<br>' +
      '（ガード値分だけ相手のドローを減らせます）<br>' +
      '相手の走破値: <b>' + runValue + '</b>';
    popup.style.display = 'flex';

    var yesBtn = $('guard-yes');
    var noBtn = $('guard-no');
    var newYes = yesBtn.cloneNode(true);
    var newNo = noBtn.cloneNode(true);
    yesBtn.parentNode.replaceChild(newYes, yesBtn);
    noBtn.parentNode.replaceChild(newNo, noBtn);

    newYes.addEventListener('click', function () {
      popup.style.display = 'none';
      phase = 'guard_select';
      setNarrator('🛡️ <b>ガードする馬カード</b>を選んでタップしてください。');
      renderAll();
    });
    newNo.addEventListener('click', function () {
      popup.style.display = 'none';
      guardValue = 0;
      itemGuardBonus = 0;
      executeCpuDraw(cpuRunValue);
    });
  }

  function selectGuard(card) {
    if (phase !== 'guard_select') return;
    if (card.type !== 'horse') { shakeCard(card.id); return; }
    if ((card.dist || '').indexOf(raceDistanceKey(race.distance)) < 0) {
      setNarrator('この馬は今回の<b>' + race.distance + '</b>をガードできません。距離適性を確認してください。');
      shakeCard(card.id);
      return;
    }
    var guardVal = (card.guard || 0) + itemGuardBonus;
    itemGuardBonus = 0;
    guardValue = guardVal;
    var el = cardElById(card.id);
    if (el) {
      el.style.pointerEvents = 'none';
      el.classList.add('selected');
      var farmRect = $('zone-farm').getBoundingClientRect();
      flyGhost(el, farmRect).then(function () {
        hand = hand.filter(function (c) { return c.id !== card.id; });
        farm.push(card);
        phase = 'idle';
        renderAll();
        CardCloseup.show(card, { label: '🛡️ ガード！', autoHideMs: 1300 });
        setNarrator('🛡️ ガード値 <b>' + guardVal + '</b> でガード！ 相手のドローが ' + guardVal + ' 減少します。');
        sleep(800).then(function () { executeCpuDraw(cpuRunValue - guardVal); });
      });
    }
  }

  function executeCpuDraw(drawCount) {
    var actualDraw = Math.max(0, drawCount);
    if (actualDraw <= 0) {
      setNarrator('🛡️ ガードで相手の走破を完全に防いだ！ 相手は1枚も引けなかった！');
      showCommandBar(true);
      isCpuTurn = false;
      hasRunThisTurn = false;
      cpuHorseCard = null;
      renderAll();
      checkVictory();
      if (!victoryShown) cmdDraw(); // 自分のターンの初めに自動でカードを1枚引く
      return;
    }
    var maxDraw = Math.min(actualDraw, cpuTotalDeck());
    setNarrator('🧠 相手が ' + maxDraw + ' 枚引いた！（走破 ' + cpuRunValue + ' - ガード ' + guardValue + ' = ' + actualDraw + '）');
    var chain = Promise.resolve();
    var opponentRect = $('zone-opponent').getBoundingClientRect();
    for (var i = 0; i < maxDraw; i++) {
      (function () {
        chain = chain.then(function () {
          var deckRect = cpuDeckSourceRect();
          var dummy = makeSmallCardDummy(deckRect);
          return flyGhost(dummy, opponentRect, 0.6).then(function () {
            dummy.remove();
            var rewardMaker;
            var rewardRoll = Math.random();
            if (rewardRoll < 0.45) rewardMaker = forceCard;
            else if (rewardRoll < 0.85) rewardMaker = CPU_HORSE_DRAW_POOL[Math.floor(Math.random() * CPU_HORSE_DRAW_POOL.length)];
            else rewardMaker = FREEPLAY_POOL[Math.floor(Math.random() * FREEPLAY_POOL.length)];
            var card = rewardMaker();
            cpuHand.push(card);
            opponentHandCount = cpuHand.length;
            cpuDrawOneFromDeck();
            lastDrawer = 'cpu';
            renderAll();
            return sleep(120);
          });
        });
      })();
    }
    chain.then(function () {
      setNarrator('🧠 相手のターン終了！ あなたの番です。');
      showCommandBar(true);
      isCpuTurn = false;
      canDraw = true;
      phase = 'idle';
      hasRunThisTurn = false;
      cpuHorseCard = null;
      renderAll();
      checkVictory();
      if (!victoryShown) cmdDraw(); // 自分のターンの初めに自動でカードを1枚引く
    });
  }

  /* ===================== 走破実行（相手ガード付き） ===================== */
  function executeRun() {
    if (!selectedHorse || isCpuTurn) return;
    var totalRun = effectiveRun(selectedHorse, runBonus);
    var horseInPlay = selectedHorse;
    var forcesToPay = selectedForces.slice();
    var modifierText = runModifiers(selectedHorse).map(function (mod) { return mod.label; }).join(' / ') || '適性補正なし';

    function flyCardOut(card, destRect) {
      var el = cardElById(card.id);
      if (el) {
        return flyGhost(el, destRect);
      }
      var handRect = $('hand-row').getBoundingClientRect();
      var dummy = makeCardDummy(card, handRect);
      return flyGhost(dummy, destRect).then(function () { dummy.remove(); });
    }

    /* STEP 1: フォースカードを支払う → STEP 2: 馬カードをフィールドに出す */
    function payForcesThenPlaceHorse() {
      setNarrator('コストとして<b>フォースカード</b>を支払うよ…');
      var chain = Promise.resolve();
      forcesToPay.forEach(function (fc) {
        chain = chain.then(function () {
          var farmRect = $('zone-farm').getBoundingClientRect();
          return flyCardOut(fc, farmRect).then(function () {
            hand = hand.filter(function (c) { return c.id !== fc.id; });
            farm.push(fc);
            renderAll();
            return sleep(220);
          });
        });
      });
      return chain.then(function () {
        setNarrator('<b>' + horseInPlay.name + '</b> をフィールドに出した！ 基礎走破 ' + horseInPlay.run + '、' + modifierText + (runBonus ? '、アイテム +' + runBonus : '') + ' → 実効走破 <b>' + totalRun + '</b>。');
        var fieldRect = $('zone-field').getBoundingClientRect();
        return flyCardOut(horseInPlay, fieldRect).then(function () {
          hand = hand.filter(function (c) { return c.id !== horseInPlay.id; });
          if (field) farm.push(field);
          field = horseInPlay;
          fieldGuard = null;
          renderAll();
          CardCloseup.show(horseInPlay, { label: '🏇 走破！', autoHideMs: 1800 });
          return sleep(500);
        });
      });
    }

    /* STEP 3: 相手が考える → STEP 4: 走破成功/失敗の結果表示 */
    function afterField() {
      if (interactionMode === 'freeplay' && !isCpuTurn) {
        var thinkingPopup = $('opponent-thinking-popup');
        thinkingPopup.style.display = 'flex';
        setNarrator('🤔 相手プレイヤーはガードをするか考えています。');
        return sleep(1400).then(function () {
          thinkingPopup.style.display = 'none';
          if (Math.random() < 0.5) {
            if (totalRun <= 0) {
              return showBanner('走破失敗').then(function () {
                setNarrator('❌ 実効走破値 ' + totalRun + ' はガード値 0 を上回れず、走破失敗。');
                return sendHorseToFarmAndReset();
              });
            }
            return showBanner('走破成功！').then(function () {
              setNarrator('相手はガードをしませんでした。走破成功です！');
              return continueRunLogic(totalRun, false, 0);
            });
          } else {
            var guardHorse = CPU_HORSE_POOL[Math.floor(Math.random() * CPU_HORSE_POOL.length)]();
            var guardVal = guardHorse.guard || 0;
            fieldGuard = guardHorse;
            renderField();
            return showBanner('相手がガード！ ' + guardHorse.name + ' / ガード ' + guardVal).then(function () {
              if (totalRun <= guardVal) {
                setNarrator('❌ 走破失敗。実効走破値 ' + totalRun + ' は実効ガード値 ' + guardVal + ' を上回れなかった。');
                return sendHorseToFarmAndReset();
              } else {
                var runDistance = totalRun - guardVal;
                setNarrator('🛡️ 実効走破 ' + totalRun + ' − 実効ガード ' + guardVal + ' = <b>走破距離 ' + runDistance + '</b>。');
                return sleep(900).then(function () { return continueRunLogic(runDistance, true, guardVal); });
              }
            });
          }
        });
      }
      return continueRunLogic(totalRun, false, 0);
    }

    /* STEP 5: 成功時の報酬ドロー＋捨て札 */
    function continueRunLogic(finalRun, usedGuard, usedGuardVal) {
      var drawCount = Math.min(finalRun, totalDeck());
      if (drawCount <= 0) {
        setNarrator('走破値が0になったため、カードを引けませんでした。');
        return sendHorseToFarmAndReset();
      }
      var chain = Promise.resolve();
      for (var i = 0; i < drawCount; i++) {
        (function () {
          chain = chain.then(function () {
            var deckRect = deckSourceRect();
            var handRect = $('hand-row').getBoundingClientRect();
            var dummy = makeDeckDummy(deckRect);
            return flyGhost(dummy, handRect).then(function () {
              dummy.remove();
              var maker = FREEPLAY_POOL[Math.floor(Math.random() * FREEPLAY_POOL.length)];
              hand.push(maker());
              drawOneFromDeck();
              lastDrawer = 'player';
              renderAll();
              return sleep(120);
            });
          });
        })();
      }
      return chain.then(function () {
        var discardCount = Math.max(0, drawCount - 1);
        var need = Math.min(discardCount, hand.length);
        if (need > 0) {
          phase = 'discard_select';
          selectionNeeded = need;
          selectionCount = 0;
          pendingFinishRun = function () { finishRun(finalRun, usedGuard, usedGuardVal); };
          setNarrator('引いた中から <b>' + need + '枚</b> 選んでファームに送ってください。');
          renderAll();
        } else {
          finishRun(finalRun, usedGuard, usedGuardVal);
        }
      });
    }

    function finishRun(finalRun, usedGuard, usedGuardVal) {
      var msg = '🏇 <b>走破成功！</b> ' + finalRun + '枚引いたよ！';
      if (usedGuard) msg += '（ガードで' + usedGuardVal + '減少）';
      if (runBonus > 0) msg += '（ボーナス+' + runBonus + '）';
      setNarrator(msg);
      sendHorseToFarmAndReset();
    }

    /* STEP 6: 使い終わった馬カードをファームへ送る */
    function sendHorseToFarmAndReset() {
      var farmRect = $('zone-farm').getBoundingClientRect();
      var fieldEl = document.querySelector('#field-body .field-mini');
      var p = (field && fieldEl) ? flyGhost(fieldEl, farmRect) : Promise.resolve();
      return p.then(function () {
        if (field) { farm.push(field); field = null; }
        fieldGuard = null;
        phase = 'idle'; selectedHorse = null; selectedForces = []; runBonus = 0; canDraw = false;
        renderAll();
        checkVictory();
        if (!victoryShown) {
          if (interactionMode === 'freeplay') {
            // 走破が完了したら結果メッセージの表示後に自動で相手のターンへ移行
            return sleep(1200).then(function () {
              if (!victoryShown && !isCpuTurn) {
                endTurn();
              }
            });
          } else {
            checkHintsAvailable();
          }
        }
      });
    }

    payForcesThenPlaceHorse().then(afterField);
  }

  /* ===================== アイテム効果の適用 ===================== */
  // カードごとの effectType に応じて処理を分岐する。
  // 新しい効果タイプを追加する場合はここに case を増やすだけでよい。
  function applyItemEffect(card) {
    CardCloseup.show(card, { label: '発動！', autoHideMs: 1100 });
    var msg = '🧪 アイテム「' + card.name + '」を使った！';
    switch (card.effectType) {
      case 'run_bonus':
        runBonus += card.effectValue;
        msg += ' 走破ボーナス +' + card.effectValue;
        break;
      case 'guard_bonus':
        itemGuardBonus += card.effectValue;
        msg += ' ガードボーナス +' + card.effectValue + '（次にガードする時に加算されます）';
        break;
      case 'draw':
        var drawn = 0;
        for (var i = 0; i < card.effectValue; i++) {
          if (!currentLane()) break;
          var maker = FREEPLAY_POOL[Math.floor(Math.random() * FREEPLAY_POOL.length)];
          hand.push(maker());
          drawOneFromDeck();
          drawn++;
        }
        msg += drawn > 0 ? (' 手札を' + drawn + '枚引いた！') : ' 山札が残っていなかった…';
        break;
      case 'discard_opponent':
        var before = opponentHandCount;
        opponentHandCount = Math.max(0, opponentHandCount - card.effectValue);
        msg += ' 相手の手札を' + (before - opponentHandCount) + '枚減らした！';
        break;
      default:
        msg += ' 効果を発動！';
    }
    setNarrator(msg);
  }

  function onHandCardClick(id) {
    var card = hand.filter(function (c) { return c.id === id; })[0];
    if (!card) return;
    var el = cardElById(id);
    if (!el || el.style.pointerEvents === 'none') return;
    Haptics.select();

    if (phase === 'guard_select' && card.type === 'horse') {
      selectGuard(card);
      return;
    }

    if (interactionMode === 'freeplay' && !isCpuTurn) {
      if (phase === 'discard_select') {
        el.style.pointerEvents = 'none';
        el.classList.add('selected');
        var farmRectD = $('zone-farm').getBoundingClientRect();
        flyGhost(el, farmRectD).then(function () {
          hand = hand.filter(function (c) { return c.id !== id; });
          farm.push(card);
          renderAll();
          selectionCount++;
          var remaining = selectionNeeded - selectionCount;
          if (remaining > 0) {
            setNarrator('あと <b>' + remaining + '枚</b> 選んでファームに送ってください。');
          } else {
            phase = 'idle';
            var fn = pendingFinishRun;
            pendingFinishRun = null;
            if (fn) fn();
          }
        });
        return;
      }

      if (phase === 'select_horse') {
        if (card.type !== 'horse') { shakeCard(id); return; }
        selectedHorse = card;
        var cost = card.cost || 2;
        var forces = hand.filter(function (c) { return c.type === 'force'; });
        if (forces.length < cost) {
          setNarrator('フォースカードが足りません（必要 ' + cost + '枚）');
          phase = 'idle'; selectedHorse = null; hasRunThisTurn = false;
          renderAll();
          return;
        }
        offerRunSupport();
        return;
      }

      if (phase === 'select_force') {
        if (card.type !== 'force') { shakeCard(id); return; }
        if (selectedForces.some(function (c) { return c.id === card.id; })) return;
        selectedForces.push(card);
        el.style.pointerEvents = 'none';
        el.classList.add('selected');
        var cost = selectedHorse.cost || 2;
        if (selectedForces.length >= cost) {
          executeRun();
        } else {
          setNarrator('あと ' + (cost - selectedForces.length) + ' 枚選んでください。');
          updateCommandButtons();
        }
        return;
      }

      if (phase === 'select_item') {
        if (card.type !== 'item' && card.type !== 'jockey') { shakeCard(id); return; }
        if (prevPhase === 'support_choice' && card.effectType !== 'run_bonus' && card.effectType !== 'run_penalty') {
          shakeCard(id); return;
        }
        hand = hand.filter(function (c) { return c.id !== card.id; });
        farm.push(card);
        applyItemEffect(card);
        phase = prevPhase;
        selectedHorse = prevSelectedHorse;
        selectedForces = prevSelectedForces.slice();
        renderAll();
        if (phase === 'support_choice') {
          offerRunSupport();
        } else if (phase === 'select_force') {
          var need = (selectedHorse ? selectedHorse.cost || 2 : 2) - selectedForces.length;
          if (need > 0) setNarrator('あと ' + need + ' 枚のフォースを選んでください。');
          else executeRun();
        } else if (phase === 'idle') {
          setNarrator($('narrator-text').innerHTML + '<br>続けてどうぞ。');
        }
        return;
      }

      if (phase === 'select_item_idle') {
        var isEligibleIdle = card.type === 'item' &&
          card.effectType !== 'run_bonus' && card.effectType !== 'run_penalty';
        if (!isEligibleIdle) { shakeCard(id); return; }
        hand = hand.filter(function (c) { return c.id !== card.id; });
        farm.push(card);
        applyItemEffect(card);
        phase = 'idle';
        renderAll();
        return;
      }

      if (phase === 'select_situation') {
        if (card.type !== 'situation') { shakeCard(id); return; }
        hand = hand.filter(function (c) { return c.id !== card.id; });
        situation = card;
        race.trackCondition = '良';
        phase = 'idle';
        setNarrator('☀️ 「' + card.name + '」を状況エリアに置いた。馬場は<b>良</b>になった！');
        renderRaceInfo();
        renderAll();
        return;
      }

      if (phase === 'idle') {
        CardCloseup.show(card, { label: 'カード詳細' });
        return;
      }
      return;
    }

    if (!interactionMode || interactionMode === 'draw') return;
    if (interactionMode === 'select-force' && card.type !== 'force') { shakeCard(id); return; }
    if (interactionMode === 'select-horse' && card.type !== 'horse') { shakeCard(id); return; }

    el.style.pointerEvents = 'none';
    el.classList.add('selected');

    var toField2 = (interactionMode === 'select-horse');
    var destId2 = toField2 ? 'zone-field' : 'zone-farm';
    var destRect2 = $(destId2).getBoundingClientRect();

    flyGhost(el, destRect2).then(function () {
      hand = hand.filter(function (c) { return c.id !== id; });
      if (toField2) {
        if (field) farm.push(field);
        field = card;
      } else {
        farm.push(card);
      }
      renderAll();
      FieldCamera.pulseTo(destRect2);
      Haptics.place();

      selectionCount++;
      if (selectionCount >= selectionNeeded) {
        var resolve = actionResolve;
        interactionMode = null;
        actionResolve = null;
        setTimeout(function () { if (resolve) resolve(); }, 150);
      }
    });
  }

  function onDeckClick() {
    if (interactionMode === 'draw') {
      var resolve = actionResolve;
      interactionMode = null;
      actionResolve = null;
      $('zone-deck').classList.remove('tappable');
      setZoneActive('zone-deck', false);
      resolve && resolve();
      return;
    }
    if (interactionMode === 'freeplay') {
      cmdDraw();
    }
  }

  function drawFreeplayCard() {
    if (!currentLane() || isCpuTurn) return;
    var drawnLaneKey = currentLane().key;
    var deckRect = deckSourceRect();
    var handRect = $('hand-row').getBoundingClientRect();
    var dummy = makeDeckDummy(deckRect);
    flyGhost(dummy, handRect).then(function () {
      dummy.remove();
      var maker;
      if (nextDrawOverride) {
        maker = nextDrawOverride;
        nextDrawOverride = null; // 1回使ったら通常のランダム抽選に戻す
      } else {
        maker = FREEPLAY_POOL[Math.floor(Math.random() * FREEPLAY_POOL.length)];
      }
      hand.push(maker());
      drawOneFromDeck();
      lastDrawer = 'player';
      renderAll();
      SoundFX.deal();
      var stackEl = document.querySelector('.lane[data-lane="' + drawnLaneKey + '"] .lane-stack');
      if (stackEl) { stackEl.classList.add('pulse'); setTimeout(function () { stackEl.classList.remove('pulse'); }, 340); }
      checkVictory();
      setNarrator('1枚引いたよ！');
      if (!victoryShown) checkHintsAvailable();
    });
  }

  var victoryShown = false;
  function showVictoryScreen(youWin) {
    var overlay = $('victory-overlay');
    if (!overlay) return;
    overlay.classList.toggle('lose', !youWin);
    $('victory-icon').textContent = youWin ? '🏆' : '💔';
    $('victory-title').textContent = youWin ? 'VICTORY' : 'DEFEAT';
    $('victory-subtitle').textContent = youWin ? 'あなたの勝ち' : '相手の勝ち';
    $('victory-message').textContent = youWin ?
      '4つの距離エリアを先に引ききった！ レースを制したのはあなただ！' :
      '相手が先に4つの距離エリアを引ききった…また挑戦しよう。';
    // 紙吹雪（勝利時のみ）
    var confettiWrap = $('victory-confetti');
    confettiWrap.innerHTML = '';
    if (youWin) {
      var colors = ['#e3b23c', '#f4e6b8', '#7fd396', '#7ea3d9', '#e08fa0'];
      for (var i = 0; i < 60; i++) {
        var piece = document.createElement('span');
        piece.style.left = (Math.random() * 100) + '%';
        piece.style.background = colors[Math.floor(Math.random() * colors.length)];
        piece.style.animationDuration = (2.2 + Math.random() * 1.8) + 's';
        piece.style.animationDelay = (Math.random() * 0.8) + 's';
        confettiWrap.appendChild(piece);
      }
    }
    overlay.classList.add('show');
    $('free-hint').hidden = true;
    showCommandBar(false);
  }
  $('victory-restart').addEventListener('click', function () { location.reload(); });

  function checkVictory() {
    if (victoryShown) return;
    var playerDone = totalDeck() <= 0;
    var cpuDone = cpuTotalDeck() <= 0;
    if (playerDone || cpuDone) {
      victoryShown = true;
      showVictoryScreen(playerDone); // 自分の山札を先に引ききったら自分の勝ち
    }
  }

  /* ===================== 状況カードの使用可能ヒント ===================== */
  // アイテムカードは「使いますか？」の自動ポップアップを廃止し、プレイヤーが
  // 自分の意志でコマンドメニューの🧪アイテムから使うかどうかを判断する形にした
  function checkHintsAvailable() {
    return checkSituationAvailableHint();
  }

  function checkSituationAvailableHint() {
    if (isCpuTurn || phase !== 'idle') return false;
    var hasSituation = hand.some(function (c) { return c.type === 'situation'; });
    if (hasSituation) {
      showSituationHintPopup();
      return true;
    }
    return false;
  }

  function showSituationHintPopup() {
    var popup = $('situation-hint-popup');
    if (!popup) return;
    popup.style.display = 'flex';

    var yesBtn = $('situation-hint-yes');
    var noBtn = $('situation-hint-no');
    var newYes = yesBtn.cloneNode(true);
    var newNo = noBtn.cloneNode(true);
    yesBtn.parentNode.replaceChild(newYes, yesBtn);
    noBtn.parentNode.replaceChild(newNo, noBtn);

    newYes.addEventListener('click', function () {
      popup.style.display = 'none';
      cmdSituation();
    });
    newNo.addEventListener('click', function () {
      popup.style.display = 'none';
    });
  }

  // プレイヤーが自分の意志でアイテムカードを使う（コマンドメニューの🧪アイテムから呼ばれる）
  function cmdItemIdle() {
    if (isCpuTurn || phase !== 'idle' || canDraw) return;
    var hasItem = hand.some(function (c) {
      return c.type === 'item' && c.effectType !== 'run_bonus' && c.effectType !== 'run_penalty';
    });
    if (!hasItem) { setNarrator('今使えるアイテムカードが手札にありません。'); return; }
    prevPhase = phase;
    phase = 'select_item_idle';
    setNarrator('🧪 使う<b>アイテムカード</b>を選んでタップしてください。');
    renderAll();
  }

  /* ===================== 効果音（Web Audio SE） ===================== */
  var SoundFX = (function () {
    var ctx = null;
    function getCtx() {
      if (!ctx) {
        var AC = window.AudioContext || window.webkitAudioContext;
        if (AC) ctx = new AC();
      }
      if (ctx && ctx.state === 'suspended') ctx.resume();
      return ctx;
    }
    function playCardDeal() {
      var c = getCtx();
      if (!c) return;
      try {
        var t0 = c.currentTime;
        var jitter = (Math.random() - 0.5);

        // ① フリック音：指ではじくような鋭いスナップ（アタックを急峻に）
        var n1 = Math.floor(c.sampleRate * 0.03);
        var buf1 = c.createBuffer(1, n1, c.sampleRate);
        var d1 = buf1.getChannelData(0);
        for (var i = 0; i < n1; i++) {
          d1[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n1, 3);
        }
        var src1 = c.createBufferSource();
        src1.buffer = buf1;
        var bp1 = c.createBiquadFilter();
        bp1.type = 'bandpass';
        bp1.frequency.value = 2800 + jitter * 700;
        bp1.Q.value = 3.4;
        var g1 = c.createGain();
        g1.gain.setValueAtTime(0.26, t0);
        g1.gain.exponentialRampToValueAtTime(0.001, t0 + 0.028);
        src1.connect(bp1); bp1.connect(g1); g1.connect(c.destination);
        src1.start(t0);

        // ② エア音：カードが空を切って滑るシュッという音（周波数を下向きにスイープ）
        var dur2 = 0.085 + Math.random() * 0.02;
        var n2 = Math.floor(c.sampleRate * dur2);
        var buf2 = c.createBuffer(1, n2, c.sampleRate);
        var d2 = buf2.getChannelData(0);
        for (var j = 0; j < n2; j++) { d2[j] = Math.random() * 2 - 1; }
        var src2 = c.createBufferSource();
        src2.buffer = buf2;
        var bp2 = c.createBiquadFilter();
        bp2.type = 'bandpass';
        bp2.frequency.setValueAtTime(5200 + jitter * 400, t0);
        bp2.frequency.exponentialRampToValueAtTime(1300, t0 + dur2);
        bp2.Q.value = 1.1;
        var g2 = c.createGain();
        g2.gain.setValueAtTime(0.001, t0);
        g2.gain.exponentialRampToValueAtTime(0.09, t0 + 0.012);
        g2.gain.exponentialRampToValueAtTime(0.0001, t0 + dur2);
        src2.connect(bp2); bp2.connect(g2); g2.connect(c.destination);
        src2.start(t0);

        // ③ 着地の一瞬の重み（低音のコツンという響き）
        var osc = c.createOscillator();
        var g3 = c.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(115 + jitter * 12, t0 + 0.018);
        g3.gain.setValueAtTime(0.0001, t0 + 0.018);
        g3.gain.exponentialRampToValueAtTime(0.055, t0 + 0.026);
        g3.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.09);
        osc.connect(g3); g3.connect(c.destination);
        osc.start(t0 + 0.018); osc.stop(t0 + 0.1);
      } catch (e) { }
    }
    function playShimmer() {
      var c = getCtx();
      if (!c) return;
      try {
        var freqs = [1046.5, 1318.5, 1567.98];
        freqs.forEach(function (f, idx) {
          var osc = c.createOscillator();
          var g = c.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(f, c.currentTime + idx * 0.04);
          g.gain.setValueAtTime(0.001, c.currentTime + idx * 0.04);
          g.gain.exponentialRampToValueAtTime(0.07, c.currentTime + idx * 0.04 + 0.01);
          g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + idx * 0.04 + 0.16);
          osc.connect(g); g.connect(c.destination);
          osc.start(c.currentTime + idx * 0.04);
          osc.stop(c.currentTime + idx * 0.04 + 0.18);
        });
      } catch (e) { }
    }
    function playFanfareJingle() {
      var c = getCtx();
      if (!c) return;
      try {
        var chord = [523.25, 659.25, 783.99, 1046.5];
        chord.forEach(function (f, idx) {
          var osc = c.createOscillator();
          var g = c.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(f, c.currentTime + idx * 0.035);
          g.gain.setValueAtTime(0.001, c.currentTime + idx * 0.035);
          g.gain.exponentialRampToValueAtTime(0.1, c.currentTime + idx * 0.035 + 0.015);
          g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + idx * 0.035 + 0.28);
          osc.connect(g); g.connect(c.destination);
          osc.start(c.currentTime + idx * 0.035);
          osc.stop(c.currentTime + idx * 0.035 + 0.3);
        });
      } catch (e) { }
    }
    return {
      deal: playCardDeal,
      shimmer: playShimmer,
      fanfare: playFanfareJingle
    };
  })();

  /* ===================== 初期50枚カード配布演出 ===================== */
  async function dealInitialCards(isManual, runId) {
    // 画面中央に50枚デッキスタックを生成
    var centerEl = document.createElement('div');
    centerEl.className = 'deal-center-deck';
    centerEl.innerHTML =
      '<div class="deal-deck-stack">' +
      '<div class="deal-deck-back"></div>' +
      '<div class="deal-deck-badge" id="deal-deck-count">50</div>' +
      '<div class="deal-deck-label">DECK (50枚)</div>' +
      '</div>';
    document.body.appendChild(centerEl);

    var countBadge = centerEl.querySelector('#deal-deck-count');
    var currentCount = 50;

    function updateDeckCount(val) {
      currentCount = val;
      if (countBadge) {
        countBadge.textContent = String(val);
        countBadge.style.animation = 'none';
        void countBadge.offsetHeight;
        countBadge.style.animation = 'badgePop .2s cubic-bezier(.34,1.56,.64,1)';
      }
    }

    function flyDealGhost(destRect, speedMs, card) {
      var duration = speedMs || 240;
      var cRect = centerEl.getBoundingClientRect();
      var ghost = document.createElement('div');
      ghost.className = 'deal-ghost-fast';
      ghost.style.left = cRect.left + 'px';
      ghost.style.top = cRect.top + 'px';
      ghost.style.width = cRect.width + 'px';
      ghost.style.height = cRect.height + 'px';
      if (card) {
        // 手札に来るカードは、裏面ではなく実際のカード面を飛ばす
        ghost.classList.add('deal-ghost-face');
        if (card.img) {
          ghost.classList.add('has-img');
          ghost.style.backgroundImage = 'url(' + card.img + ')';
        } else {
          ghost.style.backgroundImage = 'none';
          ghost.textContent = card.icon || '';
        }
      }
      document.body.appendChild(ghost);

      return new Promise(function (resolve) {
        requestAnimationFrame(function () {
          var dx = (destRect.left + destRect.width / 2) - (cRect.left + cRect.width / 2);
          var dy = (destRect.top + destRect.height / 2) - (cRect.top + cRect.height / 2);
          var scale = Math.max(0.4, Math.min(destRect.width / cRect.width, 1));
          ghost.style.transform = 'translate(' + dx + 'px,' + dy + 'px) scale(' + scale + ')';
          ghost.style.opacity = '0.85';
        });
        setTimeout(function () {
          ghost.remove();
          resolve();
        }, duration);
      });
    }

    await sleep(300);
    if (runId && runId !== tutorialRunId) { centerEl.remove(); return; }

    // ① 4つの距離エリア（各10枚・計40枚）へ配る
    if (!isManual) {
      setNarrator('50枚のデッキから、まずは<b>各10枚（計40枚）</b>を4つの距離エリア（山札）に配るよ。');
    }
    var laneKeys = ['nige', 'senko', 'sashi', 'oikomi'];
    for (var li = 0; li < laneKeys.length; li++) {
      if (runId && runId !== tutorialRunId) { centerEl.remove(); return; }
      var lKey = laneKeys[li];
      var laneObj = LANES.find(function (l) { return l.key === lKey; });
      var laneEl = document.querySelector('.lane[data-lane="' + lKey + '"]');
      var laneRect = laneEl ? laneEl.getBoundingClientRect() : $('lanes').getBoundingClientRect();

      // 各レーンへテンポよくカードが飛ぶ（3回のゴーストで10枚配る演出）
      for (var step = 0; step < 3; step++) {
        flyDealGhost(laneRect, 180);
        await sleep(isManual ? 50 : 80);
      }
      laneObj.count = 10;
      updateDeckCount(currentCount - 10);
      renderDeckLanes();
      if (laneEl) {
        laneEl.classList.add('deal-flash');
        setTimeout(function (el) { if (el) el.classList.remove('deal-flash'); }, 350, laneEl);
      }
      Haptics.place();
      await sleep(isManual ? 100 : 180);
    }

    await sleep(isManual ? 180 : 350);
    if (runId && runId !== tutorialRunId) { centerEl.remove(); return; }

    // ② 残り10枚のうち3枚をファームへ配る
    if (!isManual) {
      setNarrator('残り10枚のうち、<b>3枚はファーム</b>に置かれるよ。');
    }
    var farmZone = $('zone-farm');
    var farmRect = farmZone.getBoundingClientRect();
    var starterFarm = [kutsuwa(), kutsuwa(), kutsuwa()];
    for (var fi = 0; fi < starterFarm.length; fi++) {
      if (runId && runId !== tutorialRunId) { centerEl.remove(); return; }
      await flyDealGhost(farmRect, 220);
      farm.push(starterFarm[fi]);
      updateDeckCount(currentCount - 1);
      renderFarm();
      if (farmZone) {
        farmZone.classList.add('deal-flash');
        setTimeout(function (el) { if (el) el.classList.remove('deal-flash'); }, 300, farmZone);
      }
      Haptics.place();
      await sleep(isManual ? 90 : 150);
    }

    await sleep(isManual ? 180 : 350);
    if (runId && runId !== tutorialRunId) { centerEl.remove(); return; }

    // ③ 最後の7枚を手札へ配る
    if (!isManual) {
      setNarrator('そして最後の<b>7枚が手札</b>に来るよ！');
    }
    var handZone = $('hand-row');
    var handRect = handZone.getBoundingClientRect();
    var starterHand = [
      forceCard(),
      forceCard(),
      forceCard(),
      goldShip(),
      rousham(),
      seferRasiel(),
      whip()
    ];

    for (var hi = 0; hi < starterHand.length; hi++) {
      if (runId && runId !== tutorialRunId) { centerEl.remove(); return; }
      await flyDealGhost(handRect, 220, starterHand[hi]);
      hand.push(starterHand[hi]);
      updateDeckCount(currentCount - 1);
      renderHand();
      Haptics.place();
      await sleep(isManual ? 80 : 120);
    }

    if (handZone) {
      handZone.classList.add('deal-flash');
      setTimeout(function (el) { if (el) el.classList.remove('deal-flash'); }, 400, handZone);
    }

    centerEl.classList.add('hide');
    setTimeout(function () { centerEl.remove(); }, 350);
    await sleep(350);
  }

  function rewardDraw(n) {
    var pool = FREEPLAY_POOL;
    var chain = Promise.resolve();
    for (var i = 0; i < n; i++) {
      (function (i) {
        chain = chain.then(function () {
          var deckRect = deckSourceRect();
          var handRect = $('hand-row').getBoundingClientRect();
          var dummy = makeDeckDummy(deckRect);
          return flyGhost(dummy, handRect).then(function () {
            dummy.remove();
            hand.push(pool[i % pool.length]());
            drawOneFromDeck();
            renderAll();
            SoundFX.deal();
            return sleep(160);
          });
        });
      })(i);
    }
    return chain;
  }

  /* ===================== command bar visibility ===================== */
  function showCommandBar(show) {
    var bar = $('command-bar');
    if (!bar) return;
    bar.hidden = !show;
    bar.classList.toggle('hidden', !show);
    bar.style.display = show ? 'flex' : 'none';
  }

  /* ===================== main tutorial flow ===================== */
  var tutorialRunId = 0;

  async function runTutorial() {
    var myRunId = ++tutorialRunId;
    document.body.classList.remove('manual-mode');
    var modeOpts = document.querySelectorAll('#mode-switch .mode-opt');
    modeOpts.forEach(function (opt) {
      opt.classList.toggle('active', opt.dataset.mode === 'tutorial');
    });
    showCommandBar(false); // チュートリアル中は循環矢印（コマンドバー）を非表示
    $('narrator').style.display = '';

    // 初期状態をクリア
    LANES.forEach(function (l) { l.count = 0; });
    CPU_LANES.forEach(function (l) { l.count = 10; }); // 相手は最初から自分の山札を持っている
    farm = [];
    hand = [];
    field = null;
    fieldGuard = null;
    situation = null;
    renderAll();

    setNarrator('ようこそ、<b>フォース オブ ザ ホース</b>の世界へ！ まずは対戦の準備をしよう。');
    setProgress(0);
    await waitNext();
    if (myRunId !== tutorialRunId) return;

    // STEP 0: 50枚デッキからの初期カード配布
    setProgress(1);
    showNextButton(false);
    await dealInitialCards(false, myRunId);
    if (myRunId !== tutorialRunId) return;
    setNarrator('手札（7枚）・ファーム（3枚）・山札（各10枚）が揃ったね！ それぞれのカードの役割を見ていこう。');
    showNextButton(true);
    await waitNext();
    if (myRunId !== tutorialRunId) return;

    // STEP 1: フォースカード
    setProgress(2);
    var forceEl = cardElById(hand.filter(function (c) { return c.type === 'force'; })[0].id);
    await explainStep(forceEl, null, 'このカードが<b>フォースカード</b>だ！ お気に入りの馬を走破させるとき、コストとして使うんだ。');
    if (myRunId !== tutorialRunId) return;

    // STEP 2: 馬カード
    setProgress(3);
    var horseEl = cardElById(hand.filter(function (c) { return c.type === 'horse'; })[0].id);
    await explainStep(horseEl, null, 'このカードが<b>馬カード</b>だ！ このカードを使って相手と勝負するよ。');
    if (myRunId !== tutorialRunId) return;

    // STEP 3: アイテムカード
    setProgress(4);
    var itemEl = cardElById(hand.filter(function (c) { return c.type === 'item'; })[0].id);
    await explainStep(itemEl, null, '次はアイテムカードを紹介するよ。<b>アイテムカード</b>は走破のタイミングで、自分と相手が交互に好きな枚数だけ使える、競走馬をサポートするカードなんだ。');
    if (myRunId !== tutorialRunId) return;

    // STEP 4: ファーム
    setProgress(5);
    await explainStep($('zone-farm'), 'zone-farm', 'ここが<b>ファーム</b>だ。開始時に置かれた3枚や、使い終わったカードを置く場所だよ。');
    if (myRunId !== tutorialRunId) return;

    // STEP 5: 状況カード置き場
    setProgress(6);
    await explainStep($('zone-situation'), 'zone-situation', 'ここが<b>状況カード置き場</b>だ。状況カードを場に置くよ。');
    if (myRunId !== tutorialRunId) return;

    // STEP 6: 距離エリア(山札) / 勝利条件
    setProgress(7);
    await explainStep($('zone-deck'), 'zone-deck', 'ここが<b>距離エリア</b>だ。山札は「逃げ」「先行」「差し」「追込」の4つに各10枚配られていて、<b>逃げから順番に</b>引いていくんだ。逃げが引き終わったら先行、その次は差し、最後に追込。4つとも先に引ききったプレイヤーの勝ちだよ。');
    hideArrow();
    if (myRunId !== tutorialRunId) return;

    // STEP 7: 実際に走破してみよう（バナー）
    setProgress(8);
    setNarrator('それじゃあ、<b>実際に走破してみよう！</b>');
    showBanner('実際に走破してみよう！');
    showNextButton(true);
    await waitNext();
    if (myRunId !== tutorialRunId) return;

    // STEP 8: 走破させたい馬カードを選んでフィールドに出す
    setProgress(9);
    setNarrator('まずは<b>走破させたい馬カード</b>を選んでタップしてね。対戦フィールドに出すよ。');
    setZoneActive('field-body', true);
    showNextButton(false);
    await waitSelect('select-horse', 1);
    setZoneActive('field-body', false);
    if (myRunId !== tutorialRunId) return;

    // STEP 9: 選んだ馬に必要なフォースカードをファームへ送る
    setProgress(10);
    var runHorseCost = field ? (field.cost || 2) : 2;
    setNarrator('<b>' + (field ? field.name : 'この馬') + '</b>を走破させるコストとして、<b>フォースカードを' + runHorseCost + '枚</b>選んで、手札からファームに送ろう。カードをタップしてね。');
    setZoneActive('zone-farm', true);
    await waitSelect('select-force', runHorseCost);
    setZoneActive('zone-farm', false);
    if (myRunId !== tutorialRunId) return;

    // STEP 10: 相手のガード確認
    setProgress(11);
    setNarrator('コストを支払えたね！ 馬カードはもうフィールドに出ている。ここで相手がガードするか確認しよう…');
    showNextButton(true);
    await waitNext();
    if (myRunId !== tutorialRunId) return;
    setNarrator('相手：「<b>ガードしません</b>」');
    await showOpponentBubble('ガードしません');
    showNextButton(true);
    await waitNext();
    if (myRunId !== tutorialRunId) return;

    // STEP 11: 走破成功 → 報酬ドロー
    setProgress(12);
    var runCount = field ? (field.run || 3) : 3;
    setNarrator('やった、<b>走破成功だ！</b> 走破に成功したら、馬カードの走破数ぶんだけ山札からカードを引くよ。');
    await showBanner('走破成功！');
    showNextButton(true);
    await waitNext();
    if (myRunId !== tutorialRunId) return;
    setNarrator('走破数は ' + runCount + '。山札から ' + runCount + ' 枚引くよ。');
    hideArrow();
    await rewardDraw(runCount);
    if (myRunId !== tutorialRunId) return;
    setNarrator('引いた枚数マイナス1枚、つまり <b>' + (runCount - 1) + '枚</b> をファームに捨てよう。カードをタップしてね。');
    showNextButton(false);
    setZoneActive('zone-farm', true);
    await waitSelect('select-any', runCount - 1);
    setZoneActive('zone-farm', false);
    if (myRunId !== tutorialRunId) return;

    // STEP 13: 使い終わった馬カードをファームへ
    setProgress(14);
    setNarrator('最後に、走破に使った馬カードをファームに送るよ。');
    showNextButton(true);
    await waitNext();
    if (myRunId !== tutorialRunId) return;
    if (field) {
      var fieldEl = document.querySelector('#field-body .field-mini');
      var farmRect = $('zone-farm').getBoundingClientRect();
      await flyGhost(fieldEl, farmRect);
      farm.push(field);
      field = null;
      fieldGuard = null;
      renderAll();
    }

    // STEP 14: 繰り返しメッセージ
    setProgress(15);
    setNarrator('これを交互に繰り返して、カードを全て山札から引ききったら勝ちなんだ。');
    await waitNext();
    if (myRunId !== tutorialRunId) return;

    // STEP 15: 自由プレイへ
    setProgress(16);
    setNarrator('次は実際に自分でカードを使ってみよう。ここから先は自由に操作できるよ！');
    await waitNext();
    if (myRunId !== tutorialRunId) return;

    startFreePlay();
  }

  function startFreePlay() {
    interactionMode = 'freeplay';
    hideArrow();
    clearZoneActive();
    $('zone-deck').classList.add('tappable');
    $('narrator').style.display = 'none';
    document.body.classList.add('manual-mode');
    var modeOpts = document.querySelectorAll('#mode-switch .mode-opt');
    modeOpts.forEach(function (opt) {
      opt.classList.toggle('active', opt.dataset.mode === 'manual');
    });
    $('step-label').textContent = '自分で操作';
    phase = 'idle';
    selectedHorse = null;
    selectedForces = [];
    runBonus = 0;
    itemGuardBonus = 0;
    canDraw = true;
    isCpuTurn = false;
    hasRunThisTurn = false;
    opponentHandCount = 0;
    // 相手（CPU）にも自分と同じく初期手札7枚を配る（フォース・馬をバランスよく持たせ、序盤から走破できるようにする）
    cpuHand = [forceCard(), forceCard(), forceCard(), silkMobius(), seiunSky(), doDeuce(), hibiscus()];
    opponentHandCount = cpuHand.length;
    cpuHorseCard = null;
    if (cpuTotalDeck() <= 0) CPU_LANES.forEach(function (l) { l.count = 10; });
    renderRaceInfo();
    showNextButton(false);
    $('free-hint').hidden = true;
    showCommandBar(true); // 自分で操作する段階になったらコマンドバーを表示
    renderAll();
    cmdDraw(); // 自分のターンの初めに自動でカードを1枚引く
  }

  /* ===================== 自分で操作（ナレーターなし・完全手動プレイモード） ===================== */
  async function startManualMode() {
    var myRunId = ++tutorialRunId; // 進行中の処理を中断し新しいIDを発行
    interactionMode = 'freeplay';
    hideArrow();
    clearZoneActive();
    $('zone-deck').classList.remove('tappable');
    $('narrator').style.display = 'none';
    document.body.classList.add('manual-mode');
    var modeOpts = document.querySelectorAll('#mode-switch .mode-opt');
    modeOpts.forEach(function (opt) {
      opt.classList.toggle('active', opt.dataset.mode === 'manual');
    });
    showCommandBar(false); // 配布中はコマンドバーを一旦隠す

    // 盤面を一旦初期化（カードを空にしてから配り始める）
    LANES.forEach(function (l) { l.count = 0; });
    CPU_LANES.forEach(function (l) { l.count = 10; });
    farm = [];
    hand = [];
    cpuHand = [forceCard(), forceCard(), forceCard(), silkMobius(), seiunSky(), doDeuce(), hibiscus()];
    opponentHandCount = cpuHand.length;
    field = null;
    fieldGuard = null;
    cpuHorseCard = null;
    situation = null;

    phase = 'idle';
    selectedHorse = null;
    selectedForces = [];
    runBonus = 0;
    itemGuardBonus = 0;
    canDraw = false;
    isCpuTurn = false;
    hasRunThisTurn = false;

    setProgress(16);
    $('step-label').textContent = '自分で操作';
    renderRaceInfo();
    renderAll();

    // 50枚デッキ配布演出を実行（テンポよく山札・ファーム・手札へ配布）
    await dealInitialCards(true, myRunId);
    if (myRunId !== tutorialRunId) return;

    // 配布完了後に手動プレイ開始
    $('zone-deck').classList.add('tappable');
    canDraw = true;
    showCommandBar(true);
    renderAll();
    cmdDraw(); // 最初の手番ドロー
  }

  function startTutorialMode() {
    tutorialRunId++;
    document.body.classList.remove('manual-mode');
    var modeOpts = document.querySelectorAll('#mode-switch .mode-opt');
    modeOpts.forEach(function (opt) {
      opt.classList.toggle('active', opt.dataset.mode === 'tutorial');
    });
    $('narrator').style.display = '';
    showCommandBar(false);
    runTutorial();
  }

  /* ===================== BGM（音源ファイル再生） ===================== */
  var BGM = (function () {
    var SRC = 'audio/Banners_in_the_Gale.mp3';
    var TARGET_VOLUME = 0.45;
    var FADE_IN_MS = 1200;
    var FADE_OUT_MS = 600;

    var audio = null, fadeTimer = null;

    function ensureAudio() {
      if (!audio) {
        audio = new Audio(SRC);
        audio.loop = true;
        audio.preload = 'auto';
        audio.volume = 0;
      }
      return audio;
    }

    function clearFade() {
      if (fadeTimer) { clearInterval(fadeTimer); fadeTimer = null; }
    }

    function fadeTo(target, duration) {
      clearFade();
      var startVol = audio.volume;
      var startTime = (window.performance && performance.now) ? performance.now() : Date.now();
      fadeTimer = setInterval(function () {
        var now = (window.performance && performance.now) ? performance.now() : Date.now();
        var t = Math.min(1, (now - startTime) / duration);
        audio.volume = startVol + (target - startVol) * t;
        if (t >= 1) {
          clearFade();
          if (target === 0) audio.pause();
        }
      }, 30);
    }

    function start() {
      ensureAudio();
      var playPromise = audio.play();
      if (playPromise && playPromise.catch) { playPromise.catch(function () { }); }
      fadeTo(TARGET_VOLUME, FADE_IN_MS);
    }

    function stop() {
      if (!audio) return;
      fadeTo(0, FADE_OUT_MS);
    }

    return { start: start, stop: stop };
  })();

  var bgmEnabled = true;
  try {
    var savedBgm = localStorage.getItem('foth_bgm_enabled');
    if (savedBgm !== null) bgmEnabled = savedBgm === '1';
  } catch (e) { }

  function updateBgmButton() {
    var btn = $('bgm-toggle');
    if (!btn) return;
    btn.textContent = bgmEnabled ? '🔊 BGM' : '🔇 BGM';
    btn.classList.toggle('is-off', !bgmEnabled);
  }
  updateBgmButton();

  if ($('bgm-toggle')) {
    $('bgm-toggle').addEventListener('click', function () {
      Haptics.tap();
      bgmEnabled = !bgmEnabled;
      try { localStorage.setItem('foth_bgm_enabled', bgmEnabled ? '1' : '0'); } catch (e) { }
      updateBgmButton();
      if (bgmEnabled) BGM.start(); else BGM.stop();
    });
  }

  // ブラウザの自動再生制限のため、最初のユーザー操作をきっかけに再生を開始する
  document.addEventListener('click', function initBgmOnFirstTap() {
    if (bgmEnabled) BGM.start();
    document.removeEventListener('click', initBgmOnFirstTap);
  }, { once: true });

  /* ===================== events ===================== */
  var suppressNextHandClick = false;
  $('hand-row').addEventListener('click', function (e) {
    var el = e.target.closest ? e.target.closest('.card') : null;
    if (!el) return;
    if (suppressNextHandClick) { suppressNextHandClick = false; return; }
    onHandCardClick(el.dataset.id);
  });

  // カード詳細拡大表示（スマホ長押し＆PC右クリック）
  (function setupCardInspection() {
    var pressTimer = null;
    var pressedTarget = null;
    var touchStartX = 0, touchStartY = 0;
    var LONG_PRESS_MS = 380;

    function getCardFromEvent(target) {
      if (!target || !target.closest) return null;
      // 1. 手札カード
      var handCardEl = target.closest('#hand-row .card');
      if (handCardEl) {
        var hCard = hand.find(function (c) { return c.id === handCardEl.dataset.id; });
        return hCard ? { card: hCard, label: '手札カード詳細' } : null;
      }
      // 2. 対戦フィールドの馬カード
      var fieldEl = target.closest('#zone-field');
      if (fieldEl && field) {
        return { card: field, label: '対戦フィールド' };
      }
      // 3. ファームのカード
      var farmEl = target.closest('#zone-farm');
      if (farmEl && farm.length > 0) {
        return { card: farm[farm.length - 1], label: 'ファーム（最新カード）' };
      }
      // 4. 状況カード
      var sitEl = target.closest('#zone-situation');
      if (sitEl && situation) {
        return { card: situation, label: '状況カード' };
      }
      return null;
    }

    // --- PC用：右クリック（contextmenu）による即時拡大プレビュー ---
    document.addEventListener('contextmenu', function (e) {
      // closeup-layerが開いている時は右クリックでも閉じる
      var layer = $('closeup-layer');
      if (layer && layer.classList.contains('show')) {
        e.preventDefault();
        CardCloseup.hide();
        return;
      }
      var info = getCardFromEvent(e.target);
      if (info && info.card) {
        e.preventDefault();
        Haptics.tap();
        CardCloseup.show(info.card, { label: info.label });
      }
    });

    // --- スマホ用：長押し（touchstart / touchend / touchmove） ---
    function onTouchStart(e) {
      var touch = e.touches ? e.touches[0] : null;
      if (!touch) return;
      var info = getCardFromEvent(e.target);
      if (!info || !info.card) return;

      touchStartX = touch.clientX;
      touchStartY = touch.clientY;
      pressedTarget = info;

      if (pressTimer) clearTimeout(pressTimer);
      pressTimer = setTimeout(function () {
        if (pressedTarget && pressedTarget.card) {
          Haptics.tap();
          CardCloseup.show(pressedTarget.card, { label: pressedTarget.label });
          suppressNextHandClick = true;
        }
        pressTimer = null;
      }, LONG_PRESS_MS);
    }

    function onTouchMove(e) {
      if (!pressTimer) return;
      var touch = e.touches ? e.touches[0] : null;
      if (!touch) return;
      var dx = Math.abs(touch.clientX - touchStartX);
      var dy = Math.abs(touch.clientY - touchStartY);
      if (dx > 10 || dy > 10) {
        clearTimeout(pressTimer);
        pressTimer = null;
        pressedTarget = null;
      }
    }

    function onTouchEnd() {
      if (pressTimer) {
        clearTimeout(pressTimer);
        pressTimer = null;
      }
      pressedTarget = null;
    }

    document.addEventListener('touchstart', onTouchStart, { passive: true });
    document.addEventListener('touchmove', onTouchMove, { passive: true });
    document.addEventListener('touchend', onTouchEnd, { passive: true });
    document.addEventListener('touchcancel', onTouchEnd, { passive: true });
  })();

  $('zone-deck').addEventListener('click', onDeckClick);
  if ($('restart-btn')) $('restart-btn').addEventListener('click', function () { location.reload(); });
  $('run-support-yes').addEventListener('click', function () {
    Haptics.tap();
    closeRunSupportChoice(true);
  });
  $('run-support-no').addEventListener('click', function () {
    Haptics.tap();
    closeRunSupportChoice(false);
  });

  $('cmd-fab').addEventListener('click', function (e) {
    e.stopPropagation();
    Haptics.tap();
    var menu = $('cmd-menu');
    var willOpen = !menu.classList.contains('open');
    menu.classList.toggle('open', willOpen);
    updateFabDisplay();
  });
  $('command-bar').addEventListener('click', function (e) {
    var btn = e.target.closest ? e.target.closest('.cmd-menu-btn') : null;
    if (!btn || btn.disabled) return;
    Haptics.tap();
    var cmd = btn.dataset.cmd;
    if (cmd === 'run') cmdRun();
    else if (cmd === 'item') cmdItemIdle();
    else if (cmd === 'end') cmdEndTurn();
    $('cmd-menu').classList.remove('open');
    updateFabDisplay();
  });
  // メニューの外側をタップしたら閉じる
  document.addEventListener('click', function (e) {
    var menu = $('cmd-menu');
    if (!menu || !menu.classList.contains('open')) return;
    if (e.target.closest && e.target.closest('#command-bar')) return;
    menu.classList.remove('open');
    updateFabDisplay();
  });

  /* ===================== ドラッグ機能（ナレーター） ===================== */
  function makeDraggable(el, handleSelector) {
    if (!el) return;
    var isDragging = false;
    var startX = 0, startY = 0;
    var initLeft = 0, initTop = 0;
    var movedThreshold = false;

    function startDrag(e) {
      // ボタン類をクリックした時はドラッグを開始せず通常のクリックを優先
      if (e.target.closest && e.target.closest('button, .narrator-next, .narrator-back, .narrator-forward, .cmd-fab, .cmd-menu-btn')) {
        return;
      }

      var clientX = e.clientX !== undefined ? e.clientX : (e.touches && e.touches[0] ? e.touches[0].clientX : null);
      var clientY = e.clientY !== undefined ? e.clientY : (e.touches && e.touches[0] ? e.touches[0].clientY : null);
      if (clientX === null || clientY === null) return;

      var rect = el.getBoundingClientRect();
      startX = clientX;
      startY = clientY;
      initLeft = rect.left;
      initTop = rect.top;
      isDragging = true;
      movedThreshold = false;

      if (e.type === 'touchstart') {
        // スクロールを防止
        e.preventDefault();
      }
    }

    function onDrag(e) {
      if (!isDragging) return;
      var clientX = e.clientX !== undefined ? e.clientX : (e.touches && e.touches[0] ? e.touches[0].clientX : null);
      var clientY = e.clientY !== undefined ? e.clientY : (e.touches && e.touches[0] ? e.touches[0].clientY : null);
      if (clientX === null || clientY === null) return;

      var dx = clientX - startX;
      var dy = clientY - startY;

      // わずかなクリックブレとドラッグを判定
      if (!movedThreshold && (Math.abs(dx) > 3 || Math.abs(dy) > 3)) {
        movedThreshold = true;
        document.body.dataset.narratorMoved = '1';
        el.classList.add('dragging');
        el.style.position = 'fixed';
        var rect = el.getBoundingClientRect();
        el.style.width = rect.width + 'px';
        el.style.margin = '0';
        el.style.bottom = 'auto';
        el.style.right = 'auto';
        el.style.zIndex = '500';
      }

      if (movedThreshold) {
        var newLeft = initLeft + dx;
        var newTop = initTop + dy;

        var elW = el.offsetWidth || 280;
        var elH = el.offsetHeight || 60;
        newLeft = Math.max(4, Math.min(window.innerWidth - elW - 4, newLeft));
        newTop = Math.max(4, Math.min(window.innerHeight - elH - 4, newTop));

        el.style.left = newLeft + 'px';
        el.style.top = newTop + 'px';
      }

      if (e.cancelable) e.preventDefault();
    }

    function stopDrag() {
      if (!isDragging) return;
      isDragging = false;
      el.classList.remove('dragging');
    }

    el.addEventListener('mousedown', startDrag);
    document.addEventListener('mousemove', onDrag, { passive: false });
    document.addEventListener('mouseup', stopDrag);

    el.addEventListener('touchstart', startDrag, { passive: false });
    document.addEventListener('touchmove', onDrag, { passive: false });
    document.addEventListener('touchend', stopDrag);
    document.addEventListener('touchcancel', stopDrag);
  }

  makeDraggable($('narrator'));

  /* ===================== ナレーターの初期位置（自分の山札エリアに美しく固定） ===================== */
  function positionNarratorInitial() {
    var narrator = $('narrator');
    if (!narrator || document.body.dataset.narratorMoved) return;

    narrator.style.top = '';
    narrator.style.left = '';
    narrator.style.right = '';
    narrator.style.bottom = '';
    narrator.style.width = '';
    narrator.style.transform = '';
  }
  window.addEventListener('resize', function () {
    if (!document.body.dataset.narratorMoved) positionNarratorInitial();
  });

  /* ===================== holographic card shine (pointer-tracked) ===================== */
  (function setupHoloShine() {
    var MAX_TILT = 8; // degrees
    function updateFromPoint(el, clientX, clientY) {
      var r = el.getBoundingClientRect();
      var px = (clientX - r.left) / r.width;   // 0..1
      var py = (clientY - r.top) / r.height;   // 0..1
      px = Math.max(0, Math.min(1, px));
      py = Math.max(0, Math.min(1, py));
      var rx = (0.5 - py) * MAX_TILT * 2; // tilt up/down
      var ry = (px - 0.5) * MAX_TILT * 2; // tilt left/right
      el.style.setProperty('--holo-x', (px * 100).toFixed(1) + '%');
      el.style.setProperty('--holo-y', (py * 100).toFixed(1) + '%');
      el.style.setProperty('--holo-rx', rx.toFixed(2) + 'deg');
      el.style.setProperty('--holo-ry', ry.toFixed(2) + 'deg');
      el.style.setProperty('--holo-op', '1');
    }
    function reset(el) {
      el.style.setProperty('--holo-op', '0');
      el.style.setProperty('--holo-rx', '0deg');
      el.style.setProperty('--holo-ry', '0deg');
      el.classList.remove('holo-active');
    }
    function findCard(target) { return target && target.closest ? target.closest('.hand-row .card') : null; }
    var activeEl = null;
    $('hand-row').addEventListener('touchmove', function (e) {
      var t = e.touches[0];
      var el = document.elementFromPoint(t.clientX, t.clientY);
      var card = findCard(el);
      if (activeEl && activeEl !== card) { reset(activeEl); }
      if (card) { card.classList.add('holo-active'); updateFromPoint(card, t.clientX, t.clientY); activeEl = card; }
    }, { passive: true });
    $('hand-row').addEventListener('touchend', function () { if (activeEl) { reset(activeEl); activeEl = null; } }, { passive: true });
    $('hand-row').addEventListener('mousemove', function (e) {
      var card = findCard(e.target);
      if (activeEl && activeEl !== card) { reset(activeEl); }
      if (card) { card.classList.add('holo-active'); updateFromPoint(card, e.clientX, e.clientY); activeEl = card; }
    });
    $('hand-row').addEventListener('mouseleave', function () { if (activeEl) { reset(activeEl); activeEl = null; } });
  })();

  /* ===================== haptic feedback ===================== */
  var Haptics = (function () {
    var supported = typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';
    function fire(pattern) { if (supported) { try { navigator.vibrate(pattern); } catch (e) { } } }
    return {
      tap: function () { fire(8); },        // light UI tap (buttons)
      select: function () { fire(12); },    // card selected / lifted
      place: function () { fire([10, 30, 16]); }, // card lands on the field
      warn: function () { fire([16, 40, 16, 40, 16]); } // invalid action / shake
    };
  })();

  /* ===================== perspective toggle ===================== */
  (function setupPerspectiveToggle() {
    var btn = $('perspective-toggle');
    if (!btn) return;
    btn.addEventListener('click', function () {
      Haptics.tap();
      var on = document.body.classList.toggle('field-3d');
      btn.classList.toggle('is-on', on);
    });
  })();

  /* ===================== mobile settings panel (angle / depth / zoom) ===================== */
  (function setupSettingsPanel() {
    var gear = $('settings-gear');
    var overlay = $('settings-overlay');
    if (!gear || !overlay) return;
    var closeBtn = $('settings-close');
    var tiltRange = $('tilt-range');
    var tiltValue = $('tilt-value');
    var depthRange = $('depth-range');
    var depthValue = $('depth-value');
    var zoomRange = $('zoom-range');
    var zoomValue = $('zoom-value');
    var touchToggle = $('touch-tilt-toggle');

    var resetBtn = $('settings-reset');
    var presetBtns = overlay.querySelectorAll('.preset-btn[data-angle]');
    var legacyChips = document.querySelectorAll('#tilt-select .tilt-opt[data-angle]');

    function computeDefaultZoom() {
      return (typeof window !== 'undefined' && window.innerWidth >= 860) ? 80 : 100;
    }
    var userAdjustedZoom = false;
    var DEFAULTS = { tilt: 10, depth: 1300, zoom: computeDefaultZoom() };
    var baseTilt = DEFAULTS.tilt;
    var pointerTiltEnabled = true;
    var POINTER_RANGE = 6; // degrees of extra tilt added by touch/mouse position

    function applyTiltVar(deg) {
      document.body.style.setProperty('--tilt-angle', deg + 'deg');
      // 傾き角度に応じてフィールドの引き上げ量を動的に計算（0°で0px、10°で-110px、20°で-195px）
      var shiftY = deg <= 0 ? 0 : (-110 - (deg - 10) * 8.5);
      document.body.style.setProperty('--field-tilt-shift-y', shiftY.toFixed(1) + 'px');
      var rounded = Math.round(deg);
      document.body.dataset.tilt = String(rounded);
      document.body.classList.toggle('tilt-20-plus', deg >= 18);
      var isDesktop = typeof window !== 'undefined' && window.innerWidth >= 860;
      var handScale = deg >= 18 ? (isDesktop ? 1.12 : 1.08) : (deg >= 8 ? (isDesktop ? 1.01 : 1.0) : 1.0);
      document.body.style.setProperty('--hand-tilt-scale', handScale);
      var handShiftY = deg >= 18 ? (isDesktop ? -26 : -18) : (deg > 10 ? (deg - 10) / 10 * (isDesktop ? -26 : -18) : 0);
      document.body.style.setProperty('--hand-shift-y', handShiftY.toFixed(1) + 'px');
    }

    function setTilt(deg) {
      deg = Math.max(0, Math.min(60, Number(deg) === 0 ? 0 : (Number(deg) || 0)));
      baseTilt = deg;
      applyTiltVar(deg);
      if (tiltRange) tiltRange.value = deg;
      if (tiltValue) tiltValue.textContent = deg + '°';
      presetBtns.forEach(function (b) { b.classList.toggle('active', Number(b.dataset.angle) === deg); });
      legacyChips.forEach(function (o) { o.classList.toggle('active', o.dataset.angle === String(deg)); });
    }
    function setDepth(px) {
      px = Math.max(500, Math.min(2400, Number(px) || DEFAULTS.depth));
      document.body.style.setProperty('--field-perspective', px + 'px');
      if (depthRange) depthRange.value = px;
      if (depthValue) depthValue.textContent = px + 'px';
    }
    function setZoom(pct) {
      pct = Math.max(60, Math.min(200, Number(pct) || DEFAULTS.zoom));
      if (zoomRange) zoomRange.value = pct;
      if (zoomValue) zoomValue.textContent = pct + '%';
      if (FieldCamera && typeof FieldCamera.setBaseScale === 'function') {
        FieldCamera.setBaseScale(pct / 100);
      }
    }

    setTilt(DEFAULTS.tilt);
    setDepth(DEFAULTS.depth);
    setZoom(DEFAULTS.zoom);

    window.addEventListener('resize', function () {
      if (!userAdjustedZoom) {
        DEFAULTS.zoom = computeDefaultZoom();
        setZoom(DEFAULTS.zoom);
      }
    });

    gear.addEventListener('click', function () {
      Haptics.tap();
      overlay.classList.add('show');
    });
    if (closeBtn) {
      closeBtn.addEventListener('click', function () {
        Haptics.tap();
        overlay.classList.remove('show');
      });
    }
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) overlay.classList.remove('show');
    });

    presetBtns.forEach(function (b) {
      b.addEventListener('click', function () {
        Haptics.tap();
        setTilt(b.dataset.angle);
      });
    });
    legacyChips.forEach(function (b) {
      b.addEventListener('click', function () {
        Haptics.tap();
        setTilt(b.dataset.angle);
      });
    });
    if (tiltRange) tiltRange.addEventListener('input', function () { setTilt(tiltRange.value); });
    if (depthRange) depthRange.addEventListener('input', function () { setDepth(depthRange.value); });
    if (zoomRange) {
      zoomRange.addEventListener('input', function () {
        userAdjustedZoom = true;
        setZoom(zoomRange.value);
      });
    }

    if (touchToggle) {
      touchToggle.addEventListener('change', function () {
        pointerTiltEnabled = touchToggle.checked;
        if (!pointerTiltEnabled) applyTiltVar(baseTilt);
      });
    }



    if (resetBtn) {
      resetBtn.addEventListener('click', function () {
        Haptics.tap();
        userAdjustedZoom = false;
        DEFAULTS.zoom = computeDefaultZoom();
        setTilt(DEFAULTS.tilt);
        setDepth(DEFAULTS.depth);
        setZoom(DEFAULTS.zoom);
        if (touchToggle) touchToggle.checked = true;
        pointerTiltEnabled = true;
      });
    }

    // subtle extra tilt (vertical axis only) that follows touch/mouse position
    // over the field itself, on top of the chosen base angle; toggleable above
    var fieldEl = $('field-tilt');
    if (fieldEl) {
      var pointerTilt = function (clientY) {
        if (!pointerTiltEnabled || !document.body.classList.contains('field-3d')) return;
        var r = fieldEl.getBoundingClientRect();
        if (!r.height) return;
        var py = Math.max(0, Math.min(1, (clientY - r.top) / r.height));
        applyTiltVar(baseTilt + (0.5 - py) * POINTER_RANGE);
      };
      var pointerTiltReset = function () { applyTiltVar(baseTilt); };
      fieldEl.addEventListener('mousemove', function (e) { pointerTilt(e.clientY); });
      fieldEl.addEventListener('mouseleave', pointerTiltReset);
      fieldEl.addEventListener('touchmove', function (e) { if (e.touches[0]) pointerTilt(e.touches[0].clientY); }, { passive: true });
      fieldEl.addEventListener('touchend', pointerTiltReset, { passive: true });
    }
  })();

  /* ===================== field theme switch (スライドスイッチ: サイバー / クラシック) ===================== */
  (function setupThemeSwitch() {
    var switchWrap = $('theme-switch');
    if (!switchWrap) return;
    var opts = switchWrap.querySelectorAll('.theme-opt');

    function applyTheme(theme) {
      var isCyber = (theme === 'cyber');
      document.body.classList.toggle('field-cyber', isCyber);
      opts.forEach(function (opt) {
        opt.classList.toggle('active', opt.dataset.theme === theme);
      });
    }

    applyTheme('cyber'); // デフォルトはサイバー

    opts.forEach(function (opt) {
      opt.addEventListener('click', function () {
        Haptics.tap();
        applyTheme(opt.dataset.theme);
      });
    });
  })();

  /* ===================== mode switch (スライドスイッチ: チュートリアル / 自分で操作) ===================== */
  (function setupModeSwitch() {
    var switchWrap = $('mode-switch');
    if (!switchWrap) return;
    var opts = switchWrap.querySelectorAll('.mode-opt');

    function applyMode(mode) {
      document.body.classList.toggle('manual-mode', mode === 'manual');
      opts.forEach(function (opt) {
        opt.classList.toggle('active', opt.dataset.mode === mode);
      });
      if (mode === 'manual') {
        startManualMode();
      } else {
        startTutorialMode();
      }
    }

    opts.forEach(function (opt) {
      opt.addEventListener('click', function () {
        Haptics.tap();
        applyMode(opt.dataset.mode);
      });
    });
  })();

  /* ===================== pinch-to-zoom (field mat) ===================== */
  var FieldCamera = (function () {
    var el = $('field-image-wrap');
    if (!el) return { pulseTo: function () { }, focusRect: function () { }, reset: function () { }, setBaseScale: function () { }, isBusy: function () { return false; } };
    var MIN_SCALE = 0.6, MAX_SCALE = 2.6;
    var baseScale = (typeof window !== 'undefined' && window.innerWidth >= 860) ? 0.8 : 1;
    var state = { scale: baseScale, tx: 0, ty: 0 };
    var gesture = null; // {startDist, startMid, startScale, startTx, startTy}
    var lastTapTime = 0;
    var busy = false; // true while a scripted camera animation (pulse/focus) is running

    function apply(withTransition) {
      el.style.transition = withTransition ? 'transform .22s ease' : 'none';
      el.style.transform = 'translate(' + state.tx + 'px,' + state.ty + 'px) scale(' + state.scale + ')';
      el.style.zIndex = state.scale > 1.01 ? '30' : '';
    }
    function clamp() {
      var maxPanX = Math.max(0, (el.offsetWidth * (state.scale - 1)) / 2);
      var maxPanY = Math.max(0, (el.offsetHeight * (state.scale - 1)) / 2);
      state.tx = Math.max(-maxPanX, Math.min(maxPanX, state.tx));
      state.ty = Math.max(-maxPanY, Math.min(maxPanY, state.ty));
    }
    function dist(t0, t1) {
      var dx = t0.clientX - t1.clientX, dy = t0.clientY - t1.clientY;
      return Math.sqrt(dx * dx + dy * dy);
    }
    function mid(t0, t1) {
      return { x: (t0.clientX + t1.clientX) / 2, y: (t0.clientY + t1.clientY) / 2 };
    }
    function reset(withTransition) {
      state.scale = baseScale; state.tx = 0; state.ty = 0;
      apply(withTransition !== false);
    }
    // compute tx/ty so that a given viewport rect's center becomes the
    // center of the field-image-wrap's own box, then scale around that point
    function rectToCenterOffset(rect, scale) {
      var wrapRect = el.getBoundingClientRect();
      var wrapCenterX = wrapRect.left + wrapRect.width / 2;
      var wrapCenterY = wrapRect.top + wrapRect.height / 2;
      var rectCenterX = rect.left + rect.width / 2;
      var rectCenterY = rect.top + rect.height / 2;
      // undo current transform to work in untransformed coordinate space
      var localX = (rectCenterX - wrapCenterX) / state.scale;
      var localY = (rectCenterY - wrapCenterY) / state.scale;
      return { tx: -localX * scale, ty: -localY * scale };
    }
    // brief zoom toward a rect and back out (used when a card lands on a zone)
    function pulseTo(rect, opts) {
      if (!rect) return;
      opts = opts || {};
      var peak = opts.peak || 1.3;
      var holdMs = opts.holdMs || 260;
      busy = true;
      var startState = { scale: state.scale, tx: state.tx, ty: state.ty };
      var off = rectToCenterOffset(rect, peak);
      state.scale = peak; state.tx = off.tx; state.ty = off.ty;
      clamp();
      apply(true);
      setTimeout(function () {
        state.scale = startState.scale; state.tx = startState.tx; state.ty = startState.ty;
        clamp();
        apply(true);
        setTimeout(function () { busy = false; }, 260);
      }, holdMs);
    }
    // zoom in on a rect and stay there (used for double-tap focus); tap again to reset
    function focusRect(rect, scale) {
      if (!rect) return;
      var off = rectToCenterOffset(rect, scale || 1.8);
      state.scale = scale || 1.8; state.tx = off.tx; state.ty = off.ty;
      clamp();
      apply(true);
    }

    el.style.transformOrigin = '50% 50%';
    el.style.touchAction = 'pan-y';

    el.addEventListener('touchstart', function (e) {
      if (busy) return;
      if (e.touches.length === 2) {
        e.preventDefault();
        gesture = {
          startDist: dist(e.touches[0], e.touches[1]),
          startMid: mid(e.touches[0], e.touches[1]),
          startScale: state.scale,
          startTx: state.tx,
          startTy: state.ty
        };
      }
    }, { passive: false });

    el.addEventListener('touchmove', function (e) {
      if (busy) return;
      if (e.touches.length === 2 && gesture) {
        e.preventDefault();
        var d = dist(e.touches[0], e.touches[1]);
        var m = mid(e.touches[0], e.touches[1]);
        var ratio = d / gesture.startDist;
        state.scale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, gesture.startScale * ratio));
        state.tx = gesture.startTx + (m.x - gesture.startMid.x);
        state.ty = gesture.startTy + (m.y - gesture.startMid.y);
        clamp();
        apply(false);
      }
    }, { passive: false });

    function endGesture(e) {
      if (e.touches.length < 2) {
        gesture = null;
        if (!busy && Math.abs(state.scale - baseScale) < 0.05) { reset(); }
      }
    }
    el.addEventListener('touchend', function (e) {
      if (busy) return;
      endGesture(e);
      if (e.touches.length === 0) {
        var now = Date.now();
        if (now - lastTapTime < 320) {
          // double-tap: if tapped on a card-like element, focus on it;
          // otherwise reset to the default overview.
          var target = e.changedTouches && e.changedTouches[0]
            ? document.elementFromPoint(e.changedTouches[0].clientX, e.changedTouches[0].clientY)
            : null;
          var cardish = target && target.closest('.lane-stack, .field-mini, .farm-mini, .mini-card, .deck-card');
          if (cardish && Math.abs(state.scale - baseScale) < 0.05) {
            focusRect(cardish.getBoundingClientRect(), 1.8);
          } else {
            reset();
          }
        }
        lastTapTime = now;
      }
    }, { passive: true });
    el.addEventListener('touchcancel', endGesture, { passive: true });

    // externally-driven base zoom (e.g. the settings panel slider); replaces
    // the current scale/pan outright, same as a pinch gesture landing there
    function setBaseScale(scale) {
      scale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, scale));
      baseScale = scale;
      state.scale = scale; state.tx = 0; state.ty = 0;
      clamp();
      apply(true);
    }

    return {
      pulseTo: pulseTo,
      focusRect: focusRect,
      reset: reset,
      setBaseScale: setBaseScale,
      isBusy: function () { return busy; }
    };
  })();

  /* ===================== card closeup layer ===================== */
  var CardCloseup = (function () {
    var layer = $('closeup-layer');
    var slot = $('closeup-card');
    var labelEl = $('closeup-label');
    var toastEl = $('closeup-toast');
    var hideTimer = null;

    function formatCardDetail(card) {
      if (!card) return '';
      if (card.type === 'horse') {
        var parts = [];
        parts.push('<b style="color:var(--gold-2);font-size:14px;">' + card.name + '</b>' + (card.en ? ' <span style="font-size:11px;color:var(--rail-dim)">(' + card.en + ')</span>' : ''));
        parts.push('走破: <b>' + card.run + '</b> / ガード: <b>' + card.guard + '</b> / コスト: <b>' + (card.cost || 2) + '</b>');
        if (card.style) parts.push('脚質: <b>' + card.style + '</b> | 距離: <b>' + (card.dist || '') + '</b>');
        if (card.fav) parts.push('得意: <b>' + card.fav + '</b>');
        return parts.join('<br>');
      }
      if (card.type === 'force') {
        return '<b style="color:var(--gold-2);font-size:14px;">フォースカード</b><br>馬カードを走破させるときのコストとして使用する基本カード。';
      }
      if (card.type === 'item' || card.type === 'jockey') {
        var supportLabel = card.type === 'jockey' ? '騎手' : 'アイテム';
        return '<b style="color:var(--gold-2);font-size:14px;">' + card.name + '</b>（' + supportLabel + '）<br>効果: <b>' + (card.stat || '') + '</b><br><span style="font-size:11px;color:var(--rail-dim)">走破のタイミングで使用可能</span>';
      }
      if (card.type === 'situation') {
        return '<b style="color:var(--gold-2);font-size:14px;">' + card.name + '</b>（状況カード）<br>効果: <b>' + (card.stat || '') + '</b>';
      }
      return card.name || '';
    }

    function show(card, opts) {
      if (!card) return;
      opts = opts || {};
      slot.innerHTML = '';
      slot.appendChild(buildCardEl(card));
      labelEl.textContent = opts.label || 'カード詳細';

      var detailHtml = opts.toast || formatCardDetail(card);
      toastEl.innerHTML = detailHtml;
      toastEl.style.display = detailHtml ? '' : 'none';

      layer.classList.add('show');
      if (hideTimer) { clearTimeout(hideTimer); hideTimer = null; }
      if (opts.autoHideMs) {
        hideTimer = setTimeout(hide, opts.autoHideMs);
      }
    }

    function hide() {
      layer.classList.remove('show');
      if (hideTimer) { clearTimeout(hideTimer); hideTimer = null; }
    }

    layer.addEventListener('click', function (e) {
      hide();
    });

    window.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' || e.key === 'Esc') {
        hide();
      }
    });

    return { show: show, hide: hide };
  })();

  /* ===================== フィールド背景の放射状サイバー飛沫・スピードストリーム ===================== */
  var FieldSplash = (function () {
    var canvas = $('field-splash-canvas');
    if (!canvas) return { init: function () { }, setMode: function () { } };
    var ctx = canvas.getContext('2d');
    if (!ctx) return { init: function () { }, setMode: function () { } };

    var width = 0, height = 0;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var particles = [];
    var SPLASH_COUNT = 80;
    var WIND_COUNT = 46;
    var mode = 'off'; // 'off' | 'splash' | 'wind'

    function resize() {
      var rect = canvas.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      if (width === 0 || height === 0) return;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    /* ---------- 飛沫（下から上へ駆け上がるスピードライン） ---------- */
    function createSplashParticle(randomProgress) {
      // 放射角度: 上向き (-Math.PI / 2) を中心に、上・奥へ扇状に広がる (約 -155°〜 -25°)
      var angleSpread = Math.PI * 0.72;
      var angle = (-Math.PI / 2) + (Math.random() - 0.5) * angleSpread;

      // サイバーカラーのバリエーション: 白 60%、サイバーシアン 25%、ネオンミント 15%
      var rnd = Math.random();
      var colorType = rnd < 0.60 ? 'white' : (rnd < 0.85 ? 'cyan' : 'mint');

      return {
        angle: angle,
        progress: randomProgress !== undefined ? randomProgress : 0,
        speed: 0.007 + Math.random() * 0.009,
        baseW: 3.0 + Math.random() * 4.0,
        baseH: 14 + Math.random() * 20,
        colorType: colorType,
        originOffsetX: (Math.random() - 0.5) * 60,
        originOffsetY: (Math.random() - 0.5) * 16,
        alphaOffset: 0.45 + Math.random() * 0.18 // 薄く上品な透明度（最大約0.5）
      };
    }

    function drawSplashFrame() {
      // 起点: 画面下部中央よりさらに下（重なりが目立つ発生源は画面外に出す）
      var originX = width * 0.5;
      var originY = height * 1.22;
      var maxDist = Math.hypot(width * 0.65, height * 1.25);

      for (var i = 0; i < particles.length; i++) {
        var p = particles[i];
        p.progress += p.speed;

        if (p.progress >= 1.0) {
          particles[i] = createSplashParticle(0);
          continue;
        }

        // 下（手前）から上（奥）へ駆け上がる移動
        var t = Math.pow(p.progress, 1.55);
        var dist = maxDist * t;
        var x = originX + p.originOffsetX * (1 - t * 0.6) + Math.cos(p.angle) * dist;
        var y = originY + p.originOffsetY * (1 - t * 0.6) + Math.sin(p.angle) * dist;

        // 手前でしっかり、奥へ行くにつれてスピードラインのようにスッと伸びる
        var scale = 0.95 - t * 0.45;
        var rx = p.baseW * scale;
        var ry = p.baseH * (scale * 0.8 + t * 1.3);

        // 透明度（下部でふんわり湧き上がり、中間で適度に光り、上部奥でスッと消滅）
        var alpha = Math.min(1, p.progress / 0.1) * Math.max(0, 1 - Math.pow(p.progress, 2.6)) * p.alphaOffset;

        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(p.angle - Math.PI / 2);

        ctx.beginPath();
        ctx.ellipse(0, 0, Math.max(1, rx), Math.max(2, ry), 0, 0, Math.PI * 2);

        if (p.colorType === 'cyan') {
          ctx.fillStyle = 'rgba(62, 224, 255, ' + (alpha * 0.95).toFixed(3) + ')';
        } else if (p.colorType === 'mint') {
          ctx.fillStyle = 'rgba(0, 255, 190, ' + (alpha * 0.85).toFixed(3) + ')';
        } else {
          ctx.fillStyle = 'rgba(230, 248, 255, ' + (alpha * 0.9).toFixed(3) + ')';
        }
        ctx.fill();

        // 粒の中心にほんのりコアハイライト
        if (scale > 0.65) {
          ctx.beginPath();
          ctx.ellipse(0, 0, rx * 0.45, ry * 0.6, 0, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(255, 255, 255, ' + (alpha * 0.65).toFixed(3) + ')';
          ctx.fill();
        }

        ctx.restore();
      }
    }

    /* ---------- 風（左から右へ流れる、暗い緑を混ぜた風のライン） ---------- */
    function createWindParticle(randomProgress) {
      var rnd = Math.random();
      // 白 45%、暗い緑 40%、サイバーシアン 15%
      var colorType = rnd < 0.45 ? 'white' : (rnd < 0.85 ? 'green' : 'cyan');
      return {
        progress: randomProgress !== undefined ? randomProgress : 0,
        speed: 0.0035 + Math.random() * 0.0055,
        laneY: Math.random(), // 0〜1（画面高さに対する通過位置）
        tilt: (-6 + Math.random() * 14) * Math.PI / 180, // わずかに右下がり〜右上がり
        length: 26 + Math.random() * 46,
        thickness: 1.6 + Math.random() * 2.6,
        wobbleAmp: 5 + Math.random() * 16,
        wobbleFreq: 0.8 + Math.random() * 1.4,
        wobblePhase: Math.random() * Math.PI * 2,
        colorType: colorType,
        alphaOffset: 0.22 + Math.random() * 0.22
      };
    }

    function drawWindFrame(elapsed) {
      var travel = width * 1.35;
      for (var i = 0; i < particles.length; i++) {
        var p = particles[i];
        p.progress += p.speed;
        if (p.progress >= 1.0) {
          particles[i] = createWindParticle(0);
          continue;
        }
        var t = p.progress;
        var x = -width * 0.18 + t * travel;
        var y = p.laneY * height + Math.sin(t * Math.PI * 2 * p.wobbleFreq + p.wobblePhase) * p.wobbleAmp;

        // 左右の端でふわっと現れ、ふわっと消える（吹き抜ける風のイメージ）
        var alpha = Math.sin(Math.min(1, Math.max(0, t)) * Math.PI) * p.alphaOffset;

        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(p.tilt);

        ctx.beginPath();
        ctx.ellipse(0, 0, p.length / 2, p.thickness / 2, 0, 0, Math.PI * 2);

        if (p.colorType === 'green') {
          ctx.fillStyle = 'rgba(40, 92, 58, ' + (alpha * 0.9).toFixed(3) + ')';
        } else if (p.colorType === 'cyan') {
          ctx.fillStyle = 'rgba(62, 224, 255, ' + (alpha * 0.85).toFixed(3) + ')';
        } else {
          ctx.fillStyle = 'rgba(226, 238, 228, ' + (alpha * 0.8).toFixed(3) + ')';
        }
        ctx.fill();

        ctx.restore();
      }
    }

    function seedParticles() {
      particles = [];
      if (mode === 'splash') {
        for (var i = 0; i < SPLASH_COUNT; i++) particles.push(createSplashParticle(Math.random()));
      } else if (mode === 'wind') {
        for (var j = 0; j < WIND_COUNT; j++) particles.push(createWindParticle(Math.random()));
      }
    }

    function init() {
      resize();
      requestAnimationFrame(loop);
    }

    function loop() {
      if (mode === 'off') {
        requestAnimationFrame(loop);
        return;
      }
      if (width === 0 || height === 0) {
        resize();
        requestAnimationFrame(loop);
        return;
      }

      ctx.clearRect(0, 0, width, height);
      if (mode === 'splash') drawSplashFrame();
      else if (mode === 'wind') drawWindFrame();

      requestAnimationFrame(loop);
    }

    function setMode(m) {
      mode = (m === 'splash' || m === 'wind') ? m : 'off';
      canvas.style.display = (mode === 'off') ? 'none' : '';
      seedParticles();
      if (width && height) ctx.clearRect(0, 0, width, height);
    }

    window.addEventListener('resize', resize);

    return { init: init, setMode: setMode };
  })();

  /* ===================== boot ===================== */
  renderAll();
  runTutorial();

  requestAnimationFrame(function () { requestAnimationFrame(positionNarratorInitial); });

})();
