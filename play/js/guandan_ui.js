/* 掼蛋的界面配置（GAME_UI）。依赖：CG、GuanDan、UIC。 */
(function (root) {
  'use strict';
  var CG = root.CG, G = root.GuanDan, U = root.UIC;
  var KIND_ZH = {single: '单张', pair: '对子', trio: '三张', trio_pair: '三带二', straight: '顺子', pair_chain: '木板（三连对）',
    plane: '钢板（两连三）', flush: '同花顺', bomb: '炸弹', joker_bomb: '四大天王', pass: '过'};
  var CHAIN = {straight: 1, pair_chain: 1, plane: 1, flush: 1};
  var TEAM = [{text: '蓝队', color: '#4aa3ff'}, {text: '红队', color: '#ff6b6b'}];
  var seatPos = U.seatPos(4), lv = G.lvName;
  function sorter(g) {
    return function (cs) {
      return cs.slice().sort(function (a, b) {
        return (g.ordv(b.r) - g.ordv(a.r)) || (CG.SUITS.indexOf(a.s) - CG.SUITS.indexOf(b.s));
      });
    };
  }
  function cardText(g, c) { return CG.cardStr(c) + (g && g.isWild(c) ? '(配)' : ''); }
  function moveText(m, g) {
    if (m.isPass) return '过';
    var t = m.kind === 'bomb' ? m.length + ' 张炸弹' : (KIND_ZH[m.kind] || m.kind);
    var cs = CHAIN[m.kind] ? m.cards : sorter(g)(m.cards);
    return t + ' ' + cs.map(function (c) { return cardText(g, c); }).join(' ');
  }
  function team(s) { return TEAM[s % 2]; }

  root.GAME_UI = {
    key: 'guandan', title: '掼蛋', sub: '两副牌 · 对家一伙 · 逢人配、进贡与还贡',
    repo: 'guandan-card-engine', demoSeed: 20261013, hasBrain: false,
    kindZh: KIND_ZH, moveText: moveText, seatPos: seatPos, seatXY: U.seatXY, finishName: U.finishName,
    sortForDisplay: function (cs) { return sorter(root.CGApp && root.CGApp.A.game || new G(null, 2))(cs); },
    isWild: function (g, c) { return g.isWild && g.isWild(c); },
    alarmAt: 6, fullDeck: function () { return CG.deck(2, 2); }, counterRanks: [17, 16, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2],
    kindNames: {random: '随机', greedy: '贪心'},
    presets: {
      novice: {name: '新手', desc: '随机：在所有合法出牌里随便挑一个。', kinds: function (n) { return new Array(n).fill('random'); }},
      normal: {name: '普通', desc: '贪心规则：自由出牌出张数最多的一手，跟牌出最小能压的普通牌，手牌 ≤8 张才用炸弹 / 同花顺。', kinds: function (n) { return new Array(n).fill('greedy'); }},
      uneven: {name: '不对称', desc: '蓝队（0、2 号位）随机 vs 红队（1、3 号位）贪心——看规则比乱出强多少。我来玩时你的队友是随机、对手是贪心（很难）。', kinds: function () { return ['random', 'greedy', 'random', 'greedy']; }}
    },
    defaultPreset: {watch: 'normal', play: 'normal'},
    roleOf: function (g, s) { return team(s); },
    roleShort: function (g, s) { return team(s).text; },
    lastShown: function (g, seat, lastCards) {
      var m = g.lastAction[seat];
      return U.lastShown(g, seat, lastCards, KIND_ZH, function (cs) { return CHAIN[m.kind] ? cs : sorter(g)(cs); });
    },
    startLog: function (g, M) {
      return ['本局级牌 ' + lv(g.level) + '（红桃 ' + lv(g.level) + ' 是逢人配），' + M.status()].concat(M.tributeLog.map(function (l) { return '[进贡] ' + l; }));
    },
    onDealStart: function (g, M, task) { if (M.tributeLog.length) task('tribute'); },
    startExplain: function (g, M) {
      var t = '两副牌，每人 27 张；0、2 号位是<b style="color:#4aa3ff">蓝队</b>，1、3 号位是<b style="color:#ff6b6b">红队</b>。本局级牌 <b>' + lv(g.level) +
        '</b>：单张比 A 还大，<b>红桃 ' + lv(g.level) + '</b> 是逢人配（百搭）。';
      if (M.tributeLog.length) t += '<br>按上一局名次先进贡：' + M.tributeLog.join('；') + '。';
      return t;
    },
    centerInfo: function (g, M) {
      var t = '级牌 <b>' + lv(g.level) + '</b>（' + (M.trumpTeam === 0 ? '蓝队' : '红队') + '执打）<br>蓝队打 ' + lv(M.levels[0]) + ' · 红队打 ' + lv(M.levels[1]) + '<br>';
      if (g.done) return t + '本局结束';
      t += g.toBeat ? '要压：<b>' + moveText(g.toBeat, g) + '</b>' : '<b>自由出牌</b>';
      if (M.tributeLog.length && g.history.length < 4) t += '<br><span class="small">' + M.tributeLog.join('<br>') + '</span>';
      return t;
    },
    humanHint: function (g, legal) {
      return '点牌选中，回车出牌，空格过，T 提示。紫框的红桃 ' + lv(g.level) + ' 是逢人配，可以当任意牌（王除外）。' +
        (g.toBeat ? '要压的是 <b>' + moveText(g.toBeat, g) + '</b>。' : '现在自由出牌。') + '（共 ' + legal.length + ' 个合法动作）';
    },
    whyIllegal: function (g, cs) {
      var rk = CG.sortedNums(cs.map(function (c) { return c.r; })).join(',');
      var any = g.genMoves(g.turn).some(function (m) { return CG.sortedNums(m.cards.map(function (c) { return c.r; })).join(',') === rk; });
      if (!any) return '这不是合法牌型（顺子恰好 5 张；木板 = 3 个连对；钢板 = 2 个连续三张）';
      return g.toBeat ? '这一手压不过 ' + moveText(g.toBeat, g) : '这一手现在不能出';
    },
    onHumanMove: function (g, m, task) { if (m.cards.some(function (c) { return g.isWild(c); })) task('wild'); },
    galleryCheck: function (cards, name) {
      var g = new G(new root.PyRandom(1), 2).reset(), key = CG.sortCards(cards).map(CG.cardKey).join(',');
      g.hands[0] = cards;
      return g.genMoves(0).some(function (m) { return (KIND_ZH[m.kind] === name || (m.kind === 'bomb' && name === '炸弹') || (name === '逢人配补对子' && m.kind === 'pair')) && CG.sortCards(m.cards).map(CG.cardKey).join(',') === key; });
    },
    resultText: function (g) {
      var cat = {3: '双下', 2: '对家三游', 1: '对家末游'}[g.upgrade];
      return TEAM[g.winnerTeam].text + '头游（' + cat + '，升 ' + g.upgrade + ' 级），名次 ' + g.finished.map(function (s, i) { return U.finishName(i, 4) + ' ' + s + '号'; }).join('、');
    },
    rulesHTML: '两副牌 108 张，每人 27 张，对家一伙（0&2 vs 1&3），从 2 打到 A。<br>' +
      '单张序：大王 > 小王 > <b>级牌</b> > A > K > … > 2；<b>红桃级牌是逢人配</b>，可以当任意牌（王除外）。<br>' +
      '牌型：单、对、三、三带二、顺子（<b>恰好 5 张</b>，A 可作 1）、木板（3 个连对）、钢板（2 个连续三张）、同花顺、炸弹（4~10 张）、四大天王。<br>' +
      '牌力：四大天王 > 6 张以上炸弹 > <b>同花顺</b> > 5/4 张炸弹 > 普通牌型。出完牌的人一手没人压时由<b>对家接风</b>。<br>' +
      '三家出完即结束：双下升 3 级、对家三游升 2 级、对家末游升 1 级；打 A 要升 2 级以上才过关。下一局先<b>进贡</b>：末游给头游最大的牌（红桃级牌除外），头游还一张 ≤10 的牌；双下双贡；双大王抗贡。',
    rulesNote: '贪心规则（agents.GreedyAgent）：自由出牌时出张数最多的一手、张数相同出最小的；跟牌时出能压住的普通牌型里最小的；普通牌压不住且手牌 ≤8 张时，才用最小的炸弹或同花顺。没有专门针对掼蛋的配合（比如不压队友）。',
    tasks: [
      {id: 'types', text: '在「牌型图鉴」里点开 3 种牌型看看例子'},
      {id: 'wild', text: '用逢人配（红桃级牌）凑出一手牌'},
      {id: 'woodsteel', text: '出一手木板或钢板', when: function (e) { return e === 'kind:pair_chain' || e === 'kind:plane'; }},
      {id: 'boom', text: '出一手炸弹、同花顺或四大天王', when: function (e) { return /^kind:(bomb|flush|joker_bomb)$/.test(e); }},
      {id: 'hint', text: '用一次 💡 提示，看贪心规则会怎么出'},
      {id: 'tribute', text: '打完一局后，看下一局开局的进贡和还贡'},
      {id: 'win_practice', text: '赢一局（对手：新手）'}
    ],
    gallery: [
      ['单张', [[13, '♠']], '任意一张牌。级牌单张比 A 大，只比王小。'],
      ['对子', [[9, '♥'], [9, '♣']], '两张同点。'],
      ['逢人配补对子', [[9, '♠'], [2, '♥']], '红桃级牌（这里打 2，所以是红桃 2）可以当任意牌：9 + 红桃 2 = 一对 9。'],
      ['三带二', [[10, '♠'], [10, '♥'], [10, '♣'], [4, '♠'], [4, '♦']], '三张 + 一对。'],
      ['顺子', [[14, '♠'], [2, '♣'], [3, '♠'], [4, '♦'], [5, '♥']], '恰好 5 张连续单牌；A 可以当 1（A 2 3 4 5）或当 14（10 J Q K A）。'],
      ['木板（三连对）', [[6, '♠'], [6, '♥'], [7, '♣'], [7, '♦'], [8, '♠'], [8, '♥']], '3 个连续的对子。'],
      ['钢板（两连三）', [[11, '♠'], [11, '♥'], [11, '♣'], [12, '♠'], [12, '♥'], [12, '♣']], '2 个连续的三张。'],
      ['同花顺', [[9, '♠'], [10, '♠'], [11, '♠'], [12, '♠'], [13, '♠']], '同花色的顺子：比 5 张及以下的炸弹大，比 6 张以上的炸弹小。'],
      ['炸弹', [[8, '♠'], [8, '♥'], [8, '♣'], [8, '♦']], '同点 4~10 张：张数多的大，张数相同比点数。'],
      ['四大天王', [[16, ''], [16, ''], [17, ''], [17, '']], '两张小王 + 两张大王，最大。']
    ],
    helpCards: [
      ['① 这是什么', '<p>两副牌的<b>掼蛋</b>：四个人，对家一伙，从 2 打到 A。级牌、逢人配、同花顺、接风、进贡还贡都按标准规则在浏览器里运行，与 Python 版引擎逐步一致。</p><p>AI 是规则（贪心 / 随机），没有训练过的神经网络。</p>'],
      ['② 怎么看右边', '<p><b>规则依据</b>：这一步贪心规则命中了哪一条（自由出牌 / 跟牌 / 用炸弹 / 过），在哪些候选里挑、挑了哪一手。</p><p>下面是<b>记牌器</b>：每个点数还剩几张没出。</p><p>上一局的名次决定下一局谁进贡，开局时左边“现在发生了什么”会写出来。</p>'],
      ['③ 怎么玩', '<p>顶部切换「观战 / 我来玩 / 规则练习」。我来玩：你坐 0 号位（蓝队），队友是 2 号位。点牌选中，<kbd>回车</kbd> 出牌，<kbd>空格</kbd> 过，<kbd>T</kbd> 提示，双击一张牌选中同点数的全部。</p><p><kbd>P</kbd> 暂停 / 继续，<kbd>N</kbd> 单步，<kbd>H</kbd> 打开本说明。</p>']
    ]
  };
})(typeof window !== 'undefined' ? window : globalThis);
