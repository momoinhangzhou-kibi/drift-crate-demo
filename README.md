# 漂流补给箱 / Drift Crate

一个用 React + TypeScript + Vite 写的单页面网页小游戏 Demo。

当前版本重点实现最小可玩循环：

- 选择天赋开始新游戏
- 钓鱼、打捞、交易、开补给包
- 制作漂流火锅
- 升级载具
- 使用家具券布置小屋
- 结束一天并刷新天气、价格和随机事件
- 使用 `localStorage` 保存游戏状态

## 安全说明

这个项目本身没有后端、数据库或联网请求。游戏运行后只在浏览器本地保存数据。

在公司电脑上建议先不要安装依赖，也不要访问 npm registry。等换到个人电脑或允许 Node/npm 开发的环境后，再运行下面的命令。

## 之后在个人电脑运行

需要先安装 Node.js，然后在项目目录运行：

```bash
npm install
npm run dev
```

打开终端显示的本地地址，通常是：

```text
http://localhost:5173/
```

## 开发流程

本地开发：

```bash
npm run dev
```

检查构建：

```bash
npm run build
```

发布到线上：

```bash
git add .
git commit -m "update gameplay"
git push
```

push 到 `main` 后，Vercel 会自动部署，线上链接会自动更新。

## 项目结构

```text
src/
  App.tsx
  main.tsx
  styles.css
  game/
    types.ts
    data.ts
    logic.ts
```

## 玩法文件说明

- `src/game/types.ts`：游戏状态、物品、卡牌、天赋等类型定义
- `src/game/data.ts`：卡牌池、家具池、天气、初始背包、升级需求等静态数据
- `src/game/logic.ts`：钓鱼、打捞、开箱、交易、料理、升级、布置、结束一天、保存读取等逻辑
- `src/App.tsx`：页面渲染和按钮交互
- `src/styles.css`：可爱海蓝色 UI 样式

## 已知环境备注

如果公司网络拦截 npm registry，安装依赖时可能会看到 `EACCES` 或 fetch failed。这通常表示网络策略阻止访问包仓库，不代表项目代码有问题。
