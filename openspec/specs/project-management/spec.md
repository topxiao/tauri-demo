## ADDED Requirements

### Requirement: Import project folder
系统 SHALL 提供导入文件夹功能。用户通过 Tauri 文件选择对话框选择文件夹后，系统通过 Rust `open_folder` command 获取路径，再通过 `list_files` command 递归获取文件夹下的文件树结构。

#### Scenario: Import a folder containing HTML files
- **WHEN** 用户点击"打开文件夹"按钮并选择一个包含 HTML 文件的文件夹
- **THEN** 系统展示该文件夹的文件树结构，HTML 文件可点击，非 HTML 文件灰色展示

#### Scenario: Import an empty folder
- **WHEN** 用户选择一个空文件夹
- **THEN** 文件树显示空文件夹状态，提示用户该文件夹无 HTML 文件

### Requirement: File tree display
系统 SHALL 在左侧面板的"文件"标签页中展示文件夹结构。文件树按文件夹层级缩进展示，支持折叠展开。

#### Scenario: Display file tree with mixed file types
- **WHEN** 文件夹包含 HTML 文件、CSS 文件、JS 文件、图片等
- **THEN** HTML 文件正常显示且可点击，CSS/JS/图片等其他文件灰色展示，不提供编辑功能

### Requirement: Switch between HTML files
系统 SHALL 支持在文件树中点击不同 HTML 文件切换编辑。切换时系统通过 Rust `read_file` 读取文件内容。

#### Scenario: Switch to another HTML file with unsaved changes
- **WHEN** 用户当前编辑的 HTML 文件有未保存变更，且用户点击了另一个 HTML 文件
- **THEN** 系统弹出确认对话框提示"当前文件有未保存变更，是否保存？"

#### Scenario: Switch to another HTML file without unsaved changes
- **WHEN** 用户点击另一个 HTML 文件且当前文件无未保存变更
- **THEN** 系统立即加载新文件的 DOM 树、预览和样式数据

### Requirement: Rust file I/O commands
Rust 后端 SHALL 提供以下 Tauri commands，供前端通过 invoke 调用：

- `open_folder` → 弹出系统文件选择对话框，返回选中的文件夹路径
- `read_file(path: String)` → 读取指定路径文件内容，返回字符串
- `write_file(path: String, content: String)` → 将内容写入指定路径文件
- `list_files(dir_path: String)` → 递归列出指定文件夹下的文件树结构

#### Scenario: Read a file successfully
- **WHEN** 前端调用 `read_file` 传入有效文件路径
- **THEN** Rust 返回文件内容的字符串

#### Scenario: Read a file that does not exist
- **WHEN** 前端调用 `read_file` 传入不存在的文件路径
- **THEN** Rust 返回错误信息，前端 Toast 提示用户文件不存在

#### Scenario: Write file successfully
- **WHEN** 前端调用 `write_file` 传入有效路径和内容
- **THEN** Rust 将内容写入文件，返回成功
