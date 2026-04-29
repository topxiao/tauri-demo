## ADDED Requirements

### Requirement: Serialize and save HTML
系统 SHALL 使用 parse5 序列化 HTML AST 为 HTML 字符串，通过 Rust `write_file` 写回原文件。序列化流程：DOM 变更更新 parse5 AST → `<style>` 内 CSS 变更通过 css-tree 序列化写回 `<style>` 文本 → 内联 style 变更序列化为字符串写入属性 → parse5 序列化完整 AST。

#### Scenario: Save HTML after DOM structure change
- **WHEN** 用户在 DOM 树中新增/删除/移动了节点，然后按 Ctrl+S
- **THEN** 系统将 parse5 AST 序列化为 HTML 字符串，通过 Rust `write_file` 写回原文件，标记为已保存状态

#### Scenario: Save HTML after style tag edit
- **WHEN** 用户编辑了 `<style>` 中的 CSS 规则并保存
- **THEN** css-tree 序列化 CSS AST 为字符串，写回 `<style>` 标签文本，parse5 序列化完整 HTML 写回文件

### Requirement: Save external CSS files
系统 SHALL 将外部 CSS 文件的变更通过 css-tree 序列化后，通过 Rust `write_file` 写回对应 .css 文件。

#### Scenario: Save external CSS changes
- **WHEN** 用户编辑了外部 CSS 文件中的属性并保存
- **THEN** css-tree 序列化该文件的 CSS AST 为字符串，通过 Rust `write_file` 写回对应 .css 文件

### Requirement: Format preservation
系统 SHALL 在保存时保留原始文件的格式信息（缩进风格、空行、注释位置）。parse5 负责保留 HTML 格式，css-tree 负责保留 CSS 格式。

#### Scenario: Preserve indentation after edit
- **WHEN** 原文件使用 2 空格缩进，用户修改了一个属性值后保存
- **THEN** 保存后的文件保持 2 空格缩进风格，仅变更的属性值不同

### Requirement: Unsaved changes protection
系统 SHALL 在以下场景检测未保存变更并提示用户：切换编辑其他 HTML 文件时、关闭窗口时。提示对话框包含"保存"、"不保存"、"取消"三个选项。

#### Scenario: Switch file with unsaved changes
- **WHEN** 用户修改了当前文件但未保存，然后点击文件树中的另一个 HTML 文件
- **THEN** 弹出对话框"当前文件有未保存变更"，提供"保存"、"不保存"、"取消"按钮

#### Scenario: Close window with unsaved changes
- **WHEN** 用户修改了文件但未保存，然后关闭应用窗口
- **THEN** 弹出对话框提示保存，阻止窗口关闭直到用户做出选择

### Requirement: Undo/Redo
系统 SHALL 通过 Pinia 快照插件实现撤销/重做功能。每次 DOM 或 CSS 变更前记录完整状态快照。支持 Ctrl+Z 撤销、Ctrl+Y 重做。快照栈深度限制为 50 步。

#### Scenario: Undo a DOM node deletion
- **WHEN** 用户删除了一个 DOM 节点后按 Ctrl+Z
- **THEN** 被删除的节点恢复到 DOM 树中的原始位置

#### Scenario: Redo after undo
- **WHEN** 用户撤销操作后按 Ctrl+Y
- **THEN** 撤销的操作重新执行

#### Scenario: Undo stack depth limit
- **WHEN** 用户执行超过 50 步操作
- **THEN** 最早的快照被丢弃，Undo 栈保持最多 50 步

### Requirement: Error handling on save
系统 SHALL 在保存操作失败时提示用户，保留内存中的变更不丢失。

#### Scenario: Write permission denied
- **WHEN** Rust `write_file` 因文件权限不足而失败
- **THEN** 前端 Toast 提示"文件保存失败：权限不足"，内存中的编辑状态保留

#### Scenario: File locked by another process
- **WHEN** 目标文件被其他程序锁定无法写入
- **THEN** 前端 Toast 提示"文件保存失败：文件被占用"，用户可稍后重试
