/* 掼蛋引擎，移植自 games/guandan.py（4 人 2 副牌 108 张，对家一伙，从 2 打到 A），含整场 GuandanMatch。
 *   单张序：大王 > 小王 > 级牌 > A > K > … > 2；红桃级牌为“逢人配”（百搭，可替王以外任意牌）
 *   牌型：单、对、三、三带二、顺子(恰 5 张，A 可作 1)、木板(三连对)、钢板(两连三)、同花顺、炸弹(4~10)、四大天王
 *   牌力：四大天王 > 6 张以上炸弹 > 同花顺 > 5/4 张炸弹 > 普通牌型
 *   接风：出完牌者一手无人压时由其对家接风；三家出完即结束；升级：双下 +3 / 对家三游 +2 / 对家末游 +1
 * 依赖：CG（core.js）、PyRandom。
 */
(function (root) {
  'use strict';
  var CG = root.CG, SJ = CG.SMALL_JOKER, BJ = CG.BIG_JOKER, Move = CG.Move, SUITS = CG.SUITS;
  var MAX_PAIRS_COMBO = 80;

  function GuanDan(rng, level, first) {
    this.rng = rng || new root.PyRandom();
    this.level = level === undefined ? 2 : level;
    this._first = first === undefined ? null : first;
  }
  CG.inherit(GuanDan);
  GuanDan.prototype.N = 4;
  GuanDan.prototype.NAME = 'guandan';
  GuanDan.prototype.TITLE = '掼蛋';

  GuanDan.prototype.ordv = function (r) {
    if (r === BJ) return 18;
    if (r === SJ) return 17;
    if (r === this.level) return 16;
    return r;
  };
  GuanDan.prototype.wild = function () { return CG.card(this.level, '♥'); };
  GuanDan.prototype.isWild = function (c) { return c.r === this.level && c.s === '♥'; };
  GuanDan.prototype.deal = function () {
    var cards = CG.deck(2, 2);
    this.rng.shuffle(cards);
    this.hands = [0, 1, 2, 3].map(function (i) { return CG.sortCards(cards.slice(i * 27, (i + 1) * 27)); });
  };
  GuanDan.prototype.firstSeat = function () { return this._first !== null ? this._first : this.rng.randrange(4); };
  GuanDan.prototype.position = function (seat) { return seat % 2 === 0 ? 'even' : 'odd'; };
  GuanDan.prototype.positionsList = function () { return ['even', 'odd']; };
  GuanDan.prototype.teams = function () { return [0, 1, 0, 1]; };
  GuanDan.prototype.jiefengSeat = function (lastMover) {
    var mate = (lastMover + 2) % 4;
    return this.finished.indexOf(mate) < 0 ? mate : this._nextSeat(lastMover);
  };

  // ------------------------------------------------ 牌型生成（含逢人配）
  GuanDan.prototype.genMoves = function (seat) {
    var self = this, hand = this.hands[seat];
    var wilds = hand.filter(function (c) { return self.isWild(c); }), w = wilds.length;
    var normal = hand.filter(function (c) { return !self.isWild(c); });
    var ncnt = new CG.Counter(normal.map(function (c) { return c.r; }));
    var byRank = new Map();
    CG.sortCards(normal).forEach(function (c) { if (!byRank.has(c.r)) byRank.set(c.r, []); byRank.get(c.r).push(c); });
    function br(r) { return byRank.get(r) || []; }
    var moves = [];
    function pick(r, n) {
      var nat = br(r).slice(0, Math.min(n, ncnt.get(r)));
      return nat.concat(wilds.slice(0, n - nat.length));
    }
    function fill(r, n) { return new Array(n).fill(r); }

    var seen = {};
    hand.forEach(function (c) {
      if (!seen[c.r]) { seen[c.r] = 1; moves.push(Move('single', self.ordv(c.r), 1, [c.r], [pick(c.r, 1)[0]])); }
    });

    CG.pySetOrder(ncnt.keys().concat(w ? [this.level] : [])).forEach(function (r) {
      var total = ncnt.get(r) + (r >= SJ ? 0 : w);
      if (total >= 2) moves.push(Move('pair', self.ordv(r), 1, [r, r], pick(r, 2)));
      if (total >= 3 && r < SJ) moves.push(Move('trio', self.ordv(r), 1, fill(r, 3), pick(r, 3)));
      for (var n = 4; n <= Math.min(total, 10); n++) if (r < SJ) moves.push(Move('bomb', self.ordv(r), n, fill(r, n), pick(r, n)));
    });
    if (ncnt.get(SJ) === 2 && ncnt.get(BJ) === 2)
      moves.push(Move('joker_bomb', 99, 4, [SJ, SJ, BJ, BJ], br(SJ).concat(br(BJ))));

    var trioRanks = ncnt.keys().filter(function (r) { return r < SJ && ncnt.get(r) + w >= 3; });
    var pairRanks = ncnt.keys().filter(function (r) { return ncnt.get(r) + (r >= SJ ? 0 : w) >= 2; });
    var cntCombo = 0;
    for (var ti = 0; ti < trioRanks.length; ti++) {
      var r = trioRanks[ti], k1 = Math.max(0, 3 - ncnt.get(r));
      for (var pi = 0; pi < pairRanks.length; pi++) {
        var q = pairRanks[pi];
        if (q === r) continue;
        var k2 = q < SJ ? Math.max(0, 2 - ncnt.get(q)) : 0;
        if (ncnt.get(q) + (q < SJ ? w - k1 : 0) < 2) continue;
        if (k1 + k2 <= w) {
          var cards = br(r).slice(0, 3 - k1).concat(wilds.slice(0, k1), br(q).slice(0, 2 - k2), wilds.slice(k1, k1 + k2));
          moves.push(Move('trio_pair', self.ordv(r), 1, fill(r, 3).concat(fill(q, 2)), cards));
          cntCombo += 1;
          if (cntCombo >= MAX_PAIRS_COMBO) break;
        }
      }
      if (cntCombo >= MAX_PAIRS_COMBO) break;
    }

    function haveCards(v, suit) {
      var cs = br(v === 1 ? 14 : v);
      return suit === undefined ? cs : cs.filter(function (c) { return c.s === suit; });
    }
    function windowMoves(length, need, kind) {
      for (var a = 1; a < 16 - length; a++) {
        var vals = [];
        for (var v = a; v < a + length; v++) vals.push(v);
        if (vals.some(function (x) { return x > 14; })) continue;
        var miss = 0;
        vals.forEach(function (x) { miss += Math.max(0, need - haveCards(x).length); });
        if (miss > w) continue;
        var cs = [], usedW = 0;
        vals.forEach(function (x) {
          var nat = haveCards(x).slice(0, need);
          cs = cs.concat(nat);
          var k = need - nat.length;
          cs = cs.concat(wilds.slice(usedW, usedW + k));
          usedW += k;
        });
        moves.push(Move(kind, a + length - 1, length, cs.map(function (c) { return c.r; }), cs));
      }
    }
    windowMoves(5, 1, 'straight');
    windowMoves(3, 2, 'pair_chain');
    windowMoves(2, 3, 'plane');
    SUITS.forEach(function (suit) {
      for (var a = 1; a < 11; a++) {
        var vals = [a, a + 1, a + 2, a + 3, a + 4];
        var miss = vals.filter(function (v) { return !haveCards(v, suit).length; }).length;
        if (miss > w) continue;
        var cs = [], usedW = 0;
        vals.forEach(function (v) {
          var nat = haveCards(v, suit);
          if (nat.length) cs.push(nat[0]); else { cs.push(wilds[usedW]); usedW++; }
        });
        moves.push(Move('flush', a + 4, 5, cs.map(function (c) { return c.r; }), cs));
      }
    });
    return moves;
  };

  // ------------------------------------------------ 比较
  function power(mv) {
    if (mv.kind === 'joker_bomb') return [5, 0, 0];
    if (mv.kind === 'bomb') return [mv.length >= 6 ? 4 : 2, mv.length, mv.main];
    if (mv.kind === 'flush') return [3, 0, mv.main];
    return null;
  }
  GuanDan.power = power;
  GuanDan.prototype.beats = function (m, last) {
    var pm = power(m), pl = power(last);
    if (pm && !pl) return true;
    if (pm && pl) return CG.cmpTuple(pm, pl) > 0;
    if (pl) return false;
    return m.kind === last.kind && m.length === last.length && m.main > last.main;
  };

  // ------------------------------------------------ 结算
  GuanDan.prototype.isOver = function () { return this.finished.length >= 3; };
  GuanDan.prototype.settle = function () {
    var f = this.finished;
    this.winnerTeam = f[0] % 2;
    var mate = (f[0] + 2) % 4;
    this.upgrade = mate === f[1] ? 3 : mate === f[2] ? 2 : 1;
    for (var s = 0; s < 4; s++) this.returns_[s] = s % 2 === this.winnerTeam ? this.upgrade : -this.upgrade;
  };

  // ------------------------------------------------ 整场：级别、进贡 / 还贡、过 A
  function GuandanMatch(rng) {
    this.rng = rng || new root.PyRandom();
    this.levels = [2, 2];
    this.trumpTeam = 0;
    this.prev = null;
    this.over = false;
    this.champion = null;
    this.tributeLog = [];
    this.tributes = [];
  }
  GuandanMatch.prototype.newDeal = function () {
    var game = new GuanDan(this.rng, this.levels[this.trumpTeam], this.prev ? this.prev[0][0] : null);
    game.reset();
    this.tributeLog = [];
    this.tributes = [];
    if (this.prev) this._tribute(game);
    return game;
  };
  GuandanMatch.prototype._highest = function (game, seat) {
    return CG.maxBy(game.hands[seat].filter(function (c) { return !game.isWild(c); }), function (c) { return [game.ordv(c.r)]; });
  };
  GuandanMatch.prototype._smallestReturn = function (game, seat) {
    var cands = game.hands[seat].filter(function (c) { return c.r <= 10; });
    return CG.minBy(cands.length ? cands : game.hands[seat], function (c) { return [game.ordv(c.r)]; });
  };
  GuandanMatch.prototype._swap = function (game, payer, receiver) {
    var give = this._highest(game, payer);
    CG.removeCard(game.hands[payer], give);
    game.hands[receiver].push(give);
    var back = this._smallestReturn(game, receiver);
    CG.removeCard(game.hands[receiver], back);
    game.hands[payer].push(back);
    [payer, receiver].forEach(function (s) { game.hands[s] = CG.sortCards(game.hands[s]); });
    this.tributes.push({payer: payer, receiver: receiver, give: give, back: back});
    this.tributeLog.push(payer + ' 号位进贡 ' + CG.cardStr(give) + '，' + receiver + ' 号位还贡 ' + CG.cardStr(back));
  };
  GuandanMatch.prototype._tribute = function (game) {
    var f = this.prev[0], upgrade = this.prev[1], head = f[0];
    if (upgrade === 3) {
      var payers = [f[2], f[3]], bj = 0;
      payers.forEach(function (p) { game.hands[p].forEach(function (c) { if (c.r === BJ) bj++; }); });
      if (bj >= 2) { this.tributeLog.push('败方持双大王，抗贡！'); game.turn = head; return; }
      var g1 = this._highest(game, payers[0]), g2 = this._highest(game, payers[1]);
      var big = game.ordv(g1.r) >= game.ordv(g2.r) ? payers[0] : payers[1], small = big === payers[0] ? payers[1] : payers[0];
      this._swap(game, big, head);
      this._swap(game, small, (head + 2) % 4);
      game.turn = big;
    } else {
      var payer = f[3], bj2 = game.hands[payer].filter(function (c) { return c.r === BJ; }).length;
      if (bj2 >= 2) { this.tributeLog.push('末游持双大王，抗贡！'); game.turn = head; return; }
      this._swap(game, payer, head);
      game.turn = payer;
    }
  };
  GuandanMatch.prototype.applyResult = function (game) {
    var wt = game.winnerTeam;
    if (this.levels[wt] === 14) {
      if (game.upgrade >= 2) { this.over = true; this.champion = wt; }
    } else this.levels[wt] = Math.min(14, this.levels[wt] + game.upgrade);
    this.trumpTeam = wt;
    this.prev = [game.finished.slice(), game.upgrade];
  };
  var LV = {11: 'J', 12: 'Q', 13: 'K', 14: 'A'};
  function lvName(v) { return LV[v] || String(v); }
  GuandanMatch.prototype.status = function () {
    return '蓝队（0、2 号位）级别 ' + lvName(this.levels[0]) + ' / 红队（1、3 号位）级别 ' + lvName(this.levels[1]) +
      '，当前执打：' + (this.trumpTeam === 0 ? '蓝队' : '红队') + '（级牌 ' + lvName(this.levels[this.trumpTeam]) + '）';
  };

  GuanDan.Match = GuandanMatch;
  GuanDan.lvName = lvName;
  CG.GAMES.guandan = GuanDan;
  root.GuanDan = GuanDan;
})(typeof window !== 'undefined' ? window : globalThis);
