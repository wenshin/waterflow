# Waterflow

是一个通过同步管道、异步管道、Map 管道、Reduce 管道、Map 异步管道，以数据流的形式处理逻辑的工具。

# 安装

```
npm install waterflow --save
```

# 用法

### <a name="pipe">管道（Pipe）和管线（Pipeline）</a>
管道通过一个对象定义，本质是其 handle 属性，handle 是一个函数，接受数据和一个可以中断整个 Pipeline 的函数。详见[Pipe 定义](#pipe)
管线是由多个管道按顺序连接的数据处理流。

定义管线有两种方式：
1. 一次性链式调用管线。使用`import {pipeline} from 'waterflow'`引用。
2.  预定义的可重用管线。使用`import Pipeline from 'waterflow'`引用。

```javascript
// 链式调用一次性管线
import {pipeline} from 'waterflow';
// 预定义可重用管线
import Pipeline from 'waterflow';

// 管线配置，可在 Middleware 的参数 `state` 通过 `state.settings`获得，详见 Middlewares 一节
let settings = {
    logging: false // LoggerMiddleware 使用的配置，设置为 false 可以不打印信息
}
let output = pipeline(10, {
    name: 'myPipeline',
    middlewares: [],
    settings
})
.flow((v, breakPipeline) => -v) // 调用 breakPipeine 后，后面的管道将不会被执行
.flow({name: 'Plus1', handle: v => ++v, middlewares: []})
.finish();

console.log(output);
// -9

// Pipeline 预定一条管线，通过其实例后的 flow() 方法处理不同的数据
let ppl = new Pipeline('myPipeline', [
    {handle: v => -v, type: 'flow'}, // type 属性默认是'flow'所以如果是`flow`类型的，不设置 type 属性
    {name: 'Plus1', handle: v => ++v, middlewares: []}
])

let output10 = ppl.flow(10, settings);
let output20 = ppl.flow(20, settings);

console.log(output10);
// -9

console.log(output20);
// -19
```

### 同步管道（SyncPipe）和异步管道（AsyncPipe）

同步管道，顾名思义就是 Pipe 是同步执行的。而异步管道的 Pipe 是同步执行的。

一次性调用管线的同步管道有`pipeline.flow`，`pipeline.flowMap`，`pipeline.flowReduce`。异步管道有`pipeline.flowAsync`，`pipeline.flowMapAsync`。

可重用管线的同步管道有`flow`（默认的），`map`，`reduce`。异步管道有`async`，`mapAsync`。 通过初始化时指定 `type` 属性，如：

```javascript
let ppl = new Pipeline('myPipeline', [
    {
        name: 'myPipe',
        handle: Function,
        type: 'undefined|''|null|map|reduce|async|mapAsync'
    }
]);
```

### <a name="pipe-definition">Pipe 定义</a>
Pipe 的基本属性通过以下方式进行定义
```
{
    name: 'my-async-pipe',
    handle: Function,
    middlewares: [],
    ...otherProperties
}
```
特殊的 Pipe 需要额外的属性（otherProperties ），详见各个 Pipe 的定义。

**可重用 Pipeline 的 type 属性**
可重用 Pipeline 定义时需要在 Pipe 基本属性的基础上声明 `type` 属性。该属性的值有：
`undefined`、`null`、`''`、`'async'`、`'map'`、`'mapAsync'`、`'reduce'`。`undefined`、`null`、`''` 均使用默认类型`'flow'`。但是不要设置 type 属性为`'flow'`

**一次性 Pipeline 的简写**
如果使用一次性调用方式声明 Pipeline，可以只传递一个函数，而不是对象作为 Pipe
```
let output = pipeline(10)
    .flow(v => -v)
    .finish();
```


### AsyncPipe（`pipeline.flowAsync` 或者 `Pipeline` 的 `async` 类型）
**定义：**
```javascript
```
**参数：**
`data` 输入的数据
`breakPipeline` 中断 Pipeline 执行的参数


以下均用`pipeline`方法写样例。你可以根据[管道](#pipe)中查看如何转换成 `new Pipeline`形式。



### MapPipe（`pipeline.flowMap` 或者 `Pipeline` 的 `map` 类型）

### MapAsyncPipe（`pipeline.flowMapAsync` 或者 `Pipeline` 的 `mapAsync` 类型）
