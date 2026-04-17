# Cloudflare Workers AI ハンズオン

> Cloudflareアカウント1つで、Meta・Google・IBM・Anthropicなど複数社のAIモデルを  
> **同じコードで・別々の契約なしに・1日10,000 Neurons無料で**試せる環境を作ります。

---

## ⚡ Workers AI とは？

通常、AIモデルを使うには各社との個別契約が必要です。

```
😵 普通のやり方
  Llamaを使いたい  → 自前でGPUサーバーを用意
  Claudeを使いたい → Anthropicと契約
  Whisperを使いたい → OpenAIと契約
  画像生成したい   → Black Forest Labsと契約
  …契約が増え続ける

😊 Workers AIのやり方
  全部 → Cloudflareアカウント1つでOK ✅
```

しかも**書き方は全部同じ**：

```typescript
// テキスト生成（Meta）
await env.AI.run('@cf/meta/llama-3.1-8b-instruct-fp8-fast', { messages: [...] })

// テキスト生成（IBM）
await env.AI.run('@cf/ibm-granite/granite-4.0-h-micro', { messages: [...] })

// 画像生成
await env.AI.run('@cf/black-forest-labs/flux-1-schnell', { prompt: '...' })

// 音声認識
await env.AI.run('@cf/openai/whisper', { audio: [...] })

// 全部 env.AI.run() だけ！
```

---

## 💰 料金のしくみ

Workers AIは **「Neurons（ニューロン）」** という単位で課金されます。  
GPUの計算量に応じて消費する独自単位で、**1日10,000 Neuronsまで無料**です。

| プラン | 無料枠 | 超過分 |
|---|---|---|
| Workers Free（無料） | 10,000 Neurons/日 | 超過するとエラーになる |
| Workers Paid（$5/月〜） | 10,000 Neurons/日 | $0.011 / 1,000 Neurons |

### モデルごとの価格感

| モデル | 入力 | 出力 | 特徴 |
|---|---|---|---|
| Llama 3.1 8B fp8-fast | $0.045/MTok | $0.384/MTok | バランス良し・おすすめ |
| Llama 3.2 3B | $0.051/MTok | $0.335/MTok | 軽量・高速 |
| Granite 4.0 micro | $0.017/MTok | $0.112/MTok | **最安**・試しやすい |
| Whisper（音声認識） | $0.0005/分 | — | OpenAI直接の**1/12**の価格 |
| Claude Opus 4.7 | 非公開（※） | 非公開（※） | 現在ベータ期間 |

> ※ CloudflareダッシュボードにClaudeの料金は記載がありません。  
> 現在はベータ期間中で無料 or 低コストの可能性がありますが、  
> 正式版移行時に課金が始まる場合があります。

### 対 Anthropic 直接契約との比較

| モデル | Anthropic直接 | Workers AI経由 |
|---|---|---|
| Claude Haiku 4.5 | $1.00 / $5.00 /MTok | 非公開 |
| Claude Sonnet 4.6 | $3.00 / $15.00 /MTok | 非公開 |
| Claude Opus 4.7 | $5.00 / $25.00 /MTok | 非公開 |
| Llama 3.1 8B | — | $0.045 / $0.384 /MTok |

**Workers AIの本領はLlamaなどOSSモデルの圧倒的な安さにあります。**  
Claudeを本番で使いたい場合はAnthropicと直接契約する方が透明性が高いです。

---

## 🚨 重要：このハンズオンは「ローカルビルドのみ」で進めます

### ⛔ デプロイしてはいけない理由

```
wrangler dev   ✅ OK（ローカル動作確認）
wrangler deploy ❌ NG（このハンズオンでは禁止）
```

**デプロイすると何が起きるか：**

1. **URLが公開される**  
   `https://cf-ai-handson.あなたのサブドメイン.workers.dev` が誰でもアクセス可能になる

2. **Neuronsが外部から消費される**  
   公開されたURLに誰かがリクエストを送ると、**あなたのアカウントのNeuronsが消費される**

3. **無料枠10,000 Neurons/日を使い切るリスク**  
   悪意あるアクセスや想定外の負荷で、すぐに上限に達してエラーになる

4. **Workers Paidプランの場合は課金が発生する**  
   超過分は$0.011/1,000 Neuronsで自動課金される

### ✅ ローカルでの動作確認方法

```bash
npm run dev
# → http://localhost:8787 でアクセス可能（外部非公開）
```

ローカルでも**CloudflareのGPUサーバーにリクエストが飛ぶ**ため、Neuronsは消費されます。  
ただしURLは`localhost`なので外部からアクセスされる心配はありません。

---

## 🛠️ セットアップ

### 必要なもの

- Node.js 20以上
- Cloudflareアカウント（無料）
- Wrangler CLIのログイン済み状態

### 手順

```bash
# 1. リポジトリをクローン
git clone https://github.com/your-org/cf-ai-handson
cd cf-ai-handson

# 2. 依存関係をインストール
npm install

# 3. Cloudflareにログイン（初回のみ）
npx wrangler login

# 4. ローカルサーバーを起動
npm run dev
```

ブラウザで http://localhost:8787 を開くと動作確認できます。

---

## 📡 APIエンドポイント一覧

### `GET /`
ヘルスチェック。Workerが動いているか確認。

```bash
curl http://localhost:8787/
# → {"status":"ok","message":"Cloudflare Workers AI ハンズオン"}
```

### `POST /generate`
テキスト生成。モデルを切り替えて比較できます。

```bash
curl -X POST http://localhost:8787/generate \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Cloudflareとは何ですか？3行で教えてください。",
    "model": "@cf/meta/llama-3.1-8b-instruct-fp8-fast"
  }'
```

**使えるモデル：**
| モデルID | 特徴 |
|---|---|
| `@cf/meta/llama-3.1-8b-instruct-fp8-fast` | バランス良し（デフォルト）|
| `@cf/meta/llama-3.2-3b-instruct` | 軽量・高速 |
| `@cf/ibm-granite/granite-4.0-h-micro` | 最安 |
| `@cf/qwen/qwen2.5-coder-32b-instruct` | コード生成特化 |
| `anthropic/claude-opus-4.7` | 高性能（ベータ）|

### OpenAI互換エンドポイント（おまけ）

OpenAI SDKやVS Code Copilotと連携できます。

```bash
# モデル一覧
curl http://localhost:8787/v1/models

# チャット
curl -X POST http://localhost:8787/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "@cf/meta/llama-3.1-8b-instruct-fp8-fast",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'
```

---

## 📊 Neurons消費量の確認方法

ハンズオン中に自分がどれだけ使ったか確認できます。

1. [Cloudflareダッシュボード](https://dash.cloudflare.com) にログイン
2. 左メニュー **「Workers AI」** をクリック
3. **Analytics** タブで消費Neurons量を確認

> 💡 **目安：** Llama 3.1 8Bで1回の質問（〜200トークン）あたり約10〜20 Neurons消費。  
> 無料枠10,000 Neuronsで **数百回** は試せます。

---

## 🧱 プロジェクト構成

```
cf-ai-handson/
├── src/
│   └── index.ts      # Worker本体（APIエンドポイント）
├── public/
│   └── index.html    # デモUI（モデル比較ページ）
├── wrangler.toml     # Cloudflare設定
├── package.json
└── tsconfig.json
```

---

## ❓ よくあるトラブル

**Q. `wrangler dev` でエラーが出る**  
→ `npx wrangler login` でCloudflareにログインしているか確認してください。

**Q. Error 4006 が返ってくる**  
→ 1日の無料枠10,000 Neuronsを使い切っています。UTC 0:00（日本時間9:00）にリセットされます。

**Q. Claudeモデルが使えない**  
→ ベータ機能のため、アカウントによっては利用できない場合があります。まずLlamaモデルで試してください。

**Q. レスポンスが遅い**  
→ 初回リクエストはコールドスタートで遅くなる場合があります。2回目以降は速くなります。

---

## 📝 ライセンス

MIT