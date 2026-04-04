---
author: Luunix
pubDatetime: 2026-04-05T00:00:00Z
title: Hello World
slug: hello-world
featured: true
draft: false
tags:
  - 随笔
description: 博客的第一篇文章，记录建站的初衷与技术选型。
---

## 开始

这是 Luunix 博客的第一篇文章。

这个博客使用 [Astro](https://astro.build/) 构建，部署在 Cloudflare Pages 上。内容源自我的 Obsidian 知识库，通过自动同步脚本发布。

## 技术栈

- **框架**：Astro + AstroPaper 主题
- **样式**：Tailwind CSS
- **部署**：Cloudflare Pages
- **内容管理**：Obsidian + PARA 方法
- **搜索**：Pagefind（全文搜索）

## 为什么选择这个方案

之前用过 Halo，虽然功能全面，但对于一个追求简约的个人博客来说太重了。Astro 生成纯静态 HTML，加载速度极快，配合 Cloudflare 的全球 CDN，体验非常好。

更重要的是，所有文章都可以在 Obsidian 中用 Markdown 编写，和我的知识管理工作流完全打通。写完一篇笔记，标记一下 `publish: true`，运行同步脚本就能发布——这才是我想要的写作体验。
