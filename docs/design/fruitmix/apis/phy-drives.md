<!-- TOC -->

- [1. 概述](#1-概述)
- [2. 依赖](#2-依赖)
- [3. 参数](#3-参数)
  - [3.1. id](#31-id)
    - [3.1.1. 测试](#311-测试)
  - [3.2. path](#32-path)
- [4. 获取物理盘列表](#4-获取物理盘列表)
  - [4.1. 测试](#41-测试)
- [5. 获取文件或文件夹](#5-获取文件或文件夹)
  - [5.1. 测试](#51-测试)
- [6. 创建文件夹或文件](#6-创建文件夹或文件)
  - [6.1. 测试](#61-测试)
- [7. 重命名](#7-重命名)
- [8. 删除](#8-删除)
  - [8.1. 测试](#81-测试)

<!-- /TOC -->

# 1. 概述

`phy-drives`接口在系统内部由nfs模块提供；nfs代表native file system，与fruitmix fs的名称对应。

# 2. 依赖

`phy-drives`是storage数据流的观察者，同时需要外部注入boundVolume的uuid。

在测试时，被测单元包含fruitmix，nfs由fruitmix构造和注入boundVolume uuid，fruitmix自己则需要boundVolume数据结构。

# 3. 参数

## 3.1. id

+ 未发现drive，返回404

### 3.1.1. 测试

```js
const invalidIds = ['hello', boundVolume.uuid]
```

## 3.2. path

path是字符串，值是一个相对路径，格式是以'/'分割的合法文件夹和文件名

+ 合法文件夹和文件名满足sanitize检查
+ '/'不得作为开头和结尾字符，也不允许连续出现多个
+ 如果指定根文件夹，使用空字符串或不提供path
+ path允许不提供，不提供解释为''

+ 如果提供path，但path不是字符串，或者不是合法字符串，返回400
+ 如果提供的path不符合具体的api要求，返回403

```js
const invalidPaths = [
  '*',            // sanitize
  '/hello',       // leading slash
  'hello/',       // trailing slash
  'hello//world', // successive slash
]
```
# 4. 获取物理盘列表

## 4.1. 测试

# 5. 获取文件或文件夹

参数：

+ id:
+ path: 路径

返回

+ 如果路径是文件夹，返回文件夹内容（direntry）；
+ 如果路径是文件，返回文件内容；
+ 如果drive不存在，返回404；
+ 如果路径非法，返回400；
+ 如果路径存在但不是文件夹或者文件，返回403, EUNSUPPORTED；
+ 如果路径不存在，返回404，ENOENT/ENOTDIR

## 5.1. 测试

+ 非法参数测试
  + 非法id测试
  + 非法path测试

+ 合法参数测试

+ readdir
  + 包含文件
  + 包含文件夹
  + 包含Symlink

+ download file
  + 下载文件

+ 不支持的文件
  + Symlink

+ 路径不存在
  + 父文件夹存在
  + 父文件夹不存在
  + 父文件夹是文件

# 6. 创建文件夹或文件

该接口可以支持创建新文件夹和上传文件，使用multipart/form-data；

**参数**

请求参数包括id/path；id/path指定的目标必须为文件夹；在使用prelude的时候path从prelude传递；

prelude body是JSON对象，包含path属性；

directory part，name为`directory`，body包含的字符串为新建文件夹名称。

file part，name为`file`，filename包含的字符串为新建文件名称，body为新建文件内容，可以为空。

## 6.1. 测试

SPEC空间

qs path
+ id
  + path
    + list [directory | file]

prelude path
+ id
  + list []
    + prelude
    + [directory]
    + [file]

+ 不存在的id

+ 非法path
+ path不是文件夹
  + 文件
  + Symlink

**one-part**

+ name非法（不是prelude, file, directory)

+ prelude
  + 空body
  + JSON不是object（null, string, number, [])
  + path格式非法
  + path不是文件夹

只有prelude的情况合法吗？

+ directory
  + 空body
  + body不是合法文件名

+ file
  + filename是空字符串
  + filename不是合法文件名
  + 空文件合法吗？

**multipart**




# 7. 重命名

目标可以为文件、文件夹、不支持的类型

该api仅能够完成在一个盘内的重命名和移动情况，不能处理跨物理盘的移动。后者应该通过xcopy模块实现。

**参数**

oldPath, newPath

```
{
  oldPath: 'path string',
  newPath: 'path string'
}
```

**返回**



# 8. 删除

path可以为文件、文件夹、不支持的类型。

path必须提供且不得为空。

**参数**

id, path

**返回**

200 成功
404 id not found
400 path invalid, path not provided or emtpy
403 ENOTDIR 
500 其他错误

## 8.1. 测试

+ 非法
  + 非法id 404
  + 非法path 400
  + path为空 400
  + path未提供 400

+ 成功 200
  + delete /hello on /
  + delete /hello on /hello
  + delete /hello/world on /
  + delete /hello/world on /hello
  + delete /hello/world on /hello/world

+ 路径错误 403
  + delete /hello/world on /hello (file)



