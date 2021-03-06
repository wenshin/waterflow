# Waterflow

A pipeline deal with data like water. support Map, Reduce, Async Pipes.


# install

```
npm install waterflow --save
```

# Usage

#### Explain SyncPipe and AsyncPipe

SyncPipe is a type of pipe will execute immediately. SyncPipe includes `flow`, `flowMap` and `flowReduce`.

AsyncPipe is a type of pipe will execute async.

### SyncPipe `flow` and AsyncPipe `flowAsync`

SyncPipe is a function accept a `value` parameter and should return a new `value`;

AsyncPipe is a function accept a `value` parameter and should return a promise object;

If there is a AsyncPipe in pipeline, the `Pipeline.flow()` will return a promise object. otherwise all pipe is SyncPipe it will return the value;

```javascript
import Pipeline from 'waterflow';

let settings = {logging: false};

let pipeline = new Pipeline(
    'Pipeline of SyncPipe',
    [
        {name: 'plus1', handle: v => v++}, // SyncPipe `flow` isDefault
        {name: 'Negative', handle: v => -v}
    ]
);

assert.equal(pipeline.flow(10, settings), -11);

let pipeline = new Pipeline(
    'Pipeline of SyncPipe and AsyncPipe',
    [
        {name: 'plus1', handle: v => v++}, // SyncPipe `flow` isDefault
        {
            name: '2 times',
            handle: v => {
                return new Promise((resolve, reject) => {
                    setTimeout(() => {
                        resolve(v * 2);
                    }, 200)
                });
            }, type: 'async'
        },
        {name: 'Negative', handle: v => -v}
    ]
);

pipeline
    .flow(10)
    .then(v => asset.equal(v === -22))
    .catch(err => console.log(err));
```

### <a name="sync-pipe-map-reduce">Flow data with SyncPipe `flowMap` and `flowReduce`</a>

```javascript
import Pipeline from 'waterflow';

let pipeline = new Pipeline(
    'Pipeline Logger test',
    [
        // If `filter(item)` return `false` will been dropped.
        // This example will drop the value which great or equal 30
        {name: 'map plus 1', handle: v => v++, filter: v => v < 30, type: 'map'},
        {name: 'sum', handle: (pre, cur) => return pre + cur, initialValue: 0, type: 'reduce'}
    ]
);

assert.equal(pipeline.flow([10, 20, 30]), 10 + 1 + 20 + 1);
assert.equal(pipeline.flow({data1: 10, data2: 20, data3: 30}), 10 + 1 + 20 + 1);

```

### <a name="async-pipe">Flow data with AsyncPipe `flowMapAsync`</a>

```javascript
import Pipeline from 'waterflow';

let pipeline = new Pipeline(
    'Pipeline Logger test',
    [
        // If `filter(item)` return `false` will been dropped.
        // This example will drop the value which great or equal 30
        {
            name: 'map plus 1',
            handle: v => {
                return new Promise((resolve, reject) => {
                    setTimeout(() => {
                        resolve(++v);
                    }, 200)
                });
            },
            filter: v => v < 30,
            type: 'mapAsync'}
    ]
);

pipeline
    .flow([10, 20, 30])
    .then(data => {
        assert.sameMembers(data, [11, 21])
    });

pipeline
    .flow({data1: 10, data2: 20, data3: 30})
    .then(data => {
        assert.deepEqual(data, {data1: 11, data2: 21})
    });
```

### <a name="break-pipeline">Break Pipeline in pipe</a>

> Warning: New feature in 0.1.2

```
let pipeline = new Pipeline(
    'Pipeline Logger test',
    [
        {
            name: 'plus 1',
            handle: (v, breakPipeline) => {
                breakPipeline();
                return ++v;
            }},
        {
            name: 'map plus 1',
            handle: (v, breakPipeline) => {
                breakPipeline();
                return ++v;
            },
            filter: v => v < 30,
            type: 'map'},
        {
            name: 'map plus 1',
            handle: (v, breakPipeline) => {
                return new Promise((resolve, reject) => {
                    setTimeout(() => {
                        breakPipeline();
                        resolve(++v);
                    }, 200)
                });
            },
            filter: v => v < 30,
            type: 'mapAsync'}
    ]
);
```
### <a name="settings">Settings</a>
settings can be access in state, like the parameter of Middlewares。


#### Set Settings

```
import {pipeline} from 'waterflow';
import Pipeline from 'waterflow';

let output = pipeline(10, {name: 'myPipeline', settings: {logging: false}})
    .flow(v => -v)
    .finish();

let ppl = new Pipeline('myPipeline', [
    {handle: v => -v}
])

ppl.flow(10, {logging: false});
```

### <a name="middleware">Middleware</a>

Javascript has a weird problem `0.1 + 0.2 === 0.3000000000000002`, you must fix it everywhere.
In Pipeline you can use middlewares to handle this, see [Customize Middlewares](#customize-middlewares).

Pipeline can use middlewares between pipes, before first pipe start and after last pipe finished.

```
- - - - - - - - - +------+ - - - - - - - - - +------+ - - - - - - - -
  | (1) | (2) (3) | pipe | (4) (5) | (2) (3) | pipe | (4) (5) | (6) |
- - - - - - - - - +------+ - - - - - - - - - +------+ - - - - - - - -
```

(1): PipelineMiddleware1.pre
(2): PipeMiddleware1.pre
(3): PipeMiddleware1.post
(4): PipeMiddleware2.pre
(5): PipeMiddleware2.post
(6): PipelineMiddleware1.post

### <a name="customize-middlewares">Use and Customize Middlewares</a>

```javascript
import Pipeline from 'waterflow';
import LoggerMiddleware from 'waterflow/middlewares/logger';
import {makeRoundNumberHandler, toNumberHandler} from 'waterflow/middlewares/number';

// When pipeline finished and the value is number, change the number to
let RoundNumberPipeMiddleware = {
  type: 'pipe',
  name: 'RoundNumberPipeMiddleware',
  post: makeRoundNumberHandler()
};

let ToNumberPipeMiddleware = {
  type: 'pipe',
  name: 'ToNumberPipeMiddleware',
  pre: toNumberHandler
};


Pipeline.applyPipelineMiddlewares(LoggerMiddleware);
Pipeline.applyCommonPipeMiddlewares(ToNumberPipeMiddleware);

let pipeline = new Pipeline(
    'Pipeline inline test',
    [
        {name: '', handle: v => 1 / v, middlewares=[RoundNumberPipeMiddleware]},
    ]
);

let settings = {logging: false};
pipeline.flow(10, settings);
```
