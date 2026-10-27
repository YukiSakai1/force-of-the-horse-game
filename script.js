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
      effectValue: effectValue,
      itemUseType: effectType === 'run_bonus' || effectType === 'run_penalty' ? 'horse' : 'area'
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
    var c = horseCard('ドウデュース', 'DO DEUCE', 5, 3, '先行・差し', '中', '東京/中山・良', 3);
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
  function goggles() {
    var c = itemCard('ゴーグル', 'ガード値を+1する', 'SDF-079', 'guard_bonus', 1);
    c.itemUseType = 'horse';
    c.img = 'images/item-goggles.png';
    return c;
  }
  function isGogglesCard(card) {
    return !!(card && card.type === 'item' && card.code === 'SDF-079');
  }
  function eliteJockey() {
    var c = jockeyCard('エリートジョッキー', '走破数を+1する。ガード値を+1する', 'SDF-081', 'elite_jockey', 1);
    c.guardBonus = 1;
    c.img = 'images/elite-jockey.png';
    return c;
  }
  function veterinarian() {
    var c = itemCard('獣医師', 'ファームからノーマルフォースカードを1枚と、ゲームから除外されている自分の馬カードを1枚手札に戻してもよい', 'WEF-044', 'farm_recovery', 1);
    c.img = 'images/veterinarian.png';
    return c;
  }

  var FREEPLAY_POOL = [
    // フォースカード：馬・アイテムに比べてやや引きやすい比率（45%）に調整
    function () { return forceCard(); },
    function () { return forceCard(); },
    function () { return forceCard(); },
    function () { return forceCard(); },
    function () { return forceCard(); },
    function () { return forceCard(); },
    function () { return forceCard(); },
    function () { return forceCard(); },
    function () { return forceCard(); },
    // 馬カード（30%：各馬均等）
    function () { return goldShip(); },
    function () { return rousham(); },
    function () { return seferRasiel(); },
    function () { return silkMobius(); },
    function () { return seiunSky(); },
    function () { return doDeuce(); },
    // アイテム・騎手・状況カード（25%）
    function () { return whip(); },
    function () { return goggles(); },
    function () { return eliteJockey(); },
    function () { return veterinarian(); },
    function () { return situationCard('かんかん照り', '馬場状態を一段階良くする', KANKAN_IMG); }
  ];

  // 次にドローするカードを強制的に指定する（1回消費すると自動でクリアされる）
  var nextDrawOverride = function () { return eliteJockey(); };

  /* ===================== game state ===================== */
  var hand = [];
  var farm = [];
  var field = null;
  var fieldGuard = null; // 相手がガードに使った馬カード（相手の場に表示）
  var playerGuardCard = null; // 自分がガードに使った馬カード（自分の場に表示）
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
  function styleMatchesCurrentArea(card, lane) {
    lane = lane || currentLane();
    return !!(lane && (card.style || '').indexOf(lane.label) >= 0);
  }
  function runModifiers(card, lane) {
    var mods = [];
    if ((card.surface || []).indexOf(race.surface) < 0) mods.push({ value: -1, label: '馬場不一致 -1' });
    if ((card.dist || '').indexOf(raceDistanceKey(race.distance)) < 0) mods.push({ value: -1, label: '距離不一致 -1' });
    if (styleMatchesCurrentArea(card, lane)) mods.push({ value: 1, label: '脚質一致 +1' });
    return mods;
  }
  function effectiveRun(card, bonus, lane) {
    return (card.run || 0) + (bonus || 0) + runModifiers(card, lane).reduce(function (sum, mod) { return sum + mod.value; }, 0);
  }
  function renderRaceInfo() {
    var el = $('race-info');
    if (!el) return;
    el.textContent = '';

    var title = document.createElement('span');
    title.className = 'race-info-title';
    title.textContent = 'レース条件';
    el.appendChild(title);

    [
      ['競馬場', race.racecourse],
      ['コース', race.surface],
      ['距離', race.distance],
      ['馬場', race.trackCondition]
    ].forEach(function (entry) {
      var item = document.createElement('span');
      item.className = 'race-condition';
      var label = document.createElement('span');
      label.className = 'race-condition-label';
      label.textContent = entry[0];
      var value = document.createElement('span');
      value.className = 'race-condition-value';
      value.textContent = entry[1];
      item.appendChild(label);
      item.appendChild(value);
      el.appendChild(item);
    });
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
  var selectedRunItems = []; // 走破前に仮選択したタイプ：馬のアイテム（確定までは消費しない）
  var selectedGuardHorse = null;
  var selectedGuardItems = []; // ガード前に仮選択したガード強化カード
  var directRunItemId = null; // カード詳細から騎手を選んで走破する場合の初期選択
  var runEntrySource = null; // 'menu': 操作メニューから / 'hand': 手札カードから直接
  var handPan = 0; // 手札が多い時に左右ボタンでファン表示を移動する量
  var phase = 'idle';
  var prevPhase = 'idle';
  var prevSelectedHorse = null;
  var prevSelectedForces = [];
  var cpuRunValue = 0;
  var cpuHorseCard = null; // CPU側が今の走破で使用している馬カード（自分の手札から選ばれる）
  var cpuHand = []; // CPU側の実際の手札（表には出さないが、走破できるかの判定に使う）
  var guardValue = 0;
  var itemGuardBonus = 0; // guard_bonus アイテムの効果を一時的に積んでおく変数
  var guardSelectionConfirmedId = null; // 能力確認後にガード決定された馬カード
  var runHorseSelectionConfirmedId = null; // 詳細確認後に走破へ使う馬カード
  var runItemSelectionConfirmedId = null; // 詳細確認後に選択／解除するアイテムカード
  var guardItemSelectionConfirmedId = null; // 詳細確認後に選択／解除するガード強化カード
  var discardSelectionConfirmedId = null; // 詳細確認後に捨てるカード
  var discardSelectionsInFlight = 0; // 捨て札アニメーション中の連打・選び過ぎを防ぐ
  var isCpuTurn = false;
  var hasRunThisTurn = false;
  var pendingFinishRun = null;
  var lastDrawer = null; // 'player' | 'cpu' — 山札を最後に引いたのはどちらか

  /* ===================== dom helpers ===================== */
  function $(id) { return document.getElementById(id); }

  // 操作UIは盤面の3D変形に巻き込まれないよう、傾斜レイヤーの外へ移す。
  var commandBarRoot = $('command-bar');
  var boardRoot = $('board');
  if (commandBarRoot && boardRoot && commandBarRoot.parentNode !== boardRoot) {
    boardRoot.appendChild(commandBarRoot);
  }

  // SPの操作メニューは、3D変形には巻き込まず、状況カード置き場を隠さない位置へ置く。
  function positionMobileCommandBar() {
    var bar = $('command-bar');
    if (!bar) return;
    var useMobileFieldPosition = window.innerWidth <= 859 && document.body.classList.contains('manual-mode');
    if (!useMobileFieldPosition) {
      bar.style.removeProperty('top');
      bar.style.removeProperty('bottom');
      return;
    }
    var situationZone = $('zone-situation');
    var handZone = $('zone-hand');
    if (!situationZone || !handZone) return;
    var situationRect = situationZone.getBoundingClientRect();
    var handRect = handZone.getBoundingClientRect();
    var barHalfHeight = (bar.offsetHeight || 54) / 2;
    var highestCenter = 86 + barHalfHeight;
    var lowestCenter = handRect.top - barHalfHeight - 10;
    var centerBelowSituation = situationRect.bottom + barHalfHeight + 10;
    var centerAboveSituation = situationRect.top - barHalfHeight - 10;
    var preferredCenter = centerBelowSituation <= lowestCenter
      ? centerBelowSituation
      : centerAboveSituation;
    var center = Math.max(highestCenter, Math.min(preferredCenter, lowestCenter));
    bar.style.top = center + 'px';
    bar.style.bottom = 'auto';
  }
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
    var hasExternalHorsePreview = ((phase === 'select_force' || phase === 'select_item') && !!selectedHorse) ||
      (phase === 'select_guard_item' && !!selectedGuardHorse);
    // 選択中の馬は手札の外にプレビューしているため、元の位置に空き枠を残さない。
    var avoidCenter = false;
    var layoutCards = Array.prototype.filter.call(cards, function (el) {
      return !hasExternalHorsePreview || !el.classList.contains('run-horse-source');
    });
    var layoutCount = layoutCards.length;
    if (!layoutCount) return;
    var rowW = row.clientWidth || row.offsetWidth || 340;
    var cardW = cards[0].offsetWidth || 98;
    var isMobile = typeof window !== 'undefined' && window.innerWidth < 860;
    var maxSpread = Math.min(28, 5 * (layoutCount - 1)); // total fan spread in degrees, capped
    var angleStep = layoutCount > 1 ? maxSpread / (layoutCount - 1) : 0;
    // モバイルはオーバーラップを減らして各カードが見やすくなるよう調整
    var idealGapRatio = isMobile ? 0.38 : 0.62;
    var minGapRatio   = isMobile ? 0.20 : 0.20;
    var idealGap = cardW * idealGapRatio;
    var totalWidthIdeal = idealGap * (layoutCount - 1) + cardW;
    var gap = idealGap;
    // モバイルは横スクロールで隠れたカードを見られるので、詰めて潰さずに
    // 理想の間隔のまま並べる（画面外にはみ出た分はスワイプで見る）。
    // デスクトップは従来通り、収まらない場合だけ間隔を詰める。
    if (!isMobile && totalWidthIdeal > rowW * 0.97 && layoutCount > 1 && !avoidCenter) {
      gap = Math.max(cardW * minGapRatio, (rowW * 0.97 - cardW) / (layoutCount - 1));
    }
    var centerClearance = avoidCenter ? cardW * 1.08 : 0;
    if (avoidCenter) {
      var leftCountForWidth = Math.ceil(layoutCount / 2);
      var rightCountForWidth = layoutCount - leftCountForWidth;
      totalWidthIdeal = centerClearance * 2 +
        Math.max(0, leftCountForWidth - 1) * gap +
        Math.max(0, rightCountForWidth - 1) * gap + cardW;
    }
    var maxPan = Math.max(0, (totalWidthIdeal - rowW) / 2 + cardW * 0.35);
    // モバイルではカードが画面内に収まっていても互いに重なるため、
    // 左右ボタンで前後のカードを見せられるだけの移動量を確保する。
    if (isMobile && layoutCount > 4) {
      var browsePan = Math.min(((layoutCount - 1) * gap) / 2, cardW * 2.2);
      maxPan = Math.max(maxPan, browsePan);
    }
    handPan = Math.max(-maxPan, Math.min(maxPan, handPan));
    var center = (layoutCount - 1) / 2;
    var leftCount = Math.ceil(layoutCount / 2);
    layoutCards.forEach(function (el, i) {
      var offset = i - center;
      var rot = offset * angleStep;
      var x;
      if (avoidCenter) {
        x = i < leftCount
          ? -centerClearance - (leftCount - 1 - i) * gap
          : centerClearance + (i - leftCount) * gap;
        x += handPan;
      } else {
        x = offset * gap + handPan;
      }
      var y = Math.abs(offset) * Math.abs(offset) * (isMobile ? 0.7 : 1.15);
      el.style.setProperty('--fan-x', x.toFixed(1) + 'px');
      el.style.setProperty('--fan-rot', rot.toFixed(2) + 'deg');
      el.style.setProperty('--fan-y', y.toFixed(1) + 'px');
      el.style.zIndex = String(Math.round(100 - Math.abs(offset) * 2));
    });
    row.dataset.maxPan = String(maxPan);
    row.dataset.handPan = String(handPan);
  }

  function renderHand() {
    var row = $('hand-row');
    row.innerHTML = '';
    hand.forEach(function (c) {
      var el = buildCardEl(c);
      if (selectedHorse && selectedHorse.id === c.id &&
        (phase === 'select_horse' || phase === 'select_force' || phase === 'select_item' || phase === 'support_choice')) {
        el.classList.add((phase === 'select_force' || phase === 'select_item') ? 'run-horse-source' : 'run-horse-selected');
      }
      if (selectedGuardHorse && selectedGuardHorse.id === c.id && phase === 'select_guard_item') {
        el.classList.add('run-horse-source');
      }
      if (selectedForces.some(function (force) { return force.id === c.id; })) {
        el.classList.add('selected');
      }
      if (selectedRunItems.some(function (item) { return item.id === c.id; })) {
        el.classList.add('selected', 'run-item-selected');
        el.setAttribute('aria-pressed', 'true');
      }
      if (selectedGuardItems.some(function (item) { return item.id === c.id; })) {
        el.classList.add('selected', 'run-item-selected');
        el.setAttribute('aria-pressed', 'true');
      }
      if (interactionMode === 'select-any' && c.id === lessonReservedHorseId) {
        el.classList.add('disabled');
      } else if (interactionMode === 'select-horse' && lessonRunHorseId) {
        el.classList.add(c.id === lessonRunHorseId ? 'selectable' : 'disabled');
      } else if (interactionMode === 'lesson-situation' || interactionMode === 'lesson-situation-busy') {
        el.classList.add(c.type === 'situation' && interactionMode === 'lesson-situation' ? 'selectable' : 'disabled');
      } else if (interactionMode === 'lesson-item' || interactionMode === 'lesson-item-busy') {
        el.classList.add(lessonItemSelection && lessonItemSelection.id === c.id ? 'selectable' : 'disabled');
      } else if (interactionMode === 'select-force') {
        el.classList.add(c.type === 'force' ? 'selectable' : 'disabled');
      } else if (interactionMode === 'select-horse' || interactionMode === 'select-guard' || phase === 'guard_select') {
        el.classList.add(c.type === 'horse' ? 'selectable' : 'disabled');
      } else if (phase === 'select_horse') {
        el.classList.add(c.type === 'horse' ? 'selectable' : 'disabled');
      } else if (phase === 'select_force') {
        // フォース選択中でも馬カードをタップすれば、その馬へ選び直せる。
        el.classList.add((c.type === 'force' || c.type === 'horse') ? 'selectable' : 'disabled');
      } else if (phase === 'select_item') {
        var isHorseSupport = (c.type === 'item' || c.type === 'jockey') &&
          (c.effectType === 'run_bonus' || c.effectType === 'run_penalty' || c.effectType === 'elite_jockey');
        el.classList.add(isHorseSupport ? 'selectable' : 'disabled');
      } else if (phase === 'select_guard_item') {
        el.classList.add(isGuardSupportCard(c) ? 'selectable' : 'disabled');
      } else if (phase === 'select_item_idle') {
        var isEligibleIdleCard = c.type === 'item' && c.itemUseType === 'area';
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
    var zone = $('zone-hand');
    if (zone) {
      zone.classList.toggle('has-cards', hand.length > 0);
      zone.classList.toggle('run-selecting', phase === 'select_horse' || phase === 'select_force' ||
        phase === 'select_item' || phase === 'select_guard_item');
      zone.classList.toggle('item-selecting', phase === 'select_item' || phase === 'select_guard_item');
    }
    var cancelBtn = $('selection-cancel');
    if (cancelBtn) {
      var canCancelSelection = interactionMode === 'freeplay' &&
        (phase === 'select_horse' || phase === 'select_force' || phase === 'select_item' ||
          phase === 'guard_select' || phase === 'select_guard_item');
      cancelBtn.hidden = !canCancelSelection;
      if (phase === 'guard_select') {
        cancelBtn.textContent = 'ガードを取りやめる';
      } else if (phase === 'select_guard_item') {
        cancelBtn.textContent = 'アイテムを使わずガード';
      } else if (phase === 'select_item') {
        cancelBtn.textContent = 'アイテム使用をやめる';
      } else {
        cancelBtn.textContent = phase === 'select_force' && runEntrySource !== 'hand'
          ? '馬を変更／キャンセル'
          : '走破をキャンセル';
      }
    }
    var confirmBtn = $('selection-confirm');
    if (confirmBtn) {
      // アイテム選択段階に入っているなら、モード変数の状態にかかわらず
      // 確定ボタンを表示する。ガード中にCPUターン扱いのままでも隠さない。
      var showItemConfirm = phase === 'select_item' || phase === 'select_guard_item';
      confirmBtn.hidden = !showItemConfirm;
      confirmBtn.style.display = showItemConfirm ? 'block' : 'none';
      var selectedItemCount = phase === 'select_guard_item' ? selectedGuardItems.length : selectedRunItems.length;
      confirmBtn.disabled = selectedItemCount === 0;
      confirmBtn.textContent = selectedItemCount > 0
        ? '選択した' + selectedItemCount + '枚で' + (phase === 'select_guard_item' ? 'ガード' : '走破')
        : 'アイテムを選んでください';
    }
    var horsePreview = $('selected-horse-preview');
    if (horsePreview) {
      var showHorsePreview = interactionMode === 'freeplay' &&
        ((phase === 'select_force' || phase === 'select_item') && !!selectedHorse ||
          phase === 'select_guard_item' && !!selectedGuardHorse);
      horsePreview.hidden = !showHorsePreview;
      if (showHorsePreview) {
        var previewHorse = phase === 'select_guard_item' ? selectedGuardHorse : selectedHorse;
        horsePreview.style.backgroundImage = previewHorse.img ? 'url("' + previewHorse.img + '")' : 'none';
        horsePreview.textContent = previewHorse.img ? '' : (previewHorse.icon + ' ' + previewHorse.name);
        horsePreview.setAttribute('aria-label', '選択中の馬：' + previewHorse.name);
        horsePreview.dataset.label = phase === 'select_guard_item' ? 'ガードする馬' :
          (phase === 'select_item' ? '走破する馬' : '選択中の馬');
      } else {
        horsePreview.style.backgroundImage = 'none';
        horsePreview.textContent = '';
        horsePreview.removeAttribute('aria-label');
        delete horsePreview.dataset.label;
      }
    }
    var manualGuide = $('manual-selection-guide');
    if (manualGuide) {
      var discardRemaining = Math.max(0, selectionNeeded - selectionCount);
      var showDiscardGuide = interactionMode === 'freeplay' && phase === 'discard_select' && discardRemaining > 0;
      manualGuide.hidden = !showDiscardGuide;
      manualGuide.textContent = showDiscardGuide ? '手札から ' + discardRemaining + '枚 選んで捨ててください' : '';
    }
  }
  window.addEventListener('resize', function () { layoutHandFan(); adjustFieldDiagonalLayout(); });
  window.addEventListener('resize', positionMobileCommandBar);
  if (boardRoot) boardRoot.addEventListener('scroll', positionMobileCommandBar, { passive: true });

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
    var card = field || playerGuardCard;
    if (card) {
      var isPlayerGuard = !field && !!playerGuardCard;
      var totalType = isPlayerGuard ? 'guard' : 'run';
      var totalLabel = isPlayerGuard ? 'ガード' : '走破';
      var totalValue = isPlayerGuard ? (card.guard || 0) : effectiveRun(card, runBonus, currentLane());
      var totalHtml = '<span class="field-total-badge field-total-' + totalType + '">' +
        '<span class="field-total-label">' + totalLabel + '</span>' +
        '<strong class="field-total-value">' + totalValue + '</strong></span>';
      if (card.img) {
        body.innerHTML =
          '<div class="field-mini-wrap"><div class="field-mini field-mini-img" style="background-image:url(' + card.img + ')">' + totalHtml + '</div></div>';
      } else {
        body.innerHTML =
          '<div class="field-mini-wrap"><div class="field-mini type-horse">' +
          totalHtml +
          '<span class="stat-badge stat-badge-run" title="走破">' + card.run + '</span>' +
          '<span class="stat-badge stat-badge-guard" title="ガード">G' + card.guard + '</span>' +
          '<span class="fm-icon">' + card.icon + '</span>' +
          '<span class="fm-name">' + card.name + '</span>' +
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
    body.classList.toggle('has-card', !!card);
    if (card) {
      var totalType = fieldGuard ? 'guard' : 'run';
      var totalLabel = fieldGuard ? 'ガード' : '走破';
      var totalValue = fieldGuard ? (fieldGuard.guard || 0) : cpuRunValue;
      var totalHtml = '<span class="field-total-badge field-total-' + totalType + '">' +
        '<span class="field-total-label">' + totalLabel + '</span>' +
        '<strong class="field-total-value">' + totalValue + '</strong></span>';
      if (card.img) {
        body.innerHTML =
          '<div class="field-mini-wrap"><div class="field-mini field-mini-img" style="background-image:url(' + card.img + ')">' + totalHtml + '</div></div>';
      } else {
        body.innerHTML =
          '<div class="field-mini-wrap"><div class="field-mini type-horse">' + totalHtml +
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
    requestAnimationFrame(positionMobileCommandBar);
  }

  // 画面サイズによっては、CSSだけで組んだ対角配置（自分／相手の馬カード置き場）が
  // 山札の列と重なってしまうことがあるため、実際の表示位置を測って重なりを検出し、
  // その分だけ追加でずらす（CSSの計算だけに頼らない安全策）
  function adjustFieldDiagonalLayout() {
    var zoneFieldEl = $('zone-field');

    // デスクトップ（860px以上）では 3D パース変換後に getBoundingClientRect() が
    // 実レイアウト位置と乖離するため、重なり補正を行うと逆に大きなスペースが生まれる。
    // デスクトップは grid の row-gap で十分なスペースを確保しているのでスキップする。
    if (typeof window !== 'undefined' && window.innerWidth >= 860) {
      if (zoneFieldEl) {
        zoneFieldEl.style.setProperty('--field-opp-extra-shift', '0px');
        zoneFieldEl.style.setProperty('--field-extra-shift', '0px');
      }
      return;
    }

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
  }

  function focusTutorialTarget(targetEl) {
    var board = $('board');
    var narrator = $('narrator');
    if (!board || !targetEl) return;

    // 手札は盤面とは別の表示領域にあるため、手札選択時は盤面を動かさない。
    var hand = $('zone-hand');
    if (hand && (targetEl === hand || hand.contains(targetEl))) return;

    requestAnimationFrame(function () {
      var boardRect = board.getBoundingClientRect();
      var targetRect = targetEl.getBoundingClientRect();
      var narratorRect = narrator ? narrator.getBoundingClientRect() : { top: boardRect.bottom };
      var safeTop = boardRect.top + 18;
      var safeBottom = Math.min(boardRect.bottom - 18, narratorRect.top - 16);

      // 説明対象がナレーターに隠れず、見えている領域の中央に来るようにする。
      if (safeBottom <= safeTop) safeBottom = boardRect.bottom - 18;
      var targetCenter = targetRect.top + (targetRect.height / 2);
      var safeCenter = safeTop + ((safeBottom - safeTop) / 2);
      var nextTop = board.scrollTop + targetCenter - safeCenter;
      var maxTop = Math.max(0, board.scrollHeight - board.clientHeight);
      board.scrollTo({
        top: Math.max(0, Math.min(maxTop, nextTop)),
        behavior: 'smooth'
      });
    });
  }

  function selectionLabel(mode) {
    if (mode === 'select-force') return 'フォースカード';
    if (mode === 'select-horse') return '馬カード';
    if (mode === 'select-guard') return 'ガードする馬カード';
    return 'カード';
  }

  function updateSelectionProgress(isComplete) {
    var el = $('selection-progress');
    if (!el || !selectionNeeded) return;
    var current = Math.min(selectionCount, selectionNeeded);
    el.hidden = false;
    el.classList.toggle('complete', !!isComplete);
    el.textContent = selectionLabel(interactionMode) + 'を選択：' + current + ' / ' + selectionNeeded + '枚' + (isComplete ? ' ✓' : '');
  }

  function hideSelectionProgress() {
    var el = $('selection-progress');
    if (!el) return;
    el.hidden = true;
    el.classList.remove('complete');
    el.textContent = '';
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

  var isIntroLesson = new URLSearchParams(window.location.search).get('lesson') === 'intro';
  var isRunLesson = new URLSearchParams(window.location.search).get('lesson') === 'run';
  var isGuardLesson = new URLSearchParams(window.location.search).get('lesson') === 'guard';
  var isItemLesson = new URLSearchParams(window.location.search).get('lesson') === 'items';
  var isStyleLesson = new URLSearchParams(window.location.search).get('lesson') === 'style';
  var isAbilityLesson = new URLSearchParams(window.location.search).get('lesson') === 'ability';
  var isSituationLesson = new URLSearchParams(window.location.search).get('lesson') === 'situation';
  var isResponseLesson = new URLSearchParams(window.location.search).get('lesson') === 'responses';
  var lessonSituationSelection = null;
  var lessonItemSelection = null;
  var lessonRunHorseId = null;
  var lessonReservedHorseId = null;
  var STEP_TOTAL = isResponseLesson ? 12 : (isSituationLesson ? 8 : (isIntroLesson ? 11 : (isRunLesson ? 7 : (isGuardLesson ? 8 : (isItemLesson ? 10 : (isStyleLesson ? 15 : (isAbilityLesson ? 9 : 19)))))));
  function setProgress(step) {
    if (isRunLesson && step >= 8) step -= 7;
    if (isGuardLesson && step >= 15) step = ({15: 1, 16: 2, 17: 7, 18: 8})[step] || 8;
    var pct = Math.min(100, (step / STEP_TOTAL) * 100);
    var cur = Math.min(step, STEP_TOTAL);
    var fillEl = $('track-fill');
    var horseEl = $('track-horse');
    if (fillEl) fillEl.style.width = pct + '%';
    if (horseEl) horseEl.style.left = pct + '%';

    var curEl = $('step-current');
    var totalEl = document.querySelector('.step-total');
    if (totalEl) totalEl.textContent = STEP_TOTAL;
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

  function showOpponentGuardBanner(card, value) {
    return showBanner('相手がガード！ ' + card.name + ' / ガード ' + value, 3000, card);
  }

  function showBanner(text, maxWait, horseCard, subText) {
    var overlay = $('banner-overlay');
    var box = $('banner-box');
    var cardBackdrop = $('banner-card-backdrop');
    var stage = $('banner-stage');
    var hasCard = false;
    var isGuard = text.indexOf('ガード！') >= 0;
    if (cardBackdrop) {
      cardBackdrop.innerHTML = '';
      var targetCard = horseCard || ((text.indexOf('走破成功') >= 0 || text.indexOf('走破！') >= 0 || isGuard) ? (fieldGuard || field || selectedHorse || cpuHorseCard || goldShip()) : null);
      if (targetCard) {
        var cEl = buildCardEl(targetCard);
        cEl.classList.add('banner-horse-card');
        cardBackdrop.appendChild(cEl);
        cardBackdrop.style.display = 'block';
        hasCard = true;
      } else {
        cardBackdrop.style.display = 'none';
      }
    }
    if (stage) {
      stage.classList.toggle('has-card', hasCard);
      stage.classList.toggle('is-guard', isGuard && hasCard);
    }
    if (overlay) {
      overlay.classList.toggle('has-card', hasCard);
      overlay.classList.toggle('is-guard', isGuard && hasCard);
    }
    var subHtml = subText ? '<div class="banner-sub-caption">' + subText + '</div>' : '';
    box.innerHTML = '<span class="banner-shine"></span>' + subHtml + '<span class="banner-box-text">' + text + '</span>';
    box.classList.add('show');
    overlay.classList.add('active');
    return new Promise(function (resolve) {
      var done = false;
      function finish(event) {
        if (done) return;
        if (event) {
          event.preventDefault();
          event.stopPropagation();
        }
        done = true;
        overlay.removeEventListener('click', finish);
        box.classList.remove('show');
        overlay.classList.remove('active');
        if (stage) {
          stage.classList.remove('has-card');
          stage.classList.remove('is-guard');
        }
        if (overlay) {
          overlay.classList.remove('has-card');
          overlay.classList.remove('is-guard');
        }
        if (cardBackdrop) {
          cardBackdrop.style.display = 'none';
          cardBackdrop.innerHTML = '';
        }
        setTimeout(resolve, 250);
      }
      overlay.addEventListener('click', finish);
      // 「タップして続ける」の表示は、ユーザーの操作まで進めない。
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

  // 相手の手札欄は横長なので、その領域をそのまま複製せず、
  // 中央から縦長のカード比率で飛び出す捨て札専用ダミーを作る。
  function makeOpponentDiscardDummy(areaRect) {
    var dummy = document.createElement('div');
    var width = Math.max(44, Math.min(62, areaRect.height * 0.72));
    var height = width * 1.4;
    dummy.className = 'deck-card opponent-discard-dummy';
    dummy.style.position = 'fixed';
    dummy.style.left = (areaRect.left + areaRect.width / 2 - width / 2) + 'px';
    dummy.style.top = (areaRect.top + areaRect.height / 2 - height / 2) + 'px';
    dummy.style.width = width + 'px';
    dummy.style.height = height + 'px';
    dummy.style.transform = 'none';
    dummy.style.zIndex = '1000';
    dummy.style.borderRadius = '7px';
    dummy.style.boxShadow = '0 6px 14px rgba(0, 0, 0, .65)';
    document.body.appendChild(dummy);
    return dummy;
  }

  /* ===================== explanation step ===================== */
  function explainStep(targetEl, zoneId, text) {
    if (zoneId) setZoneActive(zoneId, true);
    if (targetEl && targetEl.classList) targetEl.classList.add('highlighted');
    setNarrator(text);
    focusTutorialTarget(targetEl);
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
    updateSelectionProgress(false);
    focusTutorialTarget($('zone-hand'));
    return new Promise(function (resolve) { actionResolve = resolve; });
  }

  function shakeCard(id) {
    var el = cardElById(id);
    if (!el) return;
    el.classList.add('shake');
    Haptics.warn();
    setTimeout(function () { el.classList.remove('shake'); }, 400);
  }

  var toastTimer = null;
  function showToast(msg, duration) {
    var toast = $('game-toast');
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.remove('show');
    void toast.offsetWidth;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      toast.classList.remove('show');
    }, duration || 2400);
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
      if (badge) badge.textContent = '操作メニュー';
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
        // 馬やフォース不足時もクリック可能にし、cmdRun()側で「フォースカードが不足しています」等の案内を出す
      }
      if (cmd === 'situation') {
        if (phase !== 'idle' || canDraw || isCpuTurn) btn.disabled = true;
        var hasSituation = hand.some(function (c) { return c.type === 'situation'; });
        if (!hasSituation) btn.disabled = true;
      }
      if (cmd === 'item') {
        if (phase !== 'idle') btn.disabled = true;
        if (canDraw) btn.disabled = true;
        var hasUsableItem = hand.some(function (c) {
          return c.type === 'item' && c.itemUseType === 'area';
        });
        if (!hasUsableItem) btn.disabled = true;
      }
      if (cmd === 'end') {
        if (canDraw) btn.disabled = true;
        if (phase !== 'idle') btn.disabled = true;
        if (isCpuTurn) btn.disabled = true;
      }
    });
    updateFabDisplay();
  }

  /* ===================== コマンドバーの初期位置（画面右下に固定） ===================== */
  function showCommandBar(show) {
    var bar = $('command-bar');
    if (!bar) return;
    bar.hidden = !show;
    bar.classList.toggle('hidden', !show);
    bar.style.display = show ? 'flex' : 'none';
    if (show) {
      updateCommandButtons();
      updateFabDisplay();
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
    if (horses.length === 0) {
      showToast('手札に馬カードがありません');
      setNarrator('手札に馬カードがありません。');
      Haptics.warn();
      return;
    }
    var forces = hand.filter(function (c) { return c.type === 'force'; });
    var minCost = Math.min.apply(null, horses.map(function (h) { return h.cost || 2; }));
    if (forces.length < minCost) {
      showToast('フォースカードが不足しています');
      setNarrator('⚠️ コストとなる<b>フォースカードが不足しています</b>。（必要: ' + minCost + '枚 / 手札: ' + forces.length + '枚）');
      Haptics.warn();
      return;
    }
    hasRunThisTurn = true;
    runEntrySource = 'menu';
    phase = 'select_horse';
    runHorseSelectionConfirmedId = null;
    runItemSelectionConfirmedId = null;
    selectedHorse = null;
    selectedForces = [];
    selectedRunItems = [];
    selectedGuardHorse = null;
    selectedGuardItems = [];
    directRunItemId = null;
    handPan = 0;
    runBonus = 0;
    setNarrator('走破する<b>馬カード</b>を選んでタップしてください。');
    showToast('走破する馬カードを1枚選んでください');
    renderAll();
  }

  var pendingAfterField = null;

  function runSupportCards() {
    return hand.filter(function (c) {
      return (c.type === 'item' || c.type === 'jockey') &&
        (c.effectType === 'run_bonus' || c.effectType === 'run_penalty' || c.effectType === 'elite_jockey');
    });
  }

  function isGuardSupportCard(card) {
    return !!(card && (card.type === 'item' || card.type === 'jockey') &&
      (card.effectType === 'guard_bonus' || card.effectType === 'elite_jockey' || card.guardBonus));
  }

  function guardSupportValue(card) {
    if (!isGuardSupportCard(card)) return 0;
    if (card.effectType === 'guard_bonus') return card.effectValue || 0;
    return card.guardBonus || 1;
  }

  function guardSupportCards() {
    return hand.filter(isGuardSupportCard);
  }

  function beginForceSelection() {
    phase = 'select_force';
    prevPhase = null;
    selectedForces = [];
    var cost = selectedHorse ? (selectedHorse.cost || 2) : 2;
    var horseName = (selectedHorse && selectedHorse.name) ? selectedHorse.name : '馬カード';
    setNarrator('<b>' + horseName + '</b>のコスト分のフォースカードを捨ててください。（残り ' + cost + ' 枚）');
    showToast('馬カードのコスト分のフォースカードを捨ててください');
    renderAll();
  }

  function beginRunWithHorse(card) {
    if (!card || card.type !== 'horse' || isCpuTurn || hasRunThisTurn || canDraw) return;
    var forces = hand.filter(function (c) { return c.type === 'force'; });
    var cost = card.cost || 2;
    if (forces.length < cost) {
      showToast('フォースカードが不足しています');
      setNarrator('⚠️ コストとなる<b>フォースカードが不足しています</b>（必要: ' + cost + '枚 / 手札: ' + forces.length + '枚）');
      Haptics.warn();
      return;
    }
    hasRunThisTurn = true;
    runEntrySource = 'hand';
    selectedHorse = card;
    selectedForces = [];
    runBonus = 0;
    beginForceSelection();
  }

  function beginRunWithItem(card) {
    if (!card || (card.type !== 'item' && card.type !== 'jockey') || isCpuTurn || hasRunThisTurn || canDraw) return;
    if (card.itemUseType === 'area' && card.type === 'item') {
      hand = hand.filter(function (c) { return c.id !== card.id; });
      farm.push(card);
      applyItemEffect(card);
      phase = 'idle';
      renderAll();
      return;
    }
    selectedRunItems = [card];
    directRunItemId = card.id;
    hasRunThisTurn = true;
    runEntrySource = 'hand';
    phase = 'select_horse';
    selectedHorse = null;
    selectedForces = [];
    runBonus = 0;
    setNarrator('「<b>' + card.name + '</b>」と一緒に走破する<b>馬カード</b>を選んでください。');
    showToast('アイテムを仮選択しました。次に馬カードを選んでください');
    renderAll();
  }

  function offerRunSupport() {
    var supports = runSupportCards();
    if (!supports.length) {
      if (pendingAfterField) {
        var fn = pendingAfterField;
        pendingAfterField = null;
        fn();
      } else {
        executeRun();
      }
      return;
    }
    phase = 'support_choice';
    renderAll();
    var hName = (field && field.name) ? field.name : (selectedHorse ? selectedHorse.name : 'この馬');
    $('run-support-desc').innerHTML =
      '<b>' + hName + '</b> の走破値を増減できるカードが ' + supports.length + ' 枚あります。使いますか？';
    $('run-support-popup').style.display = 'flex';
  }

  function closeRunSupportChoice(useCard) {
    $('run-support-popup').style.display = 'none';
    if (useCard) {
      prevPhase = 'select_force';
      prevSelectedHorse = selectedHorse;
      prevSelectedForces = selectedForces.slice();
      phase = 'select_item';
      runItemSelectionConfirmedId = null;
      if (directRunItemId && selectedRunItems.length === 0) {
        var directItem = hand.filter(function (c) { return c.id === directRunItemId; })[0];
        if (directItem) selectedRunItems = [directItem];
      }
      setNarrator('使う<b>アイテム／騎手カード</b>を選び、「この内容で走破」を押してください。もう一度タップすると選択を外せます。');
      renderAll();
    } else {
      selectedRunItems = [];
      directRunItemId = null;
      executeRun();
    }
  }

  function confirmRunItems() {
    if (phase !== 'select_item' || selectedRunItems.length === 0) return;
    var items = selectedRunItems.slice();
    items.forEach(function (card) {
      hand = hand.filter(function (c) { return c.id !== card.id; });
      farm.push(card);
      applyItemEffect(card, { silent: true });
    });
    selectedRunItems = [];
    directRunItemId = null;
    runItemSelectionConfirmedId = null;
    phase = 'select_force';
    renderAll();
    executeRun();
  }

  function confirmGuardItems() {
    if (phase !== 'select_guard_item' || selectedGuardItems.length === 0 || !selectedGuardHorse) return;
    var guardHorse = selectedGuardHorse;
    var items = selectedGuardItems.slice();
    var bonus = items.reduce(function (sum, card) { return sum + guardSupportValue(card); }, 0);
    var usedIds = items.map(function (card) { return card.id; });
    hand = hand.filter(function (card) { return usedIds.indexOf(card.id) < 0; });
    items.forEach(function (card) { farm.push(card); });
    itemGuardBonus += bonus;
    selectedGuardItems = [];
    selectedGuardHorse = null;
    guardItemSelectionConfirmedId = null;
    phase = 'guard_select';
    renderAll();
    setNarrator('ガード強化カードを<b>' + items.length + '枚</b>使用！ ガード値が<b>＋' + bonus + '</b>されます。');
    // 走破強化と同様、確定後は中間バナーの終了を待たずに処理を進める。
    // 強化後の合計値は、この直後のガード結果バナーで表示される。
    selectGuard(guardHorse, true);
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

  function activateSituationCard(card, onComplete, runId) {
    if (!card || card.type !== 'situation') return;
    hand = hand.filter(function (c) { return c.id !== card.id; });
    var el = cardElById(card.id);
    var dest = $('zone-situation');
    var destRect = dest ? dest.getBoundingClientRect() : null;

    function finish() {
      if (runId != null && runId !== tutorialRunId) return;
      situation = card;
      var conditions = ['不良', '重', '稍重', '良'];
      var conditionIndex = conditions.indexOf(race.trackCondition);
      race.trackCondition = conditions[Math.min(3, Math.max(0, conditionIndex) + 1)];
      phase = 'idle';
      SoundFX.shimmer();
      Haptics.place();
      setNarrator('状況カード「<b>' + card.name + '</b>」を使用した！ 馬場状態が<b>' + race.trackCondition + '</b>になった！');
      renderRaceInfo();
      renderAll();
      showToast('状況カード「' + card.name + '」を使用！');
      CardCloseup.show(card, { label: '状況カード使用！', autoHideMs: 1500 });
      if (onComplete) onComplete();
      else checkHintsAvailable();
    }

    if (el && destRect) {
      flyGhost(el, destRect).then(finish);
    } else {
      finish();
    }
  }

  function cmdSituation() {
    if (phase !== 'idle' || isCpuTurn || canDraw) return;
    var situations = hand.filter(function (c) { return c.type === 'situation'; });
    if (!situations.length) {
      showToast('手札に状況カードがありません');
      setNarrator('手札に状況カードがありません。');
      Haptics.warn();
      return;
    }
    if (situations.length === 1) {
      activateSituationCard(situations[0]);
    } else {
      prevPhase = phase;
      phase = 'select_situation';
      setNarrator('使う<b>状況カード</b>を選んでタップしてください。');
      renderAll();
    }
  }

  function cmdEndTurn() {
    if (phase !== 'idle' || pendingFinishRun || isCpuTurn || canDraw) return;
    endTurn();
  }

  /* ===================== ターン終了 / CPUターン ===================== */
  function endTurn() {
    if (phase !== 'idle' || pendingFinishRun) return;
    phase = 'idle';
    selectedHorse = null;
    selectedForces = [];
    runBonus = 0;
    canDraw = true;
    isCpuTurn = true;
    showCommandBar(false);
    setNarrator('🧠 <b>CPUのターンです。</b>');
    renderAll();
    showBanner('CPUのターンです', 1200).then(function () {
      setNarrator('🧠 CPU思考中…');
      showOpponentBubble('思考中…');
      sleep(1200).then(function () {
        cpuTurn();
      });
    });
  }

  function beginPlayerTurn(message) {
    if (message) setNarrator(message);
    isCpuTurn = false;
    canDraw = true;
    phase = 'idle';
    hasRunThisTurn = false;
    cpuHorseCard = null;
    showCommandBar(false);
    renderAll();
    checkVictory();
    if (victoryShown) return Promise.resolve();
    return showBanner('あなたのターンです', 1200).then(function () {
      setNarrator('🏇 <b>あなたのターンです。</b> 山札からカードを1枚引きます。');
      showCommandBar(true);
      cmdDraw();
    });
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

    // CPUが使えるアイテム（回復薬や獣医師など）があれば使用する
    var cpuItem = cpuHand.find(function (c) {
      return c.type === 'item' && (c.effectType === 'draw' || c.effectType === 'farm_recovery');
    });
    if (cpuItem) {
      cpuHand = cpuHand.filter(function (c) { return c.id !== cpuItem.id; });
      farm.push(cpuItem);
      applyItemEffect(cpuItem, { owner: 'cpu' });
      renderAll();
    }

    sleep(600).then(function () {
      var horseCard = cpuPickRunnableHorse();
      if (!horseCard) {
        setNarrator('🧠 相手は走破できる馬がいないため、ターンを終了しました。（相手の手札: ' + cpuHand.length + '枚）');
        sleep(900).then(function () {
          beginPlayerTurn('🧠 相手は走破できる馬がいないため、ターンを終了しました。');
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
      var cpuLane = cpuCurrentLane();
      cpuRunValue = effectiveRun(horseCard, 0, cpuLane);
      var cpuMods = runModifiers(horseCard, cpuLane).map(function (mod) { return mod.label; }).join(' / ') || '適性補正なし';
      setNarrator('🧠 相手が「<b>' + horseCard.name + '</b>」で走破を宣言！ 基礎 ' + horseCard.run + '、' + cpuMods + ' → 実効走破 <b>' + cpuRunValue + '</b>');
      renderAll();

      function continueCpuRun() {
        if (cpuRunValue <= 0) {
          beginPlayerTurn('🧠 相手の実効走破値が0以下のため走破失敗。');
          return;
        }

        // 相手の走破馬カードとガードポップアップを一緒に表示
        showGuardPopup(cpuRunValue, horseCard);
      }

      if (styleMatchesCurrentArea(horseCard, cpuLane)) {
        setNarrator('🧠 <b>脚質一致！</b> 相手の馬の脚質と' + cpuLane.label + 'エリアが一致したため、走破値が<b>+1</b>されます。');
        showBanner('脚質一致！ 走破＋1', 1800, horseCard, '相手：' + cpuLane.label + 'エリアと脚質が一致').then(continueCpuRun);
      } else {
        continueCpuRun();
      }
    });
  }

  function showGuardPopup(runValue, horseCard) {
    var popup = $('guard-popup');
    var slot = $('guard-horse-slot');
    if (slot) {
      slot.innerHTML = '';
      slot.onclick = null;
      slot.onkeydown = null;
      slot.removeAttribute('role');
      slot.removeAttribute('tabindex');
      slot.removeAttribute('aria-label');
      if (horseCard) {
        var cEl = buildCardEl(horseCard);
        slot.appendChild(cEl);
        slot.setAttribute('role', 'button');
        slot.setAttribute('tabindex', '0');
        slot.setAttribute('aria-label', '相手の走破馬カードの詳細を確認');
        slot.onclick = function () {
          CardCloseup.show(horseCard, { label: '相手の馬カード詳細' });
        };
        slot.onkeydown = function (event) {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            slot.onclick();
          }
        };
      }
    }
    var titleEl = $('guard-title');
    if (titleEl) {
      titleEl.innerHTML = horseCard ? ('相手が「<b>' + horseCard.name + '</b>」で走破！') : '相手が走破してきました！';
    }

    var canGuard = hand.some(function (c) { return c.type === 'horse'; });
    var descEl = $('guard-desc');
    var btnsEl = $('guard-btns');
    popup.style.display = 'flex';

    if (canGuard) {
      descEl.innerHTML =
        '相手の走破を手札の馬カードでガードしますか？<br>' +
        '（ガード値分だけ相手のドローを減らせます）<br>' +
        '相手の馬カードをタップすると詳細を確認できます。<br>' +
        '「ガードしない」なら、馬カードを使わずそのまま走破を通します。<br>' +
        '相手の実効走破値: <b>' + runValue + '</b>';
      btnsEl.innerHTML =
        '<button class="btn-guard" id="guard-yes">ガードする</button>' +
        '<button class="btn-skip" id="guard-no">⏭ ガードしない</button>';

      $('guard-yes').addEventListener('click', function () {
        popup.style.display = 'none';
        phase = 'guard_select';
        guardSelectionConfirmedId = null;
        selectedGuardHorse = null;
        selectedGuardItems = [];
        guardItemSelectionConfirmedId = null;
        setNarrator('馬カードをタップして<b>カードの詳細とガード値を確認</b>し、「この馬でガード」を押してください。');
        renderAll();
      });
      $('guard-no').addEventListener('click', function () {
        popup.style.display = 'none';
        guardSelectionConfirmedId = null;
        guardValue = 0;
        itemGuardBonus = 0;
        selectedGuardHorse = null;
        selectedGuardItems = [];
        guardItemSelectionConfirmedId = null;
        executeCpuDraw(cpuRunValue);
      });
    } else {
      descEl.innerHTML =
        '相手の実効走破値: <b>' + runValue + '</b><br>' +
        '（手札にガード可能な馬カードがありません）';
      btnsEl.innerHTML =
        '<button class="btn-guard" id="guard-ok">OK（相手がドロー）</button>';

      $('guard-ok').addEventListener('click', function () {
        popup.style.display = 'none';
        guardValue = 0;
        itemGuardBonus = 0;
        executeCpuDraw(cpuRunValue);
      });
    }
  }

  function selectGuard(card, skipSupportOffer) {
    if (phase !== 'guard_select') return;
    if (card.type !== 'horse') { shakeCard(card.id); return; }
    if ((card.dist || '').indexOf(raceDistanceKey(race.distance)) < 0) {
      setNarrator('この馬は今回の<b>' + race.distance + '</b>をガードできません。距離適性を確認してください。');
      shakeCard(card.id);
      return;
    }

    var availableGuardSupports = !skipSupportOffer ? guardSupportCards() : [];
    if (interactionMode === 'freeplay' && availableGuardSupports.length > 0) {
      selectedGuardHorse = card;
      selectedGuardItems = [];
      guardItemSelectionConfirmedId = null;
      phase = 'select_guard_item';
      handPan = 0;
      setNarrator('ガードを強化する<b>アイテム／騎手カード</b>を選び、右側の確定ボタンを押してください。複数枚選べます。');
      showToast('ガード強化カードを選択してください');
      renderAll();
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
        selectedGuardHorse = null;
        selectedGuardItems = [];
        guardItemSelectionConfirmedId = null;
        phase = 'idle';
        renderAll();
        var guardText = '自分がガード！ ' + card.name + ' / ガード ' + guardVal;
        setNarrator('ガード値 <b>' + guardVal + '</b> でガード！ 相手のドローが ' + guardVal + ' 減少します。');
        showBanner(guardText, 2800, card).then(function () {
          executeCpuDraw(cpuRunValue - guardVal);
        });
      });
    }
  }

  function executeCpuDraw(drawCount) {
    var actualDraw = Math.max(0, drawCount);
    if (actualDraw <= 0) {
      beginPlayerTurn('ガードで相手の走破を完全に防いだ！ 相手は1枚も引けなかった！');
      return;
    }
    var maxDraw = Math.min(actualDraw, cpuTotalDeck());
    setNarrator('相手（CPU）は走破に成功しました。山札から ' + maxDraw + ' 枚引きます。（走破 ' + cpuRunValue + ' - ガード ' + guardValue + ' = ' + actualDraw + '）');

    var horse = cpuHorseCard || goldShip();
    showBanner('走破成功！ ' + maxDraw + '枚ドロー', 3000, horse,
      '相手：走破 ' + cpuRunValue + ' − ガード ' + guardValue + ' ＝ ' + maxDraw + '枚').then(function () {
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
        // 走破成功時：走破数 - 1 枚を手札から捨てる（プレイヤーと同ルール）
        var discardCount = Math.max(0, maxDraw - 1);
        var needDiscard = Math.min(discardCount, cpuHand.length);

        function cpuPickCardToDiscard() {
          if (!cpuHand.length) return null;
          // 1. アイテムカード（既に使わなかったもの）
          var itemIdx = cpuHand.findIndex(function (c) { return c.type === 'item'; });
          if (itemIdx >= 0) return cpuHand.splice(itemIdx, 1)[0];

          // 2. 馬カードが複数あれば、走破値の低い馬を捨てる
          var horses = cpuHand.filter(function (c) { return c.type === 'horse'; });
          if (horses.length > 1) {
            horses.sort(function (a, b) { return (a.run || 0) - (b.run || 0); });
            var worstHorse = horses[0];
            var hIdx = cpuHand.findIndex(function (c) { return c.id === worstHorse.id; });
            if (hIdx >= 0) return cpuHand.splice(hIdx, 1)[0];
          }

          // 3. フォースカードが4枚以上あればフォースを捨てる
          var forces = cpuHand.filter(function (c) { return c.type === 'force'; });
          if (forces.length >= 4) {
            var fIdx = cpuHand.findIndex(function (c) { return c.type === 'force'; });
            if (fIdx >= 0) return cpuHand.splice(fIdx, 1)[0];
          }

          // 4. その他は末尾のカードを捨てる
          return cpuHand.pop();
        }

        var discardChain = Promise.resolve();
        if (needDiscard > 0) {
          setNarrator('相手（CPU）は走破ルールに従い、手札から <b>' + needDiscard + '枚</b> をファームに送ります…');
          var oppZone = $('zone-opponent');
          var oppRect = oppZone ? oppZone.getBoundingClientRect() : { left: 100, top: 50, width: 60, height: 40 };
          var farmZone = $('zone-farm');
          var farmRect = farmZone ? farmZone.getBoundingClientRect() : { left: 50, top: 400, width: 80, height: 110 };

          for (var d = 0; d < needDiscard; d++) {
            (function (idx) {
              discardChain = discardChain.then(function () {
                var discarded = cpuPickCardToDiscard();
                if (discarded) {
                  farm.push(discarded);
                  opponentHandCount = cpuHand.length;
                  renderAll();
                }
                var dummy = makeOpponentDiscardDummy(oppRect);
                return flyGhost(dummy, farmRect, 0.5).then(function () {
                  dummy.remove();
                  if (window.SoundFX && typeof SoundFX.cardSlide === 'function') SoundFX.cardSlide();
                  return sleep(160);
                });
              });
            })(d);
          }
        }

        return discardChain.then(function () {
          if (cpuHorseCard) {
            farm.push(cpuHorseCard);
            cpuHorseCard = null;
          }
          var endMsg = needDiscard > 0
            ? ('🧠 相手のターン終了！ 手札を ' + needDiscard + '枚 捨てました（相手の残り手札: ' + cpuHand.length + '枚）。あなたの番です。')
            : '🧠 相手のターン終了！ あなたの番です。';
          setNarrator(endMsg);
          if (needDiscard > 0) {
            showToast('相手が手札を' + needDiscard + '枚捨てました', 'info', 2200);
          }
          beginPlayerTurn(endMsg);
        });
      });
    });
  }

  /* ===================== 走破実行（相手ガード付き） ===================== */
  function executeRun() {
    if (!selectedHorse || isCpuTurn) return;
    phase = 'resolving_run';
    renderAll();
    var playerLane = currentLane();
    var totalRun = effectiveRun(selectedHorse, runBonus, playerLane);
    var horseInPlay = selectedHorse;
    var forcesToPay = selectedForces.slice();
    var modifierText = runModifiers(selectedHorse, playerLane).map(function (mod) { return mod.label; }).join(' / ') || '適性補正なし';

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
          if (styleMatchesCurrentArea(horseInPlay, playerLane)) {
            setNarrator('<b>脚質一致！</b> ' + playerLane.label + 'エリアと馬の脚質が一致したため、走破値が<b>+1</b>されます。');
            return showBanner('脚質一致！ 走破＋1', 1800, horseInPlay, playerLane.label + 'エリアと脚質が一致');
          }
          CardCloseup.show(horseInPlay, { label: '走破！', autoHideMs: 1800 });
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
            setNarrator('相手はガードをしませんでした。走破成功です！');
            return continueRunLogic(totalRun, false, 0);
          } else {
            var guardHorse = CPU_HORSE_POOL[Math.floor(Math.random() * CPU_HORSE_POOL.length)]();
            var guardVal = guardHorse.guard || 0;
            fieldGuard = guardHorse;
            renderField();
            return showOpponentGuardBanner(guardHorse, guardVal).then(function () {
              if (totalRun <= guardVal) {
                setNarrator('❌ 走破失敗。実効走破値 ' + totalRun + ' は実効ガード値 ' + guardVal + ' を上回れなかった。');
                return sendHorseToFarmAndReset();
              } else {
                var runDistance = totalRun - guardVal;
                setNarrator('実効走破 ' + totalRun + ' − 実効ガード ' + guardVal + ' = <b>走破距離 ' + runDistance + '</b>。');
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
      var resultDetail = usedGuard
        ? '走破 ' + totalRun + ' − ガード ' + usedGuardVal + ' ＝ ' + drawCount + '枚'
        : '実効走破 ' + totalRun + ' ＝ ' + drawCount + '枚';
      var chain = showBanner('走破成功！ ' + drawCount + '枚ドロー', 3000, horseInPlay, resultDetail);
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
          discardSelectionsInFlight = 0;
          discardSelectionConfirmedId = null;
          pendingFinishRun = function () { finishRun(finalRun, usedGuard, usedGuardVal); };
          setNarrator('引いた中から <b>' + need + '枚</b> 選んでファームに送ってください。');
          showToast('走破成功！ 手札から ' + need + '枚選んで捨ててください');
          renderAll();
        } else {
          finishRun(finalRun, usedGuard, usedGuardVal);
        }
      });
    }

    function finishRun(finalRun, usedGuard, usedGuardVal) {
      var msg = '<b>走破成功！</b> ' + finalRun + '枚引いたよ！';
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
              if (!victoryShown && !isCpuTurn && phase === 'idle' && !pendingFinishRun) {
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
  function applyItemEffect(card, opts) {
    opts = opts || {};
    var isCpuOwner = opts.owner === 'cpu';
    var effectHand = isCpuOwner ? cpuHand : hand;
    if (!opts.silent) CardCloseup.show(card, { label: '使用！', autoHideMs: 1100 });
    var msg = isCpuOwner
      ? '相手がアイテム「' + card.name + '」を使った！'
      : 'アイテム「' + card.name + '」を使った！';
    switch (card.effectType) {
      case 'run_bonus':
        runBonus += card.effectValue;
        msg += ' 走破ボーナス +' + card.effectValue;
        break;
      case 'guard_bonus':
        itemGuardBonus += card.effectValue;
        msg += ' ガードボーナス +' + card.effectValue + '（次にガードする時に加算されます）';
        break;
      case 'elite_jockey':
        runBonus += 1;
        itemGuardBonus += 1;
        msg += ' 走破ボーナス +1、ガードボーナス +1！';
        break;
      case 'farm_recovery':
        var recoveredForce = null;
        var recoveredHorse = null;
        for (var fi = 0; fi < farm.length; fi++) {
          if (!recoveredForce && farm[fi].type === 'force') {
            recoveredForce = farm.splice(fi, 1)[0];
            fi--;
            continue;
          }
          if (!recoveredHorse && farm[fi].type === 'horse') {
            recoveredHorse = farm.splice(fi, 1)[0];
            fi--;
            continue;
          }
        }
        var recNames = [];
        if (recoveredForce) { effectHand.push(recoveredForce); recNames.push(recoveredForce.name); }
        if (recoveredHorse) { effectHand.push(recoveredHorse); recNames.push(recoveredHorse.name); }
        if (isCpuOwner) opponentHandCount = cpuHand.length;
        if (recNames.length > 0) {
          msg += ' ファームから【' + recNames.join('・') + '】を' + (isCpuOwner ? '相手の' : '') + '手札に戻した！';
        } else {
          msg += ' ファームに対象のカードがありませんでした。';
        }
        break;
      case 'draw':
        var drawn = 0;
        for (var i = 0; i < card.effectValue; i++) {
          if (!(isCpuOwner ? cpuCurrentLane() : currentLane())) break;
          var maker = FREEPLAY_POOL[Math.floor(Math.random() * FREEPLAY_POOL.length)];
          effectHand.push(maker());
          if (isCpuOwner) {
            cpuDrawOneFromDeck();
            opponentHandCount = cpuHand.length;
          } else {
            drawOneFromDeck();
          }
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

    if (interactionMode === 'lesson-situation-busy') return;
    if (interactionMode === 'lesson-situation') {
      var situationChoice = lessonSituationSelection;
      if (!situationChoice || card.type !== 'situation') return;
      CardCloseup.show(card, {
        label: '状況カード詳細',
        actionLabel: 'この状況カードを使用する',
        onAction: function () {
          if (situationChoice.runId !== tutorialRunId || lessonSituationSelection !== situationChoice) return;
          lessonSituationSelection = null;
          interactionMode = 'lesson-situation-busy';
          renderHand();
          activateSituationCard(card, function () {
            interactionMode = null;
            situationChoice.resolve();
          }, situationChoice.runId);
        }
      });
      return;
    }

    if (interactionMode === 'select-any' && card.id === lessonReservedHorseId) {
      showToast('この馬は2ターン目の練習に残しておこう');
      return;
    }

    if (interactionMode === 'select-horse' && lessonRunHorseId && card.id !== lessonRunHorseId) {
      showToast('今回は案内されている馬カードを選んでください');
      return;
    }

    if (interactionMode === 'lesson-item-busy') return;
    if (interactionMode === 'lesson-item') {
      var itemChoice = lessonItemSelection;
      if (!itemChoice || card.id !== itemChoice.id) {
        showToast('案内されているアイテムを選んでください');
        return;
      }
      CardCloseup.show(card, {
        label: 'アイテムカード詳細',
        actionLabel: 'このカードを使う',
        onAction: async function () {
          if (itemChoice.runId !== tutorialRunId || lessonItemSelection !== itemChoice) return;
          lessonItemSelection = null;
          interactionMode = 'lesson-item-busy';
          renderHand();
          await flyGhost(cardElById(card.id), $('zone-farm').getBoundingClientRect());
          if (itemChoice.runId !== tutorialRunId) return;
          hand = hand.filter(function (c) { return c.id !== card.id; });
          farm.push(card);
          applyItemEffect(card, { silent: true });
          interactionMode = null;
          hideSelectionProgress();
          renderAll();
          itemChoice.resolve();
        }
      });
      return;
    }

    // ガード選択中に操作できるのは馬カードだけ。
    // CPUターン中は通常の自由操作分岐を通らないため、ここで先に止めて
    // アイテムなどが汎用の「ファームへ送る」処理へ落ちるのを防ぐ。
    if (phase === 'guard_select' && card.type !== 'horse') {
      shakeCard(id);
      showToast('ガードには馬カードを選んでください');
      return;
    }

    var isRunHorseChoice = card.type === 'horse' &&
      (phase === 'select_horse' || phase === 'select_force' || interactionMode === 'select-horse');
    if (isRunHorseChoice && runHorseSelectionConfirmedId !== id) {
      CardCloseup.show(card, {
        label: '馬カード詳細',
        actionLabel: phase === 'select_force' ? 'この馬に変更' : 'この馬で走破',
        onAction: function () {
          runHorseSelectionConfirmedId = id;
          onHandCardClick(id);
        }
      });
      return;
    }
    if (isRunHorseChoice) runHorseSelectionConfirmedId = null;

    var isGuardChoice = card.type === 'horse' &&
      (phase === 'guard_select' || interactionMode === 'select-guard');
    if (isGuardChoice && guardSelectionConfirmedId !== id) {
      CardCloseup.show(card, {
        label: '馬カード詳細',
        actionLabel: 'この馬でガード',
        onAction: function () {
          guardSelectionConfirmedId = id;
          onHandCardClick(id);
        }
      });
      return;
    }

    var isDiscardChoice = phase === 'discard_select' || interactionMode === 'select-any';
    if (isDiscardChoice && discardSelectionConfirmedId !== id) {
      CardCloseup.show(card, {
        label: 'カード詳細',
        actionLabel: 'このカードを捨てる',
        onAction: function () {
          discardSelectionConfirmedId = id;
          onHandCardClick(id);
        }
      });
      return;
    }
    if (isDiscardChoice) discardSelectionConfirmedId = null;

    var isRunItemChoice = phase === 'select_item' &&
      (card.type === 'item' || card.type === 'jockey') &&
      (card.effectType === 'run_bonus' || card.effectType === 'run_penalty' || card.effectType === 'elite_jockey');
    if (isRunItemChoice && runItemSelectionConfirmedId !== id) {
      var isAlreadySelected = selectedRunItems.some(function (item) { return item.id === id; });
      CardCloseup.show(card, {
        label: card.type === 'jockey' ? '騎手カード詳細' : 'アイテムカード詳細',
        actionLabel: isAlreadySelected ? '選択を外す' : 'このカードを選択',
        onAction: function () {
          runItemSelectionConfirmedId = id;
          onHandCardClick(id);
        }
      });
      return;
    }
    if (isRunItemChoice) runItemSelectionConfirmedId = null;

    var isGuardItemChoice = phase === 'select_guard_item' && isGuardSupportCard(card);
    if (isGuardItemChoice && guardItemSelectionConfirmedId !== id) {
      var isGuardItemSelected = selectedGuardItems.some(function (item) { return item.id === id; });
      CardCloseup.show(card, {
        label: card.type === 'jockey' ? '騎手カード詳細' : 'アイテムカード詳細',
        actionLabel: isGuardItemSelected ? '選択を外す' : 'このカードを選択',
        onAction: function () {
          guardItemSelectionConfirmedId = id;
          onHandCardClick(id);
        }
      });
      return;
    }
    if (isGuardItemChoice) guardItemSelectionConfirmedId = null;

    if (phase === 'guard_select' && card.type === 'horse') {
      guardSelectionConfirmedId = null;
      selectGuard(card);
      return;
    }

    // ガード強化の選択は相手ターン中に行うため、select_guard_item だけは
    // isCpuTurn が true でも手札の選択処理を通す。
    if (interactionMode === 'freeplay' && (!isCpuTurn || phase === 'select_guard_item')) {
      if (phase === 'discard_select') {
        if (selectionCount + discardSelectionsInFlight >= selectionNeeded) return;
        discardSelectionsInFlight++;
        el.style.pointerEvents = 'none';
        el.classList.add('selected');
        var farmRectD = $('zone-farm').getBoundingClientRect();
        flyGhost(el, farmRectD).then(function () {
          discardSelectionsInFlight = Math.max(0, discardSelectionsInFlight - 1);
          hand = hand.filter(function (c) { return c.id !== id; });
          farm.push(card);
          selectionCount++;
          var remaining = selectionNeeded - selectionCount;
          if (remaining > 0) {
            renderAll();
            setNarrator('あと <b>' + remaining + '枚</b> 選んでファームに送ってください。');
          } else {
            phase = 'idle';
            renderAll();
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
          showToast('フォースカードが不足しています');
          setNarrator('⚠️ コストとなる<b>フォースカードが不足しています</b>（必要: ' + cost + '枚 / 手札: ' + forces.length + '枚）');
          Haptics.warn();
          shakeCard(id);
          phase = 'idle'; selectedHorse = null; hasRunThisTurn = false;
          renderAll();
          return;
        }
        showToast('選んだ馬を確認しました。必要なフォースカードを選んでください');
        beginForceSelection();
        return;
      }

      if (phase === 'select_force') {
        if (card.type === 'horse') {
          selectedHorse = card;
          selectedForces = [];
          showToast('走破する馬を「' + card.name + '」に変更しました');
          beginForceSelection();
          return;
        }
        if (card.type !== 'force') { shakeCard(id); return; }
        var selectedForceIndex = selectedForces.findIndex(function (c) { return c.id === card.id; });
        if (selectedForceIndex >= 0) {
          selectedForces.splice(selectedForceIndex, 1);
          var deselectCost = selectedHorse ? (selectedHorse.cost || 2) : 2;
          var deselectRemaining = Math.max(0, deselectCost - selectedForces.length);
          setNarrator('<b>' + (selectedHorse ? selectedHorse.name : '馬カード') +
            '</b>のコスト分のフォースカードを捨ててください。（残り ' + deselectRemaining + ' 枚）');
          showToast('フォースカードの選択を外しました');
          renderAll();
          return;
        }
        selectedForces.push(card);
        // 選択後もクリック可能なまま再描画し、同じカードの再クリックで解除できるようにする。
        renderHand();
        var cost = selectedHorse.cost || 2;
        if (selectedForces.length >= cost) {
          showToast('必要なフォースカードを選択しました');
          if (directRunItemId) {
            prevPhase = 'select_force';
            prevSelectedHorse = selectedHorse;
            prevSelectedForces = selectedForces.slice();
            phase = 'select_item';
            setNarrator('使用するアイテムを確認し、「この内容で走破」を押してください。');
            renderAll();
          } else if (runSupportCards().length > 0) {
            offerRunSupport();
          } else {
            executeRun();
          }
        } else {
          var remaining = cost - selectedForces.length;
          var horseName = (selectedHorse && selectedHorse.name) ? selectedHorse.name : '馬カード';
          setNarrator('<b>' + horseName + '</b>のコスト分のフォースカードを捨ててください。（残り ' + remaining + ' 枚）');
          showToast('フォースカード：' + selectedForces.length + ' / ' + cost + '枚');
          updateCommandButtons();
        }
        return;
      }

      if (phase === 'select_item') {
        if (card.type !== 'item' && card.type !== 'jockey') { shakeCard(id); return; }
        if (card.effectType !== 'run_bonus' && card.effectType !== 'run_penalty' && card.effectType !== 'elite_jockey') {
          shakeCard(id); return;
        }
        var selectedIndex = selectedRunItems.findIndex(function (c) { return c.id === card.id; });
        if (selectedIndex >= 0) {
          selectedRunItems.splice(selectedIndex, 1);
          showToast('「' + card.name + '」の選択を外しました');
        } else {
          selectedRunItems.push(card);
          showToast('「' + card.name + '」を仮選択しました');
        }
        runItemSelectionConfirmedId = null;
        setNarrator(selectedRunItems.length > 0
          ? '<b>' + selectedRunItems.length + '枚</b>選択中です。内容を確認して走破を確定してください。'
          : '使うアイテムを選んでください。キャンセルすればフォース選択へ戻れます。');
        renderAll();
        return;
      }

      if (phase === 'select_guard_item') {
        if (!isGuardSupportCard(card)) { shakeCard(id); return; }
        var guardItemIndex = selectedGuardItems.findIndex(function (item) { return item.id === card.id; });
        if (guardItemIndex >= 0) {
          selectedGuardItems.splice(guardItemIndex, 1);
          showToast('「' + card.name + '」の選択を外しました');
        } else {
          selectedGuardItems.push(card);
          showToast('「' + card.name + '」を仮選択しました');
        }
        guardItemSelectionConfirmedId = null;
        setNarrator(selectedGuardItems.length > 0
          ? '<b>' + selectedGuardItems.length + '枚</b>選択中です。内容を確認してガードを確定してください。'
          : '使うガード強化カードを選んでください。左側のボタンでアイテムを使わずガードできます。');
        renderAll();
        return;
      }

      if (phase === 'select_item_idle') {
        var isEligibleIdle = card.type === 'item' && card.itemUseType === 'area';
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
        activateSituationCard(card);
        return;
      }

      if (phase === 'idle') {
        if (card.type === 'situation') {
          CardCloseup.show(card, { label: 'カード詳細' });
          return;
        }
        if (card.type === 'horse') {
          CardCloseup.show(card, {
            label: 'カード詳細',
            actionLabel: 'この馬で走破',
            onAction: function () { beginRunWithHorse(card); }
          });
          return;
        }
        if (card.type === 'item' || card.type === 'jockey') {
          if (card.type === 'item' && card.itemUseType === 'area') {
            CardCloseup.show(card, {
              label: 'カード詳細',
              actionLabel: 'このカードを使う',
              onAction: function () { beginRunWithItem(card); }
            });
          } else {
            CardCloseup.show(card, { label: 'カード詳細' });
          }
          return;
        }
        CardCloseup.show(card, { label: 'カード詳細' });
        return;
      }
      return;
    }

    if (card.type === 'situation' && (!interactionMode || interactionMode === 'freeplay')) {
      activateSituationCard(card);
      return;
    }

    if (!interactionMode || interactionMode === 'draw') return;
    if (interactionMode === 'select-force' && card.type !== 'force') { shakeCard(id); return; }
    if (interactionMode === 'select-horse' && card.type !== 'horse') { shakeCard(id); return; }
    if (interactionMode === 'select-guard' && card.type !== 'horse') { shakeCard(id); return; }
    if (interactionMode === 'select-guard') guardSelectionConfirmedId = null;

    el.style.pointerEvents = 'none';
    el.classList.add('selected');

    var toField2 = (interactionMode === 'select-horse');
    var toGuard2 = (interactionMode === 'select-guard');
    var destId2 = toField2 ? 'zone-field' : (toGuard2 ? 'field-body' : 'zone-farm');
    var destRect2 = $(destId2).getBoundingClientRect();

    flyGhost(el, destRect2).then(function () {
      hand = hand.filter(function (c) { return c.id !== id; });
      if (toField2) {
        if (field) farm.push(field);
        field = card;
      } else if (toGuard2) {
        playerGuardCard = card;
      } else {
        farm.push(card);
      }
      renderAll();

      Haptics.place();

      selectionCount++;
      updateSelectionProgress(selectionCount >= selectionNeeded);
      if (selectionCount >= selectionNeeded) {
        var resolve = actionResolve;
        interactionMode = null;
        actionResolve = null;
        setTimeout(function () {
          hideSelectionProgress();
          if (resolve) resolve();
        }, 450);
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
  $('victory-restart').addEventListener('click', function () { location.href = 'index.html'; });

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
      return c.type === 'item' && c.itemUseType === 'area';
    });
    if (!hasItem) { setNarrator('今使える「<b>タイプ：エリア</b>」のアイテムカードが手札にありません。'); return; }
    prevPhase = phase;
    phase = 'select_item_idle';
    setNarrator('🧪 走破前に使う「<b>タイプ：エリア</b>」のアイテムカードを選んでタップしてください。');
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
  function makeStarterHand() {
    return [forceCard(), forceCard(), forceCard(), goldShip(), rousham(), whip(), goggles()];
  }

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

    // ① 最初の7枚を手札へ配る
    if (!isManual) {
      setNarrator('今回はチュートリアルなので、使うカードは50枚！まずは<b>最初の7枚を手札</b>に配るよ。');
    }
    var handArea = $('zone-hand');
    var handZone = $('hand-row');
    // カードが0枚の間はチュートリアル用CSSで手札エリアが非表示になるため、
    // 先に最終表示位置を確定させてから配札アニメーションを始める。
    // さらに各カードの直前に位置を取り直し、1枚目の追加によるレイアウト変化にも追従する。
    if (handArea) handArea.classList.add('has-cards');
    var starterHand = makeStarterHand();

    for (var hi = 0; hi < starterHand.length; hi++) {
      if (runId && runId !== tutorialRunId) { centerEl.remove(); return; }
      var handRect = handZone.getBoundingClientRect();
      await flyDealGhost(handRect, 220, starterHand[hi]);
      // 飛翔アニメーション中にモードが変わった場合も、旧カードを追加しない。
      if (runId && runId !== tutorialRunId) { centerEl.remove(); return; }
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

    await sleep(isManual ? 150 : 300);
    if (runId && runId !== tutorialRunId) { centerEl.remove(); return; }

    // ② 4つの距離エリア（山札：各8枚・計32枚）へ配る
    if (!isManual) {
      setNarrator('次に、4つの距離エリア（山札）へ<b>それぞれ8枚（計32枚）</b>配置するよ。');
    }
    var laneKeys = ['nige', 'senko', 'sashi', 'oikomi'];
    for (var li = 0; li < laneKeys.length; li++) {
      if (runId && runId !== tutorialRunId) { centerEl.remove(); return; }
      var lKey = laneKeys[li];
      var laneObj = LANES.find(function (l) { return l.key === lKey; });
      var laneEl = document.querySelector('.lane[data-lane="' + lKey + '"]');
      var laneRect = laneEl ? laneEl.getBoundingClientRect() : $('lanes').getBoundingClientRect();

      // 各レーンへテンポよくカードが飛ぶ（2回のゴーストで8枚配る演出）
      for (var step = 0; step < 2; step++) {
        flyDealGhost(laneRect, 180);
        await sleep(isManual ? 40 : 70);
      }
      // モード切替で配布が中断された場合、旧処理から山札枚数を書き戻さない。
      if (runId && runId !== tutorialRunId) { centerEl.remove(); return; }
      laneObj.count = 8;
      updateDeckCount(currentCount - 8);
      renderDeckLanes();
      if (laneEl) {
        laneEl.classList.add('deal-flash');
        setTimeout(function (el) { if (el) el.classList.remove('deal-flash'); }, 350, laneEl);
      }
      Haptics.place();
      await sleep(isManual ? 80 : 150);
    }

    await sleep(isManual ? 150 : 300);
    if (runId && runId !== tutorialRunId) { centerEl.remove(); return; }

    // ③ 残りのカードをファームへ配る
    if (!isManual) {
      setNarrator('そして<b>残りのカードはファーム</b>に置かれるよ！これでバトルの準備完了だ。');
    }
    var farmZone = $('zone-farm');
    var farmRect = farmZone.getBoundingClientRect();
    var starterFarm = [
      forceCard(), forceCard(), forceCard(), forceCard(), forceCard(),
      forceCard(), forceCard(), forceCard(), forceCard(), forceCard(), forceCard()
    ];
    for (var fi = 0; fi < starterFarm.length; fi++) {
      if (runId && runId !== tutorialRunId) { centerEl.remove(); return; }
      await flyDealGhost(farmRect, 180);
      // 飛翔アニメーション中にモードが変わった場合も、旧カードを追加しない。
      if (runId && runId !== tutorialRunId) { centerEl.remove(); return; }
      farm.push(starterFarm[fi]);
      updateDeckCount(currentCount - 1);
      renderFarm();
      if (farmZone) {
        farmZone.classList.add('deal-flash');
        setTimeout(function (el) { if (el) el.classList.remove('deal-flash'); }, 200, farmZone);
      }
      Haptics.place();
      await sleep(isManual ? 30 : 60);
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


  function findHandCardClosestToCenter(matcher) {
    var matches = [];
    var centerIdx = (hand.length - 1) / 2;
    for (var i = 0; i < hand.length; i++) {
      var c = hand[i];
      var ok = typeof matcher === 'function' ? matcher(c) : (c.type === matcher);
      if (ok) {
        matches.push({ card: c, dist: Math.abs(i - centerIdx) });
      }
    }
    if (!matches.length) return null;
    matches.sort(function (a, b) { return a.dist - b.dist; });
    return matches[0].card;
  }

  /* ===================== main tutorial flow ===================== */
  var tutorialRunId = 0;

  // 総合ルール702.6d〜i：ガード後は非ターン側からサポートを使い、
  // その側が追加を終えるともう一方が追加するかパスを選ぶ。双方のパス後に比較する。
  async function runResponseLesson(runId) {
    var horse = hand.find(function (c) { return c.type === 'horse'; });
    var whips = hand.filter(function (c) { return c.effectType === 'run_bonus'; });
    var cpuGuard = rousham();
    var cpuSupport = goggles();

    setProgress(1);
    await explainStep($('zone-hand'), 'zone-hand', '<b>タイプ：馬</b>のアイテムは、走破宣言時に使うだけでなく、<b>相手のガード宣言後にも追加できる</b>よ。今回は最初は使わずに走破を宣言し、相手のガードを見てから使ってみよう。');
    if (runId !== tutorialRunId) return;
    setProgress(2);
    lessonRunHorseId = horse.id;
    runHorseSelectionConfirmedId = null;
    setNarrator('<b>ゴールドシップ</b>を選んで「<b>この馬で走破</b>」を押そう。今回は逃げエリアなので、脚質一致の加算はなく<b>走破3</b>だよ。');
    showNextButton(false);
    await waitSelect('select-horse', 1);
    if (runId !== tutorialRunId) return;
    lessonRunHorseId = null;
    setProgress(3);
    setNarrator('コストの<b>フォース2枚</b>をファームへ送ろう。鞭はまだ使わずに残しておいてね。');
    await waitSelect('select-force', horse.cost);
    if (runId !== tutorialRunId) return;

    setProgress(4);
    fieldGuard = cpuGuard;
    opponentHandCount--;
    guardValue = cpuGuard.guard;
    renderAll();
    showNextButton(false);
    await showOpponentGuardBanner(cpuGuard, guardValue);
    if (runId !== tutorialRunId) return;
    setNarrator('相手が<b>ローシャムパークでガード2</b>。ガード側からサポートを使えるけれど、今回は相手は<b>追加せずに見送った</b>よ。ここで自分がアイテムを追加できるんだ。まだ走破の結果は確定していないよ。');
    await waitNext();
    if (runId !== tutorialRunId) return;

    setProgress(5);
    setNarrator('1枚目の<b>「鞭」</b>を使おう。ガードされた後でも、自分の走破数を<b>3→4</b>に増やせるよ。今回は1枚使って相手に確認を渡すね。');
    await waitLessonItem(whips[0], runId);
    if (runId !== tutorialRunId) return;

    setProgress(6);
    showNextButton(false);
    await showBanner('相手がアイテムを追加！', 2400, cpuSupport, 'ゴーグル：ガード値 +1');
    if (runId !== tutorialRunId) return;
    opponentHandCount--;
    guardValue += cpuSupport.effectValue;
    fieldGuard = Object.assign({}, cpuGuard, { guard: guardValue });
    renderAll();
    setNarrator('相手も<b>「ゴーグル」</b>を追加して、ガードが<b>2→3</b>になった！ 相手はこれ以上の追加を見送ったので、もう一度自分が追加するか選べるよ。');
    await waitNext();
    if (runId !== tutorialRunId) return;

    setProgress(7);
    setNarrator('残っている<b>2枚目の「鞭」</b>を追加しよう。走破が<b>4→5</b>になるよ。相手がアイテムを使っても、先に使った鞭の<b>+1は消えずに残る</b>んだ。');
    await waitLessonItem(whips[1], runId);
    if (runId !== tutorialRunId) return;

    setProgress(8);
    showNextButton(false);
    await showOpponentBubble('これ以上は追加しません');
    if (runId !== tutorialRunId) return;
    setNarrator('相手は<b>これ以上アイテムを使わない</b>よ。今回は自分も追加せずに進もう。<b>お互いに追加しないと決まったら</b>、走破数とガード値を比べるよ。「つぎへ」を押してね。');
    await waitNext();
    if (runId !== tutorialRunId) return;

    setProgress(9);
    var runValue = effectiveRun(field, runBonus, currentLane());
    var drawCount = Math.max(0, runValue - guardValue);
    setNarrator('<b>走破' + runValue + ' − ガード' + guardValue + ' ＝ ' + drawCount + '枚</b>引けるね。<b>お互いにこれ以上追加しないことを確認してから</b>、走破数とガード値を比べるよ。');
    await waitNext();
    if (runId !== tutorialRunId) return;
    showNextButton(false);
    await showBanner('走破成功！', 2400, horse, drawCount + '枚ドロー');
    if (runId !== tutorialRunId) return;
    await rewardDraw(drawCount);
    if (runId !== tutorialRunId) return;

    setProgress(10);
    var discardCount = Math.max(0, drawCount - 1);
    setNarrator('<b>' + drawCount + '枚引いたので、' + discardCount + '枚</b>を選んでファームへ送ろう。追加したアイテムの効果も含めた、最後の結果で引く枚数が決まるよ。');
    discardSelectionConfirmedId = null;
    await waitSelect('select-any', discardCount);
    if (runId !== tutorialRunId) return;
    setProgress(11);
    setNarrator('走破とガードに使用した<b>馬カードを、それぞれのファームへ移動</b>して終わろう。<b>走破前の使用 → ガード → 双方の追加確認 → 結果の確定</b>が基本の流れ。ガードを見送った後に、アイテム追加のタイミングで新しくガード馬を出すことはできないよ。');
    await waitNext();
    if (runId !== tutorialRunId) return;
    await flyGhost(document.querySelector('#field-body .field-mini'), $('zone-farm').getBoundingClientRect());
    if (runId !== tutorialRunId) return;
    farm.push(field);
    field = null;
    fieldGuard = null;
    guardValue = 0;
    runBonus = 0;
    interactionMode = null;
    renderAll();
    hideArrow();
    clearZoneActive();
    hideSelectionProgress();
    showNextButton(false);
    setProgress(12);
    $('lesson-complete').querySelector('.lesson-complete-kicker').textContent = 'LESSON 07 · COMPLETE';
    $('lesson-complete-title').textContent = 'アイテムの追加使用を覚えたね！';
    $('lesson-complete').querySelector('p:not(.lesson-complete-kicker)').textContent = 'ガード後にもアイテムを追加でき、相手の追加を見てさらに使うこともできるね。お互いに追加を見送ってから、最終的な走破数とガード値を比べよう！';
    $('lesson-complete-next').href = 'lessons.html';
    $('lesson-complete-next').textContent = '遊びかたの一覧へ';
    $('lesson-complete').querySelector('.lesson-complete-back').hidden = true;
    $('lesson-complete').showModal();
  }

  async function runSituationLesson(runId) {
    setProgress(1);
    await explainStep($('race-info'), 'race-info', '今の馬場は<b>「稍重」</b>だね。馬場状態は<b>良・稍重・重・不良</b>の4段階。状況カードで、このレース条件を変えてみよう。');
    if (runId !== tutorialRunId) return;
    setProgress(2);
    await explainStep($('zone-situation'), 'zone-situation', '使った状況カードは、ここに置くよ。状況カードは<b>お互いに共通するレース条件</b>などへ影響するカードなんだ。');
    if (runId !== tutorialRunId) return;
    setProgress(3);
    setNarrator('手札の<b>「かんかん照り」</b>をタップして効果を確認し、「<b>この状況カードを使用する</b>」を押そう。馬場状態を<b>一段階良くする</b>カードだよ。');
    showNextButton(false);
    await new Promise(function (resolve) {
      lessonSituationSelection = { runId: runId, resolve: resolve };
      interactionMode = 'lesson-situation';
      renderAll();
    });
    if (runId !== tutorialRunId) return;
    setProgress(4);
    await explainStep($('race-info'), 'race-info', '馬場が<b>「稍重」→「良」</b>に変わったね！「かんかん照り」は<b>一段階</b>良くするので、重なら稍重、不良なら重になるよ。すでに良なら、それ以上は変わらないよ。');
    if (runId !== tutorialRunId) return;
    setProgress(5);
    await explainStep($('zone-situation'), 'zone-situation', '<b>「かんかん照り」</b>が状況カード置き場に置かれたね。変わった馬場は<b>自分にも相手にも共通</b>だよ。今回は、カードを使って条件が変わるところまで覚えればOK！');
    if (runId !== tutorialRunId) return;
    setProgress(6);
    await explainStep($('race-info'), 'race-info', '一部の<b>馬カードやフォース能力、サポートカード</b>は、<b>良馬場・道悪（重・不良）</b>などの馬場状態や、<b>芝・ダート</b>の条件によって効果が変わったり、強化されたりするよ。どの条件で有利になるかは、カードごとの文章を確認しよう。');
    if (runId !== tutorialRunId) return;
    setProgress(7);
    await explainStep($('zone-situation'), 'zone-situation', '状況カードの効果は、<b>馬場を変えるものだけではない</b>よ。ほかにもさまざまな効果があるので、そのカードが<b>何に影響するか</b>を確認して使おう！');
    if (runId !== tutorialRunId) return;
    interactionMode = null;
    hideArrow();
    clearZoneActive();
    showNextButton(false);
    setProgress(8);
    $('lesson-complete').querySelector('.lesson-complete-kicker').textContent = 'LESSON 06 · COMPLETE';
    $('lesson-complete-title').textContent = '状況カードを使えたね！';
    $('lesson-complete').querySelector('p:not(.lesson-complete-kicker)').textContent = 'かんかん照りで、馬場が稍重から良に変わったね。状況カードはお互いに共通するレース条件などに影響するので、効果を確認して使おう！';
    $('lesson-complete-next').href = 'tutorial.html?lesson=responses';
    $('lesson-complete-next').textContent = '次へ：アイテムの追加使用を覚えよう！ ›';
    $('lesson-complete').querySelector('.lesson-complete-back').hidden = false;
    $('lesson-complete').showModal();
  }

  async function runAbilityLesson(runId) {
    var horse = hand.find(function (card) { return card.name === 'ローシャムパーク'; });
    // 支払いに使うカードではなく、開始時からファームにあるカードを回収する。
    var recoveryCard = farm.find(function (card) { return card.type === 'force' && card.name === 'フォース'; });

    setProgress(1);
    await explainStep($('race-info'), 'race-info', '今回は<b>中山・芝・中距離</b>のレース。フォース能力には、<b>条件を満たすと自動で働くもの</b>があるよ。ローシャムパークの能力を体験してみよう！');
    if (runId !== tutorialRunId) return;

    setProgress(2);
    await explainStep(cardElById(horse.id), null, 'ローシャムパークの能力は、<b>得意競馬場で走破するために出した時、ファームのノーマルフォースを1枚手札に戻す</b>もの。カード下部の得意競馬場に<b>「中山」</b>があるので、今回は条件を満たしているよ。');
    if (runId !== tutorialRunId) return;

    setProgress(3);
    lessonRunHorseId = horse.id;
    runHorseSelectionConfirmedId = null;
    setNarrator('<b>ローシャムパーク</b>をタップして、能力の文章と得意競馬場を確認し、「<b>この馬で走破</b>」を押そう。');
    showNextButton(false);
    await waitSelect('select-horse', 1);
    if (runId !== tutorialRunId) return;
    lessonRunHorseId = null;

    setProgress(4);
    setNarrator('まずは馬を出すコストとして、<b>フォースカードを' + horse.cost + '枚</b>ファームへ送ろう。その後に、馬を出した時の能力を確認するよ。');
    await waitSelect('select-force', horse.cost);
    if (runId !== tutorialRunId) return;

    setProgress(5);
    var forcesBefore = hand.filter(function (card) { return card.type === 'force'; }).length;
    showNextButton(false);
    setNarrator('<b>得意競馬場の中山で、走破するために馬を出した</b>ので、フォース能力が自動で発動するよ！');
    await showBanner('フォース能力 発動！', 2600, horse, 'ファームのノーマルフォース1枚を手札に戻す');
    if (runId !== tutorialRunId) return;

    var recoveryDummy = makeSmallCardDummy($('zone-farm').getBoundingClientRect());
    recoveryDummy.style.backgroundImage = 'url(' + recoveryCard.img + ')';
    await flyGhost(recoveryDummy, $('hand-row').getBoundingClientRect());
    recoveryDummy.remove();
    if (runId !== tutorialRunId) return;
    farm = farm.filter(function (card) { return card.id !== recoveryCard.id; });
    hand.push(recoveryCard);
    renderAll();
    SoundFX.deal();
    var forcesAfter = hand.filter(function (card) { return card.type === 'force'; }).length;
    setNarrator('<b>フォースが' + forcesBefore + '枚 → ' + forcesAfter + '枚に増えたね！</b> ファームから手札へ1枚戻ったよ。この能力は<b>走破に成功した後ではなく、走破するために馬を出した時</b>に働くんだ。発動のための追加ボタンや追加コストはないよ。');
    await waitNext();
    if (runId !== tutorialRunId) return;

    setProgress(6);
    var drawCount = Math.max(0, effectiveRun(field, 0, currentLane()));
    setNarrator('能力の処理が終わったら、いつも通り走破するよ。今回は相手は見送るので、<b>走破数ぶんの' + drawCount + '枚</b>を引こう。<b>能力で戻った1枚は、走破のドローとは別</b>だよ。');
    await waitNext();
    if (runId !== tutorialRunId) return;
    showNextButton(false);
    await showBanner('走破成功！', 2600, horse);
    if (runId !== tutorialRunId) return;
    await rewardDraw(drawCount);
    if (runId !== tutorialRunId) return;

    setProgress(7);
    var discardCount = Math.max(0, drawCount - 1);
    setNarrator('走破で<b>' + drawCount + '枚</b>引いたので、手札から<b>' + discardCount + '枚</b>をファームへ送ろう。能力で手札に戻したフォースは、この「走破で引いた枚数」には数えないよ。');
    discardSelectionConfirmedId = null;
    await waitSelect('select-any', discardCount);
    if (runId !== tutorialRunId) return;

    setProgress(8);
    setNarrator('最後に<b>ローシャムパークをファームへ</b>送って、走破を終えよう。フォース能力は<b>カードに書かれた条件とタイミング</b>を確認することが大事だよ。');
    await waitNext();
    if (runId !== tutorialRunId) return;
    await flyGhost(document.querySelector('#field-body .field-mini'), $('zone-farm').getBoundingClientRect());
    if (runId !== tutorialRunId) return;
    farm.push(field);
    field = null;
    interactionMode = null;
    renderAll();
    hideArrow();
    clearZoneActive();
    hideSelectionProgress();
    showNextButton(false);
    setProgress(9);
    $('lesson-complete').querySelector('.lesson-complete-kicker').textContent = 'LESSON 05 · COMPLETE';
    $('lesson-complete-title').textContent = 'フォース能力を体験できたね！';
    $('lesson-complete').querySelector('p:not(.lesson-complete-kicker)').textContent = 'ローシャムパークを得意競馬場で出すと、ノーマルフォース1枚が手札に戻ったね。馬によって能力の条件やタイミングは違うので、カードの文章を確認して使おう！';
    $('lesson-complete-next').href = 'tutorial.html?lesson=situation';
    $('lesson-complete-next').textContent = '次へ：状況カードを使おう！ ›';
    $('lesson-complete').querySelector('.lesson-complete-back').hidden = false;
    $('lesson-complete').showModal();
  }

  async function runStyleLesson(runId) {
    var horses = [
      hand.find(function (card) { return card.name === 'セイウンスカイ'; }),
      hand.find(function (card) { return card.name === 'シルクメビウス'; })
    ];
    lessonReservedHorseId = horses[1].id;
    setProgress(1);
    await explainStep($('race-info'), 'race-info', '今回は練習用に<b>芝・長距離</b>のレースを用意したよ。走破数は、<b>今いるエリアと馬の脚質</b>、そして<b>距離・コースの適性</b>によって変わるんだ。2ターンで比べてみよう！');
    if (runId !== tutorialRunId) return;

    for (var turn = 0; turn < 2; turn++) {
      if (turn === 1) lessonReservedHorseId = null;
      var horse = horses[turn];
      var step = 2 + turn * 7;
      setProgress(step);
      var explanation = turn === 0
        ? '今いるエリアは<b>逃げ</b>。<b>セイウンスカイの脚質にも「逃げ」</b>があるので、脚質一致で<b>走破数が+1</b>になるよ。芝と長距離の適性も合っているね。'
        : '2ターン目は<b>シルクメビウス</b>で走破しよう。この馬は<b>ダート・マイル／中距離</b>が適性。今回の<b>芝・長距離</b>とは両方違うので、<b>距離で−1、コースで−1</b>になるよ。脚質も今の「逃げ」と一致していないね。';
      await explainStep(cardElById(horse.id), null, explanation);
      if (runId !== tutorialRunId) return;

      setProgress(step + 1);
      lessonRunHorseId = horse.id;
      runHorseSelectionConfirmedId = null;
      setNarrator('<b>' + horse.name + '</b>をタップし、カードの脚質と適性を確認して「<b>この馬で走破</b>」を押そう。');
      showNextButton(false);
      await waitSelect('select-horse', 1);
      if (runId !== tutorialRunId) return;
      lessonRunHorseId = null;

      setProgress(step + 2);
      setNarrator('馬を出すコストとして、<b>フォースカードを' + horse.cost + '枚</b>ファームへ送ろう。');
      await waitSelect('select-force', horse.cost);
      if (runId !== tutorialRunId) return;

      setProgress(step + 3);
      var drawCount = Math.max(0, effectiveRun(field, 0, currentLane()));
      setNarrator(turn === 0
        ? 'カードに書かれた走破数<b>' + horse.run + '＋脚質一致1＝' + drawCount + '</b>！ 場のカードの数字も増えたね。距離とコースが合っているので、減点はないよ。今回は相手は見送るので<b>' + drawCount + '枚</b>引けるよ。'
        : 'カードに書かれた走破数<b>' + horse.run + '−距離不一致1−コース不一致1＝' + drawCount + '</b>。<b>脚質の不一致には減点はなく、+1されないだけ</b>だよ。適性が合わなくても走破はできるけれど、今回は<b>' + drawCount + '枚</b>になるんだ。');
      focusTutorialTarget($('field-body'));
      await waitNext();
      if (runId !== tutorialRunId) return;

      showNextButton(false);
      await showBanner('走破成功！', 2600, field, turn === 0 ? '脚質一致で走破 +1' : '距離とコースの不一致で走破 −2');
      if (runId !== tutorialRunId) return;
      await rewardDraw(drawCount);
      if (runId !== tutorialRunId) return;

      setProgress(step + 4);
      var discardCount = Math.max(0, drawCount - 1);
      if (discardCount > 0) {
        setNarrator('<b>' + drawCount + '枚引けたね！</b> 引いた枚数より1枚少ない<b>' + discardCount + '枚</b>を選んで、ファームへ送ろう。<b>シルクメビウスは2ターン目に使うので残しておこう</b>。');
        discardSelectionConfirmedId = null;
        await waitSelect('select-any', discardCount);
      } else {
        setNarrator('<b>' + drawCount + '枚引けたね。</b> 捨てる枚数は「引いた枚数−1」なので、今回は<b>0枚</b>。手札を捨てずに進もう。');
        await waitNext();
      }
      if (runId !== tutorialRunId) return;

      setProgress(step + 5);
      setNarrator('使い終わった<b>' + horse.name + '</b>をファームへ送って、このターンの走破を終えよう。');
      await waitNext();
      if (runId !== tutorialRunId) return;
      await flyGhost(document.querySelector('#field-body .field-mini'), $('zone-farm').getBoundingClientRect());
      if (runId !== tutorialRunId) return;
      farm.push(field);
      field = null;
      renderAll();

      if (turn === 0) {
        setProgress(8);
        showNextButton(false);
        await showOpponentBubble('今回は走破せずに見送ります');
        if (runId !== tutorialRunId) return;
        await rewardDraw(1);
        if (runId !== tutorialRunId) return;
        setNarrator('相手は練習のため走破せずにターンを終えたよ。<b>自分の2ターン目</b>が始まり、最初の<b>1枚を引いた</b>よ。同じレース条件で、次は適性が合わない馬を使ってみよう。');
        await waitNext();
        if (runId !== tutorialRunId) return;
      }
    }

    interactionMode = null;
    hideArrow();
    clearZoneActive();
    hideSelectionProgress();
    showNextButton(false);
    setProgress(15);
    $('lesson-complete').querySelector('.lesson-complete-kicker').textContent = 'LESSON 04 · COMPLETE';
    $('lesson-complete-title').textContent = '条件に合わせた走破を覚えたね！';
    $('lesson-complete').querySelector('p:not(.lesson-complete-kicker)').textContent = '脚質一致は+1。距離不一致とコース不一致は、それぞれ−1。1ターン目は4枚、2ターン目は1枚引けたね。今いるエリアとレース条件を見て、走破する馬を選ぼう！';
    $('lesson-complete-next').href = 'tutorial.html?lesson=ability';
    $('lesson-complete-next').textContent = '次へ：フォース能力を使おう！ ›';
    $('lesson-complete').querySelector('.lesson-complete-back').hidden = false;
    $('lesson-complete').showModal();
  }

  function waitLessonItem(card, runId) {
    return new Promise(function (resolve) {
      lessonItemSelection = { id: card.id, runId: runId, resolve: resolve };
      interactionMode = 'lesson-item';
      selectionNeeded = 1;
      selectionCount = 0;
      showNextButton(false);
      updateSelectionProgress(false);
      renderAll();
    });
  }

  async function runItemLesson(runId) {
    var areaItem = hand.find(function (card) { return card.effectType === 'farm_recovery'; });
    var horseItem = hand.find(function (card) { return card.effectType === 'run_bonus'; });

    setProgress(1);
    await explainStep($('zone-hand'), 'zone-hand', 'アイテムは<b>使うタイミング</b>が大事。「<b>タイプ：エリア</b>」は自分のターン開始後から走破前に、「<b>タイプ：馬</b>」は走破やガードをする馬と一緒に使うよ。');
    if (runId !== tutorialRunId) return;

    setProgress(2);
    var forcesBefore = hand.filter(function (card) { return card.type === 'force'; }).length;
    setNarrator('まずは走破する前に、<b>タイプ：エリアの「獣医師」</b>を使おう。今回はファームのフォースを1枚手札に戻せるよ。カードをタップして、効果を確認して使ってみよう！');
    await waitLessonItem(areaItem, runId);
    if (runId !== tutorialRunId) return;

    setProgress(3);
    var forcesAfter = hand.filter(function (card) { return card.type === 'force'; }).length;
    setNarrator('<b>フォースが' + forcesBefore + '枚 → ' + forcesAfter + '枚に増えたね！</b> 獣医師はファームへ移り、効果でフォースが手札に戻ったよ。本番では<b>操作メニューの「アイテム」</b>から使えるんだ。');
    await waitNext();
    if (runId !== tutorialRunId) return;

    setProgress(4);
    setNarrator('次は<b>タイプ：馬の「鞭」</b>を、走破する馬と一緒に使おう。まずは<b>ゴールドシップ</b>を選んでね。');
    showNextButton(false);
    await waitSelect('select-horse', 1);
    if (runId !== tutorialRunId) return;

    setProgress(5);
    var cost = field.cost || 2;
    setNarrator('馬を出すコストとして、<b>フォースカードを' + cost + '枚</b>ファームへ送ろう。');
    await waitSelect('select-force', cost);
    if (runId !== tutorialRunId) return;

    setProgress(6);
    var runBefore = effectiveRun(field, runBonus, currentLane());
    setNarrator('馬を出せたね！ このまま走破する前に、<b>「鞭」をタップして使おう</b>。鞭には<b>走破数を+1する</b>効果があるよ。');
    await waitLessonItem(horseItem, runId);
    if (runId !== tutorialRunId) return;

    setProgress(7);
    var runAfter = effectiveRun(field, runBonus, currentLane());
    setNarrator('<b>走破値が' + runBefore + ' → ' + runAfter + 'になった！</b> 馬カードの右下の数字も増えているね。本番では、馬とコストを選んだ後のアイテム選択で使うよ。今回は相手は見送るので、<b>' + runAfter + '枚引ける</b>よ。');
    focusTutorialTarget($('field-body'));
    await waitNext();
    if (runId !== tutorialRunId) return;

    showNextButton(false);
    await showBanner('走破成功！', 2800, field, '鞭で走破値 +1');
    if (runId !== tutorialRunId) return;
    await rewardDraw(runAfter);
    if (runId !== tutorialRunId) return;

    setProgress(8);
    var discardCount = Math.max(0, runAfter - 1);
    setNarrator('<b>' + runAfter + '枚引けたね！</b> 走破の後はいつもと同じ。引いた枚数より1枚少ない<b>' + discardCount + '枚</b>を選んでファームへ送ろう。');
    discardSelectionConfirmedId = null;
    await waitSelect('select-any', discardCount);
    if (runId !== tutorialRunId) return;

    setProgress(9);
    setNarrator('最後に、<b>走破した馬をファームへ</b>送るよ。鞭も使い終わったので、すでにファームに置かれているね。');
    await waitNext();
    if (runId !== tutorialRunId) return;
    await flyGhost(document.querySelector('#field-body .field-mini'), $('zone-farm').getBoundingClientRect());
    if (runId !== tutorialRunId) return;
    farm.push(field);
    field = null;
    runBonus = 0;
    interactionMode = null;
    renderAll();
    hideArrow();
    clearZoneActive();
    hideSelectionProgress();
    showNextButton(false);
    setProgress(10);
    $('lesson-complete').querySelector('.lesson-complete-kicker').textContent = 'LESSON 03 · COMPLETE';
    $('lesson-complete-title').textContent = 'アイテムの使い方を覚えたね！';
    $('lesson-complete').querySelector('p:not(.lesson-complete-kicker)').textContent = 'エリアアイテムは走破前に、馬タイプのアイテムは馬と一緒に。ガードを強めるアイテムもあるので、カードに書かれた効果とタイミングを確認して使おう。';
    $('lesson-complete-next').href = 'tutorial.html?lesson=style';
    $('lesson-complete-next').textContent = '次へ：脚質一致で走破しよう！ ›';
    $('lesson-complete').querySelector('.lesson-complete-back').hidden = false;
    $('lesson-complete').showModal();
  }

  // 00は盤面の案内だけで完結し、走破・ガードの操作へ進まない。
  async function runIntroLesson(runId) {
    var steps = [
      ['race-info', 'ここに表示されているのが<b>レース条件</b>。<b>競馬場</b>は開催場所、<b>コース</b>は芝かダート、<b>距離</b>はレースの長さ、<b>馬場</b>は「良」「稍重」「重」「不良」といった馬場状態を表しているよ。'],
      ['race-info', '今回は<b>' + race.racecourse + '・' + race.surface + '・' + race.distance + '・' + race.trackCondition + '</b>のレースだよ。この条件は<b>お互いに共通</b>。馬カードの適性や能力に関わるので、走破やガードに使う馬を選ぶときに確認しよう！'],
      ['field-body', 'ここが<b>自分の場</b>。走破する馬や、ガードに使う馬を置く場所だよ。'],
      ['field-body-opp', 'ここが<b>相手の場</b>。相手が出した馬カードが表示されるよ。自分の場と見比べながら勝負しよう。'],
      ['zone-farm', 'ここが<b>ファーム</b>。手札と山札以外の残りのカード（11枚）や、使い終わったカードを置く場所だよ。'],
      ['zone-situation', 'ここは<b>状況カード置き場</b>。レース全体に影響する状況カードを置くよ。詳しい使い方は、状況カードのレッスンで覚えよう。'],
      ['zone-hand', '画面下に並んでいるのが<b>自分の手札</b>。<b>馬カード</b>で走破やガードを行い、馬を出すために<b>フォースカード</b>を使うよ。<b>アイテムカード</b>は馬や自分の行動を助けてくれるんだ。'],
      ['zone-deck', 'これが<b>距離エリア（山札）</b>。「逃げ」「先行」「差し」「追込」の4つに、それぞれ8枚ずつ配られるよ。<b>逃げから順番に</b>カードを引いて進んでいこう。'],
      ['zone-deck', '<b>4つの山札を先にすべて引ききったプレイヤーの勝ち！</b> 馬を走らせてカードを引き、相手より先にゴールを目指そう。']
    ];
    for (var i = 0; i < steps.length; i++) {
      if (runId !== tutorialRunId) return;
      setProgress(i + 2);
      await explainStep($(steps[i][0]), steps[i][0], steps[i][1]);
    }
    if (runId !== tutorialRunId) return;
    hideArrow();
    clearZoneActive();
    showNextButton(false);
    setProgress(STEP_TOTAL);
    $('lesson-complete').showModal();
  }

  async function runTutorial() {
    var myRunId = ++tutorialRunId;
    document.body.classList.remove('manual-mode');
    var modeOpts = document.querySelectorAll('#mode-switch .mode-opt');
    modeOpts.forEach(function (opt) {
      opt.classList.toggle('active', opt.dataset.mode === 'tutorial');
    });
    showCommandBar(false); // チュートリアル中は循環矢印（コマンドバー）を非表示
    $('narrator').style.display = '';

    // マニュアル操作や途中のカード選択からチュートリアルへ戻った場合も、
    // SPを含むすべての画面で必ずSTEP 0のまっさらな状態から始める。
    interactionMode = null;
    selectionNeeded = 0;
    selectionCount = 0;
    actionResolve = null;
    phase = 'idle';
    prevPhase = 'idle';
    selectedHorse = null;
    selectedForces = [];
    selectedRunItems = [];
    selectedGuardHorse = null;
    selectedGuardItems = [];
    directRunItemId = null;
    runEntrySource = null;
    handPan = 0;
    runBonus = 0;
    itemGuardBonus = 0;
    guardValue = 0;
    cpuRunValue = 0;
    guardSelectionConfirmedId = null;
    runHorseSelectionConfirmedId = null;
    runItemSelectionConfirmedId = null;
    guardItemSelectionConfirmedId = null;
    discardSelectionConfirmedId = null;
    discardSelectionsInFlight = 0;
    pendingFinishRun = null;
    canDraw = true;
    isCpuTurn = false;
    hasRunThisTurn = false;
    hideSelectionProgress();

    // 初期状態をクリア
    lessonItemSelection = null;
    lessonRunHorseId = null;
    lessonReservedHorseId = null;
    lessonSituationSelection = null;
    var predealtLesson = isRunLesson || isGuardLesson || isItemLesson || isStyleLesson || isAbilityLesson || isSituationLesson || isResponseLesson;
    LANES.forEach(function (l) { l.count = predealtLesson ? 8 : 0; });
    CPU_LANES.forEach(function (l) { l.count = 8; }); // 相手は最初から自分の山札を持っている
    farm = predealtLesson ? [
      forceCard(), forceCard(), forceCard(), forceCard(), forceCard(),
      forceCard(), forceCard(), forceCard(), forceCard(), forceCard(), forceCard()
    ] : [];
    hand = predealtLesson ? makeStarterHand() : [];
    if (isItemLesson) hand = [forceCard(), forceCard(), forceCard(), goldShip(), whip(), veterinarian(), goggles()];
    if (isStyleLesson) {
      race.surface = '芝';
      race.distance = '長距離';
      hand = [forceCard(), forceCard(), forceCard(), seiunSky(), silkMobius(), forceCard(), forceCard()];
    }
    if (isAbilityLesson) {
      race.racecourse = '中山';
      race.surface = '芝';
      race.distance = '中距離';
      race.trackCondition = '良';
      hand = [forceCard(), forceCard(), forceCard(), rousham(), goldShip(), whip(), goggles()];
    }
    if (isSituationLesson) {
      race.trackCondition = '稍重';
      hand = [forceCard(), forceCard(), goldShip(), situationCard('かんかん照り', '馬場状態を一段階良くする', KANKAN_IMG), rousham(), whip(), goggles()];
    }
    if (isResponseLesson) {
      race.racecourse = '東京';
      race.surface = '芝';
      race.distance = '中距離';
      race.trackCondition = '良';
      hand = [forceCard(), forceCard(), goldShip(), whip(), whip(), goggles(), forceCard()];
    }
    field = null;
    fieldGuard = null;
    playerGuardCard = null;
    cpuHorseCard = isGuardLesson ? seiunSky() : null;
    cpuRunValue = cpuHorseCard ? cpuHorseCard.run : 0;
    opponentHandCount = isGuardLesson ? 7 - (cpuHorseCard.cost || 2) - 1 : 7;
    situation = null;
    renderRaceInfo();
    renderAll();

    if (window.innerWidth <= 859) {
      // SPでは前のモードで動かした盤面・ページ位置を引き継がない。
      if (FieldCamera) FieldCamera.reset(false);
      var tutorialBoard = $('board');
      if (tutorialBoard) tutorialBoard.scrollTop = 0;
      window.scrollTo(0, 0);
    }

    setNarrator(isIntroLesson
      ? 'ようこそ、<b>フォース オブ ザ ホース</b>の世界へ！ このレッスンでは、<b>各エリアの役割・レース条件・勝利条件</b>を覚えよう。'
      : (isResponseLesson ? 'このレッスンでは<b>ガード後のアイテム追加</b>を練習するよ。相手の追加使用を見て、さらにアイテムを使ってみよう！'
        : isSituationLesson ? 'このレッスンでは<b>状況カード</b>を使って、レースの馬場状態を変えてみよう！'
        : isAbilityLesson ? 'このレッスンでは<b>フォース能力</b>を体験するよ。ローシャムパークを得意競馬場で出して、ファームのフォースを手札に戻してみよう！'
        : isStyleLesson ? 'このレッスンでは<b>脚質一致と適性による走破数の変化</b>を、2ターンで体験するよ。カードに書かれた走破数と、実際に引ける枚数を比べてみよう！'
        : isItemLesson ? 'このレッスンでは<b>アイテム</b>を使ってみよう。「獣医師」で手札を助けて、「鞭」で馬の走破を強くするよ！'
        : isGuardLesson ? 'このレッスンでは<b>ガード</b>を練習するよ。相手が馬を出して走破しようとしているね。手札の馬で、相手が引くカードを減らしてみよう！'
        : isRunLesson ? 'このレッスンでは<b>走破</b>を練習するよ。馬を出すところから、カードを引いてファームへ送るところまでやってみよう！'
        : 'ようこそ、<b>フォース オブ ザ ホース</b>の世界へ！ まずは対戦の準備をしよう。'));
    setProgress(0);
    await waitNext();
    if (myRunId !== tutorialRunId) return;

    if (isResponseLesson) {
      await runResponseLesson(myRunId);
      return;
    }

    if (isSituationLesson) {
      await runSituationLesson(myRunId);
      return;
    }

    if (isAbilityLesson) {
      await runAbilityLesson(myRunId);
      return;
    }

    if (isStyleLesson) {
      await runStyleLesson(myRunId);
      return;
    }

    if (isItemLesson) {
      await runItemLesson(myRunId);
      return;
    }

    if (isGuardLesson) {
      await practiceGuard();
      if (myRunId !== tutorialRunId) return;
      hideArrow();
      clearZoneActive();
      showNextButton(false);
      hideSelectionProgress();
      setProgress(18);
      $('lesson-complete').querySelector('.lesson-complete-kicker').textContent = 'LESSON 02 · COMPLETE';
      $('lesson-complete-title').textContent = 'ガードの流れを覚えたね！';
      $('lesson-complete').querySelector('p:not(.lesson-complete-kicker)').textContent = '手札の馬のガード値で、相手が走破で引く枚数を減らせたね。ガードに使う馬にはフォースのコストは不要。本番では、ガードせずに見送ることもできるよ。';
      $('lesson-complete-next').href = 'tutorial.html?lesson=items';
      $('lesson-complete-next').textContent = '次へ：アイテムを使おう！ ›';
      $('lesson-complete').querySelector('.lesson-complete-back').hidden = false;
      $('lesson-complete').showModal();
      return;
    }

    // 走破の練習は配札済みで開始し、準備の説明・演出を繰り返さない。
    if (!isRunLesson) {
    // STEP 0: 50枚デッキからの初期カード配布
    setProgress(1);
    showNextButton(false);
    await dealInitialCards(false, myRunId);
    if (myRunId !== tutorialRunId) return;
    setNarrator('今回はチュートリアルなので、使うカードは50枚！手札7枚・山札は各8枚・残りはファームだよ。まず盤面を確認しよう。');
    showNextButton(true);
    await waitNext();
    if (myRunId !== tutorialRunId) return;
    }

    if (isIntroLesson) {
      await runIntroLesson(myRunId);
      return;
    }

    if (!isRunLesson) {
    // STEP 1: 配布直後にファームを説明し、登場から説明までの間を空けない
    setProgress(2);
    await explainStep($('zone-farm'), 'zone-farm', 'ここが<b>ファーム</b>。最初に置かれた残りのカード（11枚）と、使い終わったカードを置く場所だよ。');
    if (myRunId !== tutorialRunId) return;

    // STEP 2: 状況カード置き場
    setProgress(3);
    await explainStep($('zone-situation'), 'zone-situation', 'ここは<b>状況カードの置き場所</b>。状況カードには、天候などレース全体に影響する<b>特殊効果</b>があるよ。<br>今回は詳しい効果の説明を省略するけれど、カードを引いたときに使うか選べることを覚えておこう。');
    if (myRunId !== tutorialRunId) return;

    // STEP 3: フォースカード（中央に近いカードを紹介して見やすくする）
    setProgress(4);
    var targetForce = findHandCardClosestToCenter('force');
    var forceEl = targetForce ? cardElById(targetForce.id) : null;
    if (forceEl) forceEl.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    await explainStep(forceEl, null, 'これが<b>フォースカード</b>。馬カードを場に出すために必要なカードだよ。');
    if (myRunId !== tutorialRunId) return;

    // STEP 4: 馬カード（中央に近いカードを紹介）
    setProgress(5);
    var targetHorse = findHandCardClosestToCenter('horse');
    var horseEl = targetHorse ? cardElById(targetHorse.id) : null;
    if (horseEl) horseEl.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    await explainStep(horseEl, null, 'このカードが<b>馬カード</b>だ！ このカードを使って相手と勝負するよ。');
    if (myRunId !== tutorialRunId) return;

    // STEP 5: アイテムカード（中央に近いカードを紹介）
    setProgress(6);
    var targetItem = findHandCardClosestToCenter(function (c) { return c.type === 'item' || c.type === 'jockey'; });
    var itemEl = targetItem ? cardElById(targetItem.id) : null;
    if (itemEl) itemEl.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    await explainStep(itemEl, null, '<b>アイテムカードには2種類</b>あり、使えるタイミングが違うよ。まず、このカードのような「<b>タイプ：馬</b>」は、走破する馬カードと一緒に使うカードだよ。');
    if (myRunId !== tutorialRunId) return;
    setNarrator('もう1つの「<b>タイプ：エリア</b>」は、<b>自分のターン開始後から走破する前まで</b>に使えるよ。自由操作では、右側の操作メニューにある「<b>アイテム</b>」から選ぼう。');
    showNextButton(true);
    await waitNext();
    if (myRunId !== tutorialRunId) return;

    // STEP 6: 距離エリア(山札) / 勝利条件（メッセージを2つに分割）
    setProgress(7);
    await explainStep($('zone-deck'), 'zone-deck', 'ここが<b>距離エリア（山札）</b>だ。山札は「逃げ」「先行」「差し」「追込」の4つのエリアにそれぞれ8枚ずつ配られているよ。');
    if (myRunId !== tutorialRunId) return;

    setNarrator('<b>逃げから順番に</b>引いていき、先行、差し、追込と4つの山札を<b>先にすべて引ききったプレイヤーの勝ち</b>だよ！');
    showNextButton(true);
    await waitNext();
    hideArrow();
    if (myRunId !== tutorialRunId) return;

    }

    // STEP 7: 実際に走破してみよう（ポップアップは削除し、自然に進行）
    setProgress(8);
    setNarrator('それじゃあ、<b>馬を走らせて山札を進めてみよう！</b> この操作をゲームでは「走破」と呼ぶよ。');
    showNextButton(true);
    await waitNext();
    if (myRunId !== tutorialRunId) return;

    // STEP 8: 走破させたい馬カードを選んでフィールドに出す
    setProgress(9);
    setNarrator('まずは<b>走らせたい馬カード</b>を1枚選んでタップしてね。');
    setZoneActive('field-body', true);
    showNextButton(false);
    runHorseSelectionConfirmedId = null;
    await waitSelect('select-horse', 1);
    setZoneActive('field-body', false);
    if (myRunId !== tutorialRunId) return;

    // STEP 9: 選んだ馬に必要なフォースカードをファームへ送る
    setProgress(10);
    var runHorseCost = field ? (field.cost || 2) : 2;
    setNarrator('<b>' + (field ? field.name : 'この馬') + '</b>を場に出すため、<b>フォースカードを' + runHorseCost + '枚</b>選んでファームへ送ろう。');
    setZoneActive('zone-farm', true);
    await waitSelect('select-force', runHorseCost);
    setZoneActive('zone-farm', false);
    if (myRunId !== tutorialRunId) return;

    // STEP 10: 自分の走破結果へ進む
    setProgress(11);
    setNarrator('必要なフォースカードを送れたね！ 馬カードはフィールドに出ているよ。');
    focusTutorialTarget($('field-body'));
    showNextButton(true);
    await waitNext();
    if (myRunId !== tutorialRunId) return;
    setNarrator('相手は今回は何もしないようだ。自分の<b>走破の結果</b>を確認しよう。');
    await showOpponentBubble('今回は見送ります');
    showNextButton(true);
    await waitNext();
    if (myRunId !== tutorialRunId) return;

    // STEP 11: 走破成功 → 報酬ドロー（背景に馬カードを大きく映す）
    setProgress(12);
    var runCount = field ? (field.run || 3) : 3;
    setNarrator('やった、<b>走破成功だ！</b> 走破に成功したら、馬カードの走破数ぶんだけ山札からカードを引くよ。');
    showNextButton(false);
    await showBanner('走破成功！', 3200, field);
    await sleep(100);
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
    discardSelectionConfirmedId = null;
    await waitSelect('select-any', runCount - 1);
    setZoneActive('zone-farm', false);
    if (myRunId !== tutorialRunId) return;

    // STEP 13: 使い終わった馬カードをファームへ
    setProgress(13);
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

    if (isRunLesson) {
      if (myRunId !== tutorialRunId) return;
      hideArrow();
      clearZoneActive();
      showNextButton(false);
      setProgress(14);
      $('lesson-complete').querySelector('.lesson-complete-kicker').textContent = 'LESSON 01 · COMPLETE';
      $('lesson-complete-title').textContent = '走破の流れを覚えたね！';
      $('lesson-complete').querySelector('p:not(.lesson-complete-kicker)').textContent = '馬を出す、コストを払う、走破してカードを引く。使い終わったカードをファームへ送れば、走破は完了！';
      $('lesson-complete-next').href = 'tutorial.html?lesson=guard';
      $('lesson-complete-next').textContent = '次へ：ガードしてみよう！ ›';
      $('lesson-complete').showModal();
      return;
    }

    // STEP 14: 相手ターンへ交代
    setProgress(14);
    setNarrator('自分の走破が終わったので、次は<b>相手のターン</b>だよ。相手も同じ手順で馬を走らせるよ。');
    showNextButton(true);
    await waitNext();
    if (myRunId !== tutorialRunId) return;

    await practiceGuard();
    if (myRunId !== tutorialRunId) return;

    // 通しチュートリアルと単独のガード編で、同じ操作・結果処理を使う。
    async function practiceGuard() {
    // STEP 15: 相手が馬カードを出して走破を宣言
    setProgress(15);
    cpuHorseCard = seiunSky();
    // チュートリアルではこの後のガード説明もカード記載の走破値を使う。
    // 表示用の値も同時に設定し、カード上が「走破 0」になるのを防ぐ。
    cpuRunValue = cpuHorseCard.run || 0;
    if (!isGuardLesson) opponentHandCount = Math.max(0, opponentHandCount - ((cpuHorseCard.cost || 2) + 1));
    renderAll();
    focusTutorialTarget($('field-body-opp'));
    setNarrator('相手が<b>' + cpuHorseCard.name + '</b>を出して「走破」を宣言した！ 相手も馬の走破値ぶん、山札からカードを引こうとしているよ。');
    showNextButton(false);
    await showBanner('相手が走破！', 3000, cpuHorseCard, '相手ターン');
    await sleep(100);
    showNextButton(true);
    await waitNext();
    if (myRunId !== tutorialRunId) return;

    // STEP 16: 相手の走破を見てから、初めてガードを説明する
    setProgress(16);
    var tutorialGuardCard = hand.filter(function (c) { return c.type === 'horse'; })[0];
    if (!tutorialGuardCard) {
      tutorialGuardCard = rousham();
      hand.push(tutorialGuardCard);
      renderHand();
      setNarrator('相手の走破に備えて、練習用の馬カードを手札に用意したよ。');
      showNextButton(true);
      await waitNext();
      if (myRunId !== tutorialRunId) return;
    }
    setNarrator('手札の馬カードで<b>ガード</b>すると、相手が走破で引く枚数を<b>ガード値ぶん減らせる</b>よ。<b>ガードする馬にはフォースのコストは不要</b>。本番では見送ることもできるけれど、今回はガードしてみよう。');
    showNextButton(true);
    await waitNext();
    if (myRunId !== tutorialRunId) return;
    if (isGuardLesson) {
      setProgress(3);
      await explainStep($('race-info'), 'race-info', 'ガードに使えるのは、<b>レースの距離とコース（芝・ダート）の両方に適性がある馬</b>だよ。今回の条件は<b>' + race.surface + '・' + race.distance + '</b>。距離だけ、コースだけ合っていてもガードできないんだ。');
      if (myRunId !== tutorialRunId) return;
      setProgress(4);
      await explainStep(cardElById(tutorialGuardCard.id), null, 'たとえば<b>' + tutorialGuardCard.name + '</b>は、適性コースが<b>' + (tutorialGuardCard.surface || []).join('・') + '</b>、適性距離が<b>' + tutorialGuardCard.dist + '</b>なので、今回のガードに使えるよ。<b>脚質は、今いるエリアと一致していなくてもガードできる</b>よ。');
      if (myRunId !== tutorialRunId) return;
      setProgress(5);
    }
    setNarrator('<b>ガードに使う馬カードを1枚</b>タップして、カードの詳細とガード値を確認してから決めよう。');
    setZoneActive('field-body', true);
    showNextButton(false);
    guardSelectionConfirmedId = null;
    guardItemSelectionConfirmedId = null;
    runHorseSelectionConfirmedId = null;
    discardSelectionConfirmedId = null;
    discardSelectionsInFlight = 0;
    pendingFinishRun = null;
    await waitSelect('select-guard', 1);
    setZoneActive('field-body', false);
    if (myRunId !== tutorialRunId) return;

    if (isGuardLesson) setProgress(6);
    var tutorialCpuRun = cpuHorseCard ? (cpuHorseCard.run || 3) : 3;
    var tutorialGuardValue = playerGuardCard ? (playerGuardCard.guard || 0) : 0;
    var tutorialCpuDraw = Math.max(0, tutorialCpuRun - tutorialGuardValue);
    setNarrator('<b>ガード成功！</b> 相手の走破 ' + tutorialCpuRun + ' − ガード ' + tutorialGuardValue + ' ＝ 相手が引くカードは <b>' + tutorialCpuDraw + '枚</b>になるよ。');
    showNextButton(false);
    await showBanner('ガード！', 2800, playerGuardCard);
    await sleep(100);
    showNextButton(true);
    await waitNext();
    if (myRunId !== tutorialRunId) return;

    // STEP 17: ガード後の相手の走破結果まで見せる
    setProgress(17);
    var tutorialCpuReward = Math.min(tutorialCpuDraw, cpuTotalDeck());
    if (tutorialCpuReward > 0) {
      setNarrator('ガード後の値に従って、相手は山札から<b>' + tutorialCpuReward + '枚</b>引くよ。');
      showNextButton(false);
      await showBanner('相手の走破成功！', 3000, cpuHorseCard, 'ガード後の走破結果');
      var tutorialOpponentRect = $('zone-opponent').getBoundingClientRect();
      for (var tutorialDrawIndex = 0; tutorialDrawIndex < tutorialCpuReward; tutorialDrawIndex++) {
        var tutorialDeckRect = cpuDeckSourceRect();
        var tutorialDummy = makeSmallCardDummy(tutorialDeckRect);
        await flyGhost(tutorialDummy, tutorialOpponentRect, 0.6);
        tutorialDummy.remove();
        cpuDrawOneFromDeck();
        opponentHandCount++;
        renderAll();
        await sleep(120);
      }
    } else {
      setNarrator('ガードで相手の走破を完全に防いだので、相手はカードを引けなかったよ。');
      showNextButton(false);
      await showBanner('走破を防いだ！', 2800, playerGuardCard);
    }
    if (myRunId !== tutorialRunId) return;

    var tutorialCpuDiscard = Math.max(0, tutorialCpuReward - 1);
    opponentHandCount = Math.max(0, opponentHandCount - tutorialCpuDiscard);
    if (playerGuardCard) farm.push(playerGuardCard);
    if (cpuHorseCard) farm.push(cpuHorseCard);
    playerGuardCard = null;
    cpuHorseCard = null;
    renderAll();
    setNarrator('相手も、引いた枚数より1枚少ない<b>' + tutorialCpuDiscard + '枚</b>を捨て、使った馬をファームへ送るよ。これで相手の走破まで完了！');
    showNextButton(true);
    await waitNext();
    if (myRunId !== tutorialRunId) return;

    }

    // STEP 18: 繰り返しメッセージ
    setProgress(18);
    setNarrator('これを交互に繰り返して、カードを全て山札から引ききったら勝ちなんだ。');
    await waitNext();
    if (myRunId !== tutorialRunId) return;

    // STEP 19: 自由プレイへ
    setProgress(19);
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
    selectedRunItems = [];
    selectedGuardHorse = null;
    selectedGuardItems = [];
    directRunItemId = null;
    handPan = 0;
    runBonus = 0;
    itemGuardBonus = 0;
    guardSelectionConfirmedId = null;
    guardItemSelectionConfirmedId = null;
    runHorseSelectionConfirmedId = null;
    discardSelectionConfirmedId = null;
    canDraw = true;
    isCpuTurn = false;
    hasRunThisTurn = false;
    opponentHandCount = 0;
    // 相手（CPU）にも自分と同じく初期手札7枚を配る（フォース・馬をバランスよく持たせ、序盤から走破できるようにする）
    cpuHand = [forceCard(), forceCard(), forceCard(), silkMobius(), seiunSky(), doDeuce(), goldShip()];
    opponentHandCount = cpuHand.length;
    cpuHorseCard = null;
    if (cpuTotalDeck() <= 0) CPU_LANES.forEach(function (l) { l.count = 8; });
    renderRaceInfo();
    showNextButton(false);
    $('free-hint').hidden = true;
    showCommandBar(true); // 自分で操作する段階になったらコマンドバーを表示
    renderAll();
    // チュートリアルで馬を2枚使い切っていても、自由プレイ開始直後は
    // 必ずコスト2の馬カードを引けるようにする。
    nextDrawOverride = goldShip;
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
    CPU_LANES.forEach(function (l) { l.count = 8; });
    farm = [];
    hand = [];
    cpuHand = [forceCard(), forceCard(), forceCard(), silkMobius(), seiunSky(), doDeuce(), goldShip()];
    opponentHandCount = cpuHand.length;
    field = null;
    fieldGuard = null;
    playerGuardCard = null;
    cpuHorseCard = null;
    situation = null;

    phase = 'idle';
    selectedHorse = null;
    selectedForces = [];
    selectedRunItems = [];
    selectedGuardHorse = null;
    selectedGuardItems = [];
    directRunItemId = null;
    handPan = 0;
    runBonus = 0;
    itemGuardBonus = 0;
    guardSelectionConfirmedId = null;
    guardItemSelectionConfirmedId = null;
    discardSelectionConfirmedId = null;
    discardSelectionsInFlight = 0;
    pendingFinishRun = null;
    canDraw = false;
    isCpuTurn = false;
    hasRunThisTurn = false;

    setProgress(19);
    $('step-label').textContent = '自分で操作';
    renderRaceInfo();
    renderAll();

    // 50枚デッキ配布演出を実行（テンポよく手札・山札・ファームへ配布）
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

  /* ===================== BGM（音源ファイル再生・再生位置引き継ぎ対応） ===================== */
  var BGM = (function () {
    var SRC = 'audio/Banners_in_the_Gale_recomposed_90sec.mp3';
    var TARGET_VOLUME = 0.45;
    var FADE_IN_MS = 1200;
    var FADE_OUT_MS = 600;

    var audio = null, fadeTimer = null;

    function saveCurrentTime() {
      if (audio && audio.currentTime > 0) {
        try { sessionStorage.setItem('foth_bgm_time', String(audio.currentTime)); } catch (e) { }
      }
    }

    function restoreCurrentTime() {
      if (!audio) return;
      try {
        var savedTime = sessionStorage.getItem('foth_bgm_time');
        if (savedTime) {
          var t = parseFloat(savedTime);
          if (isFinite(t) && t >= 0) {
            audio.currentTime = t;
          }
        }
      } catch (e) { }
    }

    function ensureAudio() {
      if (!audio) {
        audio = new Audio(SRC);
        audio.loop = true;
        audio.preload = 'auto';
        audio.volume = 0;

        restoreCurrentTime();

        audio.addEventListener('loadedmetadata', restoreCurrentTime);
        audio.addEventListener('timeupdate', saveCurrentTime);
        window.addEventListener('beforeunload', saveCurrentTime);
        window.addEventListener('pagehide', saveCurrentTime);
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
          if (target === 0) {
            saveCurrentTime();
            audio.pause();
          }
        }
      }, 30);
    }

    function start() {
      ensureAudio();
      restoreCurrentTime();
      var playPromise = audio.play();
      if (playPromise && playPromise.catch) { playPromise.catch(function () { }); }
      fadeTo(TARGET_VOLUME, FADE_IN_MS);
    }

    function stop() {
      if (!audio) return;
      saveCurrentTime();
      fadeTo(0, FADE_OUT_MS);
    }

    return { start: start, stop: stop };
  })();

  /* ===================== BGM 自動再生（ユーザー端末側で音量操作） ===================== */
  BGM.start();
  // ブラウザの自動再生制限のため、最初のユーザー操作をきっかけに再生を開始する
  document.addEventListener('click', function initBgmOnFirstTap() {
    BGM.start();
    document.removeEventListener('click', initBgmOnFirstTap);
  }, { once: true });

  /* ===================== events ===================== */
  var suppressNextHandClick = false;

  var handRowEl = $('hand-row');
  if (handRowEl) {
    // touch-action: manipulation と通常の click に統一する。
    // 独自 touchend 処理との二重判定で、スマホのタップが無視される問題を防ぐ。
    handRowEl.addEventListener('click', function (e) {
      var el = e.target.closest ? e.target.closest('.card') : null;
      if (!el) return;
      if (suppressNextHandClick) { suppressNextHandClick = false; return; }
      onHandCardClick(el.dataset.id);
    });
  }

  var opponentFieldCardEl = $('field-body-opp');
  if (opponentFieldCardEl) {
    opponentFieldCardEl.addEventListener('click', function () {
      if (!cpuHorseCard) return;
      CardCloseup.show(cpuHorseCard, { label: '相手の馬カード詳細' });
    });
  }

  var selectionCancelBtn = $('selection-cancel');
  if (selectionCancelBtn) {
    selectionCancelBtn.addEventListener('click', function () {
      if (interactionMode !== 'freeplay') return;
      if (phase === 'select_item') {
        phase = 'select_force';
        selectedHorse = prevSelectedHorse;
        selectedForces = prevSelectedForces.slice();
        selectedRunItems = [];
        directRunItemId = null;
        runItemSelectionConfirmedId = null;
        phase = 'support_choice';
        renderAll();
        offerRunSupport();
        setNarrator('アイテムの選択をキャンセルしました。「使わない」を選ぶと、アイテムなしで走破します。');
        showToast('アイテム選択をキャンセルしました');
        return;
      } else if (phase === 'select_guard_item') {
        var guardHorseWithoutItems = selectedGuardHorse;
        selectedGuardHorse = null;
        selectedGuardItems = [];
        guardItemSelectionConfirmedId = null;
        phase = 'guard_select';
        renderAll();
        setNarrator('アイテムを使わずにガードします。');
        selectGuard(guardHorseWithoutItems, true);
        return;
      } else if (phase === 'select_force') {
        selectedForces = [];
        selectedRunItems = [];
        directRunItemId = null;
        selectedHorse = null;
        if (runEntrySource === 'hand') {
          phase = 'idle';
          hasRunThisTurn = false;
          runEntrySource = null;
          setNarrator('走破をキャンセルしました。');
          showToast('通常の操作画面に戻りました');
        } else {
          phase = 'select_horse';
          setNarrator('走破する<b>馬カード</b>を選び直してください。');
          showToast('馬カードを選び直せます');
        }
      } else if (phase === 'select_horse') {
        selectedForces = [];
        selectedRunItems = [];
        directRunItemId = null;
        runEntrySource = null;
        selectedHorse = null;
        phase = 'idle';
        hasRunThisTurn = false;
        setNarrator('走破をキャンセルしました。');
        showToast('走破をキャンセルしました');
      } else if (phase === 'guard_select') {
        phase = 'idle';
        guardSelectionConfirmedId = null;
        guardValue = 0;
        itemGuardBonus = 0;
        selectedGuardHorse = null;
        selectedGuardItems = [];
        guardItemSelectionConfirmedId = null;
        renderAll();
        setNarrator('ガードを取りやめ、相手の走破をそのまま通します。');
        showToast('ガードせず相手の走破へ進みます');
        executeCpuDraw(cpuRunValue);
        return;
      }
      renderAll();
    });
  }

  var selectionConfirmBtn = $('selection-confirm');
  if (selectionConfirmBtn) {
    selectionConfirmBtn.addEventListener('click', function () {
      Haptics.tap();
      if (phase === 'select_guard_item') confirmGuardItems();
      else confirmRunItems();
    });
  }

  // カード詳細拡大表示（スマホ長押し＆PC右クリック）
  (function setupCardInspection() {
    var pressTimer = null;
    var pressedTarget = null;
    var touchStartX = 0, touchStartY = 0;
    var LONG_PRESS_MS = 480;

    function getCardFromEvent(target) {
      if (!target || !target.closest) return null;
      // 1. 手札カード
      var handCardEl = target.closest('#hand-row .card');
      if (handCardEl) {
        // 走破（馬・フォース選択時）や手札選択中は、長押し詳細よりも1タップでのカード選択操作を最優先する
        if (phase === 'select_horse' || phase === 'select_force' || phase === 'select_item' || phase === 'select_guard_item' ||
          phase === 'select_item_idle' || phase === 'select_situation' || phase === 'discard_select' ||
          phase === 'guard_select') {
          return null;
        }
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

  var handPrevBtn = $('hand-prev');
  var handNextBtn = $('hand-next');
  if (handPrevBtn) {
    handPrevBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      Haptics.tap();
      var row = $('hand-row');
      if (row) {
        var maxPan = Number(row.dataset.maxPan || 0);
        handPan = Math.min(maxPan, handPan + 110);
        layoutHandFan();
      }
    });
  }
  if (handNextBtn) {
    handNextBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      Haptics.tap();
      var row = $('hand-row');
      if (row) {
        var maxPan = Number(row.dataset.maxPan || 0);
        handPan = Math.max(-maxPan, handPan - 110);
        layoutHandFan();
      }
    });
  }

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
    else if (cmd === 'situation') cmdSituation();
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

    var resetBtn = $('settings-reset');
    var presetBtns = overlay.querySelectorAll('.preset-btn[data-angle]');
    var legacyChips = document.querySelectorAll('#tilt-select .tilt-opt[data-angle]');

    function computeDefaultZoom() {
      return (typeof window !== 'undefined' && window.innerWidth >= 860) ? 80 : 100;
    }
    var userAdjustedZoom = false;
    var userAdjustedDepth = false;
    var DEFAULTS = { tilt: 0, depth: 1300, zoom: computeDefaultZoom() };
    var baseTilt = DEFAULTS.tilt;

    // ---- 傾き角度に連動した自動パースペクティブ計算 ----------------------
    // rotateX(θ) + perspective(P) で下端(50% 100%)を軸に傾けると、軸から
    // 距離 d だけ離れた要素は d * sin(θ) だけ奥（-Z方向）へ押し出され、
    // 画面上では P / (P + d*sinθ) 倍に縮んで見える（遠近圧縮）。
    // P を固定したまま θ だけ大きくすると sinθ が急増し、軸から遠い1行目
    // （相手の馬カード列）ほど強く圧縮されて枠が重なってしまう。
    // そこで「10°・1300px」を基準に sinθ/P の比が常に一定になるよう P を
    // 角度に応じて自動的に引き伸ばし、どの角度でも10°時と同じ縮み具合＝
    // 同じレイアウト比率を保つようにする。
    var TILT_REF_DEG = 10;
    var TILT_REF_PERSPECTIVE = DEFAULTS.depth;
    var TILT_REF_SIN = Math.sin(TILT_REF_DEG * Math.PI / 180);
    var DEPTH_MIN = 500;
    var DEPTH_MAX = 3000;

    function autoPerspectiveForTilt(deg) {
      var d = Math.max(0, Number(deg) || 0);
      if (d <= 0) return TILT_REF_PERSPECTIVE;
      var ratio = Math.sin(d * Math.PI / 180) / TILT_REF_SIN;
      var px = TILT_REF_PERSPECTIVE * ratio;
      return Math.round(Math.max(DEPTH_MIN, Math.min(DEPTH_MAX, px)) / 10) * 10;
    }

    function applyTiltVar(deg) {
      document.body.style.setProperty('--tilt-angle', deg + 'deg');
      var isDesktop = typeof window !== 'undefined' && window.innerWidth >= 860;
      // 20度の時は10度と同じレイアウトを使用（デフォルトのフィールドをそのまま20度傾ける）
      var shiftY;
      if (isDesktop) {
        // デスクトップ: 0°で0px、10°と20°で-100px（同じレイアウト）
        shiftY = deg <= 0 ? 0 : -100;
      } else {
        // モバイル: 0°で0px、10°と20°で-12px（同じレイアウト）
        shiftY = deg <= 0 ? 0 : -12;
      }
      document.body.style.setProperty('--field-tilt-shift-y', shiftY.toFixed(1) + 'px');
      // ユーザーが「奥行き」スライダーを手動操作していない限り、傾き角度に
      // 連動してパースペクティブ距離を自動調整し、10°時と同じ見た目比率を維持する
      if (!userAdjustedDepth) {
        var autoPx = autoPerspectiveForTilt(deg);
        document.body.style.setProperty('--field-perspective', autoPx + 'px');
        if (depthRange) depthRange.value = autoPx;
        if (depthValue) depthValue.textContent = autoPx + 'px';
      }
      var rounded = Math.round(deg);
      document.body.dataset.tilt = String(rounded);
      document.body.classList.toggle('tilt-20-plus', deg >= 18);
      var handScale = deg >= 18 ? (isDesktop ? 1.04 : 1.08) : (deg >= 8 ? (isDesktop ? 1.01 : 1.0) : 1.0);
      var handShiftY = isDesktop ? 0 : (deg >= 18 ? -18 : (deg > 10 ? (deg - 10) / 10 * -18 : 0));
      document.body.style.setProperty('--hand-tilt-scale', handScale.toFixed(2));
      document.body.style.setProperty('--hand-shift-y', handShiftY.toFixed(1) + 'px');
      scheduleFieldCorrection();
    }

    // ---- 実測ベースの重なり補正を、傾き／奥行き変更後に再実行する ----------
    // adjustFieldDiagonalLayout()（このIIFEの外で定義されている、実際の
    // 描画位置を測って相手側フィールド枠のズレを補正する関数）は、これまで
    // renderAll()（ゲーム状態が変わった時）と resize 時にしか呼ばれておらず、
    // 傾き角度・奥行きを変更したタイミングでは再計算されていなかった。
    // そのため「10°用に測った補正量」が20°でもそのまま使われてしまい、
    // 枠の重なりとして残っていた。.field-tilt の transform には .45s の
    // transition がかかっているため、アニメーションが収まってから
    // （少し余裕を持たせて480ms後に）再測定する。
    var fieldCorrectionTimer = null;
    function scheduleFieldCorrection() {
      if (fieldCorrectionTimer) clearTimeout(fieldCorrectionTimer);
      fieldCorrectionTimer = setTimeout(function () {
        if (typeof adjustFieldDiagonalLayout === 'function') adjustFieldDiagonalLayout();
      }, 480);
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
      px = Math.max(DEPTH_MIN, Math.min(DEPTH_MAX, Number(px) || DEFAULTS.depth));
      document.body.style.setProperty('--field-perspective', px + 'px');
      if (depthRange) depthRange.value = px;
      if (depthValue) depthValue.textContent = px + 'px';
      scheduleFieldCorrection();
    }
    function setZoom(pct) {
      var isMob = typeof window !== 'undefined' && window.innerWidth < 860;
      var minPct = isMob ? 100 : 80;
      pct = Math.max(minPct, Math.min(200, Number(pct) || DEFAULTS.zoom));
      if (zoomRange) {
        zoomRange.min = String(minPct);
        zoomRange.value = pct;
      }
      if (zoomValue) zoomValue.textContent = pct + '%';
      if (FieldCamera && typeof FieldCamera.setBaseScale === 'function') {
        FieldCamera.setBaseScale(pct / 100);
      }
      scheduleFieldCorrection();
    }

    setDepth(DEFAULTS.depth);
    setTilt(DEFAULTS.tilt);
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
      gear.setAttribute('aria-expanded', 'true');
    });
    function closeSettings() {
      overlay.classList.remove('show');
      gear.setAttribute('aria-expanded', 'false');
    }
    if (closeBtn) {
      closeBtn.addEventListener('click', function () {
        Haptics.tap();
        closeSettings();
      });
    }
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) closeSettings();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && overlay.classList.contains('show')) closeSettings();
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
    if (depthRange) depthRange.addEventListener('input', function () {
      userAdjustedDepth = true;
      setDepth(depthRange.value);
    });
    if (zoomRange) {
      zoomRange.addEventListener('input', function () {
        userAdjustedZoom = true;
        setZoom(zoomRange.value);
      });
    }




    if (resetBtn) {
      resetBtn.addEventListener('click', function () {
        Haptics.tap();
        userAdjustedZoom = false;
        userAdjustedDepth = false;
        DEFAULTS.zoom = computeDefaultZoom();
        setDepth(DEFAULTS.depth);
        setTilt(DEFAULTS.tilt);
        setZoom(DEFAULTS.zoom);
      });
    }

  })();

  /* ===================== field theme switch (スライドスイッチ: サイバー / クラシック) ===================== */
  (function setupThemeSwitch() {
    var switchWrap = $('theme-switch');
    if (!switchWrap) return;
    var opts = switchWrap.querySelectorAll('.theme-opt');
    var STORAGE_KEY = 'foth_field_theme';

    function getSavedTheme() {
      try {
        var saved = localStorage.getItem(STORAGE_KEY);
        if (saved === 'cyber' || saved === 'classic') return saved;
      } catch (e) {}
      return 'cyber'; // 未設定時の初期値
    }

    function applyTheme(theme, save) {
      var isCyber = (theme === 'cyber');
      document.body.classList.toggle('field-cyber', isCyber);
      opts.forEach(function (opt) {
        opt.classList.toggle('active', opt.dataset.theme === theme);
      });
      if (save !== false) {
        try {
          localStorage.setItem(STORAGE_KEY, theme);
        } catch (e) {}
      }
    }

    // 初期化：保存されたテーマ設定を復元して適用
    var currentTheme = getSavedTheme();
    applyTheme(currentTheme, false);

    window._applyTheme = applyTheme;
    window._getCurrentTheme = getSavedTheme;

    opts.forEach(function (opt) {
      opt.addEventListener('click', function () {
        Haptics.tap();
        applyTheme(opt.dataset.theme, true);
      });
    });
  })();

  /* ===================== 設定パネル・モード切替＆確認モーダル ===================== */
  (function setupSettingsAndConfirmModals() {
    var switchWrap = $('mode-switch');
    var opts = switchWrap ? switchWrap.querySelectorAll('.mode-opt') : [];
    var confirmPopup = $('manual-confirm-popup');
    var confirmIcon = $('manual-confirm-icon');
    var confirmTitle = $('manual-confirm-title');
    var confirmDesc = $('manual-confirm-desc');
    var confirmSub = $('manual-confirm-sub');
    var confirmYes = $('manual-confirm-yes');
    var confirmNo = $('manual-confirm-no');

    var pendingConfirmAction = null;

    function closeConfirmPopup() {
      if (confirmPopup) confirmPopup.hidden = true;
      pendingConfirmAction = null;
    }

    function openConfirmModal(config) {
      if (!confirmPopup) return;
      if (confirmIcon) {
        if (config.icon) {
          confirmIcon.textContent = config.icon;
          confirmIcon.style.display = '';
        } else {
          confirmIcon.textContent = '';
          confirmIcon.style.display = 'none';
        }
      }
      if (confirmTitle && config.title) confirmTitle.textContent = config.title;
      if (confirmDesc && config.desc) confirmDesc.textContent = config.desc;
      if (confirmSub) confirmSub.textContent = config.sub || '';
      pendingConfirmAction = config.onConfirm || null;
      confirmPopup.hidden = false;
    }

    if (confirmYes) {
      confirmYes.addEventListener('click', function () {
        Haptics.tap();
        var action = pendingConfirmAction;
        closeConfirmPopup();
        if (typeof action === 'function') {
          action();
        }
      });
    }

    if (confirmNo) {
      confirmNo.addEventListener('click', function () {
        Haptics.tap();
        closeConfirmPopup();
      });
    }

    if (confirmPopup) {
      confirmPopup.addEventListener('click', function (e) {
        if (e.target === confirmPopup) {
          closeConfirmPopup();
        }
      });
    }

    // ESCキーで確認ダイアログを閉じる
    window.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && confirmPopup && !confirmPopup.hidden) {
        closeConfirmPopup();
      }
    });

    // 1. スタート画面に戻る CTA
    var btnHome = $('btn-nav-home');
    if (btnHome) {
      btnHome.addEventListener('click', function () {
        Haptics.tap();
        openConfirmModal({
          icon: '',
          title: 'スタート画面へ移動',
          desc: 'スタート画面に戻りますか？',
          sub: '※現在の進行状況はリセットされます',
          onConfirm: function () {
            window.location.href = 'index.html';
          }
        });
      });
    }

    // 2. 遊びかたの一覧へ CTA
    var btnLessons = $('btn-nav-lessons');
    if (btnLessons) {
      btnLessons.addEventListener('click', function () {
        Haptics.tap();
        openConfirmModal({
          icon: '',
          title: '遊びかた一覧へ移動',
          desc: '遊びかたの一覧へ戻りますか？',
          sub: '※現在の進行状況はリセットされます',
          onConfirm: function () {
            window.location.href = 'lessons.html';
          }
        });
      });
    }

    // 3. プレイモード切り替え
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
        var targetMode = opt.dataset.mode;
        var currentIsManual = document.body.classList.contains('manual-mode');

        if (targetMode === 'manual') {
          if (currentIsManual) {
            // 既に自分で操作モードの場合は設定パネルを閉じるのみ
            var settingsOverlay = $('settings-overlay');
            var settingsGear = $('settings-gear');
            if (settingsOverlay) settingsOverlay.classList.remove('show');
            if (settingsGear) settingsGear.setAttribute('aria-expanded', 'false');
            return;
          }
          // チュートリアル中から自分で操作へ切り替える場合は確認ダイアログを表示
          openConfirmModal({
            icon: '⚔️',
            title: '対戦モードへの切り替え',
            desc: 'チュートリアルを中断して、CPUと対戦しますか？',
            sub: '※チュートリアルは設定からいつでも再開できます',
            onConfirm: function () {
              applyMode('manual');
              var settingsOverlay = $('settings-overlay');
              var settingsGear = $('settings-gear');
              if (settingsOverlay) settingsOverlay.classList.remove('show');
              if (settingsGear) settingsGear.setAttribute('aria-expanded', 'false');
            }
          });
          return;
        }

        // チュートリアルへの切り替え
        applyMode('tutorial');
        var settingsOverlay = $('settings-overlay');
        var settingsGear = $('settings-gear');
        if (settingsOverlay) settingsOverlay.classList.remove('show');
        if (settingsGear) settingsGear.setAttribute('aria-expanded', 'false');
      });
    });
  })();

  /* ===================== pinch-to-zoom (field mat) ===================== */
  var FieldCamera = (function () {
    var el = $('field-image-wrap');
    if (!el) return { pulseTo: function () { }, focusRect: function () { }, reset: function () { }, setBaseScale: function () { }, isBusy: function () { return false; } };
    var isMobile = function () { return typeof window !== 'undefined' && window.innerWidth < 860; };
    var baseScale = (typeof window !== 'undefined' && window.innerWidth >= 860) ? 0.8 : 1;
    function getMinScale() {
      // スマホでは手で画面（盤面）を縮小できないよう最小倍率を1.0（標準サイズ）に固定
      return isMobile() ? 1.0 : Math.min(1.0, baseScale);
    }
    var MAX_SCALE = 2.6;
    var state = { scale: baseScale, tx: 0, ty: 0 };
    var gesture = null; // {startDist, startMid, startScale, startTx, startTy}
    var lastTapTime = 0;
    var busy = false; // true while a scripted camera animation (pulse/focus) is running

    function apply(withTransition) {
      el.style.transition = withTransition ? 'transform .22s ease' : 'none';
      el.style.transformOrigin = '50% 100%';
      el.style.transform = 'translate(' + state.tx + 'px,' + state.ty + 'px) scale(' + state.scale + ')';
      el.style.zIndex = state.scale > 1.01 ? '30' : '';

      // 倍率（scale）に応じてフィールド底面の差分を動的に詰めて余白を解消
      var h = el.offsetHeight || 600;
      var scaleShiftY = (state.scale < 1.0) ? (state.scale - 1.0) * h * 0.88 : 0;
      document.body.style.setProperty('--field-scale-shift-y', scaleShiftY.toFixed(1) + 'px');
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
    // pulseTo: 無効化（カード着地時のズームイン演出を削除）
    function pulseTo(rect, opts) { /* no-op */ }
    // zoom in on a rect and stay there (used for double-tap focus); tap again to reset
    function focusRect(rect, scale) {
      if (!rect) return;
      var off = rectToCenterOffset(rect, scale || 1.8);
      state.scale = scale || 1.8; state.tx = off.tx; state.ty = off.ty;
      clamp();
      apply(true);
    }

    el.style.transformOrigin = '50% 100%';
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
        var minScale = getMinScale();
        // スマホでは縮小(1.0未満)を完全に禁止
        state.scale = Math.max(minScale, Math.min(MAX_SCALE, gesture.startScale * ratio));
        state.tx = gesture.startTx + (m.x - gesture.startMid.x);
        state.ty = gesture.startTy + (m.y - gesture.startMid.y);
        clamp();
        apply(false);
      }
    }, { passive: false });

    function endGesture(e) {
      if (e.touches.length < 2) {
        gesture = null;
        var minScale = getMinScale();
        if (!busy && state.scale <= minScale + 0.05) { reset(); }
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
      var minScale = getMinScale();
      scale = Math.max(minScale, Math.min(MAX_SCALE, scale));
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

  // iOS Safari等でのページ全体の二本指ピンチズーム縮小を完全防止
  document.addEventListener('gesturestart', function (e) { e.preventDefault(); }, { passive: false });
  document.addEventListener('gesturechange', function (e) { e.preventDefault(); }, { passive: false });
  document.addEventListener('gestureend', function (e) { e.preventDefault(); }, { passive: false });

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
        var timingText = isGogglesCard(card)
          ? 'タイプ：馬／ガード中に使用（後から追加も可能）'
          : (card.type === 'jockey' || card.itemUseType === 'horse'
            ? 'タイプ：馬／走破中に使用（ガード後の追加も可能）'
            : 'タイプ：エリア／ターン開始後・走破前に操作メニューから使用');
        return '<b style="color:var(--gold-2);font-size:14px;">' + card.name + '</b>（' + supportLabel + '）<br>効果: <b>' + (card.stat || '') + '</b><br><span style="font-size:11px;color:var(--rail-dim)">' + timingText + '</span>';
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

      // 既存の発動ボタンがあれば除去
      var oldBtn = layer.querySelector('.closeup-action-btn');
      if (oldBtn) oldBtn.remove();

      // ガード候補など、内容を確認してから決定したいカードには確認ボタンを表示する。
      if (opts.actionLabel && typeof opts.onAction === 'function') {
        var confirmBtn = document.createElement('button');
        confirmBtn.className = 'closeup-action-btn btn-guard';
        confirmBtn.style.cssText = 'margin-top:14px;padding:9px 24px;font-size:13.5px;font-weight:700;border-radius:24px;cursor:pointer;pointer-events:auto;box-shadow:0 4px 12px rgba(227,178,60,0.4);border:1.5px solid var(--gold);';
        confirmBtn.textContent = opts.actionLabel;
        confirmBtn.addEventListener('click', function (e) {
          e.stopPropagation();
          hide();
          opts.onAction();
        });
        layer.appendChild(confirmBtn);
      // 手札の状況カードで詳細表示中なら、ここから直接発動できるボタンを表示
      } else if (card.type === 'situation' && !opts.autoHideMs && !isCpuTurn && hand.some(function (c) { return c.id === card.id; })) {
        var actBtn = document.createElement('button');
        actBtn.className = 'closeup-action-btn btn-guard';
        actBtn.style.cssText = 'margin-top:14px;padding:9px 24px;font-size:13.5px;font-weight:700;border-radius:24px;cursor:pointer;pointer-events:auto;box-shadow:0 4px 12px rgba(227,178,60,0.4);border:1.5px solid var(--gold);';
        actBtn.textContent = 'この状況カードを使用する';
        actBtn.addEventListener('click', function (e) {
          e.stopPropagation();
          hide();
          activateSituationCard(card);
        });
        layer.appendChild(actBtn);
      }

      layer.classList.add('show');
      if (hideTimer) { clearTimeout(hideTimer); hideTimer = null; }
      if (opts.autoHideMs) {
        hideTimer = setTimeout(hide, opts.autoHideMs);
      }
    }

    function hide() {
      layer.classList.remove('show');
      var oldBtn = layer.querySelector('.closeup-action-btn');
      if (oldBtn) oldBtn.remove();
      suppressNextHandClick = false;
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
  // スマホ表示時の安全な初期スクロール（初回1回のみ、手札とナレーターが見える位置へ自動スクロール）
  var initialMobileScrolled = false;
  function safeInitialMobileScroll() {
    if (initialMobileScrolled) return;
    if (window.innerWidth > 859) return; // モバイル（859px以下）のみ対象。PC・大画面時はスクロールなし
    var board = $('board');
    if (!board) return;
    initialMobileScrolled = true;

    function doScroll() {
      if (board.scrollHeight > board.clientHeight) {
        var maxScroll = board.scrollHeight - board.clientHeight;
        // 一番下までスクロールせず、ナレーターと手札の間のスペースを詰めるため少し上（50px手前）で止める
        board.scrollTop = Math.max(0, maxScroll - 50);
      }
    }

    requestAnimationFrame(doScroll);
    setTimeout(doScroll, 60);
    setTimeout(doScroll, 250);
  }

  window._showBanner = showBanner;
  window._goldShip = goldShip;
  window._showToast = showToast;
  window._showGuardPopup = showGuardPopup;
  window._doDeuce = doDeuce;
  window._silkMobius = silkMobius;
  window._seiunSky = seiunSky;
  window._getHand = function() { return hand; };
  window._setHand = function(h) { hand = h; };
  window._situationCard = situationCard;
  window._activateSituationCard = activateSituationCard;
  window._getSituation = function() { return situation; };
  window._getPhase = function() { return phase; };
  window._getInteractionMode = function() { return interactionMode; };
  window._renderAll = renderAll;
  window._FieldCamera = FieldCamera;

  renderAll();
  if (new URLSearchParams(window.location.search).get('mode') === 'manual') {
    startManualMode();
  } else {
    runTutorial();
  }
  safeInitialMobileScroll();

})();
