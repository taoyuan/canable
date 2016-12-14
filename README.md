# canable [![Build Status](https://travis-ci.org/taoyuan/canable.svg?branch=master)](https://travis-ci.org/taoyuan/canable) [![Coverage Status](https://coveralls.io/repos/github/taoyuan/canable/badge.svg?branch=master)](https://coveralls.io/github/taoyuan/canable?branch=master)

> An access control library for node.js


## Install

```
$ npm install --save canable
```


## Usage

```js
const Canable = require('canable');

const canable = new Canable();

class User {}
class Product {}

canable.allow(User, 'view', Product);

const user = new User();
const product = new Product();

canable.can(user, 'view', product);
//=> true

canable.can(user, 'edit', product);
//=> false
```

## API

### canable(input, [options])

#### input

Type: `string`

Lorem ipsum.

#### options

##### foo

Type: `boolean`<br>
Default: `false`

Lorem ipsum.


## License

MIT © [Yuan Tao](https://gihub.com/canable)
