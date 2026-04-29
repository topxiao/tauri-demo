## ADDED Requirements

### Requirement: Render HTML in iframe
系统 SHALL 通过 iframe 的 srcdoc 属性将当前编辑的 HTML 内容注入 iframe 进行实时渲染。iframe 作为中间面板占据主区域空间。

#### Scenario: Load HTML file for preview
- **WHEN** 用户打开或切换到一个 HTML 文件
- **THEN** 系统将该 HTML 内容注入 iframe srcdoc，iframe 渲染完整页面

#### Scenario: Update preview after DOM change
- **WHEN** 用户在 DOM 树中新增、删除或编辑了节点
- **THEN** 系统将最新的 HTML 内容重新注入 iframe srcdoc，预览实时更新

### Requirement: Highlight selected element in iframe
系统 SHALL 在 iframe 中为选中的 DOM 节点对应元素显示蓝色边框高亮。通过 postMessage 向 iframe 发送 highlight 事件实现。

#### Scenario: Highlight element on DOM tree selection
- **WHEN** 用户在 DOM 树中选中一个元素节点
- **THEN** iframe 中该元素显示 2px 蓝色虚线边框，并附加半透明蓝色背景遮罩

#### Scenario: Unhighlight previous element
- **WHEN** 用户切换选中另一个 DOM 节点
- **THEN** 前一个元素的高亮效果移除，新选中元素高亮

### Requirement: Click element in iframe to select in DOM tree
系统 SHALL 支持在 iframe 中点击元素，反向选中 DOM 树中对应的节点。通过注入 `data-node-id` 属性关联 DOM 树节点和 iframe 元素。

#### Scenario: Click element in iframe
- **WHEN** 用户在 iframe 预览区点击一个元素
- **THEN** DOM 树中对应节点被选中并高亮，右侧样式编辑器加载该元素的样式

#### Scenario: Click non-element area in iframe
- **WHEN** 用户点击 iframe 的空白区域
- **THEN** 取消当前选中状态，右侧样式编辑器显示空状态

### Requirement: Bidirectional postMessage communication
系统 SHALL 通过 postMessage 在主页面和 iframe 之间双向通信。主页面注入的 HTML 中包含一个 helper 脚本，负责监听 click 事件和响应 highlight/unhighlight/updateStyles/updateStructure 消息。

#### Scenario: Send highlight message to iframe
- **WHEN** 主页面选中一个 DOM 节点
- **THEN** 通过 postMessage 发送 `{ type: 'highlight', nodeId, tagName }` 到 iframe，iframe helper 脚本找到对应 `data-node-id` 元素并添加高亮样式

#### Scenario: Receive elementClicked from iframe
- **WHEN** 用户点击 iframe 中的元素
- **THEN** iframe helper 脚本通过 postMessage 发送 `{ type: 'elementClicked', nodeId }` 回主页面，主页面选中对应 DOM 树节点

### Requirement: Preview status bar
中间预览区顶部 SHALL 显示状态栏，包含当前预览的文件名和选中元素信息。

#### Scenario: Display current file and selected element
- **WHEN** 用户选中一个 DOM 节点
- **THEN** 状态栏显示"预览：index.html"和"已选中：div.container"
