---
title: AI数据隐私检查清单
description: 面向团队落地的隐私控制清单，降低泄露和合规风险。
pubDate: '2026-02-25'
updatedDate: '2026-02-25'
tags: ['隐私', '风险']
related: ['ai-policy-template-smb', 'governance-lite-implementation', 'tool-evaluation-scorecard']
audience: 管理层/IT/流程负责人
readingTime: 8分钟
outcomes:
  - 形成可执行的数据边界
  - 降低敏感信息泄露风险
  - 建立抽检与追责机制
---

## 关键原则

把“不能做什么”写进流程，而不是停留在培训口号。

## 必做清单

- 做数据分级（公开/内部/受限）
- 受限数据禁止输入公共模型
- 所有生产场景必须用白名单工具
- 高风险输出必须人工复核
- 设立月度抽检

## 场景化控制

每个流程明确：

- 可输入数据类型
- 禁止输入数据类型
- 审核人
- 异常升级路径

## 抽检标准

每月随机抽取样本，检查：

- 是否违规输入数据
- 是否跳过复核
- 是否记录异常
