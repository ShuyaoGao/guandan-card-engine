# -*- coding: utf-8 -*-
"""掼蛋：4 人 2 副牌（108 张），对家一伙，从 2 打到 A。

实现的标准规则：
  - 每人 27 张；0&2 vs 1&3；当局级牌 = 执打方当前级别
  - 单张序：大王 > 小王 > 级牌 > A > K > … > 2（级牌脱离自然位）
  - 逢人配：红桃级牌（2 张）为百搭，可替任意牌（王除外）；顺子/同花顺中
    级牌按自然位参与
  - 牌型：单张、对子（含对王）、三张、三带二、顺子(恰 5 张, A 可作 1 或 14)、
    三连对(木板)、钢板(两连三)、同花顺、炸弹(4~10 张)、四大天王
  - 牌型大小：四大天王 > 6 张及以上炸弹(张数→点数) > 同花顺(比顶张) >
    5/4 张炸弹(张数→点数) > 普通牌型(同型同长比大小)
  - 接风：出完牌者一手无人压时，由其【对家】接风
  - 三人出完即结束；升级：双下+3 / 对家三游+2 / 对家末游+1
  - 过 A：执打 A 级时需双下或对家三游（+2 以上）方可获胜
  - 进贡/还贡（GuandanMatch）：双下双贡、其余末游单贡；贡最大牌（红桃级牌除外）；
    还贡 ≤10 的牌；双大王抗贡；进贡者先出（抗贡头游先出）
"""

import random
from collections import Counter
from itertools import islice

from core.cards import (deck, rank_counter, onehot, SUITS,
                        SMALL_JOKER, BIG_JOKER, MultiHot)
from core.shed import ShedGame, Move

MAX_PAIRS_COMBO = 80


class GuanDan(ShedGame):
    N = 4
    NAME = "guandan"
    TITLE = "掼蛋"
    TEAM_DESC = "对家一伙（0&2 vs 1&3）"
    ENC = MultiHot(range(2, 15), 8, 2)

    def __init__(self, rng=None, level=2, first=None):
        super().__init__(rng)
        self.level = level
        self._first = first

    # ------------------------------------------------ 基础
    def ordv(self, r):
        """单张/对/三/炸弹的比较值：大王>小王>级牌>A>…>2。"""
        if r == BIG_JOKER:
            return 18
        if r == SMALL_JOKER:
            return 17
        if r == self.level:
            return 16
        return r

    @property
    def wild(self):
        return (self.level, "♥")

    def deal(self):
        cards = deck(2, two_as=2)
        self.rng.shuffle(cards)
        self.hands = [sorted(cards[i * 27:(i + 1) * 27]) for i in range(4)]

    def first_seat(self):
        return self._first if self._first is not None else self.rng.randrange(4)

    def position(self, seat):
        return "even" if seat % 2 == 0 else "odd"

    def positions_list(self):
        return ["even", "odd"]

    def teams(self):
        return [s % 2 for s in range(4)]

    def jiefeng_seat(self, last_mover):
        mate = (last_mover + 2) % 4
        return mate if mate not in self.finished else self._next_seat(last_mover)

    # ------------------------------------------------ 牌型生成（含逢人配）
    def gen_moves(self, seat, to_beat):
        hand = self.hands[seat]
        wild = self.wild
        wilds = [c for c in hand if c == wild]
        w = len(wilds)
        normal = [c for c in hand if c != wild]
        ncnt = Counter(r for r, _ in normal)
        by_rank = {}
        for c in sorted(normal):
            by_rank.setdefault(c[0], []).append(c)

        moves = []

        def pick(r, n):
            """取 r 点数 n 张：先自然牌后百搭。"""
            nat = by_rank.get(r, [])[:min(n, ncnt[r])]
            return nat + wilds[:n - len(nat)]

        # 单张（每个点数一种；pick 自动先取自然牌、不足才用百搭）
        seen = set()
        for c in hand:
            if c[0] not in seen:
                seen.add(c[0])
                moves.append(Move("single", self.ordv(c[0]), 1, (c[0],),
                                  (pick(c[0], 1)[0],)))

        # 对/三/炸弹（百搭可补，王不可被百搭）
        for r in set(list(ncnt) + ([self.level] if w else [])):
            base = ncnt.get(r, 0)
            extra = 0 if r >= SMALL_JOKER else w
            total = base + extra
            if total >= 2:
                moves.append(Move("pair", self.ordv(r), 1, (r, r),
                                  tuple(pick(r, 2))))
            if total >= 3 and r < SMALL_JOKER:
                moves.append(Move("trio", self.ordv(r), 1, (r,) * 3,
                                  tuple(pick(r, 3))))
            for n in range(4, min(total, 10) + 1):
                if r < SMALL_JOKER:
                    moves.append(Move("bomb", self.ordv(r), n, (r,) * n,
                                      tuple(pick(r, n))))
        if ncnt.get(SMALL_JOKER, 0) == 2 and ncnt.get(BIG_JOKER, 0) == 2:
            moves.append(Move("joker_bomb", 99, 4,
                              (SMALL_JOKER,) * 2 + (BIG_JOKER,) * 2,
                              tuple(by_rank[SMALL_JOKER] + by_rank[BIG_JOKER])))

        # 三带二
        trio_ranks = [r for r in ncnt if r < SMALL_JOKER and ncnt[r] + w >= 3]
        pair_ranks = [r for r in ncnt if (ncnt[r] + (0 if r >= SMALL_JOKER else w)) >= 2]
        cnt_combo = 0
        for r in trio_ranks:
            k1 = max(0, 3 - ncnt.get(r, 0))
            for q in pair_ranks:
                if q == r:
                    continue
                k2 = max(0, 2 - ncnt.get(q, 0)) if q < SMALL_JOKER else 0
                if ncnt.get(q, 0) + (w - k1 if q < SMALL_JOKER else 0) < 2:
                    continue
                if k1 + k2 <= w:
                    nat_r = by_rank.get(r, [])[:3 - k1]
                    nat_q = by_rank.get(q, [])[:2 - k2]
                    cards = tuple(nat_r + wilds[:k1] + nat_q + wilds[k1:k1 + k2])
                    moves.append(Move("trio_pair", self.ordv(r), 1,
                                      (r,) * 3 + (q,) * 2, cards))
                    cnt_combo += 1
                    if cnt_combo >= MAX_PAIRS_COMBO:
                        break
            if cnt_combo >= MAX_PAIRS_COMBO:
                break

        # 顺子类（值域 1..14，A 可作 1）
        def have_cards(v, suit=None):
            r = 14 if v == 1 else v
            cs = by_rank.get(r, [])
            if suit is not None:
                cs = [c for c in cs if c[1] == suit]
            return cs

        def window_moves(length, need, kind):
            for a in range(1, 16 - length):
                vals = list(range(a, a + length))
                if any(v > 14 for v in vals):
                    continue
                miss = 0
                for v in vals:
                    miss += max(0, need - len(have_cards(v)))
                if miss > w:
                    continue
                cards, used_w = [], 0
                for v in vals:
                    nat = have_cards(v)[:need]
                    cards += nat
                    k = need - len(nat)
                    cards += wilds[used_w:used_w + k]
                    used_w += k
                moves.append(Move(kind, a + length - 1, length,
                                  tuple(c[0] for c in cards), tuple(cards)))

        window_moves(5, 1, "straight")        # 顺子
        window_moves(3, 2, "pair_chain")      # 木板（三连对）
        window_moves(2, 3, "plane")           # 钢板（两连三）

        # 同花顺
        for suit in SUITS:
            for a in range(1, 11):
                vals = list(range(a, a + 5))
                miss = sum(1 for v in vals if not have_cards(v, suit))
                if miss > w:
                    continue
                cards, used_w = [], 0
                for v in vals:
                    nat = have_cards(v, suit)
                    if nat:
                        cards.append(nat[0])
                    else:
                        cards.append(wilds[used_w])
                        used_w += 1
                moves.append(Move("flush", a + 4, 5,
                                  tuple(c[0] for c in cards), tuple(cards)))
        return moves

    # ------------------------------------------------ 比较
    @staticmethod
    def _power(mv):
        if mv.kind == "joker_bomb":
            return (5, 0, 0)
        if mv.kind == "bomb":
            return (4 if mv.length >= 6 else 2, mv.length, mv.main)
        if mv.kind == "flush":
            return (3, 0, mv.main)
        return None

    def beats(self, m, last):
        pm, pl = self._power(m), self._power(last)
        if pm and not pl:
            return True
        if pm and pl:
            return pm > pl
        if pl:
            return False
        return (m.kind == last.kind and m.length == last.length
                and m.main > last.main)

    # ------------------------------------------------ 结算
    def is_over(self):
        return len(self.finished) >= 3

    def settle(self):
        f = self.finished
        self.winner_team = f[0] % 2
        mate = (f[0] + 2) % 4
        if mate == f[1]:
            self.upgrade = 3              # 双下
        elif mate == f[2]:
            self.upgrade = 2
        else:
            self.upgrade = 1
        for s in range(4):
            self.returns_[s] = float(self.upgrade if s % 2 == self.winner_team
                                     else -self.upgrade)

    # ------------------------------------------------ RL 编码
    def encode_state(self, seat):
        E = self.ENC
        feats = []
        feats += E.encode(self.hands[seat])
        unseen = Counter(r for r, _ in deck(2, two_as=2))
        unseen.subtract(rank_counter(self.hands[seat]))
        for p in self.played:
            unseen.subtract(rank_counter(p))
        feats += E.encode(list((+unseen).elements()))
        feats += E.encode(list(self.to_beat.ranks) if self.to_beat else [])
        for d in range(1, 4):
            a = self.last_action[(seat + d) % 4]
            feats += E.encode(list(a.ranks) if not a.is_pass else [])
        for d in range(1, 4):
            feats += onehot(min(len(self.hands[(seat + d) % 4]), 27), 28)
        feats += onehot(self.level - 2, 13)
        feats += onehot(sum(1 for c in self.hands[seat] if c == self.wild), 3)
        return feats

    @classmethod
    def encode_action(cls, move):
        return cls.ENC.encode([] if move.is_pass else list(move.ranks))


class GuandanMatch:
    """整场掼蛋：级别、进贡/还贡、过 A 判定。"""

    def __init__(self, rng=None):
        self.rng = rng or random.Random()
        self.levels = [2, 2]
        self.trump_team = 0               # 执打方（用谁的级别）
        self.prev = None                  # 上局 (finished, upgrade)
        self.over = False
        self.champion = None
        self.tribute_log = []

    def new_deal(self):
        game = GuanDan(self.rng, level=self.levels[self.trump_team],
                       first=self.prev[0][0] if self.prev else None)
        game.reset()
        self.tribute_log = []
        if self.prev:
            self._tribute(game)
        return game

    def _highest(self, game, seat):
        cards = [c for c in game.hands[seat] if c != game.wild]
        return max(cards, key=lambda c: game.ordv(c[0]))

    def _smallest_return(self, game, seat):
        cands = [c for c in game.hands[seat] if c[0] <= 10]
        pool = cands or game.hands[seat]
        return min(pool, key=lambda c: game.ordv(c[0]))

    def _swap(self, game, payer, receiver):
        give = self._highest(game, payer)
        game.hands[payer].remove(give)
        game.hands[receiver].append(give)
        back = self._smallest_return(game, receiver)
        game.hands[receiver].remove(back)
        game.hands[payer].append(back)
        for s in (payer, receiver):
            game.hands[s].sort()
        from core.cards import card_str
        self.tribute_log.append(
            f"{payer} 号位进贡 {card_str(give)}，{receiver} 号位还贡 {card_str(back)}")

    def _tribute(self, game):
        f, upgrade = self.prev
        head = f[0]
        if upgrade == 3:                  # 双下双贡
            payers = [f[2], f[3]]
            bj = sum(1 for p in payers for c in game.hands[p] if c[0] == BIG_JOKER)
            if bj >= 2:
                self.tribute_log.append("败方持双大王，抗贡！")
                game.turn = head
                return
            g1, g2 = (self._highest(game, payers[0]), self._highest(game, payers[1]))
            big_payer = payers[0] if game.ordv(g1[0]) >= game.ordv(g2[0]) else payers[1]
            small_payer = payers[1] if big_payer == payers[0] else payers[0]
            self._swap(game, big_payer, head)
            self._swap(game, small_payer, (head + 2) % 4)
            game.turn = big_payer
        else:                             # 末游单贡
            payer = f[3]
            bj = sum(1 for c in game.hands[payer] if c[0] == BIG_JOKER)
            if bj >= 2:
                self.tribute_log.append("末游持双大王，抗贡！")
                game.turn = head
                return
            self._swap(game, payer, head)
            game.turn = payer

    def apply_result(self, game):
        wt = game.winner_team
        if self.levels[wt] == 14:         # 打 A：需 +2 及以上过关
            if game.upgrade >= 2:
                self.over = True
                self.champion = wt
            # 否则停留在 A 重打
        else:
            self.levels[wt] = min(14, self.levels[wt] + game.upgrade)
        self.trump_team = wt
        self.prev = (list(game.finished), game.upgrade)

    def status(self):
        n = {11: "J", 12: "Q", 13: "K", 14: "A"}
        f = lambda v: n.get(v, str(v))
        return (f"偶数队级别 {f(self.levels[0])} / 奇数队级别 {f(self.levels[1])}，"
                f"当前执打：{'偶数队' if self.trump_team == 0 else '奇数队'}"
                f"（级牌 {f(self.levels[self.trump_team])}）")
