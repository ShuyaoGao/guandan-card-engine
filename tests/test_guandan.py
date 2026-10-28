# -*- coding: utf-8 -*-
"""掼蛋引擎测试（python -m pytest，或 python tests/test_guandan.py）。"""

import random
import sys
from collections import Counter
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from core.cards import deck, SMALL_JOKER, BIG_JOKER  # noqa: E402,F401
from core.shed import Move, PASS  # noqa: E402,F401
from games import GuanDan, GuandanMatch  # noqa: E402
from agents import RandomAgent, GreedyAgent  # noqa: E402,F401

PASSED = 0

def check(cond, name):
    global PASSED
    assert cond, f"测试失败: {name}"
    PASSED += 1
    print(f"  ✓ {name}")



def play_random(game, max_steps=3000):
    rng = random.Random(123)
    steps = 0
    while not game.done:
        game.step(rng.choice(game.legal_moves()))
        steps += 1
        assert steps < max_steps, "对局未终止"
    return steps



def find(moves, kind, **kw):
    return [m for m in moves if m.kind == kind
            and all(getattr(m, k) == v for k, v in kw.items())]



def test_guandan():
    g = GuanDan(random.Random(2), level=5).reset()
    check(sum(len(h) for h in g.hands) == 108, "掼蛋发牌 27×4")

    # 逢人配：一张 9 + 红桃5(百搭) 可组对 9
    g.hands[0] = [(9, "♠"), (5, "♥"), (3, "♣")]
    mv = g.gen_moves(0, None)
    check(find(mv, "pair", main=9), "百搭补对子(9+红桃级牌)")
    # 顺子 A 作 1：A 2 3 4 + 百搭
    g.hands[0] = [(14, "♠"), (2, "♦"), (3, "♣"), (4, "♠"), (5, "♥")]
    mv = g.gen_moves(0, None)
    check(find(mv, "straight", main=5), "A2345 顺子（百搭补位）")
    # 同花顺与炸弹层级
    g.hands[0] = [(10, "♠"), (11, "♠"), (12, "♠"), (13, "♠"), (14, "♠"),
                  (8, "♦"), (8, "♣"), (8, "♠"), (8, "♥"), (8, "♦"),
                  (SMALL_JOKER, ""), (SMALL_JOKER, ""), (BIG_JOKER, ""), (BIG_JOKER, "")]
    mv = g.gen_moves(0, None)
    flush = find(mv, "flush", main=14)
    b5 = find(mv, "bomb", main=8, length=5)
    b4 = find(mv, "bomb", main=8, length=4)
    jb = find(mv, "joker_bomb")
    check(flush and b5 and jb, "同花顺/5炸/四大天王均生成")
    check(g.beats(flush[0], b5[0]), "同花顺 > 5 张炸")
    check(g.beats(Move("bomb", 3, 6, (3,) * 6), flush[0]), "6 张炸 > 同花顺")
    check(g.beats(jb[0], Move("bomb", 16, 10, (5,) * 10)), "四大天王最大")
    # 级牌单张大于 A
    check(g.ordv(5) == 16 and g.ordv(14) == 14, "级牌(5)单张大于 A")

    for seed in range(12):
        g = GuanDan(random.Random(seed), level=2).reset()
        play_random(g)
        total = sum(len(h) for h in g.hands) + sum(len(p) for p in g.played)
        assert total == 108, "掼蛋牌数守恒"
        assert g.upgrade in (1, 2, 3), "升级幅度 1/2/3"
    check(True, "12 局随机掼蛋：终止 + 守恒 + 升级合法")

    m = GuandanMatch(random.Random(7))
    bots = RandomAgent(7)
    for _ in range(3):
        game = m.new_deal()
        while not game.done:
            game.step(bots.rng.choice(game.legal_moves()))
        m.apply_result(game)
    check(m.levels[0] >= 2 and m.levels[1] >= 2 and m.prev is not None,
          "整场流程：级别推进 + 进贡日志可用")



def test_greedy_guandan():
    greedy = GreedyAgent()
    for seed in range(5):
        g = GuanDan(random.Random(99 + seed))
        g.reset()
        steps = 0
        while not g.done:
            g.step(greedy.act(g))
            steps += 1
            assert steps < 5000, "贪心对局未终止"
    check(True, "贪心智能体可完整打完 5 局")


if __name__ == "__main__":
    for fn in [test_guandan, test_greedy_guandan]:
        print(f"\n[{fn.__name__}]")
        fn()
    print(f"\n全部通过：共 {PASSED} 项断言 ✓")
