# AI 面试管理系统 - veFaaS 部署指南

## 部署架构

```
前端（IGA Pages） ──────→ 后端 API（veFaaS） ──────→ 云数据库 RDS
                          │
                          ├──→ 火山方舟 AI API
                          ├──→ 对象存储 TOS
```

## 部署步骤

### 1. 安装 veadk

```bash
pip install veadk
```

### 2. 登录火山引擎

```bash
veadk login
```

或使用 AK/SK 登录（适用于 CI/CD 环境）：
```bash
veadk login --accessKey <YOUR_AK> --secretKey <YOUR_SK>
```

### 3. 初始化项目（如使用 veadk init）

```bash
cd D:\TRAEproject\AIHR\backend
veadk init --name ai-interview-backend
```

### 4. 配置环境变量

在 veFaaS 控制台或通过 CLI 配置以下环境变量：

| 变量 | 说明 | 示例 |
|------|------|------|
| `DATABASE_URL` | 数据库连接字符串 | `mysql+pymysql://user:pass@host:3306/ai_interview` |
| `ARK_API_KEY` | 火山方舟 API Key | `your-api-key-here` |
| `ARK_BASE_URL` | 火山方舟 API 地址 | `https://ark.cn-beijing.volces.com/api/v3` |
| `ARK_MODEL` | 使用的模型 | `doubao-pro-32k` |

### 5. 部署

```bash
cd D:\TRAEproject\AIHR\backend
veadk deploy
```

### 6. 获取 API 网关地址

部署成功后，控制台会返回 API 网关地址，例如：
```
https://xxxxxx.apigateway.cn-beijing.volces.com
```

### 7. 更新前端环境变量

将前端 `.env` 中的 `VITE_API_BASE` 更新为 veFaaS 的 API 网关地址：

```
VITE_API_BASE=https://xxxxxx.apigateway.cn-beijing.volces.com
```

然后重新构建并部署前端：
```bash
cd D:\TRAEproject\AIHR\frontend
npm run build
iga pages deploy
```

## 项目结构

```
backend/
├── main.py               # FastAPI 入口（本地开发）
├── handler.py            # veFaaS 入口（部署用）
├── vefaaS.json           # veFaaS 配置
├── requirements_vefaas.txt # veFaaS 依赖
└── app/
    ├── config.py         # 环境变量配置
    ├── database.py       # 数据库连接
    ├── models/           # 数据模型
    └── routers/          # API 路由
```

## 注意事项

1. **SSE 流式输出**：veFaaS 普通函数不支持 SSE，需要使用**沙箱应用**模式
2. **冷启动延迟**：普通函数有 1-3 秒冷启动，建议使用预热池或沙箱应用
3. **超时设置**：面试对话 API 建议设置 timeout 为 60 秒以上
4. **数据库**：建议使用火山引擎 RDS MySQL，SQLite 仅用于本地测试

## 成本预估

| 项目 | 费用 |
|------|------|
| veFaaS 函数调用 | ¥50-150/月 |
| RDS MySQL | ¥100-200/月 |
| 火山方舟 API | 按 Token 计费 |
| **合计** | **¥150-350/月** |
