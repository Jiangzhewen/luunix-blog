---
author: "Luunix"
pubDatetime: 2026-04-05T00:00:00.000Z
title: "用 Astro 搭建个人博客"
slug: "build-blog-with-astro"
featured: false
draft: false
tags:
  - Astro
  - 建站
description: "从零开始使用 Astro + AstroPaper 搭建一个精美简约的个人博客，配合 Obsidian 知识库管理内容。"
---

<!-- synced-from: 03 Resources/Astro 博客搭建指南.md -->

# 用 Astro 搭建个人博客

## 为什么选 Astro

在众多静态站点生成器中，Astro 有几个独特优势：

1. **零 JS 输出**：默认不向客户端发送任何 JavaScript
2. **内容优先**：原生支持 Markdown 和 MDX
3. **岛屿架构**：只在需要交互的地方加载 JS

## 快速开始

安装 AstroPaper 主题：

```bash
npm create astro@latest -- --template satnaing/astro-paper
```

这会创建一个功能完整的博客项目，包含：
- 搜索功能（Pagefind）
- 暗色模式
- SEO 优化
- RSS 订阅

## 与 Obsidian 联动

我使用 PARA 方法 管理知识库，当一篇笔记成熟到可以发布时，只需要在 frontmatter 中添加 `publish: true`。

同步脚本会自动：
- 转换 Obsidian 的 wikilink 语法
- 处理图片路径
- 映射 frontmatter 字段

这种方式让写作和发布完全分离——专注内容创作，发布只是一个命令的事。
