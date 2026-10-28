> **AI 教学演示案例 / AI Teaching Demos** 系列

# 掼蛋（guandan-card-engine）

**Shuyao Gao**（gaoshuyao.mk@gmail.com）· aSSIST University (Seoul School of Integrated Sciences and Technologies) · 서울과학종합대학원대학교
代码 MIT · 文档与教学素材 CC BY 4.0

**两副牌的掼蛋：级牌、逢人配、同花顺、对家接风、进贡还贡、打 A 过关，标准规则全部在浏览器里运行，AI 每一步依据哪条规则都摆在右边。** 打开网页就能看 AI 对打、自己坐下打一局、或者照着任务清单练习；手机竖屏也能玩。
同一系列的中国牌类游戏：[四人斗地主](https://github.com/ShuyaoGao/four-player-doudizhu-rl)、[升级（打百分）](https://github.com/ShuyaoGao/shengji-card-engine)、[保皇](https://github.com/ShuyaoGao/baohuang-card-engine)、[够级](https://github.com/ShuyaoGao/gouji-card-engine)；三人斗地主见 [doudizhu-dmc-lab](https://github.com/ShuyaoGao/doudizhu-dmc-lab)。

*A browser-only Guandan engine: level cards, wild card, tribute and return, with a rule panel explaining every AI move. See the English summary at the end.*

![观战：左边是牌桌，右边是规则依据面板](docs/img/screenshot-watch.png)

<img src="docs/img/screenshot-mobile-play.png" alt="手机竖屏「我来玩」：上方牌桌（上面一排是其他玩家，左右两侧各一家），下方可左右滑动的手牌和「提示」「过」「出牌」大按钮" width="300">

## 怎么打开（都不需要安装）

- **手机**：点在线链接 <https://shuyaogao.github.io/guandan-card-engine/>（竖屏打开，往下滑看规则依据面板；点「我来玩」自己打）。
- **电脑**：点同一个在线链接；或者在 [Releases](https://github.com/ShuyaoGao/guandan-card-engine/releases) 下载 `guandan-card-engine-v1.1.zip`，解压后双击 `index.html`；或者点 **Code → Download ZIP**，解压后双击 `play/index.html`。

页面是纯静态网页：不需要 Python，不需要联网，不会在后台留下任何进程。Windows 上的 Edge 和手机尺寸（触屏模拟）都测过；Safari 需要在真实 Mac 上确认（见常见问题）。

## 规则（本项目实现的标准核心规则）

民间牌类变体很多，这里实现的是主流核心规则，取舍都写在下面；改规则只需改 `games/guandan.py`（和对应的 `play/js/guandan.js`）一处。

- 两副牌 108 张，每人 27 张，对家一伙（0&2 vs 1&3），从 2 打到 A；当局级牌 = 执打方的级别。
- 单张序：大王 > 小王 > **级牌** > A > K > … > 2。**红桃级牌是逢人配**（百搭），可以当任意牌（王除外）；顺子 / 同花顺里级牌按自然位置参与。
- 牌型：单、对、三、三带二、顺子（**恰好 5 张**，A 可作 1 或 14）、木板（3 个连对）、钢板（2 个连续三张）、同花顺、炸弹（4~10 张）、四大天王。
- 牌力：四大天王 > 6 张以上炸弹 > 同花顺 > 5/4 张炸弹 > 普通牌型（同型同长比大小）。
- 出完牌的人一手没人压时由**对家接风**。三家出完即结束：双下升 3 级、对家三游升 2 级、对家末游升 1 级；打 A 要升 2 级以上才过关。
- 整场里下一局先进贡：双下双贡，其余末游单贡；贡最大的牌（红桃级牌除外），还一张 ≤10 的牌；败方持双大王抗贡；进贡者先出。

## 怎么用

页面顶部切换三种模式：

| 模式 | 做什么 |
|---|---|
| **观战**（默认） | 所有座位都是 AI，自动对打；可以暂停、单步、调速度、明牌。 |
| **我来玩** | 你坐 0 号位，和 AI 一起打。 |
| **规则练习** | 带任务清单的「我来玩」（对手默认“新手”），做完一项自动打勾；附牌型图鉴。 |

**电脑（键盘鼠标）**：点牌选中（再点取消），<kbd>回车</kbd> 出牌，<kbd>空格</kbd> 过，<kbd>T</kbd> 提示（按贪心规则），<kbd>Esc</kbd> 清空，双击一张牌选中同点数的全部。<kbd>P</kbd> 暂停 / 继续，<kbd>N</kbd> 单步，<kbd>H</kbd> 或右上角 **?** 打开操作说明。右上角「大屏模式」把左右比例从约 45:55 调到 35:65，方便投影。鼠标停在按钮上会有带动画的小提示。

**手机（触屏，竖屏）**：头部压成一行，右上角 ☰ 里有 AI 强度、明牌、新一局、操作说明和退出。观战时牌桌在上（上面一排是其他玩家，左右两侧各一家），规则依据面板紧跟在牌桌下面（紧凑画法），往下滑看。点「我来玩」后一屏显示、不用滚动：上方是牌桌，下方是你的手牌——**点牌选中**（再点取消），牌多时**左右滑动**，然后点 **出牌**、**过** 或 **提示**（按钮都够大）。「看规则依据」全屏打开右栏面板，「返回」关闭。横屏时会提示竖屏体验更好。

- **右栏**：「规则依据 · 记牌器」：贪心规则这一步命中了哪一条（自由出牌 / 跟牌 / 用炸弹或同花顺 / 过）、在哪些候选里挑、挑了哪一手；下面是记牌器。
- **AI 强度**有几个预设（新手 = 随机、普通 = 贪心规则……），“细调”里可以逐个座位单独选。
- **公平性**：「我来玩」时对手每一步的决策过程在本局结束前锁住（候选动作会暴露它的手牌），打完自动解锁，或打开「明牌（作弊）」。💡 提示用的贪心规则只看你自己的手牌和桌面上的牌。

## 课堂上怎么用（推荐顺序）

1. **观战**：先看一局，认识级牌（单张比 A 大）和紫框的逢人配。
2. **看一整场**：连着打几局，看级别怎么升、谁给谁进贡、为什么双大王可以抗贡。
3. **规则练习**：按任务清单用逢人配凑一手牌、出一次木板或钢板、出一次炸弹或同花顺。
4. **讨论**：这里的贪心规则不会配合队友（不会“不压队友”），想一想要加哪些规则才像人。

## 它是怎么做的

- **规则引擎**：Python 版在 `core/`（多副牌、花色、甩牌类的轮转 / 过牌 / 接风骨架）和 `games/guandan.py`；浏览器版 `play/js/core.js`、`play/js/guandan.js` 逐行移植。
- **一致性**：`tests/js/test_engine.js` 用 Python 导出的标准答案（`tests/fixtures/guandan.json`）逐步核对：同一种子发出的牌、每一步的**合法动作列表（含顺序）**、贪心智能体每一步的选择、终局名次与回报都必须相同。掼蛋的牌型生成里有一处遍历 Python 集合（set），浏览器版按 CPython 的哈希表规则复现了同样的顺序（`tests/fixtures/pyset.json` 核对）。整场（级别、进贡 / 还贡、抗贡、过 A）也逐局核对。
- **随机数**：浏览器里用与 Python `random.Random` 完全相同的随机数序列（MT19937，`play/js/pyrandom.js`），所以同一个种子在两边发出同一副牌。
- **AI**：`agents.py` 的随机和贪心规则（自由出牌出张数最多的一手、跟牌出最小能压的普通牌、手牌 ≤8 张才用炸弹）。
- **浏览器验收**：`tests/test_browser.py`（1920×1080、1366×768 跑一遍观战单步、右栏面板、我来玩一整局、练习、说明、退出）和 `tests/test_mobile.py`（390×844、414×896、360×780、768×1024 四个触屏尺寸加横屏：没有横向溢出、我来玩整页不滚动、模拟触摸点牌出牌、右栏面板打开 / 返回、没有 JS 报错）。

这个游戏没有训练好的神经网络，所以没有“大脑面板”；右栏放的是贪心规则的依据和记牌器。

### 成绩（`results/result.json`，固定种子，可复现）

每组 200 局、换边各打一半，种子 2026（`tools/run_eval.py` 调用 `evaluate.py` 的对战函数）：

| 对局 | 局数 | 该智能体所在队伍胜率 | Wilson 95% 区间 |
|---|---:|---:|---|
| 贪心 vs 随机 | 200 | 93.0% | 88.6% – 95.8% |

每组换边各打一半；胜率 = 该智能体所在队伍赢的局数 / 总局数。各游戏强弱队结构不同，50% 即为同强度。

## 想自己跑或修改

需要 Python 3.10+：

```bash
pip install -r requirements.txt     # numpy、pytest
python evaluate.py --games 200      # 对战评估（换边各半）
python -m tools.run_eval            # 固定种子重跑评估 → results/result.json
python -m tools.export_fixtures     # 改了规则后，重新生成浏览器版的测试夹具
python -m tools.build --release     # 重新生成 play/js/credits.js，打包 release/*.zip
python -m tools.screenshots         # 重新截 README 的图（电脑 + 手机；需要 pip install playwright）
python -m pytest                    # 全部测试（JS 测试需要 Node.js；浏览器测试需要本机 Edge 和 playwright）
```

## 目录结构

```
index.html           根目录跳转页（GitHub Pages 和 Release zip 的入口，自动跳到 play/）
play/                双击即玩的静态网页（index.html、css/、js/）
  css/base.css、table.css   电脑端样式    css/mobile.css   手机竖屏样式（牌类通用）
  js/guandan.js       规则引擎（移植自 games/guandan.py）
  js/core.js          多副牌、花色、甩牌骨架、随机 / 贪心智能体（移植自 core/、agents.py）
  js/table.js         页面逻辑（模式、出牌流程、规则依据、练习、说明、退出）
  js/mobile.js        手机竖屏工具：设备判断、☰ 菜单、全屏面板、横屏提示、防误触（牌类通用）
  js/guandan_ui.js    这个游戏的界面配置（牌型名称、任务清单、图鉴……）
core/                多副牌、花色、甩牌类骨架（轮转 / 过牌 / 接风）
games/guandan.py       规则引擎（含整场：级别、进贡 / 坐庄轮转）
agents.py            随机 / 贪心智能体
evaluate.py          对战评估
results/             result.json（评估结果）
tools/               构建、评估、导出夹具、浏览器自检（edge.py）、手机尺寸验收（mobile_check.py）、截图、署名填充
tests/               Python 测试（含 test_browser.py、test_mobile.py）、tests/js（Node 差分测试）、tests/fixtures（Python 导出的标准答案）
docs/img/            截图（电脑 + 手机）
```

## 常见问题

- **关掉页面后还在后台跑吗？** 不会。这是纯静态网页，关掉标签页就全部结束，不留后台进程。「退出」（电脑右上角；手机在 ☰ 里）会先停掉所有计时器，再尝试关闭标签页；浏览器不允许关闭时，会显示“已停止运行”。
- **手机上怎么玩？** 竖屏打开在线链接。观战时往下滑看规则依据面板；点「我来玩」后点牌选中、左右滑动看更多牌，再点「出牌」「过」「提示」；「看规则依据」全屏打开右栏，「返回」关闭。
- **双击 index.html 却用记事本打开了？** 右键 →「打开方式」→ 选浏览器。
- **Mac 上能用吗？** 页面只用标准 HTML / JavaScript，Safari 应该可以打开，但作者还没在真实 Mac 上测过，遇到问题欢迎反馈。Firefox 也没有测过。
- **规则和我家乡的玩法不一样？** 很正常。这里实现的是主流核心规则，取舍都写在上面的“规则”一节里。

## 许可证与引用

代码 MIT（[LICENSE](LICENSE)），文档 CC BY 4.0（[LICENSE-docs](LICENSE-docs)），使用请注明出处。
引用信息见 [CITATION.cff](CITATION.cff)（GitHub 右侧 “Cite this repository”）。第三方组件与来源见 [THIRD_PARTY.md](THIRD_PARTY.md)。

## AI 辅助开发声明

代码由 Claude Code 辅助编写，经作者审阅。

## English summary

**guandan-card-engine** is a browser-only teaching demo of Guandan, the popular two-deck partnership climbing game: level cards, the heart-level wild card, straight flushes, partner hand-over, tribute and return, and the A-level finish are all implemented. The JavaScript engine reproduces the Python engine move-by-move (including Python's set iteration order). AIs are rule-based (greedy / random), and a side panel shows which greedy rule fired at each step. The page runs fully offline (double-click `index.html`) and works on phones in portrait mode (tap cards, scroll the hand, big play / pass / hint buttons, full-screen side panel). Code: MIT; docs: CC BY 4.0. Author: Shuyao Gao (gaoshuyao.mk@gmail.com), aSSIST University (Seoul School of Integrated Sciences and Technologies).
