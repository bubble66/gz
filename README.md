# Math Knowledge Graph Explorer (数学知识图谱资源库)

这是一个交互式的数学知识图谱应用，专注于高中数学函数性质的结构化展示与编辑。

## 技术栈

- **Frontend**: React 19 + Vite + Tailwind CSS + D3.js (图谱渲染)
- **Backend**: Node.js + Express
- **Database**: SQLite (通过 `better-sqlite3`)
- **Animations**: Framer Motion (motion/react)

## 目录结构说明

- `/src`: 前端代码（React 组件、Hooks、D3 逻辑）
- `/server.ts`: 后端 Express 服务器逻辑，集成了 Vite 中间件
- `/data`: 存储持久化数据文件
  - `knowledgebase.sqlite`: 核心数据库文件（节点与关系）
- `/dist`: 项目构建后的静态文件目录（仅在运行 `npm run build` 后产生）

## 本地开发运行

1. **安装依赖**
   ```bash
   npm install
   ```

2. **启动开发服务器**
   ```bash
   npm run dev
   ```
   服务将运行在 `http://localhost:3000`。在开发模式下，后端会自动处理前端的热更新（通过 Vite 中间件）。

## 部署说明

### 如何进行生产环境构建

在部署到生产服务器之前，需要先构建前端资源：

```bash
npm run build
```

这会生成一个 `dist` 目录，包含所有混淆和优化后的静态文件。

### 启动生产环境服务

建议使用 `NODE_ENV=production` 运行服务器，这样服务器会直接提供 `dist` 目录中的静态文件，而不再依赖 Vite 的开发环境。

```bash
NODE_ENV=production npx tsx server.ts
```

或者如果您已经部署到支持 `npm start` 的平台，可以在 `package.json` 中配置相应脚本。

## 数据库与维护

- **数据位置**: 应用数据统一存储在 `/data/knowledgebase.sqlite`。
- **自动初始化**: 如果数据库文件不存在，服务器启动时会自动创建并从 `src/data/knowledgeMap.ts` 导入初始种子数据。
- **备份与迁移**: 进行代码库迁移或版本控制时，请确保 `data` 目录被包含在内。目前 `.gitignore` 已配置为允许提交 `data/knowledgebase.sqlite`，方便部署时直接携带现有数据。

## 注意事项

- **端口**: 本应用固定使用 `3000` 端口。
- **SQLite 锁**: SQLite 是单文件数据库，请确保运行环境对 `data/` 目录有读写权限。
