/**
 * Obsidian Vault → AstroPaper 博客同步脚本
 *
 * 扫描 vault 中 frontmatter 标记 publish: true 的笔记，
 * 转换为 AstroPaper 兼容格式后输出到 src/data/blog/
 */

import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

// 路径配置（相对于 blog/ 目录）
const VAULT_ROOT = path.resolve(import.meta.dirname, "../..");
const BLOG_OUTPUT = path.resolve(import.meta.dirname, "../src/data/blog");
const IMAGE_OUTPUT = path.resolve(import.meta.dirname, "../public/images");
const ASSETS_DIR = path.join(VAULT_ROOT, "Assets");

// 需要排除的目录
const EXCLUDE_DIRS = new Set([
  "blog",
  ".obsidian",
  ".agentdocs",
  "Templates",
  ".trash",
  "node_modules",
]);

// ─── 文件扫描 ──────────────────────────────────────────

/**
 * 递归扫描 vault 中的所有 .md 文件，排除指定目录
 */
function scanVaultFiles(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      // 排除指定目录和隐藏目录
      if (EXCLUDE_DIRS.has(entry.name) || entry.name.startsWith(".")) continue;
      scanVaultFiles(fullPath, files);
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      files.push(fullPath);
    }
  }
  return files;
}

// ─── 内容转换 ──────────────────────────────────────────

/**
 * 将 Obsidian wikilink 转为纯文本
 * [[note|display]] → display
 * [[note]] → note
 */
function convertWikilinks(content) {
  // 先处理带别名的 wikilink: [[target|display]]
  content = content.replace(/\[\[([^\]]+?)\|([^\]]+?)\]\]/g, "$2");
  // 再处理普通 wikilink: [[target]]
  content = content.replace(/\[\[([^\]]+?)\]\]/g, "$1");
  return content;
}

/**
 * 转换 Obsidian 图片嵌入为标准 Markdown 并复制图片
 * ![[image.png]] → ![image.png](/images/image.png)
 * ![[image.png|alt text]] → ![alt text](/images/image.png)
 */
function convertImages(content) {
  const imageExtensions = /\.(png|jpg|jpeg|gif|svg|webp|bmp|ico)$/i;
  const copiedImages = new Set();

  content = content.replace(
    /!\[\[([^\]]+?)(?:\|([^\]]*))?\]\]/g,
    (match, filename, altText) => {
      if (!imageExtensions.test(filename)) return match;

      const alt = altText || filename;
      const imageName = path.basename(filename);

      // 复制图片到 public/images/
      if (!copiedImages.has(imageName)) {
        const sourcePath = path.join(ASSETS_DIR, imageName);
        if (fs.existsSync(sourcePath)) {
          fs.mkdirSync(IMAGE_OUTPUT, { recursive: true });
          fs.copyFileSync(sourcePath, path.join(IMAGE_OUTPUT, imageName));
          copiedImages.add(imageName);
        }
      }

      return `![${alt}](/images/${imageName})`;
    }
  );

  return content;
}

/**
 * 移除 Obsidian 特有的语法块
 * - Dataview 查询块
 * - Templater 语法残留
 */
function removeObsidianSyntax(content) {
  // 移除 dataview 代码块
  content = content.replace(/```dataview[\s\S]*?```/g, "");
  // 移除 dataviewjs 代码块
  content = content.replace(/```dataviewjs[\s\S]*?```/g, "");
  // 移除 Templater 语法残留
  content = content.replace(/<%[\s\S]*?%>/g, "");
  // 清理多余的连续空行（超过2个空行压缩为2个）
  content = content.replace(/\n{3,}/g, "\n\n");
  return content;
}

// ─── Frontmatter 映射 ──────────────────────────────────

/**
 * 将日期值（可能是 Date 对象或字符串）标准化为 ISO 字符串
 */
function normalizeDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  // 字符串格式 YYYY-MM-DD
  const d = new Date(`${value}T00:00:00Z`);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

/**
 * 将 Obsidian frontmatter 转换为 AstroPaper 格式
 */
function transformFrontmatter(data, filename) {
  const pubDatetime =
    normalizeDate(data.created) || new Date().toISOString();

  return {
    author: data.author || "Luunix",
    pubDatetime,
    modDatetime: normalizeDate(data.modified),
    title: data.title || filename.replace(/\.md$/, ""),
    slug: data.slug || slugify(data.title || filename.replace(/\.md$/, "")),
    featured: data.featured || false,
    draft: data.draft || false,
    tags: Array.isArray(data.tags) ? data.tags : [],
    description: data.description || "",
  };
}

/**
 * 生成 URL-friendly 的 slug
 */
function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^\w\u4e00-\u9fff\s-]/g, "") // 保留中文、字母、数字、空格、连字符
    .replace(/[\s_]+/g, "-") // 空格和下划线转连字符
    .replace(/-+/g, "-") // 去除连续连字符
    .replace(/^-|-$/g, ""); // 去除首尾连字符
}

// ─── 主流程 ──────────────────────────────────────────

function main() {
  console.log("📝 开始同步 Obsidian → Blog...\n");

  // 扫描 vault
  const mdFiles = scanVaultFiles(VAULT_ROOT);
  console.log(`   扫描到 ${mdFiles.length} 个 Markdown 文件`);

  // 过滤标记发布的文件
  const publishFiles = [];
  for (const filePath of mdFiles) {
    const raw = fs.readFileSync(filePath, "utf-8");
    const { data } = matter(raw);
    if (data.publish === true) {
      publishFiles.push({ filePath, raw, data });
    }
  }
  console.log(`   其中 ${publishFiles.length} 篇标记为发布\n`);

  if (publishFiles.length === 0) {
    console.log("   没有需要同步的文章。");
    return;
  }

  // 清理旧的同步文件（保留手动创建的文章）
  // 通过检查文件中是否有 synced-from 注释来识别同步文件
  const existingSynced = fs.existsSync(BLOG_OUTPUT)
    ? fs.readdirSync(BLOG_OUTPUT).filter(f => {
        if (!f.endsWith(".md")) return false;
        const content = fs.readFileSync(path.join(BLOG_OUTPUT, f), "utf-8");
        return content.includes("<!-- synced-from:");
      })
    : [];

  for (const file of existingSynced) {
    fs.unlinkSync(path.join(BLOG_OUTPUT, file));
  }

  // 确保输出目录存在
  fs.mkdirSync(BLOG_OUTPUT, { recursive: true });

  // 转换并输出
  let syncedCount = 0;
  for (const { filePath, raw, data } of publishFiles) {
    const filename = path.basename(filePath);
    const { content: bodyRaw } = matter(raw);

    // 转换内容
    let body = bodyRaw;
    body = convertImages(body);
    body = convertWikilinks(body);
    body = removeObsidianSyntax(body);

    // 转换 frontmatter
    const newFrontmatter = transformFrontmatter(data, filename);
    const slug = newFrontmatter.slug;
    const outputFilename = `${slug}.md`;

    // 组装最终文件（添加同步来源标记）
    const relativePath = path.relative(VAULT_ROOT, filePath);
    // 日期字段不加引号（YAML 会解析为 Date），字符串加引号
    const DATE_FIELDS = new Set(["pubDatetime", "modDatetime"]);
    const frontmatterStr = Object.entries(newFrontmatter)
      .filter(([, v]) => v !== undefined && v !== null && v !== "")
      .map(([k, v]) => {
        if (Array.isArray(v)) {
          if (v.length === 0) return `${k}: []`;
          return `${k}:\n${v.map(item => `  - ${item}`).join("\n")}`;
        }
        if (typeof v === "boolean") return `${k}: ${v}`;
        if (DATE_FIELDS.has(k)) return `${k}: ${v}`;
        return `${k}: ${JSON.stringify(v)}`;
      })
      .join("\n");

    const output = `---\n${frontmatterStr}\n---\n\n<!-- synced-from: ${relativePath} -->\n${body}`;

    fs.writeFileSync(path.join(BLOG_OUTPUT, outputFilename), output.trim() + "\n");
    console.log(`   ✓ ${relativePath} → ${outputFilename}`);
    syncedCount++;
  }

  console.log(`\n✅ 同步完成，共 ${syncedCount} 篇文章`);
}

main();
